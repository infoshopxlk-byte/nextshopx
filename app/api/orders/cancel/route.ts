import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { order_id, reason } = body;

        const session = await getServerSession(authOptions);
        const email = session?.user?.email;

        if (!order_id || !email) {
            return NextResponse.json(
                { success: false, message: "Order ID and active session email are required" },
                { status: 400 }
            );
        }

        const wpUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL;
        if (!wpUrl) {
            throw new Error("Missing NEXT_PUBLIC_WORDPRESS_URL environment variable");
        }

        const response = await fetch(`${wpUrl}/wp-json/shopx/v1/customer/order/cancel`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                order_id: parseInt(order_id),
                email: email,
                reason: reason || "No reason provided",
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { success: false, message: data.message || "Failed to cancel order" },
                { status: response.status }
            );
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Order Cancel Error:", error);
        return NextResponse.json(
            { success: false, message: "An error occurred while cancelling the order" },
            { status: 500 }
        );
    }
}
