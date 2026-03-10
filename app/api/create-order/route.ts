import api from "@/lib/woocommerce";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const orderData = await request.json();

        console.log(`[DEBUG] Attempting to create order to: ${process.env.NEXT_PUBLIC_WORDPRESS_URL}/wp-json/wc/v3/orders`);

        // Securely proxy the payload back to standard WooCommerce API but explicitly flag  
        // WCFM interception headers so the backend Marketplace module validates the payload.
        const response = await api.post("orders", orderData, {
            headers: {
                "WCFM-SYNC": "true"
            }
        });

        return NextResponse.json(
            {
                success: true,
                orderId: response.data.id,
                paymentUrl: response.data.payment_url,
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
