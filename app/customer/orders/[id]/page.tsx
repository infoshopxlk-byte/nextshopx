"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    Loader2,
    ArrowLeft,
    Package,
    MapPin,
    Store,
    AlertCircle,
    CheckCircle2
} from "lucide-react";

export default function OrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { data: session, status } = useSession();

    const [order, setOrder] = useState<any>(null);
    const [notes, setNotes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const [cancelModal, setCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState("");
    const [isCancelling, setIsCancelling] = useState(false);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/account");
            return;
        }
        if (session?.user?.email && params.id) {
            fetchOrderDetails();
        }
    }, [session, status, params.id]);

    const fetchOrderDetails = async () => {
        try {
            const res = await fetch(`/api/orders/${params.id}?email=${session?.user?.email}`, { cache: 'no-store' });
            const data = await res.json();
            if (data.success) {
                setOrder(data.order);
                setNotes(data.notes || []);
            } else {
                setError(data.message || "Failed to load order.");
            }
        } catch (e) {
            setError("An error occurred while loading order.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelSubmit = async () => {
        if (!order) return;
        setIsCancelling(true);
        try {
            const res = await fetch("/api/orders/cancel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    order_id: order.id,
                    email: session?.user?.email,
                    reason: cancelReason
                })
            });
            const data = await res.json();
            if (data.success) {
                // Update local status
                setOrder({ ...order, status: "cancelled" });
                setCancelModal(false);
                setCancelReason("");
            } else {
                alert(data.message || "Failed to cancel order.");
            }
        } catch (e) {
            console.error(e);
            alert("An error occurred.");
        } finally {
            setIsCancelling(false);
        }
    };

    if (isLoading || status === "loading") {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="max-w-4xl mx-auto py-12 px-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 mx-auto flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Order Not Found</h2>
                <p className="text-gray-500 mb-6">{error || "We couldn't find the requested order."}</p>
                <Link href="/account" className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline">
                    <ArrowLeft className="w-4 h-4" /> Back to Account
                </Link>
            </div>
        );
    }

    const isKoko = order.payment_method === 'koko';
    const displayTotal = isKoko ? parseFloat(order.total) * 1.13 : parseFloat(order.total);

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
            <Link href="/account" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors mb-6">
                <ArrowLeft className="w-4 h-4" /> Back to Orders
            </Link>

            {/* Order Header */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 mb-6 flex flex-wrap items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-2xl font-black text-gray-900">Order #{order.number}</h1>
                        <span className={`px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-widest ${order.status === 'completed' ? 'bg-green-100 text-green-700' :
                                order.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                                    order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                        'bg-amber-100 text-amber-700'
                            }`}>
                            {order.status}
                        </span>
                    </div>
                    <p className="text-sm font-medium text-gray-500">
                        Placed on {new Date(order.date_created).toLocaleString()}
                    </p>
                </div>

                <div className="flex gap-3">
                    {(order.status === 'processing' || order.status === 'pending') && (
                        <button
                            onClick={() => setCancelModal(true)}
                            className="px-4 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest text-red-500 bg-red-50 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                        >
                            Cancel Order
                        </button>
                    )}
                </div>
            </div>

            {/* Grid Layout Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Left Column: Items & Notes */}
                <div className="md:col-span-2 space-y-6">
                    {/* Items */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                <Package className="w-5 h-5 text-blue-600" />
                                Order Items
                            </h2>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {order.line_items?.map((item: any) => (
                                <div key={item.id} className="p-6 flex gap-4 items-start">
                                    <div className="flex-1 space-y-2">
                                        <h3 className="font-bold text-gray-900 leading-tight">{item.name}</h3>
                                        <div className="flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50/50 px-2.5 py-1 rounded-lg border border-blue-100/50 w-fit">
                                            <Store className="h-3 w-3" />
                                            {item.wcfm_store_info?.store_name || "GearUp Tech"}
                                        </div>
                                        <div className="text-sm font-medium text-gray-500">
                                            Qty: <span className="text-gray-900 font-bold">{item.quantity}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-black text-gray-900">
                                            Rs. {parseFloat(item.total).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-6 bg-gray-50 border-t border-gray-100 space-y-3 font-medium text-sm">
                            <div className="flex justify-between text-gray-500">
                                <span>Subtotal</span>
                                <span className="text-gray-900">Rs. {parseFloat(order.total) - parseFloat(order.shipping_total)}</span>
                            </div>
                            <div className="flex justify-between text-gray-500">
                                <span>Shipping</span>
                                <span className="text-gray-900">Rs. {parseFloat(order.shipping_total)}</span>
                            </div>
                            {isKoko && (
                                <div className="flex justify-between text-gray-500">
                                    <span>Koko Fee (13%)</span>
                                    <span className="text-gray-900">Rs. {(parseFloat(order.total) * 0.13).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-lg font-black text-gray-900 pt-3 border-t border-gray-200 block">
                                <span>Total</span>
                                <span>Rs. {displayTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="text-right text-[10px] font-black uppercase tracking-widest text-gray-400">
                                Paid via {isKoko ? "Koko" : order.payment_method_title}
                            </div>
                        </div>
                    </div>

                    {/* Order Notes */}
                    {notes.length > 0 && (
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                                <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-amber-500" />
                                    Order Updates
                                </h2>
                            </div>
                            <div className="p-6 space-y-6">
                                {notes.map((note: any) => (
                                    <div key={note.id} className="relative pl-6 border-l-2 border-gray-100">
                                        <div className="absolute w-3 h-3 bg-blue-600 rounded-full -left-[7px] top-1.5 ring-4 ring-white" />
                                        <div className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">
                                            {new Date(note.date_created).toLocaleString()}
                                        </div>
                                        <div className="text-sm font-medium text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100" dangerouslySetInnerHTML={{ __html: note.note }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Customer Details */}
                <div className="space-y-6">
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                        <h2 className="text-base font-black text-gray-900 flex items-center gap-2 mb-4">
                            <MapPin className="w-4 h-4 text-blue-600" />
                            Shipping Details
                        </h2>
                        <div className="space-y-1 text-sm font-medium text-gray-600">
                            <p className="font-bold text-gray-900">{order.shipping?.first_name} {order.shipping?.last_name}</p>
                            <p>{order.shipping?.address_1}</p>
                            {order.shipping?.address_2 && <p>{order.shipping?.address_2}</p>}
                            <p>{order.shipping?.city}, {order.shipping?.state} {order.shipping?.postcode}</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                        <h2 className="text-base font-black text-gray-900 flex items-center gap-2 mb-4">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            Billing Details
                        </h2>
                        <div className="space-y-1 text-sm font-medium text-gray-600">
                            <p className="font-bold text-gray-900">{order.billing?.first_name} {order.billing?.last_name}</p>
                            <p>{order.billing?.email}</p>
                            <p>{order.billing?.phone}</p>
                            {order.billing?.address_1 !== order.shipping?.address_1 && (
                                <p className="mt-2 text-xs text-gray-400 rounded bg-gray-50 p-2">Different billing address used.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Cancel Order Modal */}
            {cancelModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4" onClick={() => !isCancelling && setCancelModal(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 flex-shrink-0">
                                <AlertCircle className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-gray-900 leading-tight">Cancel Order</h2>
                                <p className="text-sm text-gray-500 font-medium">Order #{order.number}</p>
                            </div>
                        </div>

                        <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1 mb-2 block">Reason for Cancellation</label>
                        <textarea
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="e.g., Found a better price, changed my mind..."
                            className="w-full h-32 bg-gray-50 border border-transparent rounded-2xl p-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 mb-6 resize-none transition-all font-medium"
                            disabled={isCancelling}
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => setCancelModal(false)}
                                disabled={isCancelling}
                                className="flex-1 py-3.5 rounded-xl font-bold bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all text-sm"
                            >
                                Keep Order
                            </button>
                            <button
                                onClick={handleCancelSubmit}
                                disabled={isCancelling || !cancelReason.trim()}
                                className="flex-1 py-3.5 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/20"
                            >
                                {isCancelling ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm Cancel"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
