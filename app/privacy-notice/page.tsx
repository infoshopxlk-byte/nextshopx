export default function PrivacyNoticePage() {
    return (
        <div className="bg-gray-50 min-h-[calc(100vh-80px)] flex flex-col">
            <div className="max-w-6xl mx-auto px-4 py-20 text-gray-900 flex-1 w-full">
                <h1 className="text-4xl font-bold mb-8 text-gray-900">Privacy Notice</h1>
                <div className="space-y-6 text-gray-600 leading-relaxed">
                    <p>
                        At ShopX, your privacy is extremely important to us. This notice explains how we collect, use, and protect your personal data when you use the ShopX platform.
                    </p>
                    
                    <section className="mt-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Information We Collect</h2>
                        <p>
                            We collect personal data you provide directly to us (like your name, address, email, and phone number when registering or buying) as well as data automatically generated through your interaction with our infrastructure (like cookies, IP addresses, and browsing behaviors).
                        </p>
                    </section>

                    <section className="mt-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">How We Use Information</h2>
                        <p>
                            Your information is strictly utilized to process transactions, prevent fraudulent activities across the platform, and personalize your digital experience. We never sell your personal data to third-party data brokers.
                        </p>
                    </section>
                    
                    <section className="mt-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Security</h2>
                        <p>
                            We employ modern industry-standard encryption protocols (SSL/TLS) to secure data during transit and protect your stored credentials.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
