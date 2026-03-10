import api from "@/lib/woocommerce";
import { NextResponse } from "next/server";

export async function GET(request: Request, context: any) {
    // Next.js 15: params must be awaited before use
    const params = await context.params;
    const { id } = params;

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!id) {
        return NextResponse.json({ success: false, message: "Order ID is required" }, { status: 400 });
    }

    if (!email) {
        return NextResponse.json({ success: false, message: "Email is required for authorization" }, { status: 400 });
    }

    try {
        const response = await api.get(`orders/${id}`);
        const order = response.data;

        // Verify ownership securely
        if (order.billing?.email?.toLowerCase() !== email.toLowerCase()) {
            return NextResponse.json({ success: false, message: "Unauthorized. Email does not match the order." }, { status: 403 });
        }

        // Fetch only customer-facing notes 
        const notesResponse = await api.get(`orders/${id}/notes`);
        const notes = notesResponse.data.filter((n: any) => n.customer_note);

        return NextResponse.json({
            success: true,
            order: order,
            notes: notes
        });
    } catch (error: any) {
        console.error("WooCommerce Fetch Single Order Error:", error.response?.data || error.message);
        return NextResponse.json({
            success: false,
            message: "Failed to fetch order details or order not found"
        }, { status: 500 });
    }
}
