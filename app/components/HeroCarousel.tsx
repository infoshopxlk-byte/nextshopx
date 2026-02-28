"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, EffectFade } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/effect-fade";
import Link from "next/link";

export default function HeroCarousel() {
    return (
        <div className="w-full relative shadow-sm rounded-2xl overflow-hidden mt-2 mb-12 border border-gray-100">
            <Swiper
                modules={[Autoplay, Pagination, EffectFade]}
                effect="fade"
                pagination={{ clickable: true }}
                autoplay={{ delay: 5000, disableOnInteraction: false }}
                className="w-full h-[400px] md:h-[450px]"
            >
                {/* Slide 1: Multi-Vendor Recruitment Banner */}
                <SwiperSlide>
                    <div className="w-full h-full bg-gradient-to-r from-blue-50 to-white relative flex items-center">
                        <div className="relative z-20 w-full px-6 md:px-16 flex items-center justify-between">
                            <div className="max-w-2xl space-y-4 md:space-y-6">
                                <div className="inline-block px-3 py-1 rounded-full bg-blue-600 text-white text-[10px] sm:text-xs md:text-sm font-bold tracking-wide shadow-sm">
                                    Sell on ShopX - Only 5% Commission!
                                </div>
                                <h2 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-black text-gray-900 leading-tight tracking-tight">
                                    Grow Your Business with ShopX.lk
                                </h2>
                                <p className="text-gray-600 text-sm sm:text-base md:text-xl font-medium line-clamp-2 sm:line-clamp-none">
                                    Reach thousands of customers islandwide. Join the fastest growing marketplace today.
                                </p>
                                <div className="pt-2 w-full flex flex-col sm:flex-row gap-3">
                                    <Link href="/become-a-seller" className="inline-block px-6 py-3 md:px-8 md:py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 text-center text-sm md:text-base">
                                        Start Selling
                                    </Link>
                                    <Link href="#latest-arrivals" className="inline-block px-6 py-3 md:px-8 md:py-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 font-bold rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95 text-center text-sm md:text-base">
                                        Shop Now
                                    </Link>
                                </div>
                            </div>

                            {/* Graphical Element */}
                            <div className="hidden lg:flex w-1/3 justify-end pr-8">
                                <div className="w-72 h-72 bg-white rounded-[2rem] relative overflow-hidden shadow-2xl rotate-6 transform p-6 flex flex-col justify-center items-center border border-gray-100">
                                    <div className="flex -space-x-4 mb-4">
                                        <div className="w-16 h-16 rounded-full bg-blue-100 border-4 border-white flex items-center justify-center text-2xl shadow-sm">👨‍💼</div>
                                        <div className="w-16 h-16 rounded-full bg-emerald-100 border-4 border-white flex items-center justify-center text-2xl shadow-sm">👩‍💻</div>
                                        <div className="w-16 h-16 rounded-full bg-purple-100 border-4 border-white flex items-center justify-center text-2xl shadow-sm">📦</div>
                                    </div>
                                    <div className="text-xl font-black text-gray-900 text-center">Join 100+<br />Local Stores</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </SwiperSlide>

                {/* Slide 2: Customer Promo */}
                <SwiperSlide>
                    <div className="w-full h-full bg-gradient-to-r from-gray-100 to-white relative flex items-center">
                        <div className="relative z-20 w-full px-6 md:px-16">
                            <div className="max-w-xl space-y-4 md:space-y-6">
                                <div className="inline-block px-3 py-1 rounded-full bg-gray-900 text-white text-[10px] sm:text-xs md:text-sm font-bold tracking-wide">
                                    Islandwide Delivery Guaranteed
                                </div>
                                <h2 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-black text-gray-900 leading-tight tracking-tight">
                                    Discover Amazing Products
                                </h2>
                                <p className="text-gray-600 text-sm sm:text-base md:text-xl font-medium line-clamp-2 sm:line-clamp-none">
                                    100% Genuine, Warranty Covered, and Easy Returns. Find the best tech products.
                                </p>
                                <div className="pt-2">
                                    <Link href="#latest-arrivals" className="inline-block px-6 py-3 md:px-8 md:py-4 bg-gray-900 hover:bg-black text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 text-center text-sm md:text-base">
                                        Explore Arrivals
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </SwiperSlide>
            </Swiper>
        </div>
    );
}
