import Image from "next/image";
import Link from "next/link";
import api from "@/lib/woocommerce";
import CartActionButtons from "@/app/components/CartActionButtons";
import ProductGrid from "@/app/components/ProductGrid";
import ChatButton from "@/app/components/ChatButton";
import ProductSelector from "../ProductSelector";
import ProductReviews from "@/app/components/ProductReviews";
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const resolvedParams = await params;
    const slug = resolvedParams.id;

    try {
        const { data } = await api.get('products', { slug: slug });
        if (data && data.length > 0) {
            const product = data[0];
            
            // Clean HTML tags from short_description for strict plain text fallback
            const cleanDescription = (product.short_description || product.description || "")
                .replace(/<[^>]*>?/gm, '')
                .slice(0, 160)
                .trim();

            const imageUrl = product.images?.[0]?.src || "https://shopx.lk/default-og-image.jpg";

            return {
                title: `${product.name} | ShopX.lk`,
                description: cleanDescription,
                openGraph: {
                    title: `${product.name} | ShopX.lk`,
                    description: cleanDescription,
                    url: `https://shopx.lk/product/${slug}`,
                    siteName: 'ShopX.lk',
                    images: [
                        {
                            url: imageUrl,
                            width: 800,
                            height: 600,
                            alt: product.name,
                        },
                    ],
                    locale: 'en_LK',
                    type: 'website',
                },
                twitter: {
                    card: 'summary_large_image',
                    title: `${product.name} | ShopX.lk`,
                    description: cleanDescription,
                    images: [imageUrl],
                },
            };
        }
    } catch (e) {
        console.error("Metadata generation error:", e);
    }

    return {
        title: 'Product | ShopX.lk',
        description: 'Explore our amazing products securely on ShopX.lk',
    };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
    let product = null;
    let relatedProducts = [];
    let initialReviews = [];
    let slug = "";

    try {
        // Await params first (Next.js 15 dynamic routing best practice)
        const resolvedParams = await params;
        slug = resolvedParams.id;

        // 1. Fetch the main product data by slug
        const { data } = await api.get('products', { slug: slug });

        // WooCommerce returns an array for queries, extract the first one
        if (data && data.length > 0) {
            product = data[0];
        }

        // 2. Fetch related products (using the first category if available)
        if (product && product.categories && product.categories.length > 0) { // Added product check here
            const categoryId = product.categories[0].id;
            const relatedResponse = await api.get("products", {
                category: categoryId,
                per_page: 4,
                exclude: [product.id], // Don't show the current product in related
                status: "publish",
            });
            relatedProducts = relatedResponse.data;
        }

        // 3. Fetch existing approved reviews
        if (product) {
            const reviewsResponse = await api.get("products/reviews", {
                product: product.id,
                status: "approved"
            });
            initialReviews = reviewsResponse.data;
        }
    } catch (error) {
        console.error(`Error fetching product ${slug || "unknown"}:`, error);
    }

    if (!product) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center p-8 bg-white">
                <h1 className="text-2xl font-bold text-gray-900">Product Not Found</h1>
                <p className="mt-2 text-gray-500">The product you are looking for does not exist or has been removed.</p>
                <Link href="/" className="mt-6 rounded-full bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 transition">
                    Back to Home
                </Link>
            </div>
        );
    }

    // JSON-LD Generation Logic
    const cleanSchemaDescription = (product.short_description || product.description || "").replace(/<[^>]*>?/gm, '').trim();
    
    // Calculate aggregate rating safely
    let reviewCount = 0;
    let ratingValue = 0;
    
    if (initialReviews.length > 0) {
        reviewCount = initialReviews.length;
        const totalRating = initialReviews.reduce((sum: number, review: any) => sum + review.rating, 0);
        ratingValue = totalRating / reviewCount;
    }

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": product.name,
        "image": product.images?.map((img: any) => img.src) || [],
        "description": cleanSchemaDescription,
        "sku": product.sku || product.id.toString(),
        "offers": {
            "@type": "Offer",
            "url": `https://shopx.lk/product/${product.slug}`,
            "priceCurrency": "LKR",
            "price": product.price,
            "availability": product.stock_status === "instock" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "itemCondition": "https://schema.org/NewCondition"
        },
        ...(reviewCount > 0 && {
            "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": ratingValue.toFixed(1),
                "reviewCount": reviewCount
            }
        })
    };

    return (
        <div className="w-full">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            {/* Breadcrumbs */}
            <div className="mb-6 flex items-center space-x-2 text-sm text-gray-500">
                <Link href="/" className="hover:text-blue-600">Home</Link>
                <span>/</span>
                {product.categories && product.categories.length > 0 && (
                    <>
                    </>
                )}
                <span className="text-gray-900 font-medium truncate max-w-[200px] sm:max-w-xs">{product.name}</span>
            </div>

            {/* Main Product Section - Handled by Client Component */}
            <div className="w-full">
                <ProductSelector product={product} />
            </div>

            {/* Product Description */}
            {product.description && product.description !== product.short_description && (
                <div className="mt-12 border-t border-gray-100 pt-12 w-full flex flex-col items-start justify-start max-w-4xl">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 text-left w-full">Description</h3>
                    <div
                        className="prose prose-base sm:prose-lg text-gray-700 leading-loose text-left w-full"
                        dangerouslySetInnerHTML={{ __html: product.description }}
                    />
                </div>
            )}

            {/* Product Reviews */}
            <div className="max-w-4xl w-full">
                <ProductReviews productId={product.id} initialReviews={initialReviews} />
            </div>

            {/* Related Products Section */}
            {relatedProducts.length > 0 && (
                <div className="mt-24 border-t border-gray-100 pt-16 relative z-10 w-full">
                    <h2 className="text-2xl font-bold text-gray-900 mb-8">Related Products</h2>
                    <ProductGrid products={relatedProducts} emptyMessage="No related products found." />
                </div>
            )}
        </div>
    );
}
