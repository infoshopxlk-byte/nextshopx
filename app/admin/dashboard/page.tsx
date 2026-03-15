"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
    LayoutDashboard, 
    ArrowUpRight, 
    Wallet, 
    Users, 
    BarChart3,
    ArrowRight
} from "lucide-react";

export default function AdminDashboardPage() {
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const roles = JSON.parse(localStorage.getItem("seller_roles") || "[]");
        if (roles.includes("administrator")) {
            setIsAdmin(true);
        }
        setLoading(false);
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 text-white">
                <LayoutDashboard className="w-16 h-16 text-white/20" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p className="text-slate-400">You do not have permission to view this command center.</p>
                <Link href="/" className="text-orange-500 hover:underline font-bold">Return Home</Link>
            </div>
        );
    }

    return (
        <div className="space-y-12 p-8 min-h-screen text-slate-100 bg-[#0a0a0f]">
            {/* Hero Section */}
            <div className="relative">
                <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="relative">
                    <h1 className="text-5xl md:text-6xl font-black tracking-tight text-white mb-6">
                        Admin <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-500">Center</span>
                    </h1>
                    <p className="text-slate-400 max-w-2xl text-xl font-medium leading-relaxed">
                        Control your marketplace ecosystem. Monitor performance, manage vendors, and oversee financial operations from a single unified interface.
                    </p>
                </div>
            </div>

            {/* Quick Stats - Glassmorphic Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                    { label: "Total Revenue", value: "LKR 2.4M", icon: Wallet, color: "text-emerald-400", href: "#" },
                    { label: "Active Sellers", value: "142", icon: Users, color: "text-blue-400", href: "/admin/dashboard/vendors" },
                    { label: "Today's Orders", value: "84", icon: LayoutDashboard, color: "text-orange-400", href: "#" },
                    { label: "Growth Rate", value: "+12.5%", icon: BarChart3, color: "text-rose-400", href: "#" },
                ].map((stat, i) => (
                    <Link key={i} href={stat.href} className="group relative overflow-hidden p-8 rounded-[2.5rem] bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 transform hover:-translate-y-2 block shadow-2xl">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 transition-transform duration-500 group-hover:scale-150" />
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-6">
                                <div className={`p-4 rounded-2xl bg-white/5 ${stat.color} shadow-inner`}>
                                    <stat.icon className="w-7 h-7" />
                                </div>
                                <ArrowUpRight className="w-6 h-6 text-white/20 group-hover:text-white transition-colors duration-300" />
                            </div>
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-2">{stat.label}</h3>
                            <div className="text-4xl font-black text-white">{stat.value}</div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Main Modules - Large Featured Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <Link href="/admin/dashboard/payouts" className="group relative overflow-hidden p-10 rounded-[3rem] bg-gradient-to-br from-white/10 to-transparent backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all duration-500 shadow-2xl">
                    <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-orange-500/10 rounded-full blur-[80px] group-hover:bg-orange-500/20 transition-colors duration-500" />
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-8">
                            <div className="w-20 h-20 rounded-[2rem] bg-orange-500/20 flex items-center justify-center shadow-xl border border-orange-500/20">
                                <Wallet className="w-10 h-10 text-orange-400" />
                            </div>
                            <div className="p-3 bg-white/5 rounded-full text-white/20 group-hover:text-white transition-all duration-500">
                                <ArrowRight className="w-8 h-8 group-hover:translate-x-2" />
                            </div>
                        </div>
                        <h2 className="text-4xl font-black text-white mb-4">Payout Requests</h2>
                        <p className="text-slate-400 text-lg leading-relaxed max-w-md mb-8">
                            Execute financial settlements for your vendors. There are <span className="text-orange-400 font-black">12 requests</span> awaiting your approval.
                        </p>
                        <div className="mt-auto flex items-center gap-3 text-sm font-bold text-orange-400">
                            <span>Open Payout Manager</span>
                            <div className="h-1 w-12 bg-orange-400/20 rounded-full overflow-hidden">
                                <div className="h-full bg-orange-400 w-0 group-hover:w-full transition-all duration-700" />
                            </div>
                        </div>
                    </div>
                </Link>

                <Link href="/admin/dashboard/vendors" className="group relative overflow-hidden p-10 rounded-[3rem] bg-gradient-to-br from-white/10 to-transparent backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all duration-500 shadow-2xl">
                    <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-blue-500/10 rounded-full blur-[80px] group-hover:bg-blue-500/20 transition-colors duration-500" />
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-8">
                            <div className="w-20 h-20 rounded-[2rem] bg-blue-500/20 flex items-center justify-center shadow-xl border border-blue-500/20">
                                <Users className="w-10 h-10 text-blue-400" />
                            </div>
                            <div className="p-3 bg-white/5 rounded-full text-white/20 group-hover:text-white transition-all duration-500">
                                <ArrowRight className="w-8 h-8 group-hover:translate-x-2" />
                            </div>
                        </div>
                        <h2 className="text-4xl font-black text-white mb-4">Sellers Directory</h2>
                        <p className="text-slate-400 text-lg leading-relaxed max-w-md mb-8">
                            Full control over vendor accounts. Audit profiles, verify documentation, and monitor individual shop health metrics.
                        </p>
                        <div className="mt-auto flex items-center gap-3 text-sm font-bold text-blue-400">
                            <span>Manage All Vendors</span>
                            <div className="h-1 w-12 bg-blue-400/20 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-400 w-0 group-hover:w-full transition-all duration-700" />
                            </div>
                        </div>
                    </div>
                </Link>
            </div>

            {/* Secondary Actions / Info */}
            <div className="p-10 rounded-[3rem] bg-white/[0.02] border border-white/5 backdrop-blur-sm flex flex-col items-center justify-center text-center space-y-6">
                <div className="flex justify-center gap-6">
                    {["System Audit", "Market Analytics", "Inventory Logs", "Dispute Resolution"].map((tag) => (
                        <span key={tag} className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-xs font-black text-slate-500 tracking-widest uppercase hover:bg-white/10 hover:text-white transition-all cursor-default">
                            {tag}
                        </span>
                    ))}
                </div>
                <p className="text-slate-600 text-sm font-medium">Advanced marketplace modules currently under scheduled maintenance.</p>
            </div>
        </div>
    );
}
