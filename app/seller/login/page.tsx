"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SellerLoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_WORDPRESS_URL}/wp-json/shopx/v1/seller/login`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password }),
                }
            );
            const data = await res.json();

            if (!res.ok || !data.token) {
                const msg =
                    data.code === "not_a_vendor"
                        ? "This account does not have vendor access."
                        : data.message || "Login failed. Please check your credentials.";
                setError(msg);
                return;
            }

            // Persist session in localStorage for dashboard reads
            localStorage.setItem("seller_token", data.token);
            localStorage.setItem("seller_id", String(data.user_id));
            localStorage.setItem("seller_store", data.store_name);

            router.push("/seller/dashboard");
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0a0a0f]">
            {/* Animated gradient orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-violet-600/30 to-indigo-800/20 blur-3xl animate-pulse" />
                <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-emerald-600/20 to-teal-800/10 blur-3xl animate-pulse [animation-delay:1.5s]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-gradient-to-r from-violet-900/10 via-indigo-900/10 to-transparent blur-3xl rotate-12" />
            </div>

            {/* Grid overlay */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.04]"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                }}
            />

            {/* Card */}
            <div className="relative z-10 w-full max-w-md mx-4">
                {/* Logo / Brand */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-2xl mb-4 shadow-violet-500/30">
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Seller Portal</h1>
                    <p className="mt-1 text-sm text-white/40">Sign in to your vendor dashboard</p>
                </div>

                <div className="backdrop-blur-2xl bg-white/[0.05] border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/40">
                    <form onSubmit={handleSubmit} className="space-y-5" id="seller-login-form">
                        {/* Error */}
                        {error && (
                            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-300" role="alert">
                                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                {error}
                            </div>
                        )}

                        {/* Username */}
                        <div className="space-y-1.5">
                            <label htmlFor="seller-username" className="block text-xs font-semibold text-white/50 uppercase tracking-widest">
                                Username or Email
                            </label>
                            <input
                                id="seller-username"
                                type="text"
                                autoComplete="username"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 transition-all duration-200"
                                placeholder="yourstore@example.com"
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <label htmlFor="seller-password" className="block text-xs font-semibold text-white/50 uppercase tracking-widest">
                                Password
                            </label>
                            <input
                                id="seller-password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 transition-all duration-200"
                                placeholder="••••••••"
                            />
                        </div>

                        {/* Submit */}
                        <button
                            id="seller-login-submit"
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    Sign In
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 pt-5 border-t border-white/5 text-center text-xs text-white/30">
                        Not a seller yet?{" "}
                        <Link href="/sell" className="text-violet-400 hover:text-violet-300 transition-colors">
                            Apply to become a vendor
                        </Link>
                    </div>
                </div>

                <p className="text-center text-xs text-white/20 mt-6">
                    &copy; {new Date().getFullYear()} ShopX. All rights reserved.
                </p>
            </div>
        </div>
    );
}
