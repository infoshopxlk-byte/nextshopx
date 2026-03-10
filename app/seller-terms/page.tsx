export default function SellerTermsPage() {
    return (
        <div className="bg-gray-50 min-h-[calc(100vh-80px)] flex flex-col">
            <div className="max-w-6xl mx-auto px-4 py-20 text-gray-900 flex-1 w-full">
                <h1 className="text-4xl font-bold mb-8 text-gray-900">Seller Terms &amp; Conditions</h1>
                <div className="space-y-6 text-gray-600 leading-relaxed">
                    <p>
                        Welcome to the ShopX Vendor Network. By registering as a seller, you agree to comply with our comprehensive network terms which maintain the safety and integrity of our marketplace.
                    </p>
                    
                    <section className="mt-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Seller Eligibility</h2>
                        <p>
                            All sellers must provide accurate business registration details or valid national identification. ShopX reserves the right to suspend any store caught falsifying operational data.
                        </p>
                    </section>

                    <section className="mt-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Product Quality & Authenticity</h2>
                        <p>
                            Vendors are strictly prohibited from listing counterfeit, illegal, or heavily restricted goods without proper authorization. Only verified vendors possess the authority to declare verified brand associations globally across the platform.
                        </p>
                    </section>

                    <section className="mt-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Fulfillment Expectations</h2>
                        <p>
                            Sellers must mark orders as 'Ready to Ship' promptly. Repeated fulfillment failures or consistently poor customer ratings will trigger an automated account review and potential suspension mapping.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
