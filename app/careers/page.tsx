export default function CareersPage() {
    return (
        <div className="bg-gray-50 min-h-[calc(100vh-80px)] flex flex-col">
            <div className="max-w-6xl mx-auto px-4 py-20 text-gray-900 flex-1 w-full">
                <h1 className="text-4xl font-bold mb-8 text-gray-900">Careers at ShopX</h1>
                <div className="space-y-6 text-gray-600 leading-relaxed">
                    <p>
                        Join our mission to build Sri Lanka&apos;s most empowering multi-vendor marketplace.
                        At ShopX, we are always looking for passionate, driven, and innovative individuals to join our growing team.
                    </p>
                    <div className="bg-white border border-gray-200 rounded-3xl p-8 mt-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Current Openings</h2>
                        <p className="mb-4">Currently, we do not have any open positions. Please check back later or send us your resume!</p>
                        <a href="mailto:careers@shopx.lk" className="inline-flex items-center justify-center px-8 py-4 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-full transition shadow-sm">
                            Submit Resume
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
