import Image from "next/image";
import Link from "next/link";
import api from "@/lib/woocommerce";
import ProductGrid from "@/app/components/ProductGrid";

export default async function SearchPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const resolvedParams = await searchParams;
    const q = typeof resolvedParams.q === "string" ? resolvedParams.q : "";

    let products = [];
    try {
        if (q) {
            const response = await api.get("products", {
                search: q,
                status: "publish",
            });
            products = response.data;
        }
    } catch (error) {
        console.error("Error fetching search results:", error);
    }

    return (
        <div className="w-full">
            {/* Header */}
            <div className="mb-8 border-b pb-6">
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
                    Search Results
                </h1>
                <p className="mt-2 text-gray-500 font-medium">
                    {q ? (
                        <>Showing {products.length} results for <span className="text-gray-900 font-bold">"{q}"</span></>
                    ) : (
                        "Please enter a search term to find products."
                    )}
                </p>
            </div>

            {/* Results Grid */}
            {products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="text-6xl mb-4">🔍</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">No products found</h2>
                    <p className="text-gray-500 max-w-md">
                        We couldn't find anything matching "{q}". Try adjusting your search term or browse our categories.
                    </p>
                    <Link href="/" className="mt-6 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">
                        Back to Home
                    </Link>
                </div>
            ) : (
                <ProductGrid products={products} />
            )}
        </div>
    );
}
