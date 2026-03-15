"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { 
    Users, 
    ArrowLeft, 
    Search, 
    Plus, 
    Eye, 
    Pencil, 
    Trash2,
    CheckCircle2,
    Clock,
    Filter,
    ArrowUpRight,
    MoreHorizontal,
    X,
    FileText,
    ExternalLink,
    AlertTriangle,
    Check,
    Ban
} from "lucide-react";

interface DocumentUrls {
    nic_front: string;
    nic_back: string;
    br_document: string;
    bank_statement: string;
}

interface RejectionHistory {
    reason: string;
    date: string;
}

interface KYCData {
    business_type: string;
    nic_number: string;
    bank_details: string;
    phone: string;
    address: string;
    documents: DocumentUrls;
    rejection_history: RejectionHistory[];
}

interface Vendor {
    id: number;
    email: string;
    display_name: string;
    store_name: string;
    registered: string;
    status: string;
    kyc?: KYCData;
}

export default function AdminVendorsPage() {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState("");
    
    // Review Modal State
    const [reviewingVendor, setReviewingVendor] = useState<Vendor | null>(null);
    const [verificationLoading, setVerificationLoading] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [showRejectionInput, setShowRejectionInput] = useState(false);

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

    const fetchVendors = useCallback(async () => {
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

            const res = await fetch(`/api/proxy?path=/shopx/v1/admin/vendors`, {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store",
            });

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`API error ${res.status}: ${txt.substring(0, 120)}`);
            }

            const data = await res.json();
            if (data.success) {
                setVendors(data.vendors || []);
            } else {
                throw new Error(data.message || "Failed to fetch vendors.");
            }
        } catch (e: unknown) {
            console.error("Vendors fetch error:", e);
            setError(e instanceof Error ? e.message : "Failed to load vendors.");
        } finally {
            setLoading(false);
        }
    }, [checkAuth]);

    useEffect(() => {
        fetchVendors();
    }, [fetchVendors]);

    const handleVerify = async (action: 'approve' | 'reject') => {
        if (!reviewingVendor) return;
        if (action === 'reject' && !rejectionReason && showRejectionInput) {
            alert("Please provide a reason for rejection.");
            return;
        }

        setVerificationLoading(true);
        try {
            const token = localStorage.getItem("seller_token");
            const WP    = process.env.NEXT_PUBLIC_WORDPRESS_URL;
            
            const res = await fetch(`${WP}/wp-json/shopx/v1/admin/vendor-verify`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    vendor_id: reviewingVendor.id,
                    action,
                    reason: rejectionReason
                })
            });

            const data = await res.json();
            if (data.success) {
                setReviewingVendor(null);
                setRejectionReason("");
                setShowRejectionInput(false);
                fetchVendors(); // Refresh list
            } else {
                alert(data.message || "Verification failed.");
            }
        } catch (e) {
            console.error("Verification error:", e);
            alert("An error occurred during verification.");
        } finally {
            setVerificationLoading(false);
        }
    };

    const filteredVendors = vendors.filter(v => 
        v.store_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!isAdmin && !loading && error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 text-white">
                <div className="p-6 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
                    <Trash2 className="w-16 h-16" />
                </div>
                <h1 className="text-3xl font-black">Access Denied</h1>
                <p className="text-slate-400 max-w-sm">You do not have the required clearance to view the vendor database.</p>
                <Link href="/admin/dashboard" className="px-8 py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all">
                    Return to Dashboard
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-10 p-8 min-h-screen text-slate-100 bg-[#0a0a0f]">
            {/* Breadcrumb & Header */}
            <div className="space-y-6">
                <Link href="/admin/dashboard" className="group inline-flex items-center gap-2 text-sm font-black text-slate-500 hover:text-white transition-all uppercase tracking-widest">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Command Center
                </Link>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-5xl font-black text-white tracking-tight">
                            Vendor <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Directory</span>
                        </h1>
                        <p className="text-slate-400 mt-3 text-lg font-medium max-w-xl">
                            High-fidelity management of your marketplace sellers. Audit, verify, and maintain vendor relationships.
                        </p>
                    </div>
                    <button className="group flex items-center gap-3 px-8 py-4 rounded-3xl bg-blue-600 hover:bg-blue-500 text-white font-black transition-all shadow-2xl shadow-blue-600/20 active:scale-95">
                        <Plus className="w-6 h-6" />
                        Add New Vendor
                    </button>
                </div>
            </div>

            {/* Filters Bar - Glassmorphism */}
            <div className="flex flex-col lg:flex-row gap-6 items-center justify-between p-2 rounded-[2.5rem] bg-white/[0.02] border border-white/5 backdrop-blur-3xl">
                <div className="relative w-full lg:max-w-xl group">
                    <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search vendors by store name, email, or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full pl-14 pr-6 py-5 bg-white/5 border border-white/10 rounded-[2rem] text-white placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/40 transition-all font-medium"
                    />
                </div>
                <div className="flex items-center gap-4 px-6">
                    <button className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                        <Filter className="w-4 h-4" />
                        Filters
                    </button>
                    <div className="h-8 w-px bg-white/10 hidden lg:block" />
                    <div className="text-sm font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                        <span className="text-white">{filteredVendors.length}</span> Total Vendors
                    </div>
                </div>
            </div>

            {/* Vendors Table - Premium Glass Design */}
            <div className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/5">
                                <th className="px-10 py-6 text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Seller Information</th>
                                <th className="px-10 py-6 text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Email Address</th>
                                <th className="px-10 py-6 text-xs font-black text-slate-500 uppercase tracking-[0.2em] text-center">Verification</th>
                                <th className="px-10 py-6 text-xs font-black text-slate-500 uppercase tracking-[0.2em] text-right">Join Date</th>
                                <th className="px-10 py-6 text-xs font-black text-slate-500 uppercase tracking-[0.2em] text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                [1, 2, 3, 4].map((i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-10 py-10">
                                            <div className="flex gap-4">
                                                <div className="w-12 h-12 bg-white/5 rounded-2xl" />
                                                <div className="flex-1 space-y-3">
                                                    <div className="h-4 bg-white/5 rounded-full w-1/3" />
                                                    <div className="h-3 bg-white/5 rounded-full w-1/4" />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : filteredVendors.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-10 py-24 text-center">
                                        <Users className="w-16 h-16 text-slate-800 mx-auto mb-4" />
                                        <div className="text-xl font-bold text-slate-500 italic">
                                            {searchQuery ? "No sellers found matching your search." : "Vendor database is currently empty."}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredVendors.map((vendor) => (
                                    <tr key={vendor.id} className="group hover:bg-white/[0.03] transition-all duration-300">
                                        <td className="px-10 py-8">
                                            <div className="flex items-center gap-5">
                                                <div className="relative">
                                                    <div className="w-14 h-14 rounded-[1.25rem] bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center text-white font-black text-2xl shadow-inner group-hover:border-blue-500/30 transition-colors">
                                                        {vendor.store_name.charAt(0).toUpperCase()}
                                                    </div>
                                                    {vendor.status === 'active' && (
                                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-4 border-[#0a0a0f] rounded-full" title="Active" />
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-lg font-black text-white group-hover:text-blue-400 transition-colors">{vendor.store_name}</span>
                                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">ID: #{vendor.id}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <span className="text-slate-300 font-medium group-hover:text-white transition-colors">
                                                {vendor.email}
                                            </span>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="flex justify-center">
                                                {vendor.status === 'active' ? (
                                                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/5">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        Verified Status
                                                    </span>
                                                ) : vendor.status === 'rejected' ? (
                                                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-black uppercase tracking-widest">
                                                        <Ban className="w-4 h-4" />
                                                        Rejected
                                                    </span>
                                                ) : (
                                                    <button 
                                                        onClick={() => setReviewingVendor(vendor)}
                                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-black uppercase tracking-widest hover:bg-amber-500/20 transition-all shadow-lg shadow-amber-500/5 group/btn"
                                                    >
                                                        <Clock className="w-4 h-4 group-hover/btn:animate-spin-slow" />
                                                        Needs Review
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-10 py-8 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="text-sm font-black text-slate-100">{new Date(vendor.registered).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                                <span className="text-[10px] font-bold text-slate-500 uppercase">{new Date(vendor.registered).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="flex items-center justify-center gap-3">
                                                <button className="p-3 rounded-2xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all transform hover:-translate-y-1" title="View Store">
                                                    <Eye className="w-5 h-5" />
                                                </button>
                                                <button className="p-3 rounded-2xl bg-white/5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all transform hover:-translate-y-1" title="Edit Access">
                                                    <Pencil className="w-5 h-5" />
                                                </button>
                                                <button className="p-3 rounded-2xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all transform hover:-translate-y-1" title="Terminate">
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Visual Footer for Table */}
                {!loading && filteredVendors.length > 0 && (
                    <div className="px-10 py-6 border-t border-white/5 bg-white/[0.02] flex items-center justify-between text-xs font-black text-slate-600 uppercase tracking-widest">
                        <div className="flex items-center gap-4">
                            <span>Showing 1 - {filteredVendors.length} of {vendors.length} vendors</span>
                            <div className="w-1 h-1 bg-slate-800 rounded-full" />
                            <MoreHorizontal className="w-4 h-4" />
                        </div>
                        <div className="flex gap-6">
                            <button className="hover:text-white transition-colors">Previous</button>
                            <button className="hover:text-white transition-colors">Next</button>
                        </div>
                    </div>
                )}
            </div>

            {/* KYC Review Modal */}
            {reviewingVendor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a0f]/80 backdrop-blur-xl transition-all duration-500">
                    <div className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden bg-white/5 border border-white/10 rounded-[3rem] shadow-2xl flex flex-col">
                        {/* Modal Header */}
                        <div className="p-10 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-amber-500/20 to-transparent border border-amber-500/20 flex items-center justify-center text-amber-400 font-black text-3xl">
                                    {reviewingVendor.store_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-white tracking-tight">Review Application</h2>
                                    <p className="text-slate-400 font-medium">Auditing <span className="text-white font-bold">{reviewingVendor.store_name}</span> (ID: #{reviewingVendor.id})</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => { setReviewingVendor(null); setShowRejectionInput(false); setRejectionReason(""); }}
                                className="p-4 rounded-2xl bg-white/5 text-slate-500 hover:text-white transition-all"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                {/* Details Column */}
                                <div className="space-y-8">
                                    <div className="space-y-6">
                                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                            <FileText className="w-4 h-4" />
                                            Business Information
                                        </h3>
                                        <div className="grid grid-cols-2 gap-6">
                                            {[
                                                { label: "Type", value: reviewingVendor.kyc?.business_type || 'Individual', color: "text-blue-400" },
                                                { label: "NIC Number", value: reviewingVendor.kyc?.nic_number || 'Not provided', color: "text-white" },
                                                { label: "Phone", value: reviewingVendor.kyc?.phone || 'Not provided', color: "text-white" },
                                                { label: "Date Joined", value: new Date(reviewingVendor.registered).toLocaleDateString(), color: "text-white" },
                                            ].map((item, i) => (
                                                <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                                    <div className="text-[10px] font-black text-slate-500 uppercase mb-1">{item.label}</div>
                                                    <div className={`text-sm font-bold ${item.color}`}>{item.value}</div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                            <div className="text-[10px] font-black text-slate-500 uppercase mb-1">Business Address</div>
                                            <div className="text-sm font-medium text-white leading-relaxed">{reviewingVendor.kyc?.address || 'Not provided'}</div>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                            <div className="text-[10px] font-black text-slate-500 uppercase mb-1">Bank Settlement Details</div>
                                            <div className="text-sm font-medium text-slate-300 leading-relaxed whitespace-pre-line">{reviewingVendor.kyc?.bank_details || 'Not provided'}</div>
                                        </div>
                                    </div>

                                    {/* Rejection History */}
                                    {reviewingVendor.kyc?.rejection_history && reviewingVendor.kyc.rejection_history.length > 0 && (
                                        <div className="space-y-4">
                                            <h3 className="text-xs font-black text-red-500 uppercase tracking-widest flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4" />
                                                Previous Rejections
                                            </h3>
                                            <div className="space-y-3">
                                                {reviewingVendor.kyc.rejection_history.map((hist, i) => (
                                                    <div key={i} className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10">
                                                        <div className="text-[10px] font-black text-red-400 uppercase mb-1">{new Date(hist.date).toLocaleString()}</div>
                                                        <div className="text-sm text-slate-400 italic">"{hist.reason}"</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Documents Column */}
                                <div className="space-y-6">
                                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <Filter className="w-4 h-4" />
                                        Identity & Documents
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        {[
                                            { label: "NIC Card (Front)", key: 'nic_front' },
                                            { label: "NIC Card (Back)", key: 'nic_back' },
                                            { label: "Business Registration (BR)", key: 'br_document' },
                                            { label: "Bank Statement", key: 'bank_statement' },
                                        ].map((doc, i) => {
                                            const url = reviewingVendor.kyc?.documents[doc.key as keyof DocumentUrls];
                                            return (
                                                <div key={i} className="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all p-4">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 rounded-xl bg-white/5 text-slate-400">
                                                                <FileText className="w-4 h-4" />
                                                            </div>
                                                            <span className="text-xs font-black text-white uppercase">{doc.label}</span>
                                                        </div>
                                                        {url ? (
                                                            <a href={url} target="_blank" className="p-2 rounded-xl bg-white/5 text-blue-400 hover:bg-blue-500/10 transition-all">
                                                                <ExternalLink className="w-4 h-4" />
                                                            </a>
                                                        ) : (
                                                            <span className="text-[10px] font-black text-slate-600">NOT UPLOADED</span>
                                                        )}
                                                    </div>
                                                    {url ? (
                                                        <div className="relative aspect-video rounded-xl bg-black/40 overflow-hidden cursor-zoom-in" onClick={() => window.open(url, '_blank')}>
                                                            <img src={url} alt={doc.label} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                                                <span className="text-xs font-black text-white uppercase tracking-widest">Click to Expand</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="aspect-video rounded-xl bg-white/[0.02] border border-dashed border-white/10 flex items-center justify-center">
                                                            <AlertTriangle className="w-8 h-8 text-white/5" />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Actions */}
                        <div className="p-10 border-t border-white/10 bg-white/[0.02] flex flex-col gap-6">
                            {showRejectionInput ? (
                                <div className="space-y-4 animate-in slide-in-from-bottom-5">
                                    <label className="text-xs font-black text-red-500 uppercase tracking-widest">Provide a detailed reason for rejection:</label>
                                    <textarea 
                                        autoFocus
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        className="w-full h-32 bg-red-500/5 border border-red-500/20 rounded-2xl p-6 text-white text-sm placeholder-red-500/20 focus:outline-none focus:border-red-500/50 transition-all"
                                        placeholder="e.g., NIC image is blurry, Bank statement does not match store name..."
                                    />
                                    <div className="flex justify-end gap-3">
                                        <button 
                                            onClick={() => { setShowRejectionInput(false); setRejectionReason(""); }}
                                            className="px-6 py-3 rounded-xl text-xs font-black text-slate-500 hover:text-white transition-all uppercase"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            disabled={verificationLoading}
                                            onClick={() => handleVerify('reject')}
                                            className="px-8 py-3 rounded-xl bg-red-500 hover:bg-red-400 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 disabled:opacity-50"
                                        >
                                            {verificationLoading ? "Processing..." : "Confirm Rejection"}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 text-sm font-medium text-slate-500 italic">
                                        Audit conducted by <span className="text-white font-bold underline cursor-default">Level 1 Admin</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <button 
                                            onClick={() => setShowRejectionInput(true)}
                                            className="group flex items-center gap-3 px-8 py-4 rounded-[1.5rem] bg-white/5 border border-red-500/20 text-red-400 font-black text-sm uppercase tracking-widest hover:bg-red-500/10 transition-all active:scale-95"
                                        >
                                            <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                                            Reject Vendor
                                        </button>
                                        <button 
                                            disabled={verificationLoading}
                                            onClick={() => handleVerify('approve')}
                                            className="group flex items-center gap-3 px-10 py-4 rounded-[1.5rem] bg-blue-600 hover:bg-blue-500 text-white font-black text-sm uppercase tracking-widest shadow-2xl shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            {verificationLoading ? (
                                                "Authorizing..."
                                            ) : (
                                                <>
                                                    <Check className="w-5 h-5 group-hover:scale-125 transition-transform" />
                                                    Approve Seller
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Styles */}
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
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 8s linear infinite;
                }
            `}</style>
        </div>
    );
}
