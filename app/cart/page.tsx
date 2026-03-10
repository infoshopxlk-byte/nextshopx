"use client";

import { useCart } from "@/app/context/CartContext";
import Image from "next/image";
import Link from "next/link";
import { Trash2, Plus, Minus, ArrowRight } from "lucide-react";

export default function CartPage() {
    const { cart, removeFromCart, addToCart, cartTotal } = useCart();

    // Fixed shipping rate per unique vendor (Sri Lanka)
    const uniqueVendorsCount = new Set(
        cart.map(item => item.wcfm_store_info?.vendor_id || item.store?.vendor_id || "ShopX Direct")
    ).size;

    // Weight-Based Shipping Logic
    const totalWeight = cart.reduce((total, item) => total + (item.weight * item.quantity), 0);
    const totalBillingKg = Math.max(1, Math.ceil(totalWeight));

    let shippingRate = 0;
    if (cart.length > 0) {
        shippingRate = 400 + (totalBillingKg - 1) * 100;
    }

    const SHIPPING_RATE = shippingRate * uniqueVendorsCount;

    const finalTotal = cartTotal + SHIPPING_RATE;



    // Handle decrementing quantity
    const handleDecrement = (product: any) => {
        // If quantity is 1, decrementing should remove it
        if (product.quantity <= 1) {
            removeFromCart(product.id, product.variation_id);
        } else {
            addToCart({
                ...product,
                selected_variation_id: product.variation_id
            }, -1);
        }
    };

    const handleIncrement = (product: any) => {
        addToCart({
            ...product,
            selected_variation_id: product.variation_id
        }, 1);
    };

    if (cart.length === 0) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center space-y-6">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                </div>
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Your Cart is Empty</h1>
                <p className="text-gray-500 max-w-md">Looks like you haven't added anything to your cart yet. Explore our marketplace to find amazing products.</p>
                <Link href="/" className="rounded-full bg-blue-600 px-8 py-3 font-bold text-white shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all active:scale-95">
                    Start Shopping
                </Link>
            </div>
        );
    }

    return (
        <div className="w-full max-w-6xl mx-auto px-4 py-8 md:py-12">
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight mb-8">Shopping Cart</h1>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

                {/* Left Side: Cart Items List */}
                <div className="lg:col-span-8 flex flex-col space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

                        {/* Table Header (Desktop only) */}
                        <div className="hidden md:grid grid-cols-12 gap-4 p-6 border-b border-gray-50 bg-gray-50/50 text-xs font-bold text-gray-400 uppercase tracking-wider">
                            <div className="col-span-6">Product</div>
                            <div className="col-span-3 text-center">Quantity</div>
                            <div className="col-span-2 text-right">Total</div>
                            <div className="col-span-1"></div>
                        </div>

                        {/* Cart Items */}
                        <ul className="divide-y divide-gray-50">
                            {cart.map((item) => (
                                <li key={item.id} className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 items-center">

                                    {/* Product Info */}
                                    <div className="md:col-span-6 flex items-center space-x-4">
                                        <div className="relative h-20 w-20 md:h-24 md:w-24 rounded-bl-xl rounded-tr-xl bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-100">
                                            {item.image ? (
                                                <Image src={item.image} alt={item.name} fill sizes="96px" className="object-cover" />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">No Image</div>
                                            )}
                                        </div>
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <Link href={`/product/${item.id}`} className="text-base font-bold text-gray-900 hover:text-blue-600 line-clamp-2 transition-colors">
                                                {item.name}
                                            </Link>
                                            {item.selected_options && Object.entries(item.selected_options).length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                    {Object.entries(item.selected_options).map(([k, v]) => (
                                                        <span key={k} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-bold border border-blue-100 uppercase tracking-tighter">
                                                            {k}: {v}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            <span className="mt-1.5 text-sm font-semibold text-gray-500">
                                                Rs. {parseFloat(item.price || "0").toLocaleString('en-LK')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Quantity Controls */}
                                    <div className="md:col-span-3 flex items-center justify-between md:justify-center">
                                        <div className="md:hidden text-sm font-medium text-gray-500">Qty:</div>
                                        <div className="flex items-center border border-gray-200 rounded-full bg-white shadow-sm overflow-hidden">
                                            <button
                                                onClick={() => handleDecrement(item)}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-50 transition-colors"
                                                aria-label="Decrease quantity"
                                            >
                                                <Minus className="w-4 h-4" />
                                            </button>
                                            <span className="w-10 text-center text-sm font-bold text-gray-900">{item.quantity}</span>
                                            <button
                                                onClick={() => handleIncrement(item)}
                                                className="p-2 text-gray-400 hover:text-green-500 hover:bg-gray-50 transition-colors"
                                                aria-label="Increase quantity"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Item Total Price */}
                                    <div className="md:col-span-2 flex items-center justify-between md:justify-end">
                                        <div className="md:hidden text-sm font-medium text-gray-500">Subtotal:</div>
                                        <div className="text-base md:text-lg font-black text-gray-900">
                                            Rs. {(parseFloat(item.price || "0") * item.quantity).toLocaleString('en-LK')}
                                        </div>
                                    </div>

                                    {/* Remove Action */}
                                    <div className="md:col-span-1 flex justify-end">
                                        <button
                                            onClick={() => removeFromCart(item.id, item.variation_id)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                            aria-label="Remove item"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Right Side: Order Summary */}
                <div className="lg:col-span-4 sticky top-24">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 md:p-8 bg-gray-50/50 border-b border-gray-100">
                            <h2 className="text-xl font-extrabold text-gray-900">Order Summary</h2>
                        </div>

                        <div className="p-6 md:p-8 flex flex-col space-y-4">
                            <div className="flex justify-between items-center text-gray-600">
                                <span className="font-medium">Subtotal ({cart.length} items)</span>
                                <span className="font-bold text-gray-900">Rs. {cartTotal.toLocaleString('en-LK')}</span>
                            </div>

                            <div className="flex justify-between items-center text-gray-600 pb-4 border-b border-gray-100">
                                <span className="font-medium flex flex-col">
                                    Shipping (Sri Lanka)
                                    {uniqueVendorsCount > 0 && (
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                                            {uniqueVendorsCount} Vendor{uniqueVendorsCount > 1 ? 's' : ''} (Rs. {shippingRate} each, {totalWeight.toFixed(2)}kg total)
                                        </span>
                                    )}
                                </span>
                                <span className="font-bold text-gray-900">Rs. {SHIPPING_RATE.toLocaleString('en-LK')}</span>
                            </div>

                            <div className="flex justify-between items-end pt-2 mb-6">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-gray-500">Estimated Total</span>
                                </div>
                                <span className="text-3xl font-black text-gray-900">
                                    Rs. {finalTotal.toLocaleString('en-LK')}
                                </span>
                            </div>

                            <Link
                                href="/checkout"
                                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all active:scale-[0.98]"
                            >
                                Proceed to Checkout
                                <ArrowRight className="w-5 h-5" />
                            </Link>

                            <div className="mt-4 text-center">
                                <Link href="/" className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                                    or Continue Shopping
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Trust badges could go here */}
                    <div className="mt-6 flex items-center justify-center space-x-4 text-xs font-medium text-gray-400">
                        <span>Secure Checkout</span>
                        <span>•</span>
                        <span>Free Returns</span>
                    </div>
                </div>

            </div>
        </div>
    );
}
