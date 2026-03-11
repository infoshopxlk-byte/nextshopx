"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import CartActionButtons from "@/app/components/CartActionButtons";
import ChatButton from "@/app/components/ChatButton";

interface AttributeOption {
    name: string;
    options: string[];
}

interface Variation {
    variation_id: number;
    display_price: number;
    display_regular_price: number;
    attributes: Record<string, string>;
    image: { src: string; alt: string; id: number } | null;
    variation_image_src?: string;
    stock_status: string;
    availability_html: string;
    is_in_stock: boolean;
}

interface ProductContextProps {
    product: any;
}

export default function ProductSelector({ product }: ProductContextProps) {
    const isVariable = product.type === "variable";
    const attributes: AttributeOption[] = product.attributes || [];
    const variations: any[] = product.variations_full_data || [];

    const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
    const [selectedVariation, setSelectedVariation] = useState<any | null>(null);

    // Initial load: Main Product fallback
    const [displayPrice, setDisplayPrice] = useState(product.price);
    const [displayRegularPrice, setDisplayRegularPrice] = useState(product.regular_price);
    const [displayImage, setDisplayImage] = useState(product.images?.[0]?.src || null);
    const [stockStatus, setStockStatus] = useState({
        status: product.stock_status,
        qty: product.stock_quantity
    });

    // 1. Sync Selection -> Match -> Display State
    useEffect(() => {
        if (!isVariable || variations.length === 0) return;

        // Find matching variation
        const match = variations.find((v) => {
            return Object.keys(v.attributes).every((attrKey) => {
                const variationValue = v.attributes[attrKey];
                if (variationValue === "") return true; // "Any" option in WooCommerce

                const cleanKey = attrKey.replace("attribute_", "").replace("pa_", "");

                const selectionValue = Object.entries(selectedOptions).find(([k, v]) => {
                    const normalizedK = k.toLowerCase().replace(/\s+/g, '-');
                    return k === cleanKey || normalizedK === cleanKey;
                })?.[1];

                return selectionValue?.toLowerCase() === variationValue.toLowerCase();
            });
        });

        // Exact match check (all required attributes selected)
        const isCompleteMatch = attributes.every(a => !!selectedOptions[a.name]);

        if (match) {
            // IMAGE Logic: Variation Image -> Fallback to Main Image
            const variantImage = match.variation_image_src || (match.image && match.image.src);
            setDisplayImage(variantImage || product.images?.[0]?.src || null);

            if (isCompleteMatch) {
                // PRICE Logic: Directly from selectedVariation.display_price
                setSelectedVariation(match);
                setDisplayPrice(match.display_price);
                setDisplayRegularPrice(match.display_regular_price);
                setStockStatus({
                    status: match.is_in_stock ? 'instock' : 'outofstock',
                    qty: match.max_qty || null
                });
            } else {
                // Partial match: show variant image if found, but reset price/stock to parent
                setSelectedVariation(null);
                setDisplayPrice(product.price);
                setDisplayRegularPrice(product.regular_price);
                setStockStatus({
                    status: product.stock_status,
                    qty: product.stock_quantity
                });
            }
        } else {
            // No match at all
            setSelectedVariation(null);
            setDisplayPrice(product.price);
            setDisplayRegularPrice(product.regular_price);
            setDisplayImage(product.images?.[0]?.src || null);
            setStockStatus({
                status: product.stock_status,
                qty: product.stock_quantity
            });
        }
    }, [selectedOptions, variations, product, isVariable, attributes]);

    // Handle selection interactions (just update options, useEffect handles the rest)
    const handleOptionSelect = (attrName: string, optionTitle: string) => {
        setSelectedOptions(prev => ({ ...prev, [attrName]: optionTitle }));
    };

    return (
        <div className="flex flex-col md:flex-row gap-12 lg:gap-16 w-full">
            {/* Left Column: Product Image (Client-side dynamic) */}
            <div className="flex flex-col space-y-4 w-full md:w-1/2">
                <div className="relative aspect-[4/5] w-full rounded-3xl bg-gray-50 overflow-hidden border border-gray-100 shadow-sm">
                    {displayImage ? (
                        <Image
                            src={displayImage}
                            alt={`Buy ${product.name} on ShopX.lk - Sri Lanka`}
                            fill
                            priority
                            sizes="(max-width: 768px) 100vw, 50vw"
                            className="object-cover"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-400">
                            No Image Available
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column: Details & Selectors */}
            <div className="flex flex-col py-4 w-full md:w-1/2">
                {/* Brand & Categories */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                    {product.brand && product.brand !== 'No Brand' && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-600/10 text-blue-600 text-[10px] font-bold uppercase tracking-wider border border-blue-600/20">
                            {product.brand}
                        </span>
                    )}
                    {product.categories?.map((cat: any) => (
                        <Link
                            key={cat.id}
                            href={`/category/${cat.slug}`}
                            className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-wider hover:bg-gray-200 transition"
                        >
                            {cat.name}
                        </Link>
                    ))}
                </div>

                <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
                    {product.name}
                </h1>

                {/* Price Block */}
                <div className="mb-6 border-b border-gray-100 pb-6">
                    <div className="flex items-baseline mb-2">
                        <span className="text-3xl font-black text-gray-900">
                            Rs. {parseFloat(displayPrice || "0").toLocaleString('en-LK')}
                        </span>
                        {displayRegularPrice && displayRegularPrice !== displayPrice && (
                            <span className="ml-3 text-lg text-gray-400 line-through">
                                Rs. {parseFloat(displayRegularPrice).toLocaleString('en-LK')}
                            </span>
                        )}
                    </div>
                    <div className="text-sm font-bold text-gray-600 mb-2">
                        or 3 x Rs. {((parseFloat(displayPrice || "0") * 1.13) / 3).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} with <span className="text-pink-600 font-black italic tracking-tighter bg-pink-50 px-1.5 py-0.5 rounded border border-pink-100">KOKO</span>
                    </div>
                    <div className="text-sm font-bold text-gray-600 mb-4">
                        or 4 x Rs. {((parseFloat(displayPrice || "0") * 1.13) / 4).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} with <span className="text-indigo-700 font-black tracking-tighter bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">PayZy</span>
                    </div>
                    {product.short_description && (
                        <div
                            className="mt-4 text-sm text-gray-600 prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: product.short_description }}
                        />
                    )}
                </div>

                {/* Variation Selectors */}
                {isVariable && attributes.length > 0 && (
                    <div className="mb-8 space-y-6">
                        {attributes.map((attr) => (
                            <div key={attr.name}>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                                        {attr.name}
                                    </label>
                                    <span className="text-xs text-gray-500 font-medium">
                                        {selectedOptions[attr.name] || "Select an option"}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {attr.options.map((opt) => {
                                        const isSelected = selectedOptions[attr.name] === opt;
                                        return (
                                            <button
                                                key={opt}
                                                onClick={() => handleOptionSelect(attr.name, opt)}
                                                className={`px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all ${isSelected
                                                    ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-600/20"
                                                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                                                    }`}
                                            >
                                                {opt}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mb-6 space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${stockStatus.status === 'instock' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                            {stockStatus.status === 'instock' ? 'In Stock' : 'Out of Stock'}
                            {stockStatus.qty ? ` (${stockStatus.qty} available)` : ''}
                        </span>

                        {product.weight && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-sm font-bold border border-gray-200">
                                <svg className="w-3.5 h-3.5 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                                </svg>
                                {parseFloat(product.weight)} kg
                            </span>
                        )}
                    </div>

                    {/* Seller Info Container - Restored to center-left flow */}
                    {product.wcfm_store_info && product.wcfm_store_info.store_name ? (
                        <div className="flex items-center justify-between border border-gray-100 rounded-xl bg-gray-50 p-4 w-full">
                            <div className="flex items-center">
                                <span className="text-sm text-gray-500 mr-2">Sold by:</span>
                                <Link
                                    href={`/sellers/${product.wcfm_store_info.store_name.toLowerCase().replace(/\s+/g, '-')}`}
                                    className="text-base font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors focus:outline-none"
                                >
                                    {product.wcfm_store_info.store_name}
                                </Link>
                            </div>
                            <ChatButton vendorId={product.wcfm_store_info.vendor_id} storeName={product.wcfm_store_info.store_name} />
                        </div>
                    ) : product.store && product.store.shop_name ? (
                        <div className="flex items-center justify-between border border-gray-100 rounded-xl bg-gray-50 p-4 w-full">
                            <div className="flex items-center">
                                <span className="text-sm text-gray-500 mr-2">Sold by:</span>
                                <Link
                                    href={`/sellers/${product.store.shop_name.toLowerCase().replace(/\s+/g, '-')}`}
                                    className="text-base font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors focus:outline-none"
                                >
                                    {product.store.shop_name}
                                </Link>
                            </div>
                            <ChatButton storeName={product.store.shop_name} />
                        </div>
                    ) : (
                        <div className="flex items-center border border-gray-100 rounded-xl bg-gray-50 p-4 w-full">
                            <span className="text-sm text-gray-500 mr-2">Sold by:</span>
                            <span className="text-base font-semibold text-gray-900">
                                ShopX Direct
                            </span>
                        </div>
                    )}
                </div>

                {/* Cart Action Buttons Context Bridge */}
                <CartActionButtons
                    product={product}
                    variationId={selectedVariation?.variation_id}
                    variationOptions={selectedOptions}
                    disabled={isVariable && !selectedVariation}
                    displayPrice={displayPrice}
                />
            </div>
        </div>
    );
}
