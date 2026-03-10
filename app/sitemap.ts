import { MetadataRoute } from 'next';
import api from "@/lib/woocommerce";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://shopx.lk';
    
    try {
        // Fetch up to 100 published products for the sitemap
        const response = await api.get('products', {
            per_page: 100,
            status: 'publish',
            _fields: 'id,slug,date_modified'
        });

        const products = response.data;

        // Map WooCommerce products to standard Sitemap structure
        const productUrls = products.map((product: any) => ({
            url: `${baseUrl}/product/${product.slug || product.id}`,
            lastModified: new Date(product.date_modified || new Date()),
            changeFrequency: 'daily' as const,
            priority: 0.8,
        }));

        return [
            {
                url: baseUrl,
                lastModified: new Date(),
                changeFrequency: 'daily',
                priority: 1,
            },
            {
                url: `${baseUrl}/shop`,
                lastModified: new Date(),
                changeFrequency: 'daily',
                priority: 0.9,
            },
            {
                url: `${baseUrl}/about`,
                lastModified: new Date(),
                changeFrequency: 'monthly',
                priority: 0.5,
            },
            {
                url: `${baseUrl}/contact`,
                lastModified: new Date(),
                changeFrequency: 'monthly',
                priority: 0.5,
            },
            ...productUrls
        ];
    } catch (error) {
        console.error("Error generating sitemap:", error);
        
        // Fallback sitemap if WooCommerce API fails
        return [
            {
                url: baseUrl,
                lastModified: new Date(),
                changeFrequency: 'daily',
                priority: 1,
            }
        ];
    }
}
