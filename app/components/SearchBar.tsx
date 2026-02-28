"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

interface SearchProduct {
    id: number;
    name: string;
    slug: string;
    price: string;
    image: string | null;
}

export default function SearchBar() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchProduct[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const router = useRouter();
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Handle clicking outside to close dropdown
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchResults = async () => {
            if (query.trim().length < 2) {
                setResults([]);
                return;
            }

            setIsSearching(true);
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
                const data = await res.json();
                setResults(data.products || []);
                setShowDropdown(true);
            } catch (error) {
                console.error("Failed to fetch search results:", error);
            } finally {
                setIsSearching(false);
            }
        };

        const debounceTimer = setTimeout(fetchResults, 300); // 300ms debounce
        return () => clearTimeout(debounceTimer);
    }, [query]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setShowDropdown(false);
        if (query.trim()) {
            router.push(`/search?q=${encodeURIComponent(query.trim())}`);
        }
    };

    return (
        <div ref={wrapperRef} className="relative w-full z-50">
            <form onSubmit={handleSearchSubmit} className="relative w-full">
                <button
                    type="submit"
                    className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 hover:text-blue-600 focus:outline-none"
                    aria-label="Submit search"
                >
                    <Search className="h-5 w-5" />
                </button>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (e.target.value.length > 0) {
                            setShowDropdown(true);
                        } else {
                            setShowDropdown(false);
                        }
                    }}
                    onFocus={() => {
                        if (query.trim().length > 0) setShowDropdown(true);
                    }}
                    className="block w-full rounded-full border border-gray-300 bg-white py-2 pl-10 pr-10 text-sm text-black placeholder-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                    placeholder="Search for products, brands and more..."
                />
                {isSearching && (
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                    </div>
                )}
            </form>

            {/* Live Search Dropdown */}
            {showDropdown && (results.length > 0 || isSearching) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                    <ul className="py-2">
                        {results.length > 0 ? (
                            <>
                                {results.map((product) => (
                                    <li key={product.id}>
                                        <Link
                                            href={`/product/${product.slug}`}
                                            onClick={() => setShowDropdown(false)}
                                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="relative w-10 h-10 rounded-md bg-gray-100 overflow-hidden flex-shrink-0">
                                                {product.image ? (
                                                    <Image src={product.image} alt={product.name} fill className="object-cover" sizes="40px" />
                                                ) : (
                                                    <Search className="w-4 h-4 text-gray-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-bold text-gray-900 truncate">{product.name}</div>
                                                <div className="text-sm font-semibold text-blue-600">
                                                    Rs. {parseFloat(product.price || "0").toLocaleString('en-LK')}
                                                </div>
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                                <li>
                                    <button
                                        onClick={handleSearchSubmit}
                                        className="w-full text-center px-4 py-3 text-sm font-bold text-blue-600 hover:bg-blue-50 border-t border-gray-100 block transition-colors"
                                    >
                                        View all results for "{query}"
                                    </button>
                                </li>
                            </>
                        ) : query.trim().length >= 2 && !isSearching ? (
                            <li className="px-4 py-6 text-center text-sm text-gray-500">
                                No products found matching "{query}"
                            </li>
                        ) : null}
                    </ul>
                </div>
            )}
        </div>
    );
}
