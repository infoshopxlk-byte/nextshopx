'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, ShoppingCart, User, ShoppingBag } from 'lucide-react';
import { useCart } from '@/app/context/CartContext';
import { useSession } from 'next-auth/react';

export default function MobileBottomNav() {
    const pathname = usePathname();
    const { cartCount } = useCart();
    const { status } = useSession();

    // Do not show on auth pages or checkout to prevent distraction
    if (pathname === '/login' || pathname === '/register' || pathname === '/checkout') {
        return null;
    }

    const navItems = [
        {
            name: 'Home',
            href: '/',
            icon: Home,
        },
        {
            name: 'Shop',
            href: '/shop', 
            icon: ShoppingBag,
        },
        {
            name: 'Search',
            href: '/search',
            icon: Search,
        },
        {
            name: 'Cart',
            href: '/cart',
            icon: ShoppingCart,
            badge: cartCount > 0 ? cartCount : null,
        },
        {
            name: 'Account',
            href: '/account',
            icon: User,
        },
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-xl border-t border-gray-200/50 pb-safe">
            <div className="flex items-center justify-around px-2 h-16 max-w-md mx-auto relative">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.name === 'Home' && pathname === '/') || (item.name === 'Account' && pathname.startsWith('/account'));
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className="relative flex flex-col items-center justify-center w-full h-full space-y-1 group"
                        >
                            <div className={`relative p-1.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-violet-50 text-violet-600 scale-110' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
                                <Icon className={`w-6 h-6 stroke-[2px] transition-transform duration-300 ${isActive ? 'scale-105' : 'group-hover:scale-110'}`} />

                                {/* Red Badge Custom for Cart */}
                                {item.badge !== null && item.badge !== undefined && (
                                    <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white shadow-sm ring-2 ring-white transform scale-100 transition-transform duration-300 animate-in zoom-in">
                                        {item.badge}
                                    </span>
                                )}
                            </div>
                            <span className={`text-[10px] font-bold tracking-wide transition-colors duration-300 ${isActive ? 'text-violet-600' : 'text-gray-500'}`}>
                                {item.name}
                            </span>
                        </Link>
                    );
                })}
            </div>
            {/* Safe Area Padding for modern iPhones without home button */}
            <div className="h-[env(safe-area-inset-bottom)] bg-white/85 backdrop-blur-xl"></div>
        </div>
    );
}
