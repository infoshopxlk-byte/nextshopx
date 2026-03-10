"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, X } from "lucide-react";

interface FieldState {
    name: string;
    price: string;
    sale_price: string;
    description: string;
    short_description: string;
    sku: string;
    stock: string;
    status: string;
    weight: string;
    brand: string;
}

interface Category {
    id: number;
    name: string;
}

interface Attribute {
    name: string;
    options: string;
}

interface Variation {
    id: string; // internal id for React key mapping
    attributes: Record<string, string>;
    regular_price: string;
    sale_price: string;
    sku: string;
    stock: string;
    image_id?: number | null;
    image_file?: File | null;
    image_preview?: string | null;
}

const INITIAL: FieldState = {
    name: "",
    price: "",
    sale_price: "",
    description: "",
    short_description: "",
    sku: "",
    stock: "",
    status: "publish",
    weight: "",
    brand: "No Brand",
};

export default function AddProductPage() {
    const router = useRouter();
    const [productType, setProductType] = useState<"simple" | "variable">("simple");
    const [fields, setFields] = useState<FieldState>(INITIAL);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    // Variable Product State
    const [attributes, setAttributes] = useState<Attribute[]>([]);
    const [variations, setVariations] = useState<Variation[]>([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
    const [catSearch, setCatSearch] = useState("");
    const [isVerified, setIsVerified] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchMeta = async () => {
            const WP = process.env.NEXT_PUBLIC_WORDPRESS_URL;
            const sellerId = localStorage.getItem("seller_id");
            try {
                // Fetch Categories
                const catRes = await fetch(`${WP}/wp-json/shopx/v1/categories`);
                if (catRes.ok) setCategories(await catRes.json());

                // Check verification
                if (sellerId) {
                    const userRes = await fetch(`${WP}/wp-json/wp/v2/users/${sellerId}?context=edit`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem("seller_token")}` }
                    });
                    if (userRes.ok) {
                        const userData = await userRes.json();
                        setIsVerified(userData.meta?._verified_seller === 'yes');
                    }
                }
            } catch (err) {
                console.error("Meta fetch error:", err);
            }
        };
        fetchMeta();
    }, []);

    function set(key: keyof FieldState, val: string) {
        setFields((p) => ({ ...p, [key]: val }));
    }

    function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    }

    function removeMainImage() {
        setImageFile(null);
        setImagePreview(null);
        if (fileRef.current) fileRef.current.value = "";
    }

    // --- Attributes & Variations Logic ---
    function addAttribute() {
        setAttributes([...attributes, { name: "", options: "" }]);
    }

    function updateAttribute(index: number, key: keyof Attribute, val: string) {
        const newAttrs = [...attributes];
        newAttrs[index][key] = val;
        setAttributes(newAttrs);
    }

    function removeAttribute(index: number) {
        setAttributes(attributes.filter((_, i) => i !== index));
    }

    function generateVariations() {
        if (attributes.length === 0) {
            setError("Please add at least one attribute to generate variations.");
            return;
        }

        const validAttrs = attributes.filter(a => a.name.trim() && a.options.trim());
        if (validAttrs.length === 0) return;

        // Generate combinations via Cartesian product
        const generateCombinations = (arrays: string[][]) => {
            return arrays.reduce((acc, curr) => {
                if (acc.length === 0) return curr.map(item => [item]);
                const newAcc: string[][] = [];
                acc.forEach(a => curr.forEach(c => newAcc.push([...a, c])));
                return newAcc;
            }, [] as string[][]);
        };

        const attrNames = validAttrs.map(a => a.name.trim());
        const attrOptionsArrays = validAttrs.map(a => a.options.split('|').map(o => o.trim()).filter(o => o));

        const combinations = generateCombinations(attrOptionsArrays);

        const newVariations: Variation[] = combinations.map((combo, idx) => {
            const attrObj: Record<string, string> = {};
            combo.forEach((val, i) => {
                attrObj[attrNames[i]] = val;
            });

            return {
                id: `var_temp_${Date.now()}_${idx}`,
                attributes: attrObj,
                regular_price: fields.price || "",
                sale_price: "",
                sku: "",
                stock: "",
            };
        });

        setVariations(newVariations);
        setError(null);
    }

    function updateVariation(index: number, key: keyof Variation, val: any) {
        const newVars = [...variations];
        newVars[index] = { ...newVars[index], [key]: val };
        setVariations(newVars);
    }

    function removeVariation(index: number) {
        setVariations(variations.filter((_, i) => i !== index));
    }

    function handleVariationImage(index: number, e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const newVars = [...variations];
        newVars[index].image_file = file;
        newVars[index].image_preview = URL.createObjectURL(file);
        setVariations(newVars);
    }

    // --- Submit Handle ---
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!fields.name.trim()) {
            setError("Product name is required.");
            return;
        }

        if (productType === "simple" && !fields.price.trim()) {
            setError("Regular price is required for simple products.");
            return;
        }

        if (productType === "variable" && variations.length === 0) {
            setError("Variable products require at least one variation. Please generate variations and set their prices.");
            return;
        }

        if (productType === "variable") {
            const missingPricing = variations.some(v => !v.regular_price.trim());
            if (missingPricing) {
                setError("All variations must have a regular price.");
                return;
            }
        }

        setLoading(true);

        const token = localStorage.getItem("seller_token");
        const sellerId = localStorage.getItem("seller_id");
        const WP = process.env.NEXT_PUBLIC_WORDPRESS_URL;

        try {
            // Step 1: upload main image if provided
            let imageId: number | null = null;
            if (imageFile && token) {
                try {
                    const formData = new FormData();
                    formData.append("file", imageFile, imageFile.name);
                    const imgRes = await fetch(`${WP}/wp-json/wp/v2/media`, {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}` },
                        body: formData,
                    });
                    if (imgRes.ok) {
                        const imgData = await imgRes.json();
                        imageId = imgData.id ?? null;
                    }
                } catch (imgErr) {
                    console.warn("Main image upload error:", imgErr);
                }
            }

            // Step 2: format payload
            const payload: Record<string, any> = {
                product_type: productType,
                name: fields.name.trim(),
                description: fields.description.trim(),
                short_description: fields.short_description.trim(),
                status: fields.status,
                vendor_id: sellerId ? parseInt(sellerId) : 0,
                weight: fields.weight.trim(),
                brand: fields.brand.trim(),
                category_ids: selectedCategories,
            };

            if (imageId) payload.image_id = imageId;

            // Step 3: upload variation images sequentially using a local copy to avoid state lag
            const submissionVariations = [...variations];
            if (productType === "variable" && token) {
                for (let i = 0; i < submissionVariations.length; i++) {
                    const varImg = submissionVariations[i].image_file;
                    if (varImg) {
                        try {
                            const vFormData = new FormData();
                            vFormData.append("file", varImg, varImg.name);
                            const vImgRes = await fetch(`${WP}/wp-json/wp/v2/media`, {
                                method: "POST",
                                headers: { Authorization: `Bearer ${token}` },
                                body: vFormData,
                            });
                            if (vImgRes.ok) {
                                const vImgData = await vImgRes.json();
                                submissionVariations[i].image_id = vImgData.id ?? null;
                            }
                        } catch (varErr) {
                            console.warn(`Variation ${i} image upload error:`, varErr);
                        }
                    }
                }
            }

            if (productType === "simple") {
                payload.regular_price = fields.price.trim();
                if (fields.sale_price.trim()) payload.sale_price = fields.sale_price.trim();
                if (fields.sku.trim()) payload.sku = fields.sku.trim();
                if (fields.stock.trim()) {
                    payload.manage_stock = true;
                    payload.stock_quantity = parseInt(fields.stock);
                }
            } else {
                // Variable payload
                payload.attributes = attributes.map(a => ({
                    name: a.name.trim(),
                    options: a.options.split('|').map(o => o.trim()).filter(Boolean)
                })).filter(a => a.name && a.options.length > 0);

                payload.variations = submissionVariations.map(v => {
                    const mappedVar: Record<string, any> = {
                        attributes: v.attributes,
                        regular_price: v.regular_price.trim(),
                    };
                    if (v.sale_price.trim()) mappedVar.sale_price = v.sale_price.trim();
                    if (v.sku.trim()) mappedVar.sku = v.sku.trim();
                    if (v.stock.trim()) {
                        mappedVar.manage_stock = true;
                        mappedVar.stock_quantity = parseInt(v.stock);
                    }
                    if (v.image_id) mappedVar.image_id = v.image_id;
                    return mappedVar;
                });
            }

            const res = await fetch(`${WP}/wp-json/shopx/v1/seller/product/create`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || `HTTP ${res.status}`);
            }

            setSuccess(`Product "${fields.name}" created! ID: ${data.product_id}`);
            setFields(INITIAL);
            setAttributes([]);
            setVariations([]);
            setSelectedCategories([]);
            setImageFile(null);
            setImagePreview(null);
            setTimeout(() => router.push("/seller/dashboard/products"), 2000);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 text-white pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition"
                        aria-label="Back"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Add New Product</h1>
                        <p className="text-sm text-white/40">List your merchandise accurately</p>
                    </div>
                </div>

                {/* Type Toggle */}
                <div className="flex bg-[#13131f] border border-white/10 p-1 rounded-xl">
                    <button
                        type="button"
                        onClick={() => setProductType("simple")}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition ${productType === "simple" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
                            }`}
                    >
                        Simple
                    </button>
                    <button
                        type="button"
                        onClick={() => setProductType("variable")}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition ${productType === "variable" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
                            }`}
                    >
                        Variable
                    </button>
                </div>
            </div>

            {/* Alerts */}
            {error && (
                <div className="flex items-start gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                </div>
            )}
            {success && (
                <div className="flex items-start gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {success}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Primary Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Column */}
                    <div className="md:col-span-2 space-y-6">

                        {/* Core Fields */}
                        <div className="rounded-3xl bg-[#13131f] border border-white/[0.07] p-6 space-y-5">
                            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider">Product Details</label>

                            <div>
                                <label className="block text-xs text-white/50 mb-1.5">Product Name <span className="text-red-400">*</span></label>
                                <input
                                    type="text"
                                    value={fields.name}
                                    onChange={(e) => set("name", e.target.value)}
                                    placeholder="e.g. Organic Coconut Oil 500ml"
                                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.07] transition"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-white/50 mb-1.5">Short Description</label>
                                <input
                                    type="text"
                                    value={fields.short_description}
                                    onChange={(e) => set("short_description", e.target.value)}
                                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.07] transition"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-white/50 mb-1.5">Full Description</label>
                                <textarea
                                    value={fields.description}
                                    onChange={(e) => set("description", e.target.value)}
                                    rows={5}
                                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.07] transition resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-white/50 mb-1.5">Brand</label>
                                    {isVerified ? (
                                        <input
                                            type="text"
                                            value={fields.brand}
                                            onChange={(e) => set("brand", e.target.value)}
                                            placeholder="No Brand"
                                            className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.07] transition"
                                        />
                                    ) : (
                                        <div className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white/40">
                                            No Brand (Verified Only)
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs text-white/50 mb-1.5">Weight (kg)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={fields.weight}
                                        onChange={(e) => set("weight", e.target.value)}
                                        placeholder="0.00"
                                        className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.07] transition"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Searchable Categories */}
                        <div className="rounded-3xl bg-[#13131f] border border-white/[0.07] p-6 space-y-5">
                            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider">Categories</label>
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    placeholder="Search categories..."
                                    value={catSearch}
                                    onChange={(e) => setCatSearch(e.target.value)}
                                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-white/20 focus:outline-none"
                                />
                                <div className="max-h-40 overflow-y-auto border border-white/5 rounded-xl p-2 bg-white/[0.02] grid grid-cols-2 gap-2">
                                    {categories
                                        .filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase()))
                                        .map(c => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => {
                                                    if (selectedCategories.includes(c.id)) {
                                                        setSelectedCategories(selectedCategories.filter(id => id !== c.id));
                                                    } else {
                                                        setSelectedCategories([...selectedCategories, c.id]);
                                                    }
                                                }}
                                                className={`text-left px-3 py-1.5 rounded-lg text-xs transition ${selectedCategories.includes(c.id)
                                                    ? "bg-violet-600/30 text-violet-300 border border-violet-500/50"
                                                    : "bg-white/5 border border-transparent text-white/40 hover:text-white/60"
                                                    }`}
                                            >
                                                {c.name}
                                            </button>
                                        ))
                                    }
                                </div>
                                {selectedCategories.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {selectedCategories.map(id => {
                                            const cat = categories.find(c => c.id === id);
                                            return cat ? (
                                                <span key={id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-600/10 border border-violet-500/20 text-violet-400 text-[10px] font-medium uppercase tracking-wider">
                                                    {cat.name}
                                                    <button type="button" onClick={() => setSelectedCategories(selectedCategories.filter(sid => sid !== id))} className="hover:text-white">
                                                        <Plus className="w-3 h-3 rotate-45" />
                                                    </button>
                                                </span>
                                            ) : null;
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Pricing & Inventory for Simple Products */}
                        {productType === "simple" && (
                            <>
                                <div className="rounded-3xl bg-[#13131f] border border-white/[0.07] p-6 space-y-5">
                                    <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider">Pricing</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs text-white/50 mb-1.5">Regular Price (Rs.) <span className="text-red-400">*</span></label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={fields.price}
                                                onChange={(e) => set("price", e.target.value)}
                                                className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.07] transition"
                                                required={productType === "simple"}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-white/50 mb-1.5">Sale Price (Rs.)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={fields.sale_price}
                                                onChange={(e) => set("sale_price", e.target.value)}
                                                className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.07] transition"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-3xl bg-[#13131f] border border-white/[0.07] p-6 space-y-5">
                                    <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider">Inventory</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs text-white/50 mb-1.5">SKU</label>
                                            <input
                                                type="text"
                                                value={fields.sku}
                                                onChange={(e) => set("sku", e.target.value)}
                                                className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.07] transition"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-white/50 mb-1.5">Stock Quantity</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={fields.stock}
                                                onChange={(e) => set("stock", e.target.value)}
                                                placeholder="Leave blank = unlimited"
                                                className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.07] transition"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Attributes & Variations for Variable Products */}
                        {productType === "variable" && (
                            <>
                                <div className="rounded-3xl bg-[#13131f] border border-white/[0.07] p-6 space-y-5">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider">Attributes</label>
                                        <button
                                            type="button"
                                            onClick={addAttribute}
                                            className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
                                        >
                                            <Plus className="w-3 h-3" /> Add Attribute
                                        </button>
                                    </div>

                                    {attributes.length === 0 ? (
                                        <div className="text-center py-6 text-white/30 text-sm border border-dashed border-white/10 rounded-xl">
                                            No attributes added. E.g. Size, Color
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {attributes.map((attr, idx) => (
                                                <div key={idx} className="flex gap-3 items-start">
                                                    <div className="flex-1 space-y-1">
                                                        <input
                                                            type="text"
                                                            value={attr.name}
                                                            onChange={(e) => updateAttribute(idx, "name", e.target.value)}
                                                            placeholder="Name (e.g. Size)"
                                                            className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div className="flex-[2] space-y-1">
                                                        <input
                                                            type="text"
                                                            value={attr.options}
                                                            onChange={(e) => updateAttribute(idx, "options", e.target.value)}
                                                            placeholder="Values separated by | (e.g. S | M | L)"
                                                            className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none"
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeAttribute(idx)}
                                                        className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}

                                            <div className="pt-2 flex justify-end">
                                                <button
                                                    type="button"
                                                    onClick={generateVariations}
                                                    className="text-xs bg-violet-600 hover:bg-violet-500 text-white font-medium px-4 py-2 rounded-lg transition border border-violet-400/30"
                                                >
                                                    Generate Variations from Attributes
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-3xl bg-[#13131f] border border-white/[0.07] p-6 space-y-5">
                                    <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Variations</label>

                                    {variations.length === 0 ? (
                                        <div className="text-center py-8 text-white/30 text-sm border border-dashed border-white/10 rounded-xl">
                                            Click "Generate Variations" to populate this list.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {variations.map((v, idx) => (
                                                <div key={v.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <div className="flex gap-2 font-medium text-sm text-indigo-300">
                                                            {Object.entries(v.attributes).map(([key, val]) => (
                                                                <span key={key} className="bg-indigo-500/20 px-2 py-0.5 rounded-md">
                                                                    {key}: {val}
                                                                </span>
                                                            ))}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeVariation(idx)}
                                                            className="text-white/30 hover:text-red-400 transition"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>

                                                    <div className="flex gap-4">
                                                        {/* Variation Image Thumbnail inside layout */}
                                                        <div className="flex-shrink-0 w-24 h-24 rounded-lg border border-dashed border-white/20 bg-white/[0.02] relative group cursor-pointer overflow-hidden flex items-center justify-center">
                                                            {v.image_preview ? (
                                                                <img src={v.image_preview} alt="Variation" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span className="text-[10px] text-white/30 font-medium text-center uppercase tracking-wider px-2">Add Image</span>
                                                            )}
                                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                                                <Plus className="w-5 h-5 text-white" />
                                                            </div>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                                onChange={(e) => handleVariationImage(idx, e)}
                                                                title="Upload Variation Image"
                                                            />
                                                        </div>

                                                        {/* Variation Inputs */}
                                                        <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-3">
                                                            <div>
                                                                <label className="block text-[10px] uppercase text-white/40 mb-1">Reg. Price *</label>
                                                                <input
                                                                    type="number" step="0.01" value={v.regular_price} onChange={e => updateVariation(idx, "regular_price", e.target.value)}
                                                                    className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-violet-500" required
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] uppercase text-white/40 mb-1">Sale Price</label>
                                                                <input
                                                                    type="number" step="0.01" value={v.sale_price} onChange={e => updateVariation(idx, "sale_price", e.target.value)}
                                                                    className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-violet-500"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] uppercase text-white/40 mb-1">SKU</label>
                                                                <input
                                                                    type="text" value={v.sku} onChange={e => updateVariation(idx, "sku", e.target.value)}
                                                                    className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-violet-500"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] uppercase text-white/40 mb-1">Stock</label>
                                                                <input
                                                                    type="number" value={v.stock} onChange={e => updateVariation(idx, "stock", e.target.value)}
                                                                    placeholder="Unlimit"
                                                                    className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-violet-500"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Right Column (Sidebar) */}
                    <div className="space-y-6">
                        {/* Image Upload */}
                        <div className="rounded-3xl bg-[#13131f] border border-white/[0.07] p-6">
                            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Main Image</label>
                            <div
                                className="relative group cursor-pointer border-2 border-dashed border-white/10 hover:border-violet-500/50 rounded-2xl transition-colors overflow-hidden"
                                onClick={() => fileRef.current?.click()}
                                style={{ minHeight: 180 }}
                            >
                                {imagePreview ? (
                                    <div className="relative w-full h-full group/preview">
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                removeMainImage();
                                            }}
                                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover/preview:opacity-100 transition-opacity z-10"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/30 group-hover:text-white/50 transition-colors p-4 text-center">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <p className="text-xs font-medium">Click to upload main image</p>
                                    </div>
                                )}
                                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                            </div>
                        </div>

                        {/* Status */}
                        <div className="rounded-3xl bg-[#13131f] border border-white/[0.07] p-6 space-y-4">
                            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider">Visibility & Shipping</label>

                            <div>
                                <label className="block text-xs text-white/50 mb-1.5">Visibility Status</label>
                                <div className="flex flex-col gap-2">
                                    {[
                                        { val: "publish", label: "Published" },
                                        { val: "draft", label: "Draft" },
                                        { val: "pending", label: "Pending Review" },
                                    ].map((s) => (
                                        <button
                                            key={s.val}
                                            type="button"
                                            onClick={() => set("status", s.val)}
                                            className={`py-2 px-3 rounded-xl text-xs font-semibold border transition text-left ${fields.status === s.val
                                                ? "bg-violet-600/20 border-violet-500/50 text-violet-300"
                                                : "bg-white/[0.02] border-white/5 text-white/50 hover:bg-white/[0.05]"
                                                }`}
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            id="submit-product"
                            disabled={loading}
                            className="w-full py-4 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-sm font-bold text-white transition shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Creating...
                                </>
                            ) : (
                                "List Product →"
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
