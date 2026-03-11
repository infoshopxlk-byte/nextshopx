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
        // Fetch specific WooCommerce customer profile by email first
        console.log(`[DEBUG] Fetching WooCommerce customer strictly for email: ${email}`);
        let customersResponse = await api.get("customers", { email: email });
        let customer = customersResponse.data[0];

        // 2. Conflict Fallback: If empty, try searching the email broadly
        if (!customer) {
            console.log(`[DEBUG] Customer not found via strict email for ${email}. Falling back to broad WooCommerce search.`);
            customersResponse = await api.get("customers", { search: email, role: 'all' });
            customer = customersResponse.data[0];
        }

        // 3. Ultimate Fallback: Native WordPress User Search (Bypasses WC Customer Roles Entirely)
        if (!customer) {
            console.log(`[DEBUG] WooCommerce failed to identify ${email} entirely. Executing raw WordPress User search...`);
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
                    console.log(`[DEBUG] Successfully located WordPress User ID ${wpUser.id} for Vendor bypass.`);
                    // Synthesize a basic shell mimicking WooCommerce's Customer object so the dashboard doesn't crash
                    customer = {
                        id: wpUser.id,
                        email: email,
                        first_name: wpUser.name || "Vendor",
                        last_name: "",
                        shipping: {},
                        billing: {}
                    };
                }
            } catch (wpError) {
                console.error(`[DEBUG] WordPress raw search fallback failed:`, wpError);
            }
        }

        if (!customer) {
            return NextResponse.json({ success: false, message: "Customer profile not found" }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            customer: customer
        }, {
            headers: {
                'Cache-Control': 'no-store, max-age=0'
            }
        });
    } catch (error: any) {
        console.error("WooCommerce Fetch Customer Error:", error.response?.data || error.message);
        return NextResponse.json({
            success: false,
            message: "Failed to fetch customer profile from WooCommerce"
        }, { 
            status: 500,
            headers: {
                'Cache-Control': 'no-store, max-age=0'
            }
        });
    }
}
