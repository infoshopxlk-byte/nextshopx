"use client";

import { useEffect, useState, useCallback } from "react";

interface PayoutRequest {
    id: number;
    vendor_id: number;
    store_name: string;
    amount: number;
    status: string;
    requested_at: string;
}

export default function AdminPayoutsPage() {
    const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [approvingIds, setApprovingIds] = useState<Set<number>>(new Set());

    const checkAuth = useCallback(() => {
        const roles = JSON.parse(localStorage.getItem("seller_roles") || "[]");
        if (roles.includes("administrator")) {
            setIsAdmin(true);
            return true;
        }
        setError("Access Denied. Administrator only.");
        setLoading(false);
        return false;
    }, []);

    const fetchPayouts = useCallback(async () => {
        if (!checkAuth()) return;

        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem("seller_token");
            const WP    = process.env.NEXT_PUBLIC_WORDPRESS_URL;
            if (!token || !WP) {
                setError("Not authenticated.");
                setLoading(false);
                return;
            }

            const res = await fetch(`/api/proxy?path=/shopx/v1/admin/payouts`, {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store",
            });

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`API error ${res.status}: ${txt.substring(0, 120)}`);
            }

            const data = await res.json();
            if (data.success) {
                setPayouts(data.payouts || []);
            } else {
                throw new Error(data.message || "Failed to fetch payouts.");
            }
        } catch (e: unknown) {
            console.error("Payouts fetch error:", e);
            setError(e instanceof Error ? e.message : "Failed to load payouts.");
        } finally {
            setLoading(false);
        }
    }, [checkAuth]);

    const handleApprove = async (requestId: number) => {
        if (approvingIds.has(requestId)) return;

        setApprovingIds(prev => new Set(prev).add(requestId));
        try {
            const token = localStorage.getItem("seller_token");
            const WP    = process.env.NEXT_PUBLIC_WORDPRESS_URL;
            
            const res = await fetch(`${WP}/wp-json/shopx/v1/admin/payout-approve`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ request_id: requestId }),
            });

            const data = await res.json();
            if (data.success) {
                // Remove from local list
                setPayouts(prev => prev.filter(p => p.id !== requestId));
            } else {
                alert(data.message || "Approval failed.");
            }
        } catch (e) {
            console.error("Approve error:", e);
            alert("An error occurred during approval.");
        } finally {
            setApprovingIds(prev => {
                const next = new Set(prev);
                next.delete(requestId);
                return next;
            });
        }
    };

    useEffect(() => {
        fetchPayouts();
    }, [fetchPayouts]);

    if (!isAdmin && !loading && error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
                <div className="p-4 rounded-full bg-red-500/10 text-red-500">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-white">Access Denied</h1>
                <p className="text-white/60 max-w-md">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 text-white min-h-screen p-6 bg-transparent">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-400">
                        Pending Payouts
                    </h1>
                    <p className="text-sm text-white/40 mt-1">
                        Review and approve vendor withdrawal requests
                    </p>
                </div>
                <button
                    onClick={fetchPayouts}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/60 hover:text-white hover:bg-white/10 transition disabled:opacity-50"
                >
                    <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {loading ? "Refreshing..." : "Refresh"}
                </button>
            </div>

            {error && !loading && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Table Container */}
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/5">
                                <th className="px-6 py-4 text-xs font-semibold text-white/40 uppercase tracking-wider">ID</th>
                                <th className="px-6 py-4 text-xs font-semibold text-white/40 uppercase tracking-wider">Store Name</th>
                                <th className="px-6 py-4 text-xs font-semibold text-white/40 uppercase tracking-wider text-right">Amount</th>
                                <th className="px-6 py-4 text-xs font-semibold text-white/40 uppercase tracking-wider">Requested At</th>
                                <th className="px-6 py-4 text-xs font-semibold text-white/40 uppercase tracking-wider text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {payouts.length === 0 && !loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-white/30 italic">
                                        No pending payout requests found.
                                    </td>
                                </tr>
                            ) : (
                                payouts.map((p) => (
                                    <tr key={p.id} className="group hover:bg-white/[0.02] transition">
                                        <td className="px-6 py-4 font-mono text-sm text-white/60">#{p.id}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-white group-hover:text-orange-400 transition">{p.store_name}</span>
                                                <span className="text-xs text-white/40">Vendor ID: {p.vendor_id}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-lg font-bold text-emerald-400">
                                                LKR {p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-white/40">
                                            {new Date(p.requested_at).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleApprove(p.id)}
                                                disabled={approvingIds.has(p.id)}
                                                className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale disabled:scale-100 shadow-lg shadow-emerald-600/20"
                                            >
                                                {approvingIds.has(p.id) ? (
                                                    <div className="flex items-center gap-2">
                                                        <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        Processing
                                                    </div>
                                                ) : "Approve"}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <style jsx global>{`
                @keyframes shine {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
}
