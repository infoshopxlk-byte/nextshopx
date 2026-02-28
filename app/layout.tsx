import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Search, User, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { CartProvider } from "@/app/context/CartContext";
import { Providers } from "@/app/components/Providers";
import CartIcon from "@/app/components/DynamicCartIcon";
import SearchBar from "@/app/components/SearchBar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ShopX.lk - Sri Lanka's Multi-Vendor Marketplace",
  description: "Discover amazing products from local sellers all over Sri Lanka.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col bg-white font-sans text-slate-900`}
      >
        <Providers>
          <CartProvider>
            {/* Global Navigation Bar */}
            <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between gap-4">
                  {/* Logo */}
                  <div className="flex-shrink-0">
                    <Link href="/" className="text-xl sm:text-2xl font-black tracking-tighter text-blue-600">
                      ShopX<span className="text-slate-900">.lk</span>
                    </Link>
                  </div>

                  {/* Desktop Search Bar (Centered) */}
                  <div className="hidden flex-1 items-center justify-center px-4 md:flex">
                    <div className="relative w-full max-w-xl">
                      <SearchBar />
                    </div>
                  </div>

                  {/* Right Icons: Account & Cart */}
                  <div className="flex items-center space-x-3 sm:space-x-6">
                    <Link href="/account" className="flex flex-col items-center justify-center text-gray-600 hover:text-blue-600 transition-colors p-1">
                      <User className="h-5 w-5 sm:h-6 sm:w-6" />
                      <span className="mt-1 text-[9px] sm:text-[10px] font-medium uppercase tracking-wider hidden xs:block">Account</span>
                    </Link>

                    <CartIcon />
                  </div>
                </div>
              </div>

              {/* Mobile Search Bar (visible only on small screens) */}
              <div className="border-t p-2 md:hidden bg-gray-50/50">
                <div className="max-w-7xl mx-auto">
                  <SearchBar />
                </div>
              </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 w-full flex flex-col items-center justify-start py-8">
              <div className="w-full h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {children}
              </div>
            </main>

            {/* Global Footer */}
            <footer className="w-full border-t bg-gray-50 py-16 mt-auto">
              {/* ... (existing footer code) */}
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                  {/* Brand Column */}
                  <div className="flex flex-col items-start">
                    <span className="text-2xl font-black tracking-tighter text-blue-600 mb-4">
                      ShopX<span className="text-gray-900">.lk</span>
                    </span>
                    <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                      Sri Lanka's trusted multi-vendor marketplace. Discover amazing products from local sellers all over the island.
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      Hotline: 011 234 5678
                    </p>
                  </div>

                  {/* Get to Know Us */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Get to Know Us</h3>
                    <ul className="space-y-3 text-sm text-gray-500">
                      <li><Link href="/about" className="hover:text-blue-600 transition-colors">About ShopX</Link></li>
                      <li><Link href="/careers" className="hover:text-blue-600 transition-colors">Careers</Link></li>
                      <li><Link href="/press" className="hover:text-blue-600 transition-colors">Press Releases</Link></li>
                      <li><Link href="/corporate" className="hover:text-blue-600 transition-colors">Corporate Information</Link></li>
                    </ul>
                  </div>

                  {/* Customer Service */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Customer Service</h3>
                    <ul className="space-y-3 text-sm text-gray-500">
                      <li><Link href="/help" className="hover:text-blue-600 transition-colors">Help Center</Link></li>
                      <li><Link href="/returns" className="hover:text-blue-600 transition-colors">Returns & Refunds</Link></li>
                      <li><Link href="/shipping" className="hover:text-blue-600 transition-colors">Shipping Rates & Policies</Link></li>
                      <li><Link href="/contact" className="hover:text-blue-600 transition-colors">Contact Us</Link></li>
                    </ul>
                  </div>

                  {/* Seller Agreements */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Make Money with Us</h3>
                    <ul className="space-y-3 text-sm text-gray-500">
                      <li><Link href="/become-a-seller" className="hover:text-blue-600 transition-colors font-semibold text-gray-700">Sell on ShopX</Link></li>
                      <li><Link href="/seller-terms" className="hover:text-blue-600 transition-colors">Seller Terms & Conditions</Link></li>
                      <li><Link href="/vendor-hub" className="hover:text-blue-600 transition-colors">Vendor Hub</Link></li>
                      <li><Link href="/advertising" className="hover:text-blue-600 transition-colors">Advertise Your Products</Link></li>
                    </ul>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                  <p className="text-sm text-gray-400">
                    &copy; {new Date().getFullYear()} ShopX.lk. All rights reserved.
                  </p>
                  <div className="flex gap-4 text-sm text-gray-400">
                    <Link href="/privacy" className="hover:text-gray-900 transition-colors">Privacy Notice</Link>
                    <Link href="/terms" className="hover:text-gray-900 transition-colors">Conditions of Use</Link>
                  </div>
                </div>
              </div>
            </footer>
          </CartProvider>
        </Providers>
      </body>
    </html>
  );
}
