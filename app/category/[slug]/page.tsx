import Image from "next/image";
import Link from "next/link";
import api from "@/lib/woocommerce";
import ProductGrid from "@/app/components/ProductGrid";

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
    let products = [];
    let categoryName = "Category";

    // Resolve dynamic params correctly in Next.js 15
    const resolvedParams = await params;
    const slug = resolvedParams.slug;

    try {
        // Since WooCommerce Product API filtering by category requires an ID and not a slug natively via `?category=`, 
        // we first fetch the category ID using its slug if the slug isn't "sale":
        let categoryId = null;

        if (slug === "sale") {
            // "Sale" isn't a strict category usually, it's a product status. Filter by on_sale
            categoryName = "Sale Items";
            const response = await api.get("products", {
                on_sale: true,
                per_page: 24,
                status: "publish",
            });
            products = response.data;
        } else {
            // Normal Categories
            const catResponse = await api.get("products/categories", {
                slug: slug
            });

            if (catResponse.data && catResponse.data.length > 0) {
                categoryId = catResponse.data[0].id;
                categoryName = catResponse.data[0].name;

                // Fetch Products for this Category ID
                const prodResponse = await api.get("products", {
                    category: categoryId,
                    per_page: 24,
                    status: "publish",
                });
                products = prodResponse.data;
            } else {
                // Formatting fallback name based on slug
                categoryName = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            }
        }
    } catch (error) {
        console.error(`Error fetching products for category ${slug}:`, error);
    }

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans w-full">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="mb-10 text-center">
                    <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">{categoryName}</h1>
                    <p className="mt-3 text-lg text-gray-500 max-w-2xl mx-auto">
                        Explore our selection of top-quality items in the {categoryName} collection designed specially for you.
                    </p>
                </div>

                {/* Product Grid */}
                {products.length === 0 ? (
                    <div className="text-center py-20 px-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto flex items-center justify-center mb-6">
                            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">No products found for "{categoryName}"</h3>
                        <p className="text-gray-500 mb-6">Check back soon, or explore our other exciting categories.</p>
                        <Link href="/" className="inline-block bg-blue-600 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-blue-700 transition-colors">
                            Return to Home
                        </Link>
                    </div>
                ) : (
                    <ProductGrid products={products} />
                )}
            </div>
        </div>
    );
}
