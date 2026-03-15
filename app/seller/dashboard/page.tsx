"use client";

import { useEffect, useState, useCallback } from "react";

interface Stats {
    total_earnings: number;
    gross_sales: number;
    balance: number;
    platform_fees: number;
    total_orders: number;
}

interface Order {
    id: number;
    status: string;
    total: string;
    date_created: string;
    billing?: { first_name?: string; last_name?: string };
}

function StatCard({
    label,
    value,
    sub,
    icon,
    gradient,
    trend,
}: {
    label: string;
    value: string;
    sub?: string;
    icon: React.ReactNode;
    gradient: string;
    trend?: { value: string; up: boolean };
}) {
    return (
        <div className="relative overflow-hidden rounded-2xl bg-[#13131f] border border-white/[0.07] p-5 group hover:border-white/[0.12] transition-all duration-300">
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${gradient} pointer-events-none`} />
            <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
                        {icon}
                    </div>
                    {trend && (
                        <span
                            className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${trend.up ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10"}`}
                        >
                            {trend.up ? "▲" : "▼"} {trend.value}
                        </span>
                    )}
                </div>
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-sm text-white/40 mt-0.5">{label}</p>
                {sub && <p className="text-xs text-white/25 mt-1">{sub}</p>}
            </div>
        </div>
    );
}

const STATUS_COLOR: Record<string, string> = {
    completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    processing: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    pending: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    cancelled: "bg-red-500/15 text-red-400 border-red-500/20",
    refunded: "bg-purple-500/15 text-purple-400 border-purple-500/20",
    "on-hold": "bg-orange-500/15 text-orange-400 border-orange-500/20",
};

