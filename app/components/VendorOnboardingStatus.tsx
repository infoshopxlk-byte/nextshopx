"use client";

import Link from "next/link";
import { Clock, AlertTriangle, ArrowRight, CheckCircle2, FileEdit } from "lucide-react";

interface VendorOnboardingStatusProps {
    status: 'pending' | 'rejected' | 'active';
    rejectionReason?: string;
}

export default function VendorOnboardingStatus({ status, rejectionReason }: VendorOnboardingStatusProps) {
    if (status === 'active') return null;

    return (
        <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
            {status === 'pending' ? (
                <div className="relative overflow-hidden rounded-3xl bg-amber-500/5 border border-amber-500/20 p-8 md:p-10">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Clock className="w-32 h-32 text-amber-500 animate-pulse" />
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                        <div className="w-20 h-20 rounded-[1.5rem] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                            <Clock className="w-10 h-10" />
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Application Under Review</h2>
                            <p className="text-slate-400 font-medium max-w-2xl leading-relaxed">
                                Our administration team is currently auditing your KYC documents and business information. 
                                This process typically takes <span className="text-amber-400 font-bold underline">24-48 hours</span>. 
                                You will be notified once your store is fully activated.
                            </p>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest px-4 py-2 bg-amber-500/10 rounded-full border border-amber-500/20">
                                Status: Reviewing
                            </span>
                        </div>
                    </div>
                </div>
            ) : status === 'rejected' ? (
                <div className="relative overflow-hidden rounded-3xl bg-red-500/5 border border-red-500/20 p-8 md:p-10">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <AlertTriangle className="w-32 h-32 text-red-500" />
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                        <div className="w-20 h-20 rounded-[1.5rem] bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                            <AlertTriangle className="w-10 h-10" />
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
                                <h2 className="text-2xl font-black text-white tracking-tight">Application Rejected</h2>
                                <span className="px-3 py-1 rounded-lg bg-red-500 text-white text-[10px] font-black uppercase tracking-widest">Action Required</span>
                            </div>
                            <div className="p-5 rounded-2xl bg-white/5 border border-white/5 mt-4">
                                <p className="text-slate-400 text-sm italic font-medium leading-relaxed">
                                    " {rejectionReason || "No specific reason provided. Please ensure all documents are clear and valid."} "
                                </p>
                            </div>
                        </div>
                        <Link 
                            href="/seller/register?resubmit=true" 
                            className="group flex items-center gap-3 px-8 py-5 rounded-[1.5rem] bg-white text-black font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all shadow-2xl shadow-white/10 active:scale-95 whitespace-nowrap"
                        >
                            <FileEdit className="w-5 h-5" />
                            Edit & Resubmit
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
