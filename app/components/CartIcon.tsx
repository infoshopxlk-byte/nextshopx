"use client";

import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/app/context/CartContext";

export default function CartIcon() {
    const { cartCount } = useCart();

    return (
        <Link
            href="/cart"
            className="group relative flex flex-col items-center justify-center text-gray-600 hover:text-blue-600 transition-colors"
        >
            <div className="relative">
                <ShoppingCart className="h-6 w-6" />
                {cartCount > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white group-hover:bg-blue-700 transition-colors">
                        {cartCount}
                    </span>
                )}
            </div>
            <span className="mt-1 text-[10px] font-medium uppercase tracking-wider hidden sm:block">
                Cart
            </span>
        </Link>
    );
}
