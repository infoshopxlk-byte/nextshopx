"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

// Define the shape of a Cart Item based on WooCommerce product data
type CartItem = {
    id: number;
    variation_id?: number | null;
    name: string;
    price: string;
    image?: string;
    quantity: number;
    weight: number;
    selected_options?: Record<string, string>;
    wcfm_store_info?: {
        vendor_id?: string | number;
        store_name?: string;
        phone?: string;
    };
    store?: {
        vendor_id?: string | number;
        shop_name?: string;
        shop_phone?: string;
    };
};

// ... CartContextType updated below ...
interface CartContextType {
    cart: CartItem[];
    addToCart: (product: any, quantity?: number) => void;
    removeFromCart: (productId: number, variationId?: number | null) => void;
    clearCart: () => void;
    cartTotal: number;
    cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);

    // Calculate total price of all items in cart
    const cartTotal = cart.reduce((total, item) => {
        const itemPrice = parseFloat(item.price || "0");
        return total + itemPrice * item.quantity;
    }, 0);

    // Calculate total number of items in cart
    const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

    // Add Item to Cart
    const addToCart = (product: any, quantity: number = 1) => {
        setCart((prevCart) => {
            const vId = product.selected_variation_id || null;

            // Check if item already exists (matching both ID and Variation ID)
            const existingItemIndex = prevCart.findIndex(
                (item) => item.id === product.id && (item.variation_id || null) === vId
            );

            if (existingItemIndex >= 0) {
                const updatedCart = [...prevCart];
                updatedCart[existingItemIndex].quantity += quantity;
                return updatedCart;
            } else {
                // If new, add to cart
                const newItem: CartItem = {
                    id: product.id,
                    variation_id: vId,
                    name: product.name,
                    price: product.price, // Uses the price passed (which should be variation price if selected)
                    weight: parseFloat(product.weight) || 0,
                    image: product.image || (product.images && product.images.length > 0 ? product.images[0].src : undefined),
                    quantity: quantity,
                    selected_options: product.selected_options,
                    wcfm_store_info: product.wcfm_store_info,
                    store: product.store,
                };
                return [...prevCart, newItem];
            }
        });
    };

    // Remove entire item from cart
    const removeFromCart = (productId: number, variationId: number | null = null) => {
        setCart((prevCart) => prevCart.filter(
            (item) => !(item.id === productId && (item.variation_id || null) === variationId)
        ));
    };

    // Clear all items from cart
    const clearCart = () => {
        setCart([]);
    };

    return (
        <CartContext.Provider
            value={{
                cart,
                addToCart,
                removeFromCart,
                clearCart,
                cartTotal,
                cartCount,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

// Custom hook to use the Cart Context
export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
}
