"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Stats {
    net_earnings: number;
    gross_sales: number;
    platform_fees: number;
    pending_balance: number;
    order_count: number;
}

interface Transaction {
    id: number;
    order_id: number;
    product_name: string;
    gross_amount: number;   // item_total
    commission: number;     // commission_amount (net earned)
    platform_fee: number;   // admin_fee (deducted)
    status: string;
    date: string;
}

const STATUS_COLOR: Record<string, string> = {
    completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    processing: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    pending: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    cancelled: "bg-red-500/15 text-red-400 border-red-500/20",
    refunded: "bg-purple-500/15 text-purple-400 border-purple-500/20",
};

function fmtLKR(n: number) {
    return "Rs. " + Number(n).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string) {
    return new Date(d).toLocaleDateString("en-LK", { day: "2-digit", month: "short", year: "numeric" });
}

function BalanceCard({
    label, value, sub, gradient, icon, loading,
}: {
    label: string; value: string; sub: string;
    gradient: string; icon: React.ReactNode; loading: boolean;
}) {
    return (
        <div className="relative overflow-hidden rounded-2xl bg-[#13131f] border border-white/[0.07] p-5 group hover:border-white/[0.12] transition-all duration-300">
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${gradient} pointer-events-none`} />
            <div className="relative z-10">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg mb-4`}>
                    {icon}
                </div>
                {loading ? (
                    <div className="space-y-2 animate-pulse">
                        <div className="h-7 w-32 bg-white/5 rounded-lg" />
                        <div className="h-3 w-20 bg-white/5 rounded" />
                    </div>
                ) : (
                    <>
                        <p className="text-2xl font-bold text-white">{value}</p>
                        <p className="text-xs text-white/40 mt-1">{label}</p>
                        <p className="text-[10px] text-white/25 mt-0.5">{sub}</p>
                    </>
                )}
            </div>
        </div>
    );
}

