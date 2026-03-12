"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { User } from "lucide-react";
import { ReactNode } from "react";
import CartIcon from "@/app/components/DynamicCartIcon";
import SearchBar from "@/app/components/SearchBar";
import MobileBottomNav from "@/app/components/MobileBottomNav";
import AiChatbot from "@/app/components/AiChatbot";

// Routes where we suppress the entire site chrome
const SELLER_PREFIXES = ["/seller/dashboard", "/seller/login"];

export default function SiteChrome({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const isSeller = SELLER_PREFIXES.some((p) => pathname.startsWith(p));

    // On seller routes: render children only, full-screen
    if (isSeller) {
        return <div className="min-h-screen flex flex-col">{children}</div>;
    }

    // Normal shopfront: full site chrome
    return (
        <>
            {/* Global Navigation Bar */}
            <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white shadow-sm">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between gap-4">
                        {/* Logo */}
                        <div className="flex-shrink-0">
                            <Link href="/" className="text-xl sm:text-2xl font-black tracking-tighter text-blue-600">
                                ShopX<span className="text-slate-900">.lk</span>
                            </Link>
                        </div>

                        {/* Desktop Search Bar */}
                        <div className="hidden flex-1 items-center justify-center px-4 md:flex">
                            <div className="relative w-full max-w-xl">
                                <SearchBar />
                            </div>
                        </div>

                        {/* Right Icons & Buttons */}
                        <div className="flex items-center space-x-3 sm:space-x-4 lg:space-x-6">
                            <Link
                                href="/shop"
                                className="hidden sm:inline-flex items-center justify-center rounded-xl bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8] transition shadow-md shadow-blue-500/20"
                            >
                                Shop
                            </Link>
                            <Link
                                href="/seller/login"
                                className="hidden sm:inline-flex items-center justify-center rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition shadow-md shadow-violet-500/20"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                Seller Hub
                            </Link>
                            <div className="h-6 w-px bg-gray-200 hidden sm:block mx-1"></div>
                            <Link href="/account" className="flex flex-col items-center justify-center text-gray-600 hover:text-blue-600 transition-colors p-1">
                                <User className="h-5 w-5 sm:h-6 sm:w-6" />
                                <span className="mt-1 text-[9px] sm:text-[10px] font-medium uppercase tracking-wider hidden xs:block">Account</span>
                            </Link>
                            <CartIcon />
                        </div>
                    </div>
                </div>

                {/* Mobile Search Bar */}
                <div className="border-t border-gray-100 p-2 md:hidden bg-gray-50/50">
                    <div className="max-w-7xl mx-auto">
                        <SearchBar />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 w-full flex flex-col items-center justify-start py-8">
                <div className="w-full h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {children}
                </div>
            </main>

            {/* Footer */}
            <footer className="w-full bg-gray-100 py-12 mt-auto pb-24 md:pb-16 text-gray-800">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
                        <div className="flex flex-col items-start lg:col-span-1">
                            <span className="text-2xl font-black tracking-tighter mb-4 text-blue-600">ShopX<span className="text-gray-900">.lk</span></span>
                            <p className="text-sm text-gray-500 mb-6 leading-relaxed">Sri Lanka&apos;s trusted multi-vendor marketplace.</p>
                            <p className="text-sm font-bold flex flex-col gap-2">
                                <span>Hotline: <a href="tel:0703999100" className="hover:text-violet-600 transition">070 3999 100</a></span>
                                <a 
                                    href="https://wa.me/94703999100" 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="inline-flex flex-wrap items-center gap-1.5 text-[#25D366] hover:text-green-600 transition"
                                >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12.031 0C5.385 0 0 5.385 0 12.031c0 2.152.563 4.238 1.635 6.085L.085 24l6.046-1.584C7.883 23.417 9.932 24 12.029 24 18.675 24 24 18.614 24 11.969 24 5.385 18.675 0 12.031 0zm0 21.996c-1.83 0-3.626-.492-5.196-1.424l-.372-.222-3.868 1.014 1.033-3.771-.243-.388c-1.026-1.637-1.567-3.522-1.567-5.462 0-5.717 4.654-10.373 10.375-10.373 5.72 0 10.373 4.656 10.373 10.373 0 5.717-4.653 10.371-10.373 10.371zm5.694-7.792c-.312-.156-1.848-.912-2.134-1.017-.285-.104-.494-.156-.702.156-.208.312-.806 1.017-.988 1.225-.182.208-.364.234-.676.078-.312-.156-1.319-.487-2.513-1.554-.928-.829-1.553-1.854-1.735-2.166-.182-.312-.02-.482.136-.638.14-.14.312-.364.468-.546.156-.182.208-.312.312-.52.104-.208.052-.39-.026-.546-.078-.156-.702-1.693-.962-2.318-.254-.606-.511-.523-.702-.533-.182-.01-.39-.01-.598-.01-.208 0-.546.078-.832.39-.286.312-1.092 1.066-1.092 2.602 0 1.536 1.118 3.02 1.274 3.228.156.208 2.2 3.356 5.33 4.708.746.321 1.328.513 1.78.656.748.238 1.428.204 1.96.124.594-.091 1.848-.755 2.108-1.484.26-.729.26-1.354.182-1.484-.078-.131-.286-.208-.598-.365z"/>
                                    </svg>
                                    Chat on WhatsApp
                                </a>
                            </p>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-wider mb-4">Get to Know Us</h3>
                            <ul className="space-y-3 text-sm text-gray-500">
                                <li><Link href="/about" className="hover:text-gray-900 transition">About ShopX</Link></li>
                                <li><Link href="/careers" className="hover:text-gray-900 transition">Careers</Link></li>
                                <li><Link href="/contact" className="hover:text-gray-900 transition">Contact Us</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-wider mb-4">Customer Service</h3>
                            <ul className="space-y-3 text-sm text-gray-500">
                                <li><Link href="/help-center" className="hover:text-gray-900 transition">Help Center</Link></li>
                                <li><Link href="/returns-refunds" className="hover:text-gray-900 transition">Returns &amp; Refunds</Link></li>
                                <li><Link href="/shipping-info" className="hover:text-gray-900 transition">Shipping Info</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-wider mb-4">Sell on ShopX</h3>
                            <ul className="space-y-3 text-sm text-gray-500">
                                <li><Link href="/sell" className="hover:text-gray-900 font-semibold text-gray-600 transition">Become a Vendor</Link></li>
                                <li><Link href="/seller-terms" className="hover:text-gray-900 transition">Seller Terms</Link></li>
                                <li><Link href="/seller/login" className="hover:text-gray-900 transition">Vendor Hub</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-wider mb-4">Our Reviews</h3>
                            <ul className="space-y-3 text-sm text-gray-500">
                                <li><a href="https://trustpilot.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 transition">Trustpilot</a></li>
                                <li><a href="https://google.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 transition">Google Review</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} ShopX.lk. All rights reserved.</p>
                        <div className="flex gap-4 text-sm text-gray-500">
                            <Link href="/privacy-notice" className="hover:text-gray-900 transition">Privacy Notice</Link>
                            <Link href="/conditions-of-use" className="hover:text-gray-900 transition">Conditions of Use</Link>
                        </div>
                    </div>
                </div>
            </footer>

            <MobileBottomNav />
            <AiChatbot />
        </>
    );
}
