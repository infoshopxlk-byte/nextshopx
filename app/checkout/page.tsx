"use client";

import { useState, useEffect } from "react";
import { useCart } from "@/app/context/CartContext";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import {
    ShoppingBag,
    ArrowLeft,
    Loader2,
    ShieldCheck,
    Truck,
    CreditCard,
    CheckCircle2,
    Lock,
    ChevronRight,
    AlertCircle
} from "lucide-react";

export default function CheckoutPage() {
    const { cart, cartTotal, clearCart } = useCart();
    const router = useRouter();
    const { data: session } = useSession();

    // Shipping cost constant
    const SHIPPING_RATE = 350;
    const baseTotal = cartTotal + (cart.length > 0 ? SHIPPING_RATE : 0);

    // Form & Payment State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [paymentMethod, setPaymentMethod] = useState("cod");

    // KOKO Markup Calculation (13%)
    const finalTotal = paymentMethod === "koko" ? baseTotal * 1.13 : baseTotal;
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        address: "",
        city: "",
        phone: "",
        email: "",
        zip: "",
    });

    // Auto-fill form if user is logged in
    useEffect(() => {
        if (session?.user) {
            const nameParts = session.user.name?.split(" ") || ["", ""];
            setFormData(prev => ({
                ...prev,
                firstName: nameParts[0] || "",
                lastName: nameParts.slice(1).join(" ") || "",
                email: session.user?.email || "",
            }));
        }
    }, [session]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleCheckout = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Basic Validation Check
        if (cart.length === 0) {
            setError("Your cart is empty. Please add items before checking out.");
            return;
        }

        if (
            !formData.firstName ||
            !formData.lastName ||
            !formData.address ||
            !formData.city ||
            !formData.phone ||
            !formData.email
        ) {
            setError("Please fill out all shipping details.");
            return;
        }

        setIsSubmitting(true);

        try {
            // Structure WooCommerce order data payload
            // Structure WooCommerce order data payload
            const load = {
                payment_method: paymentMethod,
                payment_method_title:
                    paymentMethod === "cod" ? "Cash on Delivery" :
                        paymentMethod === "genie" ? "Visa / Master (Genie Business)" :
                            paymentMethod === "koko" ? "Paykoko" : "Payzy",
                set_paid: false,
                billing: {
                    first_name: formData.firstName,
                    last_name: formData.lastName,
                    address_1: formData.address,
                    city: formData.city,
                    country: "LK",
                    email: formData.email,
                    phone: formData.phone,
                },
                shipping: {
                    first_name: formData.firstName,
                    last_name: formData.lastName,
                    address_1: formData.address,
                    city: formData.city,
                    country: "LK",
                },
                line_items: cart.map((item) => ({
                    product_id: item.id,
                    quantity: item.quantity,
                })),
                shipping_lines: [
                    {
                        method_id: "flat_rate",
                        method_title: "Standard Island-wide Delivery",
                        total: SHIPPING_RATE.toString(),
                    },
                ],
            };

            // Call our internal Next.js API Route handler that securely proxies to WooCommerce
            const response = await fetch("/api/create-order", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(load),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to create order");
            }

            // Handle Post-Order Logic (Redirection for non-COD)
            if (paymentMethod !== "cod" && data.paymentUrl) {
                // Redirect to External Payment Gateway (Genie, Koko, PayZy)
                window.location.href = data.paymentUrl;
                return;
            }

            // For COD or if no redirection URL is provided, go to success page
            // Clear the CartContext successfully!
            clearCart();

            // Redirect to the success celebration page with WooCommerce Order ID
            router.push(`/success?orderId=${data.orderId}`);

        } catch (err: any) {
            console.error("Checkout submission failed:", err);
            setError(err.message || "Something went wrong while placing your order. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // If cart is completely clean, prompt back to store
    if (cart.length === 0 && !isSubmitting) {
        return (
            <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center space-y-6">
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Checkout</h1>
                <p className="text-gray-500 max-w-md">Your cart is completely empty, so you cannot checkout yet.</p>
                <Link href="/cart" className="rounded-full bg-blue-600 px-8 py-3 font-bold text-white shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all active:scale-95">
                    Return to Cart
                </Link>
            </div>
        );
    }

    return (
        <div className="w-full max-w-6xl mx-auto px-4 py-8 md:py-12">
            {/* Breadcrumbs */}
            <div className="mb-8 flex items-center space-x-2 text-sm text-gray-500 font-medium">
                <Link href="/cart" className="hover:text-blue-600">Cart</Link>
                <ChevronRight className="w-4 h-4" />
                <span className="text-gray-900">Checkout</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight mb-8">Secure Checkout</h1>

            {error && (
                <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-red-800 font-medium">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                {/* Left Side: Shipping Form */}
                <div className="lg:col-span-7">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 md:p-8 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm">1</span>
                                Shipping Details
                            </h2>
                        </div>

                        <form id="checkout-form" onSubmit={handleCheckout} className="p-6 md:p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label htmlFor="firstName" className="block text-sm font-bold text-gray-700">First Name</label>
                                    <input
                                        type="text"
                                        id="firstName"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleInputChange}
                                        className="w-full rounded-xl border border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 bg-white focus:bg-gray-50 transition-colors text-gray-900 placeholder-gray-400"
                                        placeholder="John"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="lastName" className="block text-sm font-bold text-gray-700">Last Name</label>
                                    <input
                                        type="text"
                                        id="lastName"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleInputChange}
                                        className="w-full rounded-xl border border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 bg-white focus:bg-gray-50 transition-colors text-gray-900 placeholder-gray-400"
                                        placeholder="Doe"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="email" className="block text-sm font-bold text-gray-700">Email Address</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className="w-full rounded-xl border border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 bg-white focus:bg-gray-50 transition-colors text-gray-900 placeholder-gray-400"
                                    placeholder="john@example.com"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="phone" className="block text-sm font-bold text-gray-700">Phone Number</label>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    className="w-full rounded-xl border border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 bg-white focus:bg-gray-50 transition-colors text-gray-900 placeholder-gray-400"
                                    placeholder="07X XXX XXXX"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="address" className="block text-sm font-bold text-gray-700">Street Address</label>
                                <input
                                    type="text"
                                    id="address"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    className="w-full rounded-xl border border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 bg-white focus:bg-gray-50 transition-colors text-gray-900 placeholder-gray-400"
                                    placeholder="123 Main Street, Apt 4B"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label htmlFor="city" className="block text-sm font-bold text-gray-700">City / District</label>
                                    <input
                                        type="text"
                                        id="city"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleInputChange}
                                        className="w-full rounded-xl border border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 bg-white focus:bg-gray-50 transition-colors text-gray-900 placeholder-gray-400"
                                        placeholder="Colombo"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="country" className="block text-sm font-bold text-gray-500">Country</label>
                                    <input
                                        type="text"
                                        id="country"
                                        disabled
                                        value="Sri Lanka"
                                        className="w-full rounded-xl border-gray-100 bg-gray-50 p-3 border text-gray-400 cursor-not-allowed"
                                    />
                                </div>
                            </div>

                        </form>

                        {/* Payment Method Section */}
                        <div className="p-6 md:p-8 border-t border-gray-100 bg-gray-50/50">
                            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2 mb-6">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm">2</span>
                                Payment Method
                            </h2>

                            <div className="space-y-4">
                                {/* Cash on Delivery */}
                                <label className={`flex items-start gap-4 p-4 bg-white rounded-xl border-2 transition-all cursor-pointer ${paymentMethod === 'cod' ? 'border-blue-500 shadow-md ring-1 ring-blue-500/10' : 'border-gray-100 hover:border-gray-200'}`}>
                                    <input
                                        type="radio"
                                        name="payment_method"
                                        value="cod"
                                        checked={paymentMethod === 'cod'}
                                        onChange={() => setPaymentMethod('cod')}
                                        className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold text-gray-900 text-base">Cash on Delivery (COD)</span>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Default</span>
                                        </div>
                                        <p className="text-sm text-gray-500 leading-relaxed font-medium">Pay securely in cash at your doorstep upon delivery.</p>
                                    </div>
                                </label>

                                {/* Visa / Master (Genie) */}
                                <label className={`flex items-start gap-4 p-4 bg-white rounded-xl border-2 transition-all cursor-pointer ${paymentMethod === 'genie' ? 'border-blue-500 shadow-md ring-1 ring-blue-500/10' : 'border-gray-100 hover:border-gray-200'}`}>
                                    <input
                                        type="radio"
                                        name="payment_method"
                                        value="genie"
                                        checked={paymentMethod === 'genie'}
                                        onChange={() => setPaymentMethod('genie')}
                                        className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold text-gray-900 text-base">Visa / Master / Amex</span>
                                            <div className="flex items-center gap-1 bg-sky-50 px-2 py-0.5 rounded text-[10px] font-bold text-sky-700">
                                                <span>Powered by Genie Business</span>
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-500 leading-relaxed font-medium">Pay with your Credit or Debit card via Sri Lanka's leading gateway.</p>
                                    </div>
                                </label>

                                {/* Paykoko */}
                                <label className={`flex items-start gap-4 p-4 bg-white rounded-xl border-2 transition-all cursor-pointer ${paymentMethod === 'koko' ? 'border-blue-500 shadow-md ring-1 ring-blue-500/10' : 'border-gray-100 hover:border-gray-200'}`}>
                                    <input
                                        type="radio"
                                        name="payment_method"
                                        value="koko"
                                        checked={paymentMethod === 'koko'}
                                        onChange={() => setPaymentMethod('koko')}
                                        className="mt-1 h-4 w-4 text-pink-600 border-gray-300 focus:ring-pink-500"
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold text-gray-900 text-base">Paykoko (Installments)</span>
                                            <div className="flex items-center gap-1.5 bg-pink-50 px-2 py-1 rounded text-[11px] font-black italic text-pink-600 border border-pink-100">
                                                KOKO
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-500 leading-relaxed font-medium">Split your payment into 3 interest-free installments. (Total includes 13% convenience fee).</p>
                                    </div>
                                </label>

                                {/* Payzy */}
                                <label className={`flex items-start gap-4 p-4 bg-white rounded-xl border-2 transition-all cursor-pointer ${paymentMethod === 'payzy' ? 'border-blue-500 shadow-md ring-1 ring-blue-500/10' : 'border-gray-100 hover:border-gray-200'}`}>
                                    <input
                                        type="radio"
                                        name="payment_method"
                                        value="payzy"
                                        checked={paymentMethod === 'payzy'}
                                        onChange={() => setPaymentMethod('payzy')}
                                        className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold text-gray-900 text-base">Payzy</span>
                                            <div className="flex items-center gap-1.5 bg-indigo-50 px-2 py-1 rounded text-[11px] font-black tracking-tighter text-indigo-700 border border-indigo-100">
                                                PayZy
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-500 leading-relaxed font-medium">Fast and secure local mobile payments.</p>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Order Review */}
                <div className="lg:col-span-5 sticky top-24">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 md:p-8 bg-gray-50/50 border-b border-gray-100">
                            <h2 className="text-xl font-extrabold text-gray-900 flex justify-between items-center">
                                Order Review
                                <span className="text-sm font-medium px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-700">
                                    {cart.length} items
                                </span>
                            </h2>
                        </div>

                        <div className="p-6 md:p-8">
                            {/* Product List */}
                            <ul className="divide-y divide-gray-100 mb-6">
                                {cart.map((item) => (
                                    <li key={item.id} className="py-4 flex gap-4">
                                        <div className="relative h-16 w-16 rounded-xl bg-gray-50 flex-shrink-0 overflow-hidden border border-gray-100">
                                            {item.image ? (
                                                <Image src={item.image} alt={item.name} fill sizes="64px" className="object-cover" />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">No Image</div>
                                            )}
                                            <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-[10px] font-bold text-white z-10">
                                                {item.quantity}
                                            </span>
                                        </div>
                                        <div className="flex-1 flex flex-col min-w-0">
                                            <span className="text-sm font-bold text-gray-900 line-clamp-2 leading-tight">
                                                {item.name}
                                            </span>
                                            <span className="mt-1 text-sm font-semibold text-gray-500">
                                                Rs. {(parseFloat(item.price || "0") * item.quantity).toLocaleString('en-LK')}
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>

                            {/* Cost Summary */}
                            <div className="flex flex-col space-y-3 pt-4 border-t border-gray-100">
                                <div className="flex justify-between items-center text-gray-500 text-sm font-medium">
                                    <span>Subtotal</span>
                                    <span className="text-gray-900">Rs. {cartTotal.toLocaleString('en-LK')}</span>
                                </div>

                                <div className="flex justify-between items-center text-gray-500 text-sm font-medium">
                                    <span>Shipping</span>
                                    <span className="text-gray-900">Rs. {SHIPPING_RATE.toLocaleString('en-LK')}</span>
                                </div>

                                <div className="flex justify-between items-end pt-4 mt-2 border-t border-gray-100">
                                    <span className="text-base font-bold text-gray-900">Total</span>
                                    <span className="text-3xl font-black text-blue-600">
                                        Rs. {finalTotal.toLocaleString('en-LK')}
                                    </span>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                form="checkout-form"
                                disabled={isSubmitting || cart.length === 0}
                                className="mt-8 w-full flex items-center justify-center gap-2 bg-gray-900 text-white font-black py-4 rounded-xl shadow-lg hover:bg-black hover:shadow-xl transition-all active:scale-[0.98] disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed disabled:active:scale-100 disabled:shadow-none"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    paymentMethod === "cod" ? "Place Order (COD)" :
                                        paymentMethod === "genie" ? "Confirm & Pay with Card" :
                                            `Pay with ${paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)}`
                                )}
                            </button>

                            <p className="mt-4 text-center text-xs text-gray-500 font-medium">
                                By placing this order, you agree to our Terms of Service & Privacy Policy.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
