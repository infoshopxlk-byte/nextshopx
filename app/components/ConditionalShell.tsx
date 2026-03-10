"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";

const SELLER_PREFIXES = ["/seller/dashboard", "/seller/login"];

interface Props {
    renderChrome: (children: ReactNode) => ReactNode;
    children: ReactNode;
}

/**
 * On /seller/* routes: renders children full-screen (no site chrome).
 * On all other routes: delegates to renderChrome(children) so the header,
 * main wrapper, footer etc. are rendered around the page content.
 */
export default function SellerAwareShell({ renderChrome, children }: Props) {
    const pathname = usePathname();
    const isSeller = SELLER_PREFIXES.some((p) => pathname.startsWith(p));

    if (isSeller) {
        return <div className="min-h-screen flex flex-col">{children}</div>;
    }

    return <>{renderChrome(children)}</>;
}
