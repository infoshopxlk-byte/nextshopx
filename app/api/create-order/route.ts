import api from "@/lib/woocommerce";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return NextResponse.json(
            { success: false, message: "Unauthorized: You must be logged in to place an order." },
            { status: 401 }
        );
    }

    try {
        const orderData = await request.json();

        // 1. Fetch WooCommerce Customer ID using session email
        const userEmail = session.user.email;
        let customerId = null;

        if (userEmail) {
            try {
                // Stage 1: Strict Email Search
                console.log(`[DEBUG] Checkout Stage 1: Strict search for ${userEmail}`);
                const customersResponse = await api.get("customers", { email: userEmail });
                if (customersResponse.data && customersResponse.data.length > 0) {
                    customerId = customersResponse.data[0].id;
                    console.log(`[DEBUG] Found Customer ID via strict search: ${customerId}`);
                } else {
                    // Stage 2: Create customer if not found
                    console.log(`[DEBUG] Checkout Stage 2: Customer not found. Creating new WooCommerce customer...`);
                    try {
                        const nameParts = session.user.name?.split(" ") || [""];
                        const newCustomer = await api.post("customers", {
                            email: userEmail,
                            first_name: nameParts[0] || "",
                            last_name: nameParts.slice(1).join(" ") || "",
                            username: userEmail.split("@")[0]
                        });
                        customerId = newCustomer.data.id;
                        console.log(`[DEBUG] Created new Customer ID: ${customerId}`);
                    } catch (createError: any) {
                        const errorCode = createError.response?.data?.code;
                        console.warn(`[DEBUG] Creation Failed with code: ${errorCode}. Message:`, createError.response?.data?.message);
                        
                        // Stage 3: Conflict Fallback (Email Exists but role is missing/hidden)
                        if (errorCode === 'registration-error-email-exists') {
                            console.log(`[DEBUG] Checkout Stage 3: Conflict detected. Attempting broad WooCommerce search fallback.`);
                            const searchResponse = await api.get("customers", { search: userEmail, role: 'all' });
                            
                            if (searchResponse.data && searchResponse.data.length > 0) {
                                customerId = searchResponse.data[0].id;
                                console.log(`[DEBUG] Found Customer ID via broad WooCommerce search: ${customerId}`);
                            } else {
                                console.log(`[DEBUG] WooCommerce broad search failed. Executing final native WordPress User search fallback...`);
                                // Stage 4: Ultimate Fallback to raw WordPress REST API (Bypasses WC Customer Role Restrictions)
                                try {
                                    const wpAuth = Buffer.from(`${process.env.WC_CONSUMER_KEY}:${process.env.WC_CONSUMER_SECRET}`).toString('base64');
                                    const wpResponse = await fetch(`${process.env.NEXT_PUBLIC_WORDPRESS_URL}/wp-json/wp/v2/users?search=${encodeURIComponent(userEmail)}`, {
                                        headers: {
                                            'Authorization': `Basic ${wpAuth}`,
                                            'Content-Type': 'application/json'
                                        }
                                    });
                                    const wpUsers = await wpResponse.json();
                                    
                                    if (wpUsers && wpUsers.length > 0) {
                                        customerId = wpUsers[0].id; // Force bind the raw WordPress User ID
                                        console.log(`[DEBUG] Success! Extracted raw WordPress User ID: ${customerId}`);
                                    } else {
                                        console.error(`[DEBUG] Critical Error: WordPress native search also failed for existing email ${userEmail}`);
                                    }
                                } catch (wpError) {
                                    console.error(`[DEBUG] WordPress native search threw an exception:`, wpError);
                                }
                            }
                        }
                    }
                }
            } catch (custError: any) {
                console.warn("Failed to lookup WooCommerce customer by email during checkout:", custError.response?.data || custError.message);
            }
        }

        // 4. Final Validation Enforcement
        if (!customerId || customerId === 0) {
            console.error(`[ERROR] Order aborted. Failed to resolve a valid Customer ID for ${userEmail}`);
            return NextResponse.json(
                { success: false, message: "Server Error: Failed to link order to a valid customer profile. Please contact support." },
                { status: 500 }
            );
        }

        // 5. Inject Validated Customer ID into the payload
        orderData.customer_id = customerId;

        console.log(`[DEBUG] Final Order Payload being sent to WooCommerce:`, JSON.stringify(orderData, null, 2));

        // Securely proxy the payload back to standard WooCommerce API but explicitly flag  
        // WCFM interception headers so the backend Marketplace module validates the payload.
        const response = await api.post("orders", orderData, {
            headers: {
                "WCFM-SYNC": "true"
            }
        });

        // ==========================================
        // DIRECT PAYMENT GATEWAY INTEGRATION
        // ==========================================
        let directPaymentUrl = response.data.payment_url;
        const wcOrderId = response.data.id;
        const orderTotal = response.data.total;
        
        // GENIE (VISA / MASTER)
        if (orderData.payment_method === 'genie') {
            console.log(`[DEBUG] Initiating direct Genie API checkout for Order ${wcOrderId}`);
            try {
                // Fetch server IP address for logging
                let serverIp = "Unknown";
                try {
                    const ipRes = await fetch("https://api.ipify.org?format=json");
                    if (ipRes.ok) {
                        const ipData = await ipRes.json();
                        serverIp = ipData.ip;
                    }
                } catch (e) {
                    console.error("Could not fetch server IP", e);
                }

                const genieEndpoint = "https://api.geniebiz.lk/public/transactions"; 
                
                const geniePayload = {
                    amount: parseFloat(orderTotal),
                    currency: "LKR",
                    redirectUrl: `${process.env.NEXTAUTH_URL}/success?orderId=${wcOrderId}`,
                    webhook: `${process.env.NEXTAUTH_URL}/api/webhooks/genie`, // This webhook route needs to be created
                    localId: wcOrderId.toString(),
                    customerReference: orderData.billing.email,
                    order: {
                        shopId: process.env.GENIE_MERCHANT_ID
                    },
                    billingDetails: {
                        name: `${orderData.billing.first_name} ${orderData.billing.last_name}`,
                        email: orderData.billing.email,
                        address1: orderData.billing.address_1,
                        address2: orderData.billing.city
                    }
                };

                const apiKey = process.env.GENIE_API_KEY || "";
                const maskedApiKey = apiKey.length > 20 
                    ? `${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 5)}` 
                    : "MISSING_OR_TOO_SHORT";

                console.log("================ GENIE API DEBUG ================");
                console.log("Endpoint: ", genieEndpoint);
                console.log("Server Outgoing IP (Whitelist check): ", serverIp);
                console.log("Headers: ", {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${maskedApiKey}`
                });
                console.log("Payload: ", JSON.stringify(geniePayload, null, 2));
                console.log("=================================================");

                const genieResponse = await fetch(genieEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.GENIE_API_KEY}`
                    },
                    body: JSON.stringify(geniePayload)
                });

                if (genieResponse.ok) {
                    const genieData = await genieResponse.json();
                    // TODO: Adjust field names according to actual Genie API response document
                    directPaymentUrl = genieData.paymentUrl || genieData.url || genieData.redirectUrl || directPaymentUrl; 
                    console.log(`[DEBUG] Genie Payment URL generated: ${directPaymentUrl}`);
                } else {
                    const errorText = await genieResponse.text();
                    console.error(`[ERROR] Genie API failed (Status: ${genieResponse.status}):`, errorText);
                }
            } catch (err) {
                 console.error("[ERROR] Genie API integration error:", err);
            }
        } 
        // PAYZY (INSTALLMENTS)
        else if (orderData.payment_method === 'payzy') {
            console.log(`[DEBUG] Initiating direct Payzy API checkout for Order ${wcOrderId}`);
            try {
                // TODO: Replace with exact Payzy Checkout API endpoint
                const payzyEndpoint = "https://api.payzy.lk/v1/checkout/session"; 
                
                const payzyPayload = {
                    shopId: process.env.PAYZY_SHOP_ID,
                    reference: wcOrderId.toString(),
                    amount: parseFloat(orderTotal),
                    currency: "LKR",
                    customer: {
                        firstName: orderData.billing.first_name,
                        lastName: orderData.billing.last_name,
                        email: orderData.billing.email,
                        phone: orderData.billing.phone,
                    },
                    successUrl: `${process.env.NEXTAUTH_URL}/success?orderId=${wcOrderId}`,
                    cancelUrl: `${process.env.NEXTAUTH_URL}/checkout`
                };

                const payzyResponse = await fetch(payzyEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.PAYZY_SECRET_KEY}`
                    },
                    body: JSON.stringify(payzyPayload)
                });

                if (payzyResponse.ok) {
                    const payzyData = await payzyResponse.json();
                    // TODO: Adjust field names according to actual Payzy API response document
                    directPaymentUrl = payzyData.sessionUrl || payzyData.url || payzyData.redirectUrl || directPaymentUrl;
                    console.log(`[DEBUG] Payzy Session URL generated: ${directPaymentUrl}`);
                } else {
                     console.error("[ERROR] Payzy API failed:", await payzyResponse.text());
                }
            } catch (err) {
                console.error("[ERROR] Payzy API integration error:", err);
            }
        }

        return NextResponse.json(
            {
                success: true,
                orderId: wcOrderId,
                paymentUrl: directPaymentUrl,
                message: "Order placed successfully!"
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("WooCommerce Order Auth/Creation Error:", error.response?.data || error.message);

        return NextResponse.json(
            {
                success: false,
                message: error.response?.data?.message || "Failed to establish secure connection to WooCommerce to complete order."
            },
            { status: error.response?.status || 500 }
        );
    }
}
