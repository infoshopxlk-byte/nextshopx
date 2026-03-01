'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Sparkles } from 'lucide-react';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    isHtml?: boolean;
}

export default function AiChatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: 'Hi there! 👋 I am ShopX AI. How can I help you find the perfect product today?',
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isOpen]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg.content }),
            });

            const data = await res.json();

            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.reply,
                isHtml: data.isHtml
            };

            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: "I'm having trouble connecting right now. Please try again later."
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-[60] flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <div className="bg-white w-[90vw] md:w-[380px] h-[500px] max-h-[70vh] rounded-3xl shadow-2xl border border-gray-100 mb-4 overflow-hidden flex flex-col transition-all transform origin-bottom-right">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex justify-between items-center text-white">
                        <div className="flex items-center gap-2">
                            <div className="bg-white/20 p-1.5 rounded-full backdrop-blur-sm">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm tracking-wide">ShopX Assistant</h3>
                                <div className="flex items-center gap-1.5 opacity-90">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                    <span className="text-[10px] font-medium">Online (AI)</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 space-y-4">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    {/* Avatar */}
                                    <div className="shrink-0 mt-auto">
                                        {msg.role === 'assistant' ? (
                                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                                                <Bot className="w-4 h-4 text-blue-600" />
                                            </div>
                                        ) : (
                                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                                                <User className="w-4 h-4 text-gray-500" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Bubble */}
                                    <div className={`p-3 rounded-2xl ${msg.role === 'user'
                                            ? 'bg-blue-600 text-white rounded-br-none'
                                            : 'bg-white border border-gray-100 shadow-sm text-gray-800 rounded-bl-none'
                                        }`}>
                                        {msg.isHtml ? (
                                            <div
                                                className="text-sm prose prose-sm max-w-none prose-a:text-blue-600 prose-a:font-bold prose-a:no-underline hover:prose-a:underline prose-p:leading-snug"
                                                dangerouslySetInnerHTML={{ __html: msg.content }}
                                            />
                                        ) : (
                                            <p className="text-sm leading-snug">{msg.content}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="flex gap-2">
                                    <div className="w-6 h-6 shrink-0 mt-auto rounded-full bg-blue-100 flex items-center justify-center">
                                        <Bot className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div className="bg-white border border-gray-100 shadow-sm p-4 rounded-2xl rounded-bl-none flex gap-1.5 items-center">
                                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-white border-t border-gray-100">
                        <form onSubmit={handleSendMessage} className="flex gap-2 relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask about products..."
                                className="flex-1 bg-gray-100 rounded-full pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-transparent transition-all"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className="absolute right-1 top-1 bottom-1 w-10 sm:w-12 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:hover:bg-blue-600"
                            >
                                <Send className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5" />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Floating FAB Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="group bg-blue-600 text-white p-4 rounded-full shadow-xl hover:shadow-blue-500/30 hover:bg-blue-700 transition-all duration-300 transform hover:-translate-y-1 relative"
                >
                    <MessageSquare className="w-6 h-6" />
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
                        <span className="w-2 h-2 bg-white rounded-full"></span>
                    </span>
                    {/* Tooltip hint visible on desktop hover */}
                    <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs font-bold py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap hidden md:block">
                        Need help shopping?
                    </div>
                </button>
            )}
        </div>
    );
}
