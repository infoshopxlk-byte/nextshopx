import React from 'react';
import Image from 'next/image';
import { Target, Heart, Zap, Globe, Shield, ShoppingBag } from 'lucide-react';

export default function AboutUs() {
    return (
        <div className="min-h-[80vh] bg-white text-gray-900 pb-20 font-sans">
            {/* Hero Header */}
            <div className="bg-gradient-to-br from-blue-50 via-white to-blue-50 py-24 px-4 sm:px-6 lg:px-8 border-b border-gray-100">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-bold tracking-wide mb-6">
                        <Globe className="w-4 h-4" />
                        SRI LANKA'S PREMIER MARKETPLACE
                    </div>
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight tracking-tight text-gray-900 mb-6">
                        Connecting buyers and sellers across the island.
                    </h1>
                    <p className="text-lg sm:text-xl text-gray-500 leading-relaxed max-w-2xl mx-auto">
                        ShopX.lk is more than just a marketplace. We are a digital ecosystem built to empower local Sri Lankan businesses and provide customers with an unparalleled, secure shopping experience.
                    </p>
                </div>
            </div>

            {/* The Story Section */}
            <div className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-3xl font-bold mb-6">Our Story</h2>
                        <div className="space-y-4 text-gray-600 leading-relaxed">
                            <p>
                                Born out of a vision to digitize local commerce, ShopX.lk started with a simple idea: make it incredibly easy for anyone in Sri Lanka to buy and sell authentic products online.
                            </p>
                            <p>
                                We noticed that many local vendors struggled with the high fees and technical complexities of setting up their own e-commerce sites. At the same time, consumers were looking for a unified, trustworthy platform to discover real electronics, fashion, and home goods with guaranteed islandwide delivery.
                            </p>
                            <p>
                                That's why we built ShopX.lk. By keeping our vendor commission at a radical flat 5%, we enable sellers to offer better prices to you, the consumer. It is a win-win cycle that fuels the local economy.
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 rounded-3xl p-6 aspect-square flex flex-col items-center justify-center text-center">
                            <div className="text-4xl font-black text-blue-600 mb-2">100+</div>
                            <div className="text-sm font-bold text-gray-500 uppercase tracking-wider">Verified Vendors</div>
                        </div>
                        <div className="bg-indigo-50 rounded-3xl p-6 aspect-square flex flex-col items-center justify-center text-center mt-8">
                            <div className="text-4xl font-black text-indigo-600 mb-2">50k+</div>
                            <div className="text-sm font-bold text-gray-500 uppercase tracking-wider">Products Listed</div>
                        </div>
                        <div className="bg-emerald-50 rounded-3xl p-6 aspect-square flex flex-col items-center justify-center text-center -mt-8">
                            <div className="text-4xl font-black text-emerald-600 mb-2">99%</div>
                            <div className="text-sm font-bold text-gray-500 uppercase tracking-wider">Happy Customers</div>
                        </div>
                        <div className="bg-pink-50 rounded-3xl p-6 aspect-square flex flex-col items-center justify-center text-center">
                            <div className="text-4xl font-black text-pink-600 mb-2">24/7</div>
                            <div className="text-sm font-bold text-gray-500 uppercase tracking-wider">Active Support</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Core Values */}
            <div className="bg-gray-50 py-24 px-4 sm:px-6 lg:px-8 border-y border-gray-100">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold mb-4">Our Core Values</h2>
                        <p className="text-gray-500 max-w-2xl mx-auto">The principles that guide every decision we make at ShopX.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                                <Shield className="w-6 h-6 text-blue-600" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Absolute Trust</h3>
                            <p className="text-gray-500">We verify every seller and guarantee the authenticity of products sold on our platform to ensure your money is safe.</p>
                        </div>
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-6">
                                <Zap className="w-6 h-6 text-orange-600" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Lightning Fast</h3>
                            <p className="text-gray-500">From our optimized website browsing speeds to our accelerated islandwide delivery partners, we value your time.</p>
                        </div>
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                            <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center mb-6">
                                <Heart className="w-6 h-6 text-rose-600" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Community First</h3>
                            <p className="text-gray-500">By charging only 5% commission, we put the community and local business owners first, helping Sri Lanka grow.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* CTA */}
            <div className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center">
                <h2 className="text-3xl font-bold mb-6">Ready to experience the difference?</h2>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <a href="/category/all" className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-lg active:scale-95">
                        <ShoppingBag className="w-5 h-5" />
                        Start Shopping
                    </a>
                    <a href="/sell" className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 font-bold px-8 py-4 rounded-xl transition-all shadow-sm active:scale-95">
                        Become a Vendor
                    </a>
                </div>
            </div>

        </div>
    );
}
