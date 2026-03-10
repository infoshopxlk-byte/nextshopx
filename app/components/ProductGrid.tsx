"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useState, useEffect } from "react";

interface Product {
    id: number | string;
    name: string;
    slug: string;
    price?: string;
    regular_price?: string;
    on_sale?: boolean;
    images?: { src: string; alt?: string }[];
    store?: { shop_name?: string };
    wcfm_store_info?: { store_name?: string };
}

interface ProductGridProps {
    products: Product[];
    emptyMessage?: string;
}

export default function ProductGrid({ products, emptyMessage = "No products found." }: ProductGridProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Exact structural match for first render to guarantee hydration consistency
    if (!isMounted) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 md:gap-8 lg:gap-10 opacity-0 transition-opacity duration-300">
                {products.map((_, i) => (
                    <div key={i} className="bg-white rounded-xl md:rounded-2xl border border-gray-100 h-[300px]"></div>
                ))}
            </div>
        );
    }

    if (products.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="text-gray-400 font-bold text-lg text-center px-4">{emptyMessage}</div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 md:gap-8 lg:gap-10">
            {products.map((product) => (
                <div
                    key={product.id}
                    className="group bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 flex flex-col h-full relative"
                >
                    {/* Product Image Container */}
                    <div className="relative w-full aspect-square bg-white border-b border-gray-50 overflow-hidden group-hover:bg-gray-50 transition-colors">
                        {/* Badges */}
                        <div className="absolute top-2 left-2 md:top-3 md:left-3 z-10 flex flex-col gap-1">
                            {product.on_sale ? (
                                <div className="bg-white text-red-600 border border-red-100 text-[8px] md:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 md:px-2.5 md:py-1 rounded shadow-sm">
                                    Sale
                                </div>
                            ) : (
                                <div className="bg-white text-gray-900 border border-gray-100 text-[8px] md:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 md:px-2.5 md:py-1 rounded shadow-sm">
                                    New
                                </div>
                            )}
                        </div>

                        {/* Image */}
                        {product.images && product.images.length > 0 ? (
                            <Image
                                src={product.images[0].src}
                                alt={product.images[0].alt || product.name}
                                fill
                                sizes="(max-width: 768px) 50vw, 25vw"
                                className="object-contain p-3 md:p-4 group-hover:scale-105 transition-transform duration-500 ease-out"
                            />
                        ) : (
                            <div className="flex items-center justify-center w-full h-full text-gray-400 font-medium text-xs">
                                No Image
                            </div>
                        )}
                        <Link href={`/product/${product.slug}`} className="absolute inset-0 z-20"></Link>
                    </div>

                    {/* Product Details Container */}
                    <div className="p-3 md:p-5 flex flex-col flex-1 bg-white relative z-30 pointer-events-none">
                        <div className="mb-1 md:mb-2 pointer-events-auto">
                            {/* Vendor Name extracted consistently */}
                            {(product.wcfm_store_info?.store_name || product.store?.shop_name) && (
                                <Link
                                    href={`/sellers/${(product.wcfm_store_info?.store_name || product.store?.shop_name || "").toLowerCase().replace(/\s+/g, '-')}`}
                                    className="text-[10px] md:text-xs font-bold text-gray-500 hover:text-blue-600 transition-colors relative z-40 truncate block"
                                >
                                    {product.wcfm_store_info?.store_name || product.store?.shop_name}
                                </Link>
                            )}
                        </div>

                        <h3 className="text-xs md:text-base font-bold text-gray-900 mb-1.5 md:mb-2 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors pointer-events-auto">
                            <Link href={`/product/${product.slug}`} className="relative z-40">
                                {product.name}
                            </Link>
                        </h3>

                        {/* Pricing and KOKO */}
                        <div className="mt-auto pt-2">
                            <div className="flex items-baseline gap-1.5 flex-wrap">
                                <span suppressHydrationWarning className="text-sm md:text-xl font-black text-gray-900 tracking-tighter">
                                    Rs. {parseFloat(product.price || "0").toLocaleString('en-LK')}
                                </span>
                                {product.regular_price && product.regular_price !== product.price && (
                                    <span className="text-[9px] md:text-xs font-bold text-gray-400 line-through">
                                        {parseFloat(product.regular_price).toLocaleString('en-LK')}
                                    </span>
                                )}
                            </div>
                            {/* KOKO Badge aligned perfectly */}
                            <div suppressHydrationWarning className="text-[9px] md:text-[11px] font-bold text-gray-500 mt-1 md:mt-2 flex flex-wrap items-center gap-1 leading-none">
                                <span>3 x Rs. {((parseFloat(product.price || "0") * 1.13) / 3).toLocaleString('en-LK', { maximumFractionDigits: 0 })} with</span>
                                <span className="text-pink-600 font-black italic tracking-tighter bg-pink-50 px-1 py-0.5 rounded border border-pink-100 leading-none">KOKO</span>
                            </div>

                            {/* PayZy Badge */}
                            <div suppressHydrationWarning className="text-[9px] md:text-[11px] font-bold text-gray-500 mt-1 flex flex-wrap items-center gap-1 leading-none">
                                <span>or 4 x Rs. {((parseFloat(product.price || "0") * 1.13) / 4).toLocaleString('en-LK', { maximumFractionDigits: 0 })} with</span>
                                <span className="text-indigo-700 font-black tracking-tighter bg-indigo-50 px-1 py-0.5 rounded border border-indigo-100 leading-none">PayZy</span>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
