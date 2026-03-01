import React from 'react';
import Link from 'next/link';
import { Store, TrendingUp, Users, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function VendorRegistration() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Hero Section */}
            <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-blue-500 opacity-20 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-indigo-500 opacity-20 blur-3xl"></div>

                <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-200 text-xs sm:text-sm font-bold tracking-wide border border-blue-400/30 backdrop-blur-sm">
                            <Store className="w-4 h-4" />
                            JOIN 100+ LOCAL STORES
                        </div>
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight tracking-tight">
                            Grow your business with ShopX.lk
                        </h1>
                        <p className="text-lg sm:text-xl text-blue-100 max-w-lg leading-relaxed">
                            Reach thousands of active customers across Sri Lanka. Set up your online store in minutes and start selling with the lowest commission rates in the market.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl border border-white/20 backdrop-blur-md">
                                <div className="bg-blue-500 rounded-lg p-2">
                                    <TrendingUp className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <div className="text-2xl font-black">Only 5%</div>
                                    <div className="text-xs text-blue-200 font-medium uppercase tracking-wider">Flat Commission</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Registration Form Card */}
                    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-blue-100 text-gray-900 relative">
                        <div className="absolute -top-4 -right-4 bg-green-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg transform rotate-3">
                            Free Trial Available!
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Start Selling Today</h2>
                        <p className="text-gray-500 text-sm mb-6">Create your seller account and launch your store.</p>

                        <form className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">First Name</label>
                                    <input type="text" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="John" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Last Name</label>
                                    <input type="text" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="Doe" required />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Store Name</label>
                                <input type="text" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="e.g. Dream Electronics" required />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Email Address</label>
                                <input type="email" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="john@example.com" required />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number</label>
                                <input type="tel" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="07XXXXXXXX" required />
                            </div>

                            <button type="button" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-md transition-all active:scale-[0.98] mt-4 flex justify-center items-center gap-2 group">
                                Register as Vendor
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>

                            <p className="text-xs text-center text-gray-500 mt-4">
                                By registering, you agree to our <Link href="/seller-terms" className="text-blue-600 hover:underline">Seller Terms & Conditions</Link>.
                            </p>
                        </form>
                    </div>
                </div>
            </div>

            {/* Why Sell With Us Section */}
            <div className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold text-gray-900">Why choose ShopX?</h2>
                    <p className="mt-4 text-gray-500 max-w-2xl mx-auto text-lg">We provide everything you need to manage your business online, backed by our islandwide delivery network.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Feature 1 */}
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-shadow">
                        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6">
                            <Users className="w-7 h-7 text-indigo-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">Massive Audience</h3>
                        <p className="text-gray-500 leading-relaxed">Instantly reach thousands of daily shoppers browsing ShopX for electronics, fashion, and home goods.</p>
                    </div>

                    {/* Feature 2 */}
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-shadow">
                        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6">
                            <TrendingUp className="w-7 h-7 text-emerald-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">Keep More Profit</h3>
                        <p className="text-gray-500 leading-relaxed">Unlike other platforms charging 12-15%, we take a flat 5% commission. You keep the lion's share of your hard work.</p>
                    </div>

                    {/* Feature 3 */}
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-shadow">
                        <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                            <ShieldCheck className="w-7 h-7 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">Secure Payments</h3>
                        <p className="text-gray-500 leading-relaxed">Get paid directly to your bank account weekly. We handle all the payment gateway complexities and COD collections.</p>
                    </div>
                </div>
            </div>

            {/* Simple Steps */}
            <div className="bg-white py-20 px-4 sm:px-6 lg:px-8 border-t border-gray-100">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-gray-900">How it works</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        {['Register Account', 'Upload Products', 'Receive Orders', 'Get Paid Weekly'].map((step, index) => (
                            <div key={index} className="flex flex-col items-center text-center relative">
                                <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-black mb-4 relative z-10 shadow-lg shadow-blue-200">
                                    {index + 1}
                                </div>
                                {/* Connector Line */}
                                {index !== 3 && <div className="hidden md:block absolute top-8 left-1/2 w-full h-[2px] bg-blue-100 -z-0"></div>}
                                <h4 className="text-lg font-bold text-gray-900 mb-2">{step}</h4>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
