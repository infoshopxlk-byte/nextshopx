import api from "@/lib/woocommerce";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: any) {
    // Next.js 15: params must be awaited before use
    const params = await context.params;
    const { id } = params;

    const session = await getServerSession(authOptions);
    const email = session?.user?.email;

    if (!id) {
        return NextResponse.json({ success: false, message: "Order ID is required" }, { status: 400 });
    }

    if (!session || !email) {
        return NextResponse.json({ success: false, message: "Unauthorized. Please log in." }, { status: 401 });
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
        }, {
            headers: {
                'Cache-Control': 'no-store, max-age=0'
            }
        });
    } catch (error: any) {
        console.error("WooCommerce Fetch Single Order Error:", error.response?.data || error.message);
        return NextResponse.json({
            success: false,
            message: "Failed to fetch order details or order not found"
        }, { 
            status: 500,
            headers: {
                'Cache-Control': 'no-store, max-age=0'
            }
        });
    }
}
