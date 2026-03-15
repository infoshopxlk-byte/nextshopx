"use client";

import { useState, useEffect, useCallback, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
    Upload, 
    CheckCircle2, 
    ArrowRight, 
    User, 
    Mail, 
    MapPin, 
    Phone, 
    Globe, 
    Lock,
    Shield,
    CreditCard,
    FileText,
    Image as ImageIcon,
    AlertTriangle
} from "lucide-react";

interface FormState {
    first_name: string;
    last_name: string;
    email: string;
    username: string;
    password: string;
    phone: string;
    store_name: string;
    description: string;
    address: string;
    business_type: string;
    nic_number: string;
    bank_details: string;
}

interface FileState {
    nic_front: File | null;
    nic_back: File | null;
    br_document: File | null;
    bank_statement: File | null;
}

function RegisterFormContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isResubmitting = searchParams.get("resubmit") === "true";

    const [form, setForm] = useState<FormState>({
        first_name: "",
        last_name: "",
        email: "",
        username: "",
        password: "",
        phone: "",
        store_name: "",
        description: "",
        address: "",
        business_type: "individual",
        nic_number: "",
        bank_details: "",
    });

    const [files, setFiles] = useState<FileState>({
        nic_front: null,
        nic_back: null,
        br_document: null,
        bank_statement: null,
    });

    const [loading, setLoading] = useState(false);
    const [fetchingData, setFetchingData] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const fetchExistingData = useCallback(async () => {
        const token = localStorage.getItem("seller_token");
        if (!token || !isResubmitting) return;

        setFetchingData(true);
        try {
            const WP = process.env.NEXT_PUBLIC_WORDPRESS_URL;
            const res = await fetch(`${WP}/wp-json/wp/v2/users/me?context=edit`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setForm({
                    first_name: data.first_name || "",
                    last_name: data.last_name || "",
                    email: data.email || "",
                    username: data.username || "",
                    password: "", // Don't pre-fill password
                    phone: data.meta?.billing_phone || "",
                    store_name: data.meta?.store_name || "",
                    description: data.meta?.store_description || "",
                    address: data.meta?.store_address || "",
                    business_type: data.meta?.business_type || "individual",
                    nic_number: data.meta?.nic_number || "",
                    bank_details: data.meta?.bank_details || "",
                });
            }
        } catch (e) {
            console.error("Fetch existing data error:", e);
        } finally {
            setFetchingData(false);
        }
    }, [isResubmitting]);

    useEffect(() => {
        fetchExistingData();
    }, [fetchExistingData]);

    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        if (e.target.files?.[0]) {
            setFiles((prev) => ({ ...prev, [e.target.name]: e.target.files![0] }));
        }
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const formData = new FormData();
            // Append all JSON fields
            Object.entries(form).forEach(([key, value]) => {
                formData.append(key, value);
            });
            // Append files
            Object.entries(files).forEach(([key, file]) => {
                if (file) formData.append(key, file);
            });

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_WORDPRESS_URL}/wp-json/shopx/v1/seller/register`,
                {
                    method: "POST",
                    body: formData, // Browser handles boundary and Content-Type for FormData
                }
            );
            const data = await res.json();

            if (!res.ok || !data.success) {
                setError(data.message || "Submission failed. Please try again.");
                return;
            }

            setSuccess(true);
            setTimeout(() => router.push(localStorage.getItem("seller_token") ? "/seller/dashboard" : "/seller/login"), 2000);
        } catch (e) {
            console.error("Submission error:", e);
            setError("Network error. Please check your connection and try again.");
        } finally {
            setLoading(false);
        }
    }

    if (fetchingData) {
        return (
            <div className="flex items-center justify-center p-20 text-white/40 italic font-medium">
                Syncing existing profile data...
            </div>
        );
    }

    return (
        <div className="relative z-10 w-full max-w-4xl mx-4">
            {/* Brand header */}
            <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-orange-500 to-amber-600 shadow-2xl shadow-orange-500/30 mb-5">
                    <Shield className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-4xl font-black text-white tracking-tight">
                    {isResubmitting ? "Refine Your Application" : "Global Seller Registration"}
                </h1>
                <p className="mt-2 text-slate-400 font-medium tracking-wide">
                    {isResubmitting ? "Fix the issues and resubmit for verification" : "Join the ShopX premium marketplace vendor network"}
                </p>
            </div>

            <div className="backdrop-blur-3xl bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-10 md:p-12 shadow-2xl shadow-black/50 overflow-hidden relative">
                {/* Decorative highlight */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />

                {success ? (
                    <div className="text-center py-16 space-y-6 animate-in zoom-in-95 duration-500">
                        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4 shadow-inner">
                            <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white mb-2">Application Received!</h2>
                            <p className="text-slate-400 font-medium max-w-sm mx-auto">
                                {isResubmitting ? "Your updated documents are now with our audit team." : "Welcome aboard! Redirecting to your command center..."}
                            </p>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-12" id="seller-register-form">
                        {error && (
                            <div className="flex items-start gap-4 bg-red-500/10 border border-red-500/20 rounded-2xl px-6 py-4 text-sm text-red-300 animate-in slide-in-from-top-2" role="alert">
                                <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                                <span className="font-medium font-bold uppercase tracking-tight">{error}</span>
                            </div>
                        )}

                        {/* ── Section: Personal & Account ── */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="space-y-6">
                                <SectionHeader title="Owner Profile" icon={<User className="w-4 h-4" />} />
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="First Name" name="first_name" value={form.first_name} onChange={handleChange} placeholder="Amal" required />
                                    <Field label="Last Name" name="last_name" value={form.last_name} onChange={handleChange} placeholder="Perera" required />
                                </div>
                                <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="amal@example.com" required readonly={isResubmitting} />
                                <Field label="Phone" name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="+94 77 123 4567" required />
                            </div>

                            <div className="space-y-6">
                                <SectionHeader title="Access Security" icon={<Lock className="w-4 h-4" />} />
                                <Field label="Username" name="username" value={form.username} onChange={handleChange} placeholder="amal_premium" required readonly={isResubmitting} />
                                <Field label="Password" name="password" type="password" value={form.password} onChange={handleChange} placeholder={isResubmitting ? "Leave blank to keep current" : "Min. 8 characters"} required={!isResubmitting} />
                                <div className="pt-2">
                                    <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-3">Business Type</label>
                                    <select 
                                        name="business_type" 
                                        value={form.business_type} 
                                        onChange={handleChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white text-sm focus:outline-none focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/20 appearance-none cursor-pointer"
                                    >
                                        <option value="individual" className="bg-[#1a1a25]">Individual / Sole Trader</option>
                                        <option value="company" className="bg-[#1a1a25]">Registered Private Company</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* ── Section: Shop & KYC Details ── */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="space-y-6">
                                <SectionHeader title="Store Presence" icon={<Globe className="w-4 h-4" />} />
                                <Field label="Store Name" name="store_name" value={form.store_name} onChange={handleChange} placeholder="Amal's Global Boutique" required />
                                <Field label="Business Address" name="address" value={form.address} onChange={handleChange} placeholder="No. 45, Galle Road, Colombo 03" required />
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Shop Biography</label>
                                    <textarea
                                        name="description"
                                        rows={4}
                                        value={form.description}
                                        onChange={handleChange}
                                        placeholder="Briefly describe your products and brand story..."
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 text-sm focus:outline-none focus:border-orange-500/60 transition-all resize-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <SectionHeader title="Financial & KYC" icon={<CreditCard className="w-4 h-4" />} />
                                <Field label="NIC / ID Number" name="nic_number" value={form.nic_number} onChange={handleChange} placeholder="e.g., 901234567V" required />
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Bank Payout Details</label>
                                    <textarea
                                        name="bank_details"
                                        rows={4}
                                        value={form.bank_details}
                                        onChange={handleChange}
                                        placeholder="Bank Name, Branch, Account Holder, Account Number"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 text-sm focus:outline-none focus:border-orange-500/60 transition-all resize-none"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ── Section: Verification Documents ── */}
                        <div className="space-y-8 pt-4">
                            <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                <SectionHeader title="Document Identity Verification" icon={<FileText className="w-4 h-4" />} />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-lg">High-Res JPG/PNG Only</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                <FileField label="NIC Front View" name="nic_front" onChange={handleFileChange} fileName={files.nic_front?.name} />
                                <FileField label="NIC Back View" name="nic_back" onChange={handleFileChange} fileName={files.nic_back?.name} />
                                <FileField label="BR Document" name="br_document" onChange={handleFileChange} fileName={files.br_document?.name} />
                                <FileField label="Bank Statement" name="bank_statement" onChange={handleFileChange} fileName={files.bank_statement?.name} />
                            </div>
                        </div>

                        {/* ── Submit Command ── */}
                        <div className="pt-8">
                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative w-full bg-white text-black font-black py-5 px-10 rounded-3xl transition-all duration-300 shadow-2xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <span className="relative flex items-center justify-center gap-4 text-base uppercase tracking-widest">
                                    {loading ? (
                                        <>
                                            <div className="w-5 h-5 border-4 border-black/20 border-t-black rounded-full animate-spin" />
                                            Transmission in Progress...
                                        </>
                                    ) : (
                                        <>
                                            {isResubmitting ? "Resubmit For Verification" : "Launch Your Marketplace Store"}
                                            <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                                        </>
                                    )}
                                </span>
                            </button>
                        </div>
                    </form>
                )}

                <div className="mt-12 pt-8 border-t border-white/5 text-center">
                    <p className="text-xs text-slate-500 font-medium">
                        Already verified?{" "}
                        <Link href="/seller/login" className="text-white hover:text-orange-400 font-black transition-colors uppercase tracking-widest ml-1 inline-flex items-center gap-1 group">
                            Sign in to Console
                            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function SellerRegisterPage() {
    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0a0a0f] py-20 font-sans selection:bg-orange-500/30 selection:text-white">
            {/* Massive background ambient orbs */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-orange-600/10 blur-[150px] rounded-full animate-pulse" />
                <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-blue-600/5 blur-[150px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            <Suspense fallback={<div className="text-white/20 italic">Loading interface...</div>}>
                <RegisterFormContent />
            </Suspense>

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200;300;400;500;600;700;800&display=swap');
                body {
                    font-family: 'Plus Jakarta Sans', sans-serif;
                }
            `}</style>
        </div>
    );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function SectionHeader({ title, icon }: { title: string, icon: React.ReactNode }) {
    return (
        <h3 className="text-[11px] font-black text-white uppercase tracking-[0.25em] flex items-center gap-3">
            <span className="p-2 rounded-lg bg-white/5 border border-white/10 text-orange-400">
                {icon}
            </span>
            {title}
        </h3>
    );
}

