"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Product {
    id: number;
    name: string;
    status: string;
    price: string;
    regular_price: string;
    sale_price: string;
    stock_status: string;
    stock_quantity: number | null;
    images: { src: string; alt: string }[];
    sku: string;
    date_created: string;
}

const STATUS_BADGE: Record<string, string> = {
    publish: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    draft: "bg-white/5 text-white/40 border-white/10",
    pending: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    private: "bg-violet-500/15 text-violet-400 border-violet-500/20",
};

const STOCK_BADGE: Record<string, string> = {
    instock: "text-emerald-400",
    outofstock: "text-red-400",
    onbackorder: "text-amber-400",
};

export default function SellerProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem("seller_token");
            const WP = process.env.NEXT_PUBLIC_WORDPRESS_URL;
            if (!token || !WP) {
                setError("Not authenticated.");
                return;
            }
            const res = await fetch(
                `${WP}/wp-json/wc/v3/products?per_page=50&status=any&orderby=date&order=desc`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    cache: "no-store",
                }
            );
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`API error ${res.status}: ${txt.substring(0, 120)}`);
            }
            const data = await res.json();
            setProducts(Array.isArray(data) ? data : []);
        } catch (e: unknown) {
            console.error("Products fetch error:", e);
            setError(e instanceof Error ? e.message : "Failed to load products.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchProducts(); }, [fetchProducts]);

    return (
        <div className="space-y-6 text-white">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Products</h1>
                    <p className="text-sm text-white/40 mt-1">
                        {loading ? "Loading…" : `${products.length} product${products.length !== 1 ? "s" : ""} in your store`}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchProducts}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/60 hover:text-white hover:bg-white/10 transition"
                        id="refresh-products"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                    </button>
                    <Link
                        href="/seller/dashboard/products/add"
                        id="add-product-btn"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-sm font-bold text-white transition shadow-lg shadow-violet-500/20"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Product
                    </Link>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-start gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                </div>
            )}

            {/* Table */}
            <div className="rounded-2xl bg-[#13131f] border border-white/[0.07] overflow-hidden">
                {loading ? (
                    <div className="divide-y divide-white/5">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="px-6 py-4 flex items-center gap-4 animate-pulse">
                                <div className="w-10 h-10 bg-white/5 rounded-lg flex-shrink-0" />
                                <div className="flex-1 space-y-1.5">
                                    <div className="h-3.5 bg-white/5 rounded w-48" />
                                    <div className="h-3 bg-white/5 rounded w-24" />
                                </div>
                                <div className="w-16 h-4 bg-white/5 rounded" />
                                <div className="w-20 h-4 bg-white/5 rounded" />
                                <div className="w-16 h-4 bg-white/5 rounded" />
                            </div>
                        ))}
                    </div>
                ) : products.length === 0 ? (
                    <div className="py-20 text-center">
                        <svg className="w-12 h-12 mx-auto mb-4 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <p className="text-white/30 text-sm mb-4">No products yet</p>
                        <Link
                            href="/seller/dashboard/products/add"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-semibold text-white transition"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add your first product
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm" id="products-table">
                            <thead>
                                <tr className="border-b border-white/5">
                                    {["", "Product", "SKU", "Price", "Stock", "Status", ""].map((h, i) => (
                                        <th key={i} className="px-5 py-3 text-[10px] font-semibold text-white/30 uppercase tracking-widest text-left">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.04]">
                                {products.map((p) => {
                                    const img = p.images?.[0]?.src;
                                    const price = p.sale_price
                                        ? `Rs. ${parseFloat(p.sale_price).toLocaleString("en-LK", { minimumFractionDigits: 2 })}`
                                        : p.regular_price
                                            ? `Rs. ${parseFloat(p.regular_price).toLocaleString("en-LK", { minimumFractionDigits: 2 })}`
                                            : "—";
                                    const isOnSale = !!p.sale_price;
                                    return (
                                        <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                                            {/* Thumbnail */}
                                            <td className="px-5 py-3 w-12">
                                                {img ? (
                                                    <img src={img} alt={p.name} className="w-10 h-10 rounded-lg object-cover border border-white/10" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                                                        <svg className="w-4 h-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </td>
                                            {/* Name */}
                                            <td className="px-5 py-3">
                                                <p className="font-medium text-white line-clamp-1">{p.name}</p>
                                                <p className="text-xs text-white/30 mt-0.5">#{p.id}</p>
                                            </td>
                                            {/* SKU */}
                                            <td className="px-5 py-3 text-white/40 font-mono text-xs">{p.sku || "—"}</td>
                                            {/* Price */}
                                            <td className="px-5 py-3">
                                                <span className="font-semibold text-white">{price}</span>
                                                {isOnSale && (
                                                    <span className="ml-1.5 text-xs text-white/30 line-through">
                                                        Rs. {parseFloat(p.regular_price).toLocaleString("en-LK", { minimumFractionDigits: 2 })}
                                                    </span>
                                                )}
                                            </td>
                                            {/* Stock */}
                                            <td className="px-5 py-3">
                                                <span className={`text-xs font-semibold capitalize ${STOCK_BADGE[p.stock_status] ?? "text-white/40"}`}>
                                                    {p.stock_status === "instock" ? (
                                                        p.stock_quantity != null ? `${p.stock_quantity} in stock` : "In stock"
                                                    ) : p.stock_status === "outofstock" ? "Out of stock" : "Backorder"}
                                                </span>
                                            </td>
                                            {/* Status */}
                                            <td className="px-5 py-3">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${STATUS_BADGE[p.status] ?? "bg-white/5 text-white/40 border-white/10"}`}>
                                                    {p.status}
                                                </span>
                                            </td>
                                            {/* Actions */}
                                            <td className="px-5 py-3">
                                                <Link
                                                    href={`/seller/dashboard/products/edit/${p.id}`}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white/50 hover:text-white transition opacity-0 group-hover:opacity-100"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                    Edit
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
