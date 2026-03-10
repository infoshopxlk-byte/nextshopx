export default function HelpCenterPage() {
    return (
        <div className="bg-gray-50 min-h-[calc(100vh-80px)] flex flex-col">
            <div className="max-w-6xl mx-auto px-4 py-20 text-gray-900 flex-1 w-full">
                <h1 className="text-4xl font-bold mb-8 text-gray-900">Help Center</h1>
                <div className="space-y-8 text-gray-600 leading-relaxed">
                    <p>
                        Welcome to the ShopX Help Center. How can we assist you today? We are committed to providing you with the best experience possible.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                        <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Track Your Order</h3>
                            <p className="text-sm mb-4">View the status of your current orders and past purchase history.</p>
                            <a href="/customer/orders" className="text-violet-600 hover:text-violet-700 font-medium text-sm transition">View Orders &rarr;</a>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Contact Support</h3>
                            <p className="text-sm mb-4">Need further assistance? Our standard support team is available 24/7.</p>
                            <a href="/contact" className="text-violet-600 hover:text-violet-700 font-medium text-sm transition">Contact Us &rarr;</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