function Field({ label, name, value, onChange, placeholder, type = "text", required = false, readonly = false }: any) {
    return (
        <div className="space-y-2">
            <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">
                {label}{required && <span className="text-orange-500 ml-1 opacity-50">*</span>}
            </label>
            <input
                name={name}
                type={type}
                required={required}
                readOnly={readonly}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-white/10 text-sm focus:outline-none focus:border-orange-500/60 transition-all ${readonly ? 'opacity-50 cursor-not-allowed border-dashed' : ''}`}
            />
        </div>
    );
}

function FileField({ label, name, onChange, fileName }: any) {
    return (
        <div className="space-y-3">
            <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">{label}</label>
            <label className="relative flex flex-col items-center justify-center w-full aspect-square md:aspect-auto md:h-32 rounded-2xl bg-white/[0.02] border border-dashed border-white/20 hover:border-white/40 hover:bg-white/[0.04] transition-all cursor-pointer group">
                <input type="file" name={name} onChange={onChange} className="hidden" accept="image/*" />
                <div className="flex flex-col items-center gap-2 p-4 text-center">
                    {fileName ? (
                        <>
                            <ImageIcon className="w-6 h-6 text-emerald-400" />
                            <span className="text-[10px] font-bold text-white max-w-[120px] truncate">{fileName}</span>
                        </>
                    ) : (
                        <>
                            <Upload className="w-6 h-6 text-slate-500 group-hover:text-orange-500 transition-colors" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select File</span>
                        </>
                    )}
                </div>
            </label>
        </div>
    );
}
