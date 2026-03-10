export default function ReturnsRefundsPage() {
    return (
        <div className="bg-gray-50 min-h-[calc(100vh-80px)] flex flex-col">
            <div className="max-w-6xl mx-auto px-4 py-20 text-gray-900 flex-1 w-full">
                <h1 className="text-4xl font-bold mb-8 text-gray-900">Returns &amp; Refunds</h1>
                <div className="space-y-6 text-gray-600 leading-relaxed">
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Return Policy</h2>
                        <p>
                            If you are not entirely satisfied with your purchase, we're here to help. You have 14 calendar days to return an item from the date you received it.
                            To be eligible for a return, your item must be unused, in the same condition that you received it, and in its original packaging.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-8">Refunds</h2>
                        <p>
                            Once we receive your item, we will inspect it and notify you that we have received your returned item. We will immediately notify you on the status of your refund after inspecting the item.
                            If your return is approved, we will initiate a refund to your original method of payment (or directly to your bank account/card).
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