function fmtDate(d: string) {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

import VendorOnboardingStatus from "@/app/components/VendorOnboardingStatus";

function fmtLKR(n: number) {
    const val = n || 0;
    return "Rs. " + val.toLocaleString("en-LK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

export default function SellerDashboardPage() {
    const [stats, setStats] = useState<Stats>({
        total_earnings: 0,
        total_orders: 0,
        balance: 0,
        gross_sales: 0,
        platform_fees: 0
    });
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [storeName, setStoreName] = useState("Dashboard");
    const [vendorStatus, setVendorStatus] = useState<'pending' | 'rejected' | 'active'>('active');
    const [rejectionReason, setRejectionReason] = useState("");

    const fetchData = useCallback(async () => {
        const token = localStorage.getItem("seller_token");
        const store = localStorage.getItem("seller_store") || "Dashboard";
        setStoreName(store);

        if (!token) return;

        try {
            const WP = process.env.NEXT_PUBLIC_WORDPRESS_URL;

            // Fetch User Meta/Status as well
            const [ordersRes, statsRes, userRes] = await Promise.allSettled([
                fetch(`/api/proxy?path=/shopx/v1/seller/orders&per_page=100`, {
                    headers: { Authorization: `Bearer ${token}` },
                    cache: "no-store",
                }),
                fetch(`/api/proxy?path=/shopx/v1/seller/stats-summary`, {
                    headers: { Authorization: `Bearer ${token}` },
                    cache: "no-store",
                }),
                // We need an endpoint to get the current user's profile/meta
                fetch(`/api/proxy?path=/wp/v2/users/me&context=edit`, {
                    headers: { Authorization: `Bearer ${token}` },
                    cache: "no-store",
                })
            ]);

            if (userRes.status === "fulfilled" && userRes.value.ok) {
                const userData = await userRes.value.json();
                const status = userData.meta?.vendor_status || 'active';
                setVendorStatus(status);
                setRejectionReason(userData.meta?.rejection_reason || "");
            }

            let fetchedCommission = null;
            if (statsRes.status === "fulfilled" && statsRes.value.ok) {
                const raw = await statsRes.value.json();
                fetchedCommission = raw.data ?? null;
            }

            if (ordersRes.status === "fulfilled" && ordersRes.value.ok) {
                const raw = await ordersRes.value.json();
                // New endpoint returns { success, data: [...] }
                const list = Array.isArray(raw) ? raw : (raw.data ?? []);
                
                const validOrders = list.filter((o: any) => ['completed', 'processing'].includes((o.status || "").toLowerCase()));
                
                // Calculate frontend commission
                const totalSales = validOrders.reduce((sum: number, o: any) => sum + parseFloat(o.total || "0"), 0);
                
                const platformFees = totalSales * 0.08;
                const netEarnings = totalSales - platformFees;

                if (fetchedCommission) {
                    // Map new API keys to stats state
                    setStats({
                        total_earnings: fetchedCommission.total_earnings ?? 0,
                        gross_sales: fetchedCommission.gross_sales ?? fetchedCommission.total_earnings ?? 0,
                        balance: fetchedCommission.balance ?? 0,
                        platform_fees: fetchedCommission.platform_fees ?? (totalSales * 0.08),
                        total_orders: fetchedCommission.total_orders ?? validOrders.length
                    });
                } else {
                    setStats({
                        gross_sales: totalSales,
                        total_earnings: netEarnings,
                        platform_fees: platformFees,
                        balance: 0,
                        total_orders: validOrders.length
                    });
                }

                // Cleanup: Filter out 'pending' orders older than 24 hours
                const filteredList = list.filter((order: Order) => {
                    if (order.status === 'pending') {
                        const ageInHours = (Date.now() - new Date(order.date_created).getTime()) / (1000 * 60 * 60);
                        return ageInHours <= 24;
                    }
                    return true;
                });
                
                setOrders(filteredList.slice(0, 8));
            }

        } catch (e) {
            console.error("Dashboard fetch error:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const s = stats;

    return (
        <div className="space-y-8 text-white">
            <VendorOnboardingStatus status={vendorStatus} rejectionReason={rejectionReason} />
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Welcome back, {storeName} 👋</h1>
                    <p className="text-sm text-white/40 mt-1">Here&apos;s what&apos;s happening with your store today.</p>
                </div>
                <button
                    id="refresh-dashboard"
                    onClick={() => { setLoading(true); fetchData(); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/60 hover:text-white hover:bg-white/10 transition-all"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard
                    label="Net Earnings"
                    value={loading ? "—" : fmtLKR(s.total_earnings)}
                    sub="After platform fee"
                    gradient="from-violet-600/20 to-indigo-600/10"
                    icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg>}
                />
                <StatCard
                    label="Gross Sales"
                    value={loading ? "—" : fmtLKR(s.gross_sales)}
                    sub="Before deductions"
                    gradient="from-emerald-600/20 to-teal-600/10"
                    icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                />
                <StatCard
                    label="Pending Balance"
                    value={loading ? "—" : fmtLKR(s.balance)}
                    sub="Awaiting withdrawal"
                    gradient="from-amber-600/20 to-orange-600/10"
                    icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />
                <StatCard
                    label="Platform Fee"
                    value={loading ? "—" : fmtLKR(s.platform_fees)}
                    sub="8% commission paid"
                    gradient="from-rose-600/20 to-pink-600/10"
                    icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                />
            </div>

            {/* Recent Orders */}
            <div className="rounded-2xl bg-[#13131f] border border-white/[0.07] overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <h2 className="text-base font-semibold text-white">Recent Orders</h2>
                    <span className="text-xs text-white/30">{orders.length} orders shown</span>
                </div>

                {loading ? (
                    <div className="divide-y divide-white/5">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="px-6 py-4 flex items-center gap-4 animate-pulse">
                                <div className="w-16 h-4 bg-white/5 rounded-md" />
                                <div className="flex-1 h-4 bg-white/5 rounded-md" />
                                <div className="w-20 h-4 bg-white/5 rounded-md" />
                                <div className="w-24 h-4 bg-white/5 rounded-md" />
                            </div>
                        ))}
                    </div>
                ) : orders.length === 0 ? (
                    <div className="px-6 py-16 text-center text-white/30">
                        <svg className="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        No orders yet
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm" id="recent-orders-table">
                            <thead>
                                <tr className="border-b border-white/5">
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-white/30 uppercase tracking-widest">Order</th>
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-white/30 uppercase tracking-widest">Customer</th>
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-white/30 uppercase tracking-widest">Date</th>
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-white/30 uppercase tracking-widest">Status</th>
                                    <th className="text-right px-6 py-3 text-xs font-semibold text-white/30 uppercase tracking-widest">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.04]">
                                {orders.map((order) => (
                                    <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-3.5 font-mono text-violet-400 font-medium">#{order.id}</td>
                                        <td className="px-6 py-3.5 text-white/70">
                                            {order.billing?.first_name || order.billing?.last_name
                                                ? `${order.billing?.first_name ?? ""} ${order.billing?.last_name ?? ""}`.trim()
                                                : "—"}
                                        </td>
                                        <td className="px-6 py-3.5 text-white/40">{fmtDate(order.date_created)}</td>
                                        <td className="px-6 py-3.5">
                                            <div className="flex flex-col items-start gap-1">
                                                <span
                                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${STATUS_COLOR[order.status] ?? "bg-white/5 text-white/40 border-white/10"}`}
                                                >
                                                    {order.status}
                                                </span>
                                                {order.status === 'pending' && (
                                                    <span className="text-[10px] font-medium text-amber-500/80">
                                                        Payment not completed
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3.5 text-right text-white font-semibold">
                                            Rs. {parseFloat(order.total).toLocaleString("en-LK", { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
