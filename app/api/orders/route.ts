import api from "@/lib/woocommerce";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;

    if (!session || !email) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    try {
        // Resolving WooCommerce Customer ID Using the 4-Stage Role-Agnostic Vendor Bypass Fallback
        
        // Stage 1: Strict Check
        console.log(`[DEBUG] Orders API: Fetching WooCommerce customer strictly for email: ${email}`);
        let customersResponse = await api.get("customers", { email: email });
        let customer = customersResponse.data[0];

        // Stage 2: Broad WooCommerce Conflict Check
        if (!customer) {
            console.log(`[DEBUG] Orders API: Customer not found via strict email. Falling back to broad WooCommerce search.`);
            customersResponse = await api.get("customers", { search: email, role: 'all' });
            customer = customersResponse.data[0];
        }

        // Stage 3 & 4: Native WordPress User Search (Bypasses all WC Customer Role constraints)
        if (!customer) {
            console.log(`[DEBUG] Orders API: WooCommerce failed to identify ${email} entirely. Executing raw WordPress User search...`);
            try {
                const wpAuth = Buffer.from(`${process.env.WC_CONSUMER_KEY}:${process.env.WC_CONSUMER_SECRET}`).toString('base64');
                const wpResponse = await fetch(`${process.env.NEXT_PUBLIC_WORDPRESS_URL}/wp-json/wp/v2/users?search=${encodeURIComponent(email)}`, {
                    headers: {
                        'Authorization': `Basic ${wpAuth}`,
                        'Content-Type': 'application/json'
                    }
                });
                const wpUsers = await wpResponse.json();
                
                if (wpUsers && wpUsers.length > 0) {
                    const wpUser = wpUsers[0];
                    console.log(`[DEBUG] Orders API: Successfully located WordPress User ID ${wpUser.id} for Vendor bypass.`);
                    customer = { id: wpUser.id }; // Shell specifically passing the ID
                }
            } catch (wpError) {
                console.error(`[DEBUG] Orders API: WordPress raw search fallback failed:`, wpError);
            }
        }

        if (!customer || !customer.id) {
            console.warn(`[WARN] Orders API: Completely failed to resolve an ID for ${email}. Returning empty order history.`);
            return NextResponse.json({
                success: true,
                orders: []
            }, {
                headers: {
                    'Cache-Control': 'no-store, max-age=0'
                }
            });
        }

        // Fetch orders strictly filtered by the specific, validated numerical customer ID
        console.log(`[DEBUG] Fetching WooCommerce orders strictly for Customer ID: ${customer.id}`);
        
        let response = await api.get("orders", {
            customer: customer.id,
            status: "any",
            orderby: "date",
            order: "desc"
        });

        // WCFM usually injects vendor data into line items or provides a separate endpoint.
        // For now, we'll return the orders as is.

        return NextResponse.json({
            success: true,
            orders: response.data
        }, {
            headers: {
                'Cache-Control': 'no-store, max-age=0'
            }
        });
    } catch (error: any) {
        console.error("WooCommerce Fetch Orders Error:", error.response?.data || error.message);
        return NextResponse.json({
            success: false,
            message: "Failed to fetch orders from WooCommerce"
        }, { 
            status: 500,
            headers: {
                'Cache-Control': 'no-store, max-age=0'
            }
        });
    }
}
