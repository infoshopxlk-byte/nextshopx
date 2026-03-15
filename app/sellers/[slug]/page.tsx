"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { User, MapPin, Package, Share2, Facebook, Twitter, Instagram, Globe } from "lucide-react";
import ProductGrid from "@/app/components/ProductGrid";

interface Vendor {
    id: number;
    store_name: string;
    slug: string;
    description: string;
    banner: string;
    logo: string;
    email: string;
    social: {
        fb?: string;
        twitter?: string;
        instagram?: string;
        youtube?: string;
    } | any;
    product_count: number;
}

export default function SellerProfilePage() {
    const params = useParams();
    const slug = params?.slug as string;

    const [vendor, setVendor] = useState<Vendor | null>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!slug) return;

        const fetchVendorData = async () => {
            try {
                setLoading(true);
                setError(null);

                // 1. Fetch Vendor Details via Proxy
                // Using the robust backend endpoint /shopx/v1/vendors/{slug}
                const vendorRes = await fetch(`/api/proxy?path=/shopx/v1/store-details/${slug}/&t=${Date.now()}`, {
                    cache: 'no-store'
                });
                const vendorData = await vendorRes.json();

                if (!vendorRes.ok || vendorData.error) {
                    throw new Error(vendorData.message || vendorData.error || "Store not found");
                }
                
                setVendor(vendorData);

                // 2. Fetch Vendor Products via Proxy
                // Using the optimized ShopX vendor-products endpoint
                const productsRes = await fetch(`/api/proxy?path=/shopx/v1/vendor-products/${vendorData.id}/&t=${Date.now()}`);
                if (productsRes.ok) {
                    const productsData = await productsRes.json();
                    if (Array.isArray(productsData)) {
                        setProducts(productsData);
                    }
                }
            } catch (err: any) {
                console.error("Seller profile fetch error:", err);
                setError(err.message || "Failed to load store profile");
            } finally {
                setLoading(false);
            }
        };

        fetchVendorData();
    }, [slug]);

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error || !vendor) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                    <User className="w-10 h-10 text-gray-400" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Oops! Store Not Found</h1>
                <p className="text-gray-500 mb-6 text-center max-w-md">The seller you're looking for might have changed their store name or moved.</p>
                <Link href="/" className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
                    Back to ShopX Home
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white pb-20">
            {/* Hero Section: Banner (Full Width) */}
            <div className="relative h-48 md:h-96 w-full bg-gray-100">
                {vendor.banner ? (
                    <Image
                        src={vendor.banner}
                        alt={vendor.store_name}
                        fill
                        className="object-cover"
                        priority
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-800 opacity-90" />
                )}
                {/* Subtle overlay to make text pop if needed */}
                <div className="absolute inset-0 bg-black/5" />
            </div>

            {/* Profile Section with Overlap UI */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 md:-mt-32 relative z-20">
                <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                    <div className="p-6 md:p-12">
                        <div className="flex flex-col md:flex-row md:items-end gap-8 md:gap-10">
                            {/* Logo Overlapping Banner */}
                            <div className="relative shrink-0">
                                <div className="h-40 w-40 md:h-52 md:w-52 rounded-[2rem] overflow-hidden bg-white shadow-2xl border-4 md:border-8 border-white group">
                                    {vendor.logo ? (
                                        <Image
                                            src={vendor.logo}
                                            alt={vendor.store_name}
                                            fill
                                            className="object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center bg-gray-50 text-gray-300">
                                            <User size={80} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Store Header Details */}
                            <div className="flex-1">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div>
                                        <h1 className="text-4xl md:text-7xl font-black text-gray-900 tracking-tighter mb-4">
                                            {vendor.store_name}
                                        </h1>
                                        <div className="flex flex-wrap items-center gap-5 text-gray-500 font-bold">
                                            <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl">
                                                <Package size={20} className="text-blue-600" />
                                                <span className="text-gray-900">{vendor.product_count || products.length}</span>
                                                <span>Products</span>
                                            </div>
                                            <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl">
                                                <MapPin size={20} className="text-blue-600" />
                                                <span className="text-gray-900">Sri Lanka</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button className="flex-1 md:flex-none px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-black hover:text-white transition-all shadow-xl shadow-blue-200 hover:shadow-gray-200 active:scale-95">
                                            Follow Store
                                        </button>
                                        <button className="p-4 bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-100 hover:text-gray-900 transition-all border border-gray-100 group">
                                            <Share2 size={24} className="group-hover:rotate-12 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Store Info Grid */}
                        <div className="mt-12 pt-12 border-t border-gray-50 grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-20">
                            <div className="lg:col-span-2">
                                <h3 className="text-xl font-black text-gray-900 mb-5 tracking-tight flex items-center gap-3">
                                    <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                                    Store Description
                                </h3>
                                {vendor.description ? (
                                    <div 
                                        className="text-gray-600 leading-loose font-medium prose prose-blue max-w-none text-lg"
                                        dangerouslySetInnerHTML={{ __html: vendor.description }}
                                    />
                                ) : (
                                    <p className="text-gray-400 font-medium italic text-lg leading-loose">
                                        Premium ShopX verified vendor. Explore our curated selection of high-quality products available with easy KOKO installments and official warranty.
                                    </p>
                                )}
                            </div>
                            
                            <div>
                                <h3 className="text-xl font-black text-gray-900 mb-6 tracking-tight flex items-center gap-3">
                                    <span className="w-1.5 h-6 bg-indigo-600 rounded-full"></span>
                                    Connect
                                </h3>
                                <div className="flex flex-col gap-4">
                                    {vendor.social?.fb && (
                                        <a href={vendor.social.fb.startsWith('http') ? vendor.social.fb : `https://${vendor.social.fb}`} target="_blank" className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all font-bold group">
                                            <Facebook size={24} className="group-hover:scale-110 transition-transform" /> 
                                            <span className="flex-1">Facebook</span>
                                        </a>
                                    )}
                                    {vendor.social?.instagram && (
                                        <a href={vendor.social.instagram.startsWith('http') ? vendor.social.instagram : `https://${vendor.social.instagram}`} target="_blank" className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl text-gray-600 hover:text-pink-600 hover:bg-pink-50 transition-all font-bold group">
                                            <Instagram size={24} className="group-hover:scale-110 transition-transform" /> 
                                            <span className="flex-1">Instagram</span>
                                        </a>
                                    )}
                                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl text-gray-600 font-bold border border-transparent">
                                        <Globe size={24} className="text-gray-400" /> 
                                        <span className="flex-1 text-gray-400">Official Store</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Products Grid Section */}
                <div className="mt-24">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
                        <div>
                            <h2 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tighter">
                                Store Catalog
                            </h2>
                            <p className="text-gray-500 mt-3 font-bold text-lg">
                                Discover everything available from {vendor.store_name}
                            </p>
                        </div>
                        <div className="bg-blue-50 text-blue-700 px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest border border-blue-100">
                            {products.length} Products
                        </div>
                    </div>
                    
                    <div className="bg-white p-2 rounded-[2.5rem]">
                        <ProductGrid 
                            products={products} 
                            emptyMessage={`${vendor.store_name} hasn't uploaded any products yet.`} 
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
