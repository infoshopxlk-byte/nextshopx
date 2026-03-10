"use client";

import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, HelpCircle, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function ContactUs() {
    const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setStatus({ type: null, message: '' });

        try {
            const res = await fetch("/api/send-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "contact", data: formData }),
            });

            const result = await res.json();

            if (res.ok && result.success) {
                setStatus({ type: 'success', message: "Your message has been sent successfully!" });
                setFormData({ name: '', email: '', subject: '', message: '' });
            } else {
                throw new Error(result.message || "Failed to send message.");
            }
        } catch (error: any) {
            setStatus({ type: 'error', message: error.message || "An unexpected error occurred." });
        } finally {
            setIsSubmitting(false);
        }
    };
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Header Section */}
            <div className="bg-white border-b border-gray-100 py-16 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto text-center">
                    <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4 tracking-tight">How can we help you?</h1>
                    <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                        Whether you have a question about an order, want to become a vendor, or just want to say hi, our team is ready to answer all your questions.
                    </p>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8">

                    {/* Left Column: Contact Info & Quick Links */}
                    <div className="lg:col-span-1 space-y-8">
                        {/* Direct Contact Card */}
                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-blue-100 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-0"></div>

                            <h2 className="text-2xl font-bold text-gray-900 mb-8 relative z-10">Get in Touch</h2>

                            <div className="space-y-6 relative z-10">
                                {/* Hotline - Highlighted */}
                                <div className="flex bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                                        <Phone className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">24/7 Hotline</p>
                                        <a href="tel:0703999100" className="text-xl font-black text-blue-600 hover:text-blue-800 transition-colors">
                                            070 3999 100
                                        </a>
                                    </div>
                                </div>

                                <div className="flex">
                                    <div className="w-12 h-12 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center shrink-0">
                                        <Mail className="w-6 h-6 text-gray-600" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Email Support</p>
                                        <a href="mailto:support@shopx.lk" className="text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors">
                                            support@shopx.lk
                                        </a>
                                    </div>
                                </div>

                                <div className="flex">
                                    <div className="w-12 h-12 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center shrink-0">
                                        <MapPin className="w-6 h-6 text-gray-600" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Office Location</p>
                                        <p className="text-base font-medium text-gray-700 leading-relaxed">
                                            ShopX.lk Headquarters<br />
                                            Colombo ,<br />
                                            Sri Lanka.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Help Resources */}
                        <div className="bg-transparent space-y-4">
                            <h3 className="text-lg font-bold text-gray-900 px-2">Quick Resources</h3>

                            <a href="/help-center" className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:border-violet-200 hover:shadow-md transition-all group">
                                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center group-hover:bg-violet-600 transition-colors">
                                    <HelpCircle className="w-5 h-5 text-indigo-600 group-hover:text-white transition-colors" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 group-hover:text-violet-600 transition-colors">Help Center</h4>
                                    <p className="text-xs text-gray-500">Find answers to common questions</p>
                                </div>
                            </a>

                            <a href="/returns-refunds" className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:border-violet-200 hover:shadow-md transition-all group">
                                <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center group-hover:bg-violet-600 transition-colors">
                                    <FileText className="w-5 h-5 text-rose-600 group-hover:text-white transition-colors" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 group-hover:text-violet-600 transition-colors">Returns & Refunds</h4>
                                    <p className="text-xs text-gray-500">Read our replacement policy</p>
                                </div>
                            </a>
                        </div>
                    </div>

                    {/* Right Column: Contact Form */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-gray-200">
                            <div className="mb-8">
                                <h2 className="text-3xl font-bold text-gray-900 mb-2">Send us a message</h2>
                                <p className="text-gray-500">We aim to respond to all inquiries within 24 hours.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {status.type === 'success' && (
                                    <div className="p-4 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3 text-green-700 font-medium">
                                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                                        {status.message}
                                    </div>
                                )}
                                {status.type === 'error' && (
                                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 font-medium">
                                        <AlertCircle className="w-5 h-5 shrink-0" />
                                        {status.message}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-bold text-gray-700 mb-2">Your Name</label>
                                        <input
                                            type="text"
                                            id="name"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-5 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-400"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                                        <input
                                            type="email"
                                            id="email"
                                            required
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full px-5 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-400"
                                            placeholder="john@example.com"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="subject" className="block text-sm font-bold text-gray-700 mb-2">Subject</label>
                                    <select
                                        id="subject"
                                        value={formData.subject}
                                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                        className="w-full xl px-5 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-700"
                                    >
                                        <option value="">Select a topic...</option>
                                        <option value="Order Inquiry">Order Inquiry</option>
                                        <option value="Selling on ShopX">Selling on ShopX</option>
                                        <option value="Returns / Warranty">Returns / Warranty</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="message" className="block text-sm font-bold text-gray-700 mb-2">Message</label>
                                    <textarea
                                        id="message"
                                        required
                                        value={formData.message}
                                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                        rows={6}
                                        className="w-full px-5 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-400 resize-none"
                                        placeholder="How can we help you today?"
                                    ></textarea>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-all active:scale-95 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-5 h-5" />
                                            Send Message
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
