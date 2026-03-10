"use client";

import React from 'react';

export default function ChatButton({ vendorId, storeName }: { vendorId?: number, storeName?: string }) {
    return (
        <button
            className="px-4 py-1.5 bg-indigo-50 text-indigo-600 text-sm font-bold rounded-lg hover:bg-indigo-100 border border-indigo-200 transition-colors flex items-center gap-2 shadow-sm"
            onClick={() => alert(`Chat feature coming soon for ${storeName || 'this seller'}!`)}
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Chat
        </button>
    );
}
