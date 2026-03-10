"use client";

import React, { useState, useEffect } from 'react';
import { Star, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface Review {
    id: number;
    rating: number;
    reviewer: string;
    review: string;
    date_created: string;
    verified: boolean;
}

interface ProductReviewsProps {
    productId: number;
    initialReviews: Review[];
}

export default function ProductReviews({ productId, initialReviews }: ProductReviewsProps) {
    const { data: session, status: sessionStatus } = useSession();
    
    // Eligibility State
    const [canReview, setCanReview] = useState<boolean | null>(null);
    const [checkingEligibility, setCheckingEligibility] = useState(true);

    // Form State
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [reviewText, setReviewText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // UI Feedback State
    const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

    // Reviews List State (to optimistally append new review)
    const [reviews, setReviews] = useState<Review[]>(initialReviews);

    useEffect(() => {
        const checkEligibility = async () => {
            // Only check if they are logged in.
            if (sessionStatus !== "authenticated") {
                setCheckingEligibility(false);
                setCanReview(false);
                return;
            }

            try {
                const res = await fetch(`/api/reviews/verify?productId=${productId}`);
                const data = await res.json();
                setCanReview(data.canReview);
            } catch (err) {
                console.error("Failed to check review eligibility", err);
                setCanReview(false);
            } finally {
                setCheckingEligibility(false);
            }
        };

        checkEligibility();
    }, [productId, sessionStatus]);

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (rating === 0) {
            setSubmitStatus({ type: 'error', message: "Please select a star rating." });
            return;
        }

        if (reviewText.trim().length < 5) {
            setSubmitStatus({ type: 'error', message: "Please enter a slightly longer review." });
            return;
        }

        setIsSubmitting(true);
        setSubmitStatus({ type: null, message: '' });

        try {
            const res = await fetch("/api/reviews", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    productId, 
                    rating, 
                    review: reviewText 
                }),
            });

            const result = await res.json();

            if (res.ok && result.success) {
                setSubmitStatus({ type: 'success', message: result.message || "Review submitted successfully!" });
                
                // Optimistically add the review to the top of the list
                const newReviewObj: Review = {
                    id: result.data.id || Date.now(),
                    rating: rating,
                    reviewer: session?.user?.name || "You",
                    review: reviewText,
                    date_created: new Date().toISOString(),
                    verified: true // We know it's verified because the API allowed it
                };
                
                setReviews([newReviewObj, ...reviews]);
                
                // Reset form
                setRating(0);
                setReviewText("");
                
                // Keep the success message visible, but hide the form itself
                setCanReview(false); 
            } else {
                throw new Error(result.message || "Failed to submit review.");
            }
        } catch (error: any) {
            setSubmitStatus({ type: 'error', message: error.message || "An unexpected error occurred." });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Format date string beautifully
    const formatDate = (dateString: string) => {
        const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    return (
        <div className="w-full mt-16 pt-16 border-t border-gray-100 font-sans">
            <h3 className="text-3xl font-black text-gray-900 mb-8 tracking-tight">Customer Reviews</h3>

            {/* Write Review Section */}
            {checkingEligibility ? (
                <div className="flex items-center gap-3 text-gray-500 mb-12 p-6 bg-gray-50 rounded-2xl animate-pulse">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Checking eligibility...
                </div>
            ) : canReview ? (
                <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-200 mb-12">
                    <h4 className="text-xl font-bold text-gray-900 mb-2">Write a Review</h4>
                    <p className="text-gray-500 text-sm mb-6">Share your verified purchase experience with other shoppers.</p>
                    
                    {submitStatus.type === 'error' && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 font-medium">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            {submitStatus.message}
                        </div>
                    )}

                    <form onSubmit={handleSubmitReview} className="space-y-6">
                        {/* Star Rating */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Overall Rating</label>
                            <div className="flex items-center gap-1 cursor-pointer">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star 
                                        key={star}
                                        className={`w-8 h-8 transition-colors ${
                                            star <= (hoverRating || rating) 
                                                ? 'fill-yellow-400 text-yellow-400' 
                                                : 'text-gray-300 hover:text-yellow-200'
                                        }`}
                                        onMouseEnter={() => setHoverRating(star)}
                                        onMouseLeave={() => setHoverRating(0)}
                                        onClick={() => setRating(star)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Review Text Area */}
                        <div>
                            <label htmlFor="reviewText" className="block text-sm font-bold text-gray-700 mb-2">Your Review</label>
                            <textarea
                                id="reviewText"
                                rows={4}
                                value={reviewText}
                                onChange={(e) => setReviewText(e.target.value)}
                                className="w-full px-5 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-400 resize-none text-gray-900"
                                placeholder="What did you like or dislike? What should other shoppers know before buying?"
                            ></textarea>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting || rating === 0 || reviewText.trim() === ""}
                            className="inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white font-bold py-3.5 px-8 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                "Submit Review"
                            )}
                        </button>
                    </form>
                </div>
            ) : submitStatus.type === 'success' ? (
                <div className="mb-12 p-6 bg-green-50 border border-green-100 rounded-2xl flex flex-col sm:flex-row items-center gap-4 text-green-800 text-center sm:text-left">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                        <h4 className="font-bold text-lg mb-1">{submitStatus.message}</h4>
                        <p className="text-green-700 text-sm">Thank you for sharing your feedback. Your review is now visible to the community.</p>
                    </div>
                </div>
            ) : null}

            {/* Display Existing Reviews */}
            <div className="space-y-6">
                {reviews.length === 0 ? (
                    <div className="text-center py-12 px-4 border border-dashed border-gray-200 rounded-3xl bg-gray-50/50">
                        <p className="text-gray-500 font-medium tracking-wide">No reviews yet for this product.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {reviews.map((rev) => (
                            <div key={rev.id} className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm transition-shadow hover:shadow-md">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
                                    <div>
                                        {/* Name & Badge Row */}
                                        <div className="flex items-center flex-wrap gap-2 mb-2">
                                            <h5 className="font-bold text-gray-900 text-lg">{rev.reviewer}</h5>
                                            {rev.verified && (
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100/50">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                                                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Verified Purchase</span>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Date */}
                                        <div className="text-sm text-gray-400">
                                            Reviewed on {formatDate(rev.date_created)}
                                        </div>
                                    </div>
                                    
                                    {/* Star Rating Display */}
                                    <div className="flex items-center gap-0.5 shrink-0">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Star 
                                                key={star}
                                                className={`w-5 h-5 ${
                                                    star <= rev.rating 
                                                        ? 'fill-yellow-400 text-yellow-400' 
                                                        : 'text-gray-200 fill-gray-100'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                                
                                {/* Content Area */}
                                <div 
                                    className="text-gray-700 leading-relaxed text-base prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{ __html: rev.review.replace(/\ng/, '<br/>') }}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
