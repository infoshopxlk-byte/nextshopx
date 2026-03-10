export default function ShippingInfoPage() {
    return (
        <div className="bg-gray-50 min-h-[calc(100vh-80px)] flex flex-col">
            <div className="max-w-6xl mx-auto px-4 py-20 text-gray-900 flex-1 w-full">
                <h1 className="text-4xl font-bold mb-8 text-gray-900">Shipping Information</h1>
                <div className="space-y-6 text-gray-600 leading-relaxed">
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Delivery Options & Rates</h2>
                        <p>
                            We offer island-wide shipping across Sri Lanka. Delivery timelines typically range from 2-5 business days depending on your exact location and the vendor's shipping origin.
                        </p>
                        <p className="mt-4">
                            Shipping costs are dynamically calculated at checkout based on the cumulative weight of your products and the vendor's specific shipping zones.
                        </p>
                    </section>
                    
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-8">Order Tracking</h2>
                        <p>
                            Once an order is confirmed and dispatched by a vendor, you will receive an email notification containing your specific tracking ID. You can also monitor real-time order states via your customer dashboard. 
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
