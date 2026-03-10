import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import api from "@/lib/woocommerce";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { productId, rating, review } = body;

        if (!productId || !rating || !review) {
            return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
        }

        // 1. Get current session for security
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.email || !session?.user?.name) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const reviewerName = session.user.name;
        const reviewerEmail = session.user.email;

        // 2. Double-check verification before allowing POST
        // (Optional, but good practice to prevent direct API hits)
        const customerId = (session.user as any).id;
        const ordersResponse = await api.get("orders", {
            customer: customerId,
            status: "completed"
        });
        
        const orders = ordersResponse.data;
        const hasPurchased = orders.some((order: any) => 
            order.line_items.some((item: any) => item.product_id.toString() === productId.toString())
        );

        if (!hasPurchased) {
            return NextResponse.json({ success: false, message: "You must purchase this item to submit a review." }, { status: 403 });
        }

        // 3. Post review to WooCommerce
        const reviewData = {
            product_id: parseInt(productId),
            review: review,
            reviewer: reviewerName,
            reviewer_email: reviewerEmail,
            rating: parseInt(rating),
            verified: true // We already verified them internally
        };

        const response = await api.post("products/reviews", reviewData);

        return NextResponse.json({ 
            success: true, 
            data: response.data,
            message: "Review submitted successfully!"
        });

    } catch (error: any) {
        console.error("Review submission error:", error.response?.data || error.message);
        return NextResponse.json({ 
            success: false, 
            message: error.response?.data?.message || "Failed to submit review." 
        }, { status: 500 });
    }
}
