import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = 'https://shopx.lk';
    
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/api/', '/seller/dashboard/'], // Protect private vendor areas and raw API nodes
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
