import api from "@/lib/woocommerce";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
        return NextResponse.json({ success: false, message: "Email is required" }, { status: 400 });
    }

    try {
        // Fetch orders filtered by the customer's email
        const response = await api.get("orders", {
            email: email,
            per_page: 20,
            orderby: "date",
            order: "desc"
        });

        // We can enrich the line items with vendor info if needed, 
        // but WooCommerce often includes some metadata. 
        // WCFM usually injects vendor data into line items or provides a separate endpoint.
        // For now, we'll return the orders as is.

        return NextResponse.json({
            success: true,
            orders: response.data
        });
    } catch (error: any) {
        console.error("WooCommerce Fetch Orders Error:", error.response?.data || error.message);
        return NextResponse.json({
            success: false,
            message: "Failed to fetch orders from WooCommerce"
        }, { status: 500 });
    }
}
