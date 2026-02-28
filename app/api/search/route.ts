import { NextResponse } from "next/server";
import { searchProducts } from "@/lib/woocommerce";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query) {
        return NextResponse.json({ products: [] });
    }

    try {
        const products = await searchProducts(query);
        // Return only what's needed for the live search dropdown
        const minimalProducts = products.map((p: any) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            price: p.price,
            image: p.images && p.images.length > 0 ? p.images[0].src : null
        })).slice(0, 3); // Top 3 matching products

        return NextResponse.json({ products: minimalProducts });
    } catch (error) {
        console.error("API Search Error:", error);
        return NextResponse.json({ products: [] }, { status: 500 });
    }
}
