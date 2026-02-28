import api from "@/lib/woocommerce";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const orderData = await request.json();

        // Conditional status based on payment method
        // COD orders go to "processing" immediately, others start as "pending"
        orderData.status = orderData.payment_method === "cod" ? "processing" : "pending";

        // Securely proxy the payload back to WooCommerce API using the initialized instance 
        // which has access to the isolated Server Environment Variables.
        const response = await api.post("orders", orderData);

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
