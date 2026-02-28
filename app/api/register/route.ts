import api from "@/lib/woocommerce";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { email, first_name, last_name, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ success: false, message: "Email and password are required" }, { status: 400 });
        }

        // Create the customer in WooCommerce
        const response = await api.post("customers", {
            email,
            first_name,
            last_name,
            password,
            username: email.split('@')[0], // Use email prefix as username
        });

        return NextResponse.json({
            success: true,
            customer: response.data,
            message: "Account created successfully!"
        }, { status: 201 });

    } catch (error: any) {
        console.error("WooCommerce Customer Creation Error:", error.response?.data || error.message);

        // Handle "Email already exists" error from WooCommerce
        const errorMessage = error.response?.data?.message || "Failed to create account. Please try again.";
        const isEmailExists = errorMessage.toLowerCase().includes("email already exists") || error.response?.data?.code === "registration-error-email-exists";

        return NextResponse.json({
            success: false,
            message: isEmailExists ? "This email is already registered. Please try logging in." : errorMessage
        }, { status: error.response?.status || 500 });
    }
}
