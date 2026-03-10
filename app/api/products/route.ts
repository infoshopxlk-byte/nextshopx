import { NextResponse } from 'next/server';
import api from '@/lib/woocommerce';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    
    // Build query object from URL params
    const query: any = {
        status: 'publish',
        per_page: searchParams.get('per_page') || 50,
    };

    if (searchParams.has('category')) {
        query.category = searchParams.get('category');
    }
    if (searchParams.has('min_price')) {
        query.min_price = searchParams.get('min_price');
    }
    if (searchParams.has('max_price')) {
        query.max_price = searchParams.get('max_price');
    }
    
    try {
        const response = await api.get('products', query);
        return NextResponse.json(response.data);
    } catch (error: any) {
        console.error("WooCommerce fetch error:", error?.response?.data || error.message);
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }
}
