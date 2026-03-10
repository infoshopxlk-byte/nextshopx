import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CartProvider } from "@/app/context/CartContext";
import { Providers } from "@/app/components/Providers";
import SiteChrome from "@/app/components/SiteChrome";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ShopX.lk - Sri Lanka's Multi-Vendor Marketplace",
  description: "Discover amazing products from local sellers all over Sri Lanka.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col bg-white font-sans text-slate-900`}>
        <Providers>
          <CartProvider>
            {/*
                         * SiteChrome is a Client Component that reads usePathname.
                         * On /seller/* routes it renders children full-screen (no header/footer).
                         * On all other routes it renders the full shop chrome around children.
                         */}
            <SiteChrome>
              {children}
            </SiteChrome>
          </CartProvider>
        </Providers>
      </body>
    </html>
  );
}
