"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, Search, X, Check } from "lucide-react";
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
    const [inStock, setInStock] = useState(searchParams.get("in_stock") === "true");
    
    const [loading, setLoading] = useState(true);
    const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

    // Fetch Categories
    useEffect(() => {
        fetch(`${WP}/wp-json/shopx/v1/categories`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setCategories(data.data.filter((c: any) => c.count > 0));
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
                if (inStock) query.in_stock = "true";

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
    }, [selectedCategory, priceRange, inStock]);

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

    const handleClearFilters = () => {
        setSelectedCategory("");
        setPriceRange({min:"", max:""});
        setInStock(false);
        router.push("/shop");
    };

    const FilterSidebar = () => (
        <div className="space-y-8">
            <div className="flex justify-between items-center md:hidden mb-6">
                <h2 className="text-xl font-bold text-gray-900">Filters</h2>
                <button onClick={() => setIsMobileFiltersOpen(false)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-600">
                    <X className="w-5 h-5" />
                </button>
            </div>
            
            {/* Availability */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Availability</h3>
                <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${inStock ? 'bg-violet-600 border-violet-600' : 'border-gray-300 group-hover:border-violet-400'}`}>
                        {inStock && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={inStock}
                        onChange={(e) => {
                            setInStock(e.target.checked);
                            updateURL("in_stock", e.target.checked ? "true" : "");
                        }}
                    />
                    <span className={`text-sm font-medium transition-colors ${inStock ? 'text-violet-600' : 'text-gray-600 group-hover:text-gray-900'}`}>
                        In Stock Only
                    </span>
                </label>
            </div>

            {/* Categories */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Categories</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    <button 
                        onClick={() => { setSelectedCategory(""); updateURL("category", ""); }}
                        className={`block w-full text-left text-sm py-1.5 transition-colors ${!selectedCategory ? "text-violet-600 font-bold" : "text-gray-600 hover:text-violet-500 font-medium"}`}
                    >
                        All Categories
                    </button>
                    {categories.map(c => (
                        <button 
                            key={c.id}
                            onClick={() => { setSelectedCategory(c.id.toString()); updateURL("category", c.id.toString()); }}
                            className={`block w-full text-left text-sm py-1.5 transition-colors ${selectedCategory === c.id.toString() ? "text-violet-600 font-bold" : "text-gray-600 hover:text-violet-500 font-medium"}`}
                        >
                            {c.name} <span className="text-gray-400 text-xs ml-1">({c.count})</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Price Range */}
            <div className="space-y-4 border-t border-gray-100 pt-6">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Price (Rs.)</h3>
                <div className="flex items-center gap-3">
                    <input 
                        type="number" 
                        placeholder="Min" 
                        value={priceRange.min}
                        onChange={e => {
                            setPriceRange(prev => ({ ...prev, min: e.target.value }));
                            updateURL("min_price", e.target.value);
                        }}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-violet-600 focus:ring-1 focus:ring-violet-600 transition-all placeholder:text-gray-400"
                    />
                    <span className="text-gray-400">-</span>
                    <input 
                        type="number" 
                        placeholder="Max" 
                        value={priceRange.max}
                        onChange={e => {
                            setPriceRange(prev => ({ ...prev, max: e.target.value }));
                            updateURL("max_price", e.target.value);
                        }}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-violet-600 focus:ring-1 focus:ring-violet-600 transition-all placeholder:text-gray-400"
                    />
                </div>
            </div>
        </div>
    );

    return (
        <div className="bg-white min-h-screen">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-24">
                
                {/* Mobile Filter Toggle */}
                <div className="md:hidden flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Shop</h1>
                    <button 
                        onClick={() => setIsMobileFiltersOpen(true)}
                        className="flex items-center gap-2 border-2 border-violet-600 text-violet-600 px-5 py-2 rounded-3xl text-sm font-bold shadow-sm hover:bg-violet-50 hover:shadow transition-all"
                    >
                        <Filter className="w-4 h-4" /> Filters
                    </button>
                </div>

                {/* Mobile Slide-out Drawer */}
                <AnimatePresence>
                    {isMobileFiltersOpen && (
                        <>
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="fixed inset-0 z-40 bg-gray-900/60 backdrop-blur-sm md:hidden"
                                onClick={() => setIsMobileFiltersOpen(false)}
                            />
                            <motion.div
                                initial={{ x: "-100%" }}
                                animate={{ x: 0 }}
                                exit={{ x: "-100%" }}
                                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                className="fixed inset-y-0 left-0 z-50 w-[85%] max-w-sm bg-white rounded-r-3xl shadow-2xl overflow-y-auto p-6 md:hidden border-r border-gray-100"
                            >
                                <FilterSidebar />
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Desktop Sidebar */}
                    <div className="hidden md:block md:col-span-1 pr-6 border-r border-gray-100">
                        <FilterSidebar />
                    </div>

                    {/* Product Grid Area */}
                    <div className="md:col-span-3">
                        <div className="hidden md:flex justify-between items-end mb-8 border-b border-gray-100 pb-4">
                            <div>
                                <h1 className="text-4xl font-black text-gray-900 tracking-tight">All Products</h1>
                            </div>
                            <div className="text-sm font-medium text-gray-500 bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
                                {products.length} Products Found
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="w-10 h-10 rounded-full border-4 border-violet-100 border-t-violet-600 animate-spin"></div>
                            </div>
                        ) : products.length > 0 ? (
                            <div className="w-full">
                                <ProductGrid products={products} emptyMessage="No products found matching your filters." />
                            </div>
                        ) : (
                            <div className="text-center py-24 bg-gray-50 border border-dashed border-gray-200 rounded-3xl">
                                <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-gray-900 mb-2 tracking-tight">No products found</h3>
                                <p className="text-sm text-gray-500 max-w-sm mx-auto font-medium">Try adjusting your filters or browsing all categories to find what you're looking for.</p>
                                <button 
                                    onClick={handleClearFilters}
                                    className="mt-8 px-8 py-3 bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-200 text-white rounded-full text-sm font-bold transition-all transform hover:-translate-y-0.5"
                                >
                                    Clear all filters
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ShopPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center pt-20 bg-white">
                <div className="w-10 h-10 rounded-full border-4 border-violet-100 border-t-violet-600 animate-spin"></div>
            </div>
        }>
            <ShopContent />
        </Suspense>
    );
}
