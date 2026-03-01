import { NextResponse } from 'next/server';
import api from '@/lib/woocommerce';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const userInput = body.message?.toLowerCase().trim() || "";

        console.log(`[AI CHAT] User asked: "${userInput}"`);

        // 1. Basic Greetings & Chit-chat
        if (userInput.match(/^(hi|hello|hey|greetings|help|how are you|who are you)/i)) {
            return NextResponse.json({
                reply: "Hello! 👋 I am the ShopX AI Assistant. I can check live prices, stock availability, and find specific products for you. What are you looking for today?",
                isHtml: false
            });
        }

        if (userInput.match(/^(thanks|thank you|ok|great|awesome|bye)/i)) {
            return NextResponse.json({
                reply: "You're very welcome! Let me know if you need anything else. Happy shopping! 🛒",
                isHtml: false
            });
        }

        if (userInput.match(/koko|installment|pay later/i)) {
            return NextResponse.json({
                reply: "Yes! We offer **KOKO Installments** on all our products. You can split your payment into 3 interest-free bits (a 13% convenience markup applies). Just select Paykoko at checkout! 💳",
                isHtml: true
            });
        }

        // 2. Product Search Extraction (Simulated NLP)
        // Extract potential keywords by removing common filler words
        const fillerWords = ['what', 'is', 'the', 'price', 'of', 'do', 'you', 'have', 'any', 'looking', 'for', 'i', 'want', 'to', 'buy', 'show', 'me', 'details', 'about'];
        const searchTerms = userInput.split(' ').filter((word: string) => !fillerWords.includes(word)).join(' ');

        if (searchTerms.length > 2) {
            console.log(`[AI CHAT] Searching WooCommerce for: "${searchTerms}"`);
            try {
                // Fetch live data from WooCommerce
                const response = await api.get("products", {
                    search: searchTerms,
                    per_page: 3,
                    status: "publish",
                });

                const products = response.data;

                if (products && products.length > 0) {
                    const topMatch = products[0];
                    const stockText = topMatch.stock_status === 'instock'
                        ? `<span style="color: green; font-weight: bold;">In Stock 🟢</span>`
                        : `<span style="color: red; font-weight: bold;">Out of Stock 🔴</span>`;

                    const price = parseFloat(topMatch.price || "0").toLocaleString('en-LK');

                    // Format a rich HTML response
                    const replyHtml = `
                        <p>I found something matching your request!</p>
                        <br/>
                        <p><strong>${topMatch.name}</strong></p>
                        <p>💰 Price: Rs. ${price}</p>
                        <p>📦 Status: ${stockText}</p>
                        <br/>
                        <a href="/product/${topMatch.slug}" style="display: inline-block; background: #2563eb; color: white; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-size: 12px; margin-top: 5px;">
                            View Details / Buy Now
                        </a>
                    `;

                    return NextResponse.json({
                        reply: replyHtml,
                        isHtml: true
                    });
                } else {
                    return NextResponse.json({
                        reply: `I couldn't find any exact products matching "${searchTerms}". Could you try using a broader term or check our Category page?`,
                        isHtml: false
                    });
                }
            } catch (wcError) {
                console.error("[AI CHAT] WooCommerce API error:", wcError);
                return NextResponse.json({
                    reply: "I'm having a little trouble connecting to our catalog right now. Please try searching via the main search bar!",
                    isHtml: false
                });
            }
        }

        // 3. Fallback Catch-all
        return NextResponse.json({
            reply: "I'm an AI assistant in training! I'm best at finding product prices and stock details. Try asking me something like: 'Do you have the Fantech MCX01?'",
            isHtml: false
        });

    } catch (error) {
        console.error("[AI CHAT] Root Error:", error);
        return NextResponse.json(
            { reply: "Sorry, I am experiencing a temporary glitch. Please try again soon.", isHtml: false },
            { status: 500 }
        );
    }
}
