import { NextRequest, NextResponse } from "next/server";
import api from "@/lib/woocommerce";

/**
 * GET /api/seller/products
 * Fetches products belonging to the authenticated vendor.
 */
export async function GET(req: NextRequest) {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    
    if (!token) {
        return NextResponse.json({ error: "Unauthorized: Missing token" }, { status: 401 });
    }

    try {
        // Decode JWT to get vendor ID
        // Note: In a production environment, you should verify the signature with your secret key.
        const parts = token.split('.');
        if (parts.length !== 3) {
            return NextResponse.json({ error: "Invalid token format" }, { status: 401 });
        }

        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        const vendorId = payload.data?.user?.id;

        if (!vendorId) {
             return NextResponse.json({ error: "Unauthorized: Invalid token payload" }, { status: 401 });
        }

        // Fetch products where author = vendorId
        // This requires the 'woocommerce_rest_product_object_query' filter to be active in WP.
        const response = await api.get("products", {
            author: vendorId,
            status: "any",
            per_page: 100,
            orderby: "date",
            order: "desc"
        });

        return NextResponse.json({ 
            success: true, 
            products: response.data,
            count: response.data.length
        });

    } catch (error: any) {
        console.error("Fetch vendor products error:", error?.response?.data || error.message);
        return NextResponse.json({ 
            error: "Failed to fetch vendor products",
            details: error?.response?.data || error.message 
        }, { status: 500 });
    }
}
