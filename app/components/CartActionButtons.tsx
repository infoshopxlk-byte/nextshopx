"use client";

import { useState } from "react";
import { useCart } from "@/app/context/CartContext";
import { useRouter } from "next/navigation";

export default function CartActionButtons({ product }: { product: any }) {
    const { addToCart } = useCart();
    const router = useRouter();
    const [isAdded, setIsAdded] = useState(false);

    const isOutOfStock = product.stock_status !== "instock";

    const handleAddToCart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Button clicked: Add to Cart for product ID', product.id);
        addToCart(product);
        setIsAdded(true);

        // Reset the success state after 2 seconds
        setTimeout(() => {
            setIsAdded(false);
        }, 2000);
    };

    const handleBuyNow = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Button clicked: Buy Now for product ID', product.id);
        addToCart(product);
        router.push("/cart");
    };

    return (
        <div className="mb-8 flex flex-col sm:flex-row gap-4 w-full relative z-50">
            <button
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all active:scale-[0.98] disabled:bg-gray-400 disabled:cursor-not-allowed disabled:active:scale-100"
            >
                {isOutOfStock ? "Out of Stock" : "Buy Now"}
            </button>

            <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`flex-1 font-bold py-4 border-2 rounded-xl transition-all active:scale-[0.98] disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed disabled:active:scale-100 ${isAdded
                    ? "bg-green-50 text-green-700 border-green-500"
                    : "bg-white text-gray-900 border-gray-900 hover:bg-gray-50"
                    }`}
            >
                {isAdded ? "Added to Cart ✓" : "Add to Cart"}
            </button>

            {/* Floating Toast Notification overlay */}
            {isAdded && (
                <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-2xl z-50 transition-opacity">
                    Success: {product.name} added to cart!
                </div>
            )}
        </div>
    );
}
