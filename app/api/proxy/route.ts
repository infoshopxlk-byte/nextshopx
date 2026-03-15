import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    return handleProxy(req);
}

export async function POST(req: NextRequest) {
    return handleProxy(req);
}

async function handleProxy(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get("path");

    if (!path) {
        return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
    }

    const WP = process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://sellerhub.shopx.lk';
    
    // Clean WP: remove trailing slash if exists
    const cleanWP = WP.replace(/\/$/, "");
    
    // Clean path: ensure it starts with / but doesn't have //
    const cleanPath = path.startsWith("/") ? path : `/${path}`;

    // Build the target URL
    const targetUrl = new URL(`${cleanWP}/wp-json${cleanPath}`);
    
    // Forward all other search params
    searchParams.forEach((value, key) => {
        if (key !== "path") {
            targetUrl.searchParams.set(key, value);
        }
    });

    // Ensure the final URL is encoded correctly
    const finalUrl = targetUrl.toString();
    console.log("Full Proxy URL:", finalUrl);

    const authHeader = req.headers.get("Authorization");
    let body: any = undefined;

    if (req.method !== "GET" && req.method !== "HEAD") {
        try {
            body = await req.json();
        } catch (e) {
            // No body or invalid JSON
        }
    }

    const fetchOptions: RequestInit = {
        method: req.method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader || '', // ටෝකන් එක අනිවාර්යයෙන්ම පාස් කරන්න
        },
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
    };

    try {
        const res = await fetch(finalUrl, fetchOptions);
        
        // Defensive check: Ensure the response is JSON
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            console.error("Non-JSON response received from WordPress:", contentType);
            return NextResponse.json({ error: "Upstream returned non-JSON response" }, { status: 502 });
        }

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (e) {
        console.error("Proxy error:", e);
        return NextResponse.json({ error: "Failed to fetch from WordPress" }, { status: 500 });
    }
}
