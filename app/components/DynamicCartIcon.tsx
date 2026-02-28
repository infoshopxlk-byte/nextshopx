"use client";

import dynamic from "next/dynamic";

// Dynamically import the CartIcon client component with SSR disabled
// This prevents React hydration errors caused by localStorage reading
const DynamicCartIcon = dynamic(() => import("./CartIcon"), {
    ssr: false,
});

export default DynamicCartIcon;
