"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

// Define the shape of a Cart Item based on WooCommerce product data
type CartItem = {
    id: number;
    name: string;
    price: string;
    image?: string;
    quantity: number;
};

// Define the Context shape
interface CartContextType {
    cart: CartItem[];
    addToCart: (product: any, quantity?: number) => void;
    removeFromCart: (productId: number) => void;
    clearCart: () => void;
    cartTotal: number;
    cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);

    // Load cart from localStorage on initial render
    useEffect(() => {
        const savedCart = localStorage.getItem("shopx_cart");
        if (savedCart) {
            try {
                setCart(JSON.parse(savedCart));
            } catch (error) {
                console.error("Failed to parse cart from localStorage", error);
            }
        }
        setIsInitialized(true);
    }, []);

    // Save cart to localStorage whenever it changes
    useEffect(() => {
        if (isInitialized) {
            localStorage.setItem("shopx_cart", JSON.stringify(cart));
        }
    }, [cart, isInitialized]);

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
            // Check if item already exists
            const existingItemIndex = prevCart.findIndex((item) => item.id === product.id);

            if (existingItemIndex >= 0) {
                // If exists, update quantity
                const updatedCart = [...prevCart];
                updatedCart[existingItemIndex].quantity += quantity;
                return updatedCart;
            } else {
                // If new, add to cart
                const newItem: CartItem = {
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    image: product.images && product.images.length > 0 ? product.images[0].src : undefined,
                    quantity: quantity,
                };
                return [...prevCart, newItem];
            }
        });
    };

    // Remove entire item from cart by ID
    const removeFromCart = (productId: number) => {
        setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
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
