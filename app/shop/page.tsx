"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Filter, Search, ChevronDown, Check, X } from "lucide-react";
import ProductGrid from "@/app/components/ProductGrid";

const WP = process.env.NEXT_PUBLIC_WORDPRESS_URL || "https://shopx.lk";

interface Category {
    id: number;
    name: string;
    slug: string;
    count: number;
}

function ShopContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    
    // Filters State
    const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "");
    const [priceRange, setPriceRange] = useState({ min: searchParams.get("min_price") || "", max: searchParams.get("max_price") || "" });
    const [selectedColor, setSelectedColor] = useState(searchParams.get("color") || "");
    const [selectedBrand, setSelectedBrand] = useState(searchParams.get("brand") || "");
    
    const [loading, setLoading] = useState(true);
    const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

    // Fetch Categories
    useEffect(() => {
        fetch(`${WP}/wp-json/shopx/v1/categories`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setCategories(data.data.filter((c: any) => c.count > 0)); // Only show categories with products
                }
            })
            .catch(console.error);
    }, []);

    // Fetch Products based on filters
    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                const query: any = {
                    status: "publish",
                    per_page: 50,
                };
                
                if (selectedCategory) query.category = selectedCategory;
                if (priceRange.min) query.min_price = priceRange.min;
                if (priceRange.max) query.max_price = priceRange.max;
                // Color and Brand are custom taxonomies/attributes, WC REST API supports them via 'attribute' and 'attribute_term'
                // This requires correct slug matching. We'll skip deep integration of custom attributes in this simplified call unless mapped.

                const params = new URLSearchParams(query);
                const response = await fetch(`/api/products?${params.toString()}`);
                
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                
                const data = await response.json();
                setProducts(data);
            } catch (error) {
                console.error("Error fetching products:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [selectedCategory, priceRange, selectedBrand, selectedColor]);

    // Sync URL when filters change
    const updateURL = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
             params.set(key, value);
        } else {
             params.delete(key);
        }
        router.push(`/shop?${params.toString()}`, { scroll: false });
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                
                {/* Mobile Filter Toggle */}
                <div className="md:hidden flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold text-white">Shop</h1>
                    <button 
                        onClick={() => setIsMobileFiltersOpen(true)}
                        className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl text-white text-sm"
                    >
                        <Filter className="w-4 h-4" /> Filters
                    </button>
                </div>

                {/* Sidebar Filters */}
                <div className={`
                    fixed md:relative inset-0 z-50 md:z-0 bg-[#0a0a0a] md:bg-[#13131f] p-6 md:rounded-3xl
                    transition-transform duration-300 ease-in-out
                    ${isMobileFiltersOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
                    md:col-span-1 space-y-8 h-full md:h-auto overflow-y-auto md:overflow-visible
                `}>
                        <div className="flex md:hidden justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">Filters</h2>
                            <button onClick={() => setIsMobileFiltersOpen(false)} className="p-2 bg-white/10 rounded-full text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        {/* Categories */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Categories</h3>
                            <div className="space-y-2">
                                <button 
                                    onClick={() => { setSelectedCategory(""); updateURL("category", ""); }}
                                    className={`block text-sm transition ${!selectedCategory ? "text-violet-400 font-medium" : "text-white/70 hover:text-white"}`}
                                >
                                    All Categories
                                </button>
                                {categories.map(c => (
                                    <button 
                                        key={c.id}
                                        onClick={() => { setSelectedCategory(c.id.toString()); updateURL("category", c.id.toString()); }}
                                        className={`block text-sm transition ${selectedCategory === c.id.toString() ? "text-violet-400 font-medium" : "text-white/70 hover:text-white"}`}
                                    >
                                        {c.name} <span className="text-white/30 text-xs ml-1">({c.count})</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Price Range */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Price (Rs.)</h3>
                            <div className="flex items-center gap-3">
                                <input 
                                    type="number" 
                                    placeholder="Min" 
                                    value={priceRange.min}
                                    onChange={e => {
                                        setPriceRange(prev => ({ ...prev, min: e.target.value }));
                                        updateURL("min_price", e.target.value);
                                    }}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                                />
                                <span className="text-white/30">-</span>
                                <input 
                                    type="number" 
                                    placeholder="Max" 
                                    value={priceRange.max}
                                    onChange={e => {
                                        setPriceRange(prev => ({ ...prev, max: e.target.value }));
                                        updateURL("max_price", e.target.value);
                                    }}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                                />
                            </div>
                        </div>

                        {/* Color (Dummy for UI demonstration since WC variation filtering is complex) */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Color</h3>
                            <div className="flex flex-wrap gap-2">
                                {['Black', 'White', 'Red', 'Blue', 'Green'].map(color => (
                                    <button
                                        key={color}
                                        onClick={() => {
                                            const newColor = selectedColor === color ? "" : color;
                                            setSelectedColor(newColor);
                                            updateURL("color", newColor);
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                                            selectedColor === color 
                                                ? "bg-white/20 border-white/30 text-white" 
                                                : "bg-transparent border-white/10 text-white/60 hover:bg-white/5"
                                        }`}
                                    >
                                        {color}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Brand */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Brand</h3>
                            <div className="space-y-2">
                                {['No Brand', 'Nike', 'Adidas', 'Sony', 'Samsung'].map(brand => (
                                    <label key={brand} className="flex items-center gap-3 cursor-pointer group">
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition ${selectedBrand === brand ? 'bg-violet-500 border-violet-500' : 'border-white/20 group-hover:border-white/40'}`}>
                                            {selectedBrand === brand && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            className="hidden" 
                                            checked={selectedBrand === brand}
                                            onChange={() => {
                                                const newBrand = selectedBrand === brand ? "" : brand;
                                                setSelectedBrand(newBrand);
                                                updateURL("brand", newBrand);
                                            }}
                                        />
                                        <span className={`text-sm transition ${selectedBrand === brand ? 'text-white' : 'text-white/60 group-hover:text-white/80'}`}>{brand}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Product Grid Area */}
                    <div className="md:col-span-3">
                        <div className="hidden md:flex justify-between items-center mb-8">
                            <h1 className="text-3xl font-bold text-white tracking-tight">Shop All Products</h1>
                            <div className="text-sm text-white/40">
                                {products.length} Products Found
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin"></div>
                            </div>
                        ) : products.length > 0 ? (
                            <div className="w-full">
                                <ProductGrid products={products} emptyMessage="No products found matching your filters." />
                            </div>
                        ) : (
                            <div className="text-center py-24 bg-[#13131f] border border-white/5 rounded-3xl">
                                <Search className="w-12 h-12 text-white/10 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-white mb-2">No products found</h3>
                                <p className="text-sm text-white/40 max-w-sm mx-auto">Try adjusting your filters or browsing all categories to find what you're looking for.</p>
                                <button 
                                    onClick={() => {
                                        setSelectedCategory("");
                                        setPriceRange({min:"", max:""});
                                        setSelectedBrand("");
                                        setSelectedColor("");
                                        router.push("/shop");
                                    }}
                                    className="mt-6 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition"
                                >
                                    Clear all filters
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
    );
}

export default function ShopPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center pt-20">
                <div className="w-8 h-8 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin"></div>
            </div>
        }>
            <ShopContent />
        </Suspense>
    );
}