export default function EarningsPage() {
    const router = useRouter();
    const [stats, setStats] = useState<Stats | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [statsLoading, setStatsLoading] = useState(true);
    const [txLoading, setTxLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        const token = localStorage.getItem("seller_token");
        if (!token) {
            router.replace("/seller/login");
            return;
        }
        const WP = process.env.NEXT_PUBLIC_WORDPRESS_URL;

        // Fetch stats and transactions in parallel
        setStatsLoading(true);
        setTxLoading(true);
        setError(null);

        const [statsRes, txRes] = await Promise.allSettled([
            fetch(`${WP}/wp-json/shopx/v1/seller/stats-summary`, {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store",
            }),
            fetch(`${WP}/wp-json/shopx/v1/seller/transactions?per_page=50`, {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store",
            }),
        ]);

        // Stats
        if (statsRes.status === "fulfilled" && statsRes.value.ok) {
            try {
                const raw = await statsRes.value.json();
                setStats(raw.data ?? null);
            } catch { setError("Failed to parse earnings data."); }
        } else {
            setError("Failed to load earnings summary.");
        }
        setStatsLoading(false);

        // Transactions
        if (txRes.status === "fulfilled" && txRes.value.ok) {
            try {
                const raw = await txRes.value.json();
                const list = Array.isArray(raw) ? raw : (raw.data ?? []);
                setTransactions(list);
            } catch { /* leave empty */ }
        }
        setTxLoading(false);
    }, [router]);

    useEffect(() => {
        const token = localStorage.getItem("seller_token");
        if (!token) { router.replace("/seller/login"); return; }
        fetchAll();
    }, [fetchAll, router]);

    const s = stats ?? { net_earnings: 0, gross_sales: 0, platform_fees: 0, pending_balance: 0, order_count: 0 };

    // Withdrawn = gross_sales - net_earnings - platform_fees differs per setup,
    // so we approximate: withdrawn = net_earnings - pending_balance
    const withdrawn = Math.max(0, s.net_earnings - s.pending_balance);

    return (
        <div className="space-y-8 text-white">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Earnings</h1>
                    <p className="text-sm text-white/40 mt-1">Your financial overview and commission history</p>
                </div>
                <button
                    id="refresh-earnings"
                    onClick={fetchAll}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/60 hover:text-white hover:bg-white/10 transition"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-start gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                </div>
            )}

            {/* Balance Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <BalanceCard
                    label="Net Earnings"
                    value={fmtLKR(s.net_earnings)}
                    sub={`${s.order_count} orders`}
                    gradient="from-violet-600/20 to-indigo-600/10"
                    loading={statsLoading}
                    icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg>}
                />
                <BalanceCard
                    label="Gross Sales"
                    value={fmtLKR(s.gross_sales)}
                    sub="Before deductions"
                    gradient="from-emerald-600/20 to-teal-600/10"
                    loading={statsLoading}
                    icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                />
                <BalanceCard
                    label="Pending Balance"
                    value={fmtLKR(s.pending_balance)}
                    sub="Awaiting withdrawal"
                    gradient="from-amber-600/20 to-orange-600/10"
                    loading={statsLoading}
                    icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />
                <BalanceCard
                    label="Platform Fees"
                    value={fmtLKR(s.platform_fees)}
                    sub="Commission deducted"
                    gradient="from-rose-600/20 to-pink-600/10"
                    loading={statsLoading}
                    icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                />
            </div>

            {/* Transactions Table */}
            <div className="rounded-2xl bg-[#13131f] border border-white/[0.07] overflow-hidden mt-8">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <div>
                        <h2 className="text-base font-semibold text-white">Commission History</h2>
                        <span className="text-xs text-emerald-400 mt-1 block">Next Payout Date: Every two weeks</span>
                    </div>
                    <span className="text-xs text-white/30">{txLoading ? "Loading…" : `${transactions.length} transactions`}</span>
                </div>

                {txLoading ? (
                    <div className="divide-y divide-white/5">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="px-6 py-4 flex items-center gap-4 animate-pulse">
                                <div className="w-16 h-4 bg-white/5 rounded" />
                                <div className="flex-1 h-4 bg-white/5 rounded" />
                                <div className="w-20 h-4 bg-white/5 rounded" />
                                <div className="w-20 h-4 bg-white/5 rounded" />
                                <div className="w-16 h-4 bg-white/5 rounded" />
                            </div>
                        ))}
                    </div>
                ) : s.order_count === 0 ? (
                    <div className="py-20 text-center">
                        <svg className="w-10 h-10 mx-auto mb-3 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="text-white/30 text-sm">No commission records yet</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        {transactions.length === 0 && s.order_count > 0 && (
                            <div className="bg-violet-500/10 border-b border-violet-500/20 px-6 py-4 text-violet-300 text-sm">
                                <strong>Estimated Earnings active:</strong> Your recent {s.order_count} order(s) are currently being processed by the platform. The metrics above represent estimated payouts until final reconciliation.
                            </div>
                        )}
                        <table className="w-full text-sm" id="transactions-table">
                            <thead>
                                <tr className="border-b border-white/5">
                                    {["Order", "Product", "Date", "Status", "Gross", "Platform Fee", "You Earned"].map((h) => (
                                        <th key={h} className="px-5 py-3 text-[10px] font-semibold text-white/30 uppercase tracking-widest text-left whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.04]">
                                {transactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-5 py-3.5 font-mono text-violet-400 font-medium whitespace-nowrap">
                                            #{tx.order_id}
                                        </td>
                                        <td className="px-5 py-3.5 text-white/70 max-w-[200px] truncate" title={tx.product_name}>
                                            {tx.product_name || "—"}
                                        </td>
                                        <td className="px-5 py-3.5 text-white/40 whitespace-nowrap">
                                            {tx.date ? fmtDate(tx.date) : "—"}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${STATUS_COLOR[tx.status] ?? "bg-white/5 text-white/40 border-white/10"}`}>
                                                {tx.status || "pending"}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-white/60 whitespace-nowrap">
                                            {fmtLKR(tx.gross_amount)}
                                        </td>
                                        <td className="px-5 py-3.5 text-rose-400 whitespace-nowrap">
                                            − {fmtLKR(tx.platform_fee)}
                                        </td>
                                        <td className="px-5 py-3.5 text-emerald-400 font-semibold whitespace-nowrap">
                                            {fmtLKR(tx.commission)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            {/* Totals footer */}
                            <tfoot>
                                <tr className="border-t border-white/10 bg-white/[0.02]">
                                    <td colSpan={4} className="px-5 py-3 text-xs font-semibold text-white/30 uppercase tracking-widest">Total</td>
                                    <td className="px-5 py-3 text-white/60 font-semibold whitespace-nowrap">
                                        {fmtLKR(transactions.reduce((a, t) => a + Number(t.gross_amount), 0))}
                                    </td>
                                    <td className="px-5 py-3 text-rose-400 font-semibold whitespace-nowrap">
                                        − {fmtLKR(transactions.reduce((a, t) => a + Number(t.platform_fee), 0))}
                                    </td>
                                    <td className="px-5 py-3 text-emerald-400 font-bold whitespace-nowrap">
                                        {fmtLKR(transactions.reduce((a, t) => a + Number(t.commission), 0))}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
