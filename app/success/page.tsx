"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, ShoppingBag, ArrowRight } from "lucide-react";
import { Suspense } from "react";

function SuccessContent() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get("orderId");

    return (
        <div className="flex min-h-[70vh] flex-col items-center justify-center p-8 text-center space-y-6 max-w-2xl mx-auto">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-4 border-4 border-green-50">
                <CheckCircle className="w-12 h-12 text-green-600" />
            </div>

            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
                Order Confirmed!
            </h1>

            <p className="text-lg text-gray-500 max-w-md">
                Thank you for shopping at ShopX.lk. We have successfully received your order and are preparing it for delivery.
            </p>

            {orderId && (
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 w-full max-w-sm mt-4">
                    <p className="text-sm font-medium text-gray-500 mb-1">Your Order Number</p>
                    <p className="text-2xl font-bold tracking-wider text-gray-900">#{orderId}</p>
                </div>
            )}

            <div className="pt-8 w-full flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                    href="/"
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all active:scale-[0.98]"
                >
                    <ShoppingBag className="w-5 h-5" />
                    Continue Shopping
                </Link>

                <Link
                    href="/account"
                    className="flex-1 flex items-center justify-center gap-2 bg-white text-gray-900 font-bold py-4 px-8 border-2 border-gray-900 rounded-xl hover:bg-gray-50 transition-all active:scale-[0.98]"
                >
                    View My Orders
                    <ArrowRight className="w-5 h-5" />
                </Link>
            </div>
            {/* Support Footer */}
            <p className="mt-8 text-sm text-gray-500">
                Need help? <a href="/contact" className="text-blue-600 font-semibold hover:underline">Contact Support</a>
            </p>

        </div>
    );
}

// NextJS Requires searchParams functionality to be wrapped in a React Suspense Boundary.
export default function SuccessPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-[70vh] flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="mt-6 text-xl font-bold text-gray-900 tracking-tight">Loading your receipt...</p>
            </div>
        }>
            <SuccessContent />
        </Suspense>
    );
}
