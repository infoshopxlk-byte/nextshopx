import { NextRequest, NextResponse } from "next/server";

const WP = process.env.NEXT_PUBLIC_WORDPRESS_URL;

export async function GET(req: NextRequest) {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Fetch WCFM vendor orders & commission data via WP REST
        const [ordersRes, commissionRes] = await Promise.all([
            fetch(`${WP}/wp-json/shopx/v1/seller/stats?type=orders`, {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store",
            }),
            fetch(`${WP}/wp-json/shopx/v1/seller/stats?type=commission`, {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store",
            }),
        ]);

        const [orders, commission] = await Promise.all([
            ordersRes.ok ? ordersRes.json() : { data: [] },
            commissionRes.ok ? commissionRes.json() : { data: {} },
        ]);

        return NextResponse.json({ orders: orders.data ?? [], commission: commission.data ?? {} });
    } catch (e) {
        console.error("Seller stats fetch error:", e);
        return NextResponse.json({ orders: [], commission: {} });
    }
}
