import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import api from "@/lib/woocommerce";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const productId = searchParams.get("productId");

        if (!productId) {
            return NextResponse.json({ canReview: false, message: "Product ID is required" }, { status: 400 });
        }

        // 1. Get current session
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.email || !(session.user as any).id) {
            return NextResponse.json({ canReview: false, message: "Unauthorized" }, { status: 401 });
        }

        const customerId = (session.user as any).id;

        // 2. Fetch completed orders for this specific customer
        const ordersResponse = await api.get("orders", {
            customer: customerId,
            status: "completed",
            per_page: 100 // Adjust if they have massive order histories
        });

        const orders = ordersResponse.data;

        // 3. Scan orders for the product
        let hasPurchased = false;

        for (const order of orders) {
            const hasItem = order.line_items.some((item: any) => item.product_id.toString() === productId);
            if (hasItem) {
                hasPurchased = true;
                break;
            }
        }

        return NextResponse.json({ 
            canReview: hasPurchased,
            message: hasPurchased ? "Verified Buyer" : "You must purchase this item to review it."
        });

    } catch (error) {
        console.error("Review verification error:", error);
        return NextResponse.json({ canReview: false, message: "Internal Server Error" }, { status: 500 });
    }
}
