"use client";

import { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import {
    User,
    Package,
    MapPin,
    LogOut,
    LayoutDashboard,
    ChevronRight,
    Clock,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Store
} from "lucide-react";
import api from "@/lib/woocommerce";

export default function AccountPage() {
    const { data: session, status } = useSession();
    const [activeTab, setActiveTab] = useState("dashboard");
    const [authMode, setAuthMode] = useState<"login" | "register">("login");
    const [orders, setOrders] = useState<any[]>([]);
    const [isLoadingOrders, setIsLoadingOrders] = useState(false);

    // Auth States
    const [loginData, setLoginData] = useState({ email: "", password: "" });
    const [registerData, setRegisterData] = useState({ firstName: "", lastName: "", email: "", password: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Fetch orders if logged in
    useEffect(() => {
        if (session?.user?.email) {
            fetchOrders();
        }
    }, [session]);

    const fetchOrders = async () => {
        setIsLoadingOrders(true);
        try {
            // In a real scenario, we'd fetch via an internal API to avoid exposing keys,
            // but for this dashboard implementation, we'll use the lib for structure.
            const response = await fetch(`/api/orders?email=${session?.user?.email}`);
            const data = await response.json();
            if (data.success) {
                setOrders(data.orders);
            }
        } catch (err) {
            console.error("Failed to fetch orders:", err);
        } finally {
            setIsLoadingOrders(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const result = await signIn("credentials", {
            email: loginData.email,
            password: loginData.password,
            redirect: false,
        });

        if (result?.error) {
            setError("Invalid email or password. Please check your credentials and try again.");
        }
        setIsSubmitting(false);
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: registerData.email,
                    first_name: registerData.firstName,
                    last_name: registerData.lastName,
                    password: registerData.password,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Registration failed");
            }

            // Auto-login after successful registration
            const loginResult = await signIn("credentials", {
                email: registerData.email,
                password: registerData.password,
                redirect: false,
            });

            if (loginResult?.error) {
                setSuccess("Account created! Please log in above.");
                setAuthMode("login");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (status === "loading") {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                <p className="mt-4 text-gray-500 font-medium">Loading your account...</p>
            </div>
        );
    }

    // --- GUEST VIEW: Login / Register ---
    if (!session) {
        return (
            <div className="max-w-md mx-auto py-12 px-4 sm:px-0">
                <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl p-8 md:p-10">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 mb-6">
                            <User className="h-8 w-8" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                            {authMode === "login" ? "Welcome back to ShopX" : "Join the Community"}
                        </h1>
                        <p className="mt-3 text-gray-500 font-medium">
                            {authMode === "login" ? "Login to manage your orders" : "Create an account to track your orders"}
                        </p>
                    </div>

                    <div className="flex p-1 bg-gray-50 rounded-2xl mb-8">
                        <button
                            onClick={() => { setAuthMode("login"); setError(null); setSuccess(null); }}
                            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${authMode === "login" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                        >
                            Login
                        </button>
                        <button
                            onClick={() => { setAuthMode("register"); setError(null); setSuccess(null); }}
                            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${authMode === "register" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                        >
                            Register
                        </button>
                    </div>

                    {authMode === "login" ? (
                        <form onSubmit={handleLogin} className="space-y-6">
                            {error && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm font-semibold animate-shake">
                                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                    {error}
                                </div>
                            )}
                            {success && (
                                <div className="p-4 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3 text-green-600 text-sm font-semibold">
                                    <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                                    {success}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={loginData.email}
                                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                                    placeholder="name@email.com"
                                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-medium"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Password</label>
                                <input
                                    type="password"
                                    required
                                    value={loginData.password}
                                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                                    placeholder="••••••••"
                                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-medium"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                            >
                                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign In to Account"}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleRegister} className="space-y-6">
                            {error && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm font-semibold animate-shake">
                                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">First Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={registerData.firstName}
                                        onChange={(e) => setRegisterData({ ...registerData, firstName: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 outline-none font-medium text-sm transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Last Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={registerData.lastName}
                                        onChange={(e) => setRegisterData({ ...registerData, lastName: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 outline-none font-medium text-sm transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={registerData.email}
                                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                                    placeholder="your@email.com"
                                    className="w-full px-5 py-4 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 outline-none font-medium text-sm transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Password</label>
                                <input
                                    type="password"
                                    required
                                    minLength={8}
                                    value={registerData.password}
                                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                                    placeholder="min. 8 characters"
                                    className="w-full px-5 py-4 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 outline-none font-medium text-sm transition-all"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                            >
                                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create Free Account"}
                            </button>
                        </form>
                    )}

                    <div className="mt-8 pt-6 border-t border-gray-50 text-center text-xs text-gray-400 font-medium">
                        By continuing, you agree to ShopX's <button className="text-blue-600 font-bold hover:underline">Terms of Service</button> and <button className="text-blue-600 font-bold hover:underline">Privacy Policy</button>.
                    </div>
                </div>
            </div>
        );
    }

    // --- LOGGED IN VIEW: Dashboard ---
    return (
        <div className="max-w-7xl mx-auto py-4">
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">

                {/* Desktop Sidebar */}
                <aside className="hidden lg:block space-y-2">
                    <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-xl">
                                {session.user?.name?.[0]}
                            </div>
                            <div className="flex-1 truncate">
                                <h3 className="font-bold text-gray-900 truncate">{session.user?.name}</h3>
                                <p className="text-xs text-gray-500 font-medium truncate">{session.user?.email}</p>
                            </div>
                        </div>
                    </div>

                    <nav className="space-y-1">
                        {[
                            { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
                            { id: "orders", label: "My Orders", icon: Package },
                            { id: "addresses", label: "Shipping Addresses", icon: MapPin },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${activeTab === tab.id
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                                    }`}
                            >
                                <tab.icon className="h-5 w-5" />
                                {tab.label}
                            </button>
                        ))}
                        <button
                            onClick={() => signOut()}
                            className="w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold text-red-500 hover:bg-red-50 transition-all mt-4"
                        >
                            <LogOut className="h-5 w-5" />
                            Logout
                        </button>
                    </nav>
                </aside>

                {/* Mobile Tab Nav */}
                <div className="lg:hidden flex overflow-x-auto pb-2 gap-2 no-scrollbar">
                    {["dashboard", "orders", "addresses"].map((id) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className={`flex-shrink-0 px-5 py-3 rounded-full font-bold text-sm whitespace-nowrap transition-all ${activeTab === id ? "bg-blue-600 text-white shadow-md" : "bg-gray-100 text-gray-600"
                                }`}
                        >
                            {id.charAt(0).toUpperCase() + id.slice(1)}
                        </button>
                    ))}
                    <button onClick={() => signOut()} className="px-5 py-3 rounded-full bg-red-50 text-red-500 font-bold text-sm">Logout</button>
                </div>

                {/* Content Area */}
                <main className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 min-h-[600px]">
                    {activeTab === "dashboard" && (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Hello, {session.user?.name}!</h2>
                                <p className="text-gray-500 font-medium mt-1">From your dashboard you can view your recent orders and manage your account details.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="p-6 rounded-3xl bg-blue-50 border border-blue-100">
                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-blue-600 mb-4 shadow-sm">
                                        <Package className="h-5 w-5" />
                                    </div>
                                    <div className="text-2xl font-black text-blue-600">{orders.length}</div>
                                    <div className="text-xs font-black uppercase tracking-widest text-blue-400 mt-1">Total Orders</div>
                                </div>
                                <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-600 mb-4 shadow-sm">
                                        <Clock className="h-5 w-5" />
                                    </div>
                                    <div className="text-2xl font-black text-slate-600">{orders.filter(o => o.status === 'pending' || o.status === 'processing').length}</div>
                                    <div className="text-xs font-black uppercase tracking-widest text-slate-400 mt-1">Pending Sync</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "orders" && (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">My Order History</h2>

                            {isLoadingOrders ? (
                                <div className="flex flex-col items-center py-20">
                                    <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                                </div>
                            ) : orders.length === 0 ? (
                                <div className="flex flex-col items-center py-20 text-center">
                                    <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 mb-4">
                                        <Package className="h-8 w-8" />
                                    </div>
                                    <p className="font-bold text-gray-900">No orders found yet</p>
                                    <p className="text-sm text-gray-500 mt-1">You haven't placed any orders on ShopX yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {orders.map((order) => {
                                        // Calculate Koko markup if payment was koko
                                        const isKoko = order.payment_method === 'koko';
                                        const displayTotal = isKoko ? parseFloat(order.total) * 1.13 : parseFloat(order.total);

                                        return (
                                            <div key={order.id} className="group p-5 rounded-3xl border border-gray-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all">
                                                <div className="flex flex-wrap items-center justify-between gap-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-sm font-black text-gray-900">Order #{order.number}</span>
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${order.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                                order.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                                                                    'bg-amber-100 text-amber-700'
                                                                }`}>
                                                                {order.status}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-gray-400 font-medium font-mono">
                                                            {new Date(order.date_created).toLocaleDateString()}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 text-sm font-bold text-blue-600 bg-blue-50/50 px-3 py-1.5 rounded-xl border border-blue-100/50">
                                                        <Store className="h-3.5 w-3.5" />
                                                        {order.line_items?.[0]?.wcfm_store_info?.store_name || "GearUp Tech"}
                                                    </div>

                                                    <div className="text-right">
                                                        <div className="text-lg font-black text-gray-900">
                                                            Rs. {displayTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </div>
                                                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                            {isKoko ? "Paid via Koko (+13%)" : order.payment_method_title}
                                                        </div>
                                                    </div>

                                                    <button className="p-2 rounded-xl bg-gray-50 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                        <ChevronRight className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "addresses" && (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Saved Shipping Address</h2>

                            {orders.length > 0 ? (
                                <div className="p-8 rounded-3xl border border-gray-100 bg-white shadow-sm">
                                    <div className="flex items-start gap-6">
                                        <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                                            <MapPin className="h-6 w-6" />
                                        </div>
                                        <div className="space-y-4 flex-1">
                                            <div>
                                                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Last Used Address</div>
                                                <h3 className="font-bold text-gray-900 text-lg">
                                                    {orders[0].shipping.first_name} {orders[0].shipping.last_name}
                                                </h3>
                                            </div>

                                            <div className="text-gray-600 leading-relaxed font-medium">
                                                {orders[0].shipping.address_1}<br />
                                                {orders[0].shipping.address_2 && <>{orders[0].shipping.address_2}<br /></>}
                                                {orders[0].shipping.city}, {orders[0].shipping.state} {orders[0].shipping.postcode}<br />
                                                Sri Lanka
                                            </div>

                                            <div className="pt-4 flex gap-4">
                                                <button className="text-sm font-bold text-blue-600 hover:text-blue-700">Edit Address</button>
                                                <button className="text-sm font-bold text-gray-400">Set as Primary</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-8 rounded-3xl border-2 border-dashed border-gray-100 bg-gray-50/30 flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 rounded-3xl bg-white shadow-sm flex items-center justify-center text-gray-300 mb-4">
                                        <MapPin className="h-8 w-8" />
                                    </div>
                                    <p className="font-bold text-gray-900 text-lg">No address saved yet</p>
                                    <p className="text-sm text-gray-500 mt-2 max-w-sm">Place your first order to automatically save your shipping details here for future use.</p>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
