"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { 
    LayoutDashboard, 
    Wallet, 
    Users, 
    LogOut,
    Menu,
    X
} from "lucide-react";
import { useState } from "react";

const ADMIN_NAV = [
    {
        href: "/admin/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
    },
    {
        href: "/admin/dashboard/payouts",
        label: "Payouts",
        icon: Wallet,
    },
    {
        href: "/admin/dashboard/vendors",
        label: "Sellers",
        icon: Users,
    },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem('seller_token');
        localStorage.removeItem('admin_token');
        localStorage.removeItem('seller_roles');
        window.location.href = '/seller/login';
    };

    return (
        <div className="min-h-screen bg-[#0a0a0f] flex flex-col lg:flex-row">
            {/* Mobile Header */}
            <div className="lg:hidden flex items-center justify-between p-4 bg-[#0d0d14] border-b border-white/5">
                <Link href="/admin/dashboard" className="text-xl font-black tracking-tight text-white">
                    ShopX<span className="text-orange-400">Admin</span>
                </Link>
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-white/70 hover:text-white">
                    {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-72 bg-[#0d0d14] border-r border-white/5 flex flex-col transform transition-transform duration-300 ease-in-out
                ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
                lg:translate-x-0 lg:static lg:w-80
            `}>
                {/* Brand */}
                <div className="p-8 hidden lg:block">
                    <Link href="/admin/dashboard" className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                            <LayoutDashboard className="w-6 h-6 text-white" />
                        </div>
                        <span>ShopX<span className="text-orange-400 font-black">Admin</span></span>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 space-y-2 mt-4 lg:mt-0">
                    <p className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Command Center</p>
                    {ADMIN_NAV.map((item) => {
                        const active = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/admin/dashboard");
                        // special check for base dashboard
                        const isBaseDashboard = item.href === "/admin/dashboard" && pathname === "/admin/dashboard";
                        const isActualActive = item.href === "/admin/dashboard" ? isBaseDashboard : pathname.startsWith(item.href);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`
                                    flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold transition-all duration-200 group
                                    ${isActualActive 
                                        ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30" 
                                        : "text-slate-400 hover:text-white hover:bg-white/5"}
                                `}
                                onClick={() => setIsSidebarOpen(false)}
                            >
                                <item.icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${isActualActive ? "text-white" : "text-slate-500 group-hover:text-orange-400"}`} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer / Logout */}
                <div className="p-6 border-t border-white/5 bg-white/[0.01]">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold text-red-500 hover:bg-red-600 hover:text-white transition-all duration-300 group shadow-lg hover:shadow-red-600/20"
                    >
                        <LogOut className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Overlay for mobile */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Main Content */}
            <main className="flex-1 lg:h-screen lg:overflow-y-auto custom-scrollbar bg-[#0a0a0f]">
                {children}
            </main>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
            `}</style>
        </div>
    );
}
