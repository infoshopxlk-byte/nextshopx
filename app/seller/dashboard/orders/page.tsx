"use client";

import { useEffect, useState, useCallback, useRef, Fragment } from "react";

interface OrderNote {
    id: number;
    date_created: string;
    note: string;
    customer_note: boolean;
    author: string;
}

interface OrderItem {
    name: string;
    quantity: number;
    sku?: string;
    total: string;
}

interface Order {
    id: number;
    status: string;
    total: string;
    date_created: string;
    billing: {
        first_name: string;
        last_name: string;
        address_1: string;
        address_2?: string;
        city: string;
        state?: string;
        postcode?: string;
        phone?: string;
        email?: string;
    };
    shipping: {
        first_name: string;
        last_name: string;
        address_1: string;
        address_2?: string;
        city: string;
        state?: string;
        postcode?: string;
    };
    line_items: OrderItem[];
    shipping_total: string;
    cancel_reason?: string;
}

const STATUS_COLOR: Record<string, string> = {
    completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    processing: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    pending: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    cancelled: "bg-red-500/15 text-red-400 border-red-500/20",
    refunded: "bg-purple-500/15 text-purple-400 border-purple-500/20",
    "on-hold": "bg-orange-500/15 text-orange-400 border-orange-500/20",
};

function fmtDate(d: string) {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtLKR(n: string | number) {
    return "Rs. " + parseFloat(String(n)).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Invoice Print Modal ───────────────────────────────────────────────────────
function InvoiceModal({ order, notes, storeName, onClose }: { order: Order; notes: OrderNote[]; storeName: string; onClose: () => void }) {
    const printRef = useRef<HTMLDivElement>(null);

    function handlePrint() {
        const win = window.open("", "_blank", "width=900,height=700");
        if (!win || !printRef.current) return;
        win.document.write(`
            <!DOCTYPE html><html><head>
            <title>Invoice #${order.id} – ShopX.lk</title>
            <style>
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body { font-family: 'Arial', sans-serif; font-size: 12px; color: #111; background: #fff; }
              @page { size: A4; margin: 16mm; }
              .page { width: 100%; max-width: 794px; margin: 0 auto; padding: 24px; }
              .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; }
              .brand { font-size: 22px; font-weight: 900; color: #2563eb; letter-spacing: -0.5px; }
              .brand span { color: #111; }
              .invoice-meta { text-align: right; }
              .invoice-meta h2 { font-size: 20px; font-weight: 700; color: #111; }
              .invoice-meta p { color: #555; font-size: 11px; margin-top: 2px; }
              .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
              .section-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 4px; }
              .section-value { font-size: 12px; color: #111; line-height: 1.6; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
              th { background: #f3f4f6; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb; }
              td { padding: 8px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
              .totals { margin-left: auto; width: 280px; }
              .totals tr.grand td { font-weight: 700; font-size: 14px; border-top: 2px solid #111; padding-top: 8px; }
              .notes-box { background: #fffbeb; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin-top: 16px; }
              .notes-box h4 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #92400e; margin-bottom: 8px; }
              .note-item { margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #fde68a; }
              .note-item:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
              .note-meta { font-size: 10px; color: #92400e; margin-bottom: 2px; }
              .note-text { font-size: 12px; color: #111; white-space: pre-wrap; }
              .status-badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: 600; text-transform: capitalize; background: #dbeafe; color: #1d4ed8; }
              .footer-note { margin-top: 24px; font-size: 10px; color: #888; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 12px; }
            </style>
            </head><body><div class="page">${printRef.current.innerHTML}</div></body></html>
        `);
        win.document.close();
        win.focus();
        setTimeout(() => { win.print(); win.close(); }, 500);
    }

    const courierNotes = notes.filter(n => !n.customer_note);
    const customerNotes = notes.filter(n => n.customer_note);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Modal header */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-lg font-bold text-gray-900">Invoice Preview — Order #{order.id}</h2>
                    <div className="flex items-center gap-2">
                        <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                            Print / Save PDF
                        </button>
                        <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>

                {/* Scrollable preview */}
                <div className="overflow-y-auto flex-1 p-6 bg-gray-50">
                    {/* Printable area */}
                    <div ref={printRef} className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 font-sans text-sm text-gray-900">
                        {/* Page header */}
                        <div className="header flex justify-between items-start border-b-2 border-blue-600 pb-4 mb-6">
                            <div>
                                <div className="brand text-2xl font-black text-blue-600">ShopX<span className="text-gray-900">.lk</span></div>
                                <p className="text-xs text-gray-500 mt-1">vendor.shopx.lk</p>
                                <p className="text-xs text-gray-500 font-semibold mt-1">{storeName}</p>
                            </div>
                            <div className="text-right">
                                <h2 className="text-xl font-bold text-gray-900">INVOICE</h2>
                                <p className="text-sm text-gray-500">#{order.id}</p>
                                <p className="text-xs text-gray-400 mt-1">{fmtDate(order.date_created)}</p>
                                <span className="inline-block mt-2 px-3 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 capitalize">{order.status}</span>
                            </div>
                        </div>

                        {/* Addresses */}
                        <div className="grid grid-cols-2 gap-6 mb-6">
                            <div>
                                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Bill To</p>
                                <p className="font-semibold">{order.billing.first_name} {order.billing.last_name}</p>
                                <p className="text-gray-600 text-xs leading-relaxed">
                                    {order.billing.address_1}{order.billing.address_2 ? `, ${order.billing.address_2}` : ""}<br />
                                    {order.billing.city}{order.billing.postcode ? ` ${order.billing.postcode}` : ""}
                                    {order.billing.phone && <><br />Tel: {order.billing.phone}</>}
                                    {order.billing.email && <><br />{order.billing.email}</>}
                                </p>
                            </div>
                            <div>
                                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Ship To</p>
                                <p className="font-semibold">{order.shipping.first_name} {order.shipping.last_name}</p>
                                <p className="text-gray-600 text-xs leading-relaxed">
                                    {order.shipping.address_1}{order.shipping.address_2 ? `, ${order.shipping.address_2}` : ""}<br />
                                    {order.shipping.city}{order.shipping.postcode ? ` ${order.shipping.postcode}` : ""}
                                </p>
                            </div>
                        </div>

                        {/* Items */}
                        <table className="w-full text-xs border-collapse mb-4">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="text-left p-2 border-b border-gray-200 font-semibold text-gray-500 uppercase tracking-wider text-[9px]">Item</th>
                                    <th className="text-left p-2 border-b border-gray-200 font-semibold text-gray-500 uppercase tracking-wider text-[9px]">SKU</th>
                                    <th className="text-center p-2 border-b border-gray-200 font-semibold text-gray-500 uppercase tracking-wider text-[9px]">Qty</th>
                                    <th className="text-right p-2 border-b border-gray-200 font-semibold text-gray-500 uppercase tracking-wider text-[9px]">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.line_items.map((item, i) => (
                                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                                        <td className="p-2 border-b border-gray-100 font-medium">{item.name}</td>
                                        <td className="p-2 border-b border-gray-100 text-gray-400">{item.sku || "—"}</td>
                                        <td className="p-2 border-b border-gray-100 text-center">{item.quantity}</td>
                                        <td className="p-2 border-b border-gray-100 text-right font-semibold">{fmtLKR(item.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Totals */}
                        <div className="flex justify-end mb-6">
                            <table className="w-64 text-sm">
                                <tbody>
                                    <tr>
                                        <td className="py-1 text-gray-500">Subtotal</td>
                                        <td className="py-1 text-right">{fmtLKR(parseFloat(order.total) - parseFloat(order.shipping_total || "0"))}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1 text-gray-500">Shipping</td>
                                        <td className="py-1 text-right">{fmtLKR(order.shipping_total || "0")}</td>
                                    </tr>
                                    <tr className="border-t-2 border-gray-900">
                                        <td className="pt-2 font-bold">Total</td>
                                        <td className="pt-2 text-right font-bold text-base">{fmtLKR(order.total)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Courier / Order Notes — the critical section */}
                        {(courierNotes.length > 0 || customerNotes.length > 0) && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-2">
                                <h4 className="text-[9px] font-bold uppercase tracking-widest text-amber-700 mb-3 flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    Order Notes & Courier Details
                                </h4>
                                {courierNotes.map(n => (
                                    <div key={n.id} className="mb-3 pb-3 border-b border-amber-200 last:border-0 last:mb-0 last:pb-0">
                                        <p className="text-[9px] text-amber-600 font-semibold mb-1">{fmtDate(n.date_created)} — {n.author || "Admin"}</p>
                                        <p className="text-xs text-gray-800 whitespace-pre-wrap">{n.note}</p>
                                    </div>
                                ))}
                                {customerNotes.map(n => (
                                    <div key={n.id} className="mb-3 pb-3 border-b border-amber-200 last:border-0 last:mb-0 last:pb-0">
                                        <p className="text-[9px] text-amber-600 font-semibold mb-1">{fmtDate(n.date_created)} — Customer Note</p>
                                        <p className="text-xs text-gray-800 whitespace-pre-wrap">{n.note}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        <p className="text-center text-[9px] text-gray-400 mt-6 border-t pt-4">
                            Thank you for your purchase! | ShopX.lk — Sri Lanka&apos;s Multi-Vendor Marketplace | Hotline: 070 3999 100
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Orders Page ───────────────────────────────────────────────────────────────
export default function SellerOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [openMenu, setOpenMenu] = useState<number | null>(null);
    const [printOrder, setPrintOrder] = useState<Order | null>(null);
    const [printNotes, setPrintNotes] = useState<OrderNote[]>([]);
    const [notesLoading, setNotesLoading] = useState(false);
    const [storeName, setStoreName] = useState("My Store");

    const [rtsOrder, setRtsOrder] = useState<Order | null>(null);
    const [rtsNote, setRtsNote] = useState("");
    const [rtsSubmitting, setRtsSubmitting] = useState(false);

    const fetchOrders = useCallback(async () => {
        const token = localStorage.getItem("seller_token");
        const store = localStorage.getItem("seller_store") || "My Store";
        setStoreName(store);
        if (!token) return;
        try {
            const res = await fetch(`/api/proxy?path=/shopx/v1/seller/orders&per_page=100`, {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store",
            });
            if (res.ok) {
                const raw = await res.json();
                console.log("Orders API Response:", raw);
                // Endpoint returns { success: true, data: [...] }
                const list = Array.isArray(raw) ? raw : (raw.data ?? []);
                
                // Cleanup: Filter out 'pending' orders older than 24 hours
                const filteredList = list.filter((order: Order) => {
                    if (order.status === 'pending') {
                        const ageInHours = (Date.now() - new Date(order.date_created).getTime()) / (1000 * 60 * 60);
                        return ageInHours <= 24;
                    }
                    return true;
                });
                
                setOrders(filteredList);
            }
        } catch (e) {
            console.error("Orders fetch error:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    async function handleRtsSubmit() {
        if (!rtsOrder) return;
        setRtsSubmitting(true);
        try {
            const token = localStorage.getItem("seller_token");
            const res = await fetch(`/api/proxy?path=/shopx/v1/seller/order/rts`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    order_id: rtsOrder.id,
                    note: rtsNote
                })
            });

            if (res.ok) {
                // Update local status inline immediately
                setOrders(prev => prev.map(o => o.id === rtsOrder.id ? { ...o, status: "completed" } : o));
                setRtsOrder(null);
            } else {
                const data = await res.json();
                alert(data?.message || "Failed to mark as RTS.");
            }
        } catch (e) {
            console.error("RTS error:", e);
            alert("An error occurred. Please try again.");
        } finally {
            setRtsSubmitting(false);
        }
    }

    async function handlePrintInvoice(order: Order) {
        setOpenMenu(null);
        setPrintOrder(order);
        setPrintNotes([]);
        setNotesLoading(true);
        try {
            const token = localStorage.getItem("seller_token");
            const res = await fetch(`/api/proxy?path=/wc/v3/orders/${order.id}/notes`, {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store",
            });
            if (res.ok) {
                const notes: OrderNote[] = await res.json();
                setPrintNotes(Array.isArray(notes) ? notes : []);
            }
        } catch (e) {
            console.error("Notes fetch error:", e);
        } finally {
            setNotesLoading(false);
        }
    }

    async function handlePrintShippingLabel(order: Order) {
        setOpenMenu(null);
        setNotesLoading(true);

        let notes: OrderNote[] = [];
        try {
            const token = localStorage.getItem("seller_token");
            const res = await fetch(`/api/proxy?path=/wc/v3/orders/${order.id}/notes`, {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store",
            });
            if (res.ok) notes = await res.json();
        } catch { /* ignore, show label without notes */ }
        finally { setNotesLoading(false); }

        const sh = order.shipping;
        const name = [sh?.first_name, sh?.last_name].filter(Boolean).join(" ")
            || [order.billing?.first_name, order.billing?.last_name].filter(Boolean).join(" ");
        const addr = [sh?.address_1, sh?.address_2, sh?.city, sh?.postcode].filter(Boolean).join(", ");
        const phone = order.billing?.phone || "";
        const courierNotes = notes.map(n =>
            `<p><strong>${n.customer_note ? "Customer" : "Admin"} Note (${new Date(n.date_created).toLocaleDateString()}):</strong><br>${n.note.replace(/\n/g, "<br>")}</p>`
        ).join("");

        const win = window.open("", "_blank", "width=600,height=500");
        if (!win) return;
        win.document.write(`<!DOCTYPE html><html><head><title>Shipping Label – #${order.id}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; background: #f5f5f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .label { background: #fff; border: 2px solid #000; border-radius: 8px; padding: 24px; width: 380px; }
  .from { font-size: 10px; color: #555; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 1px dashed #ccc; padding-bottom: 8px; margin-bottom: 12px; }
  .to-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #555; margin-bottom: 4px; }
  .name { font-size: 20px; font-weight: 900; margin-bottom: 4px; }
  .addr { font-size: 14px; line-height: 1.5; color: #222; }
  .phone { font-size: 13px; color: #333; margin-top: 4px; }
  .order-id { text-align: center; font-size: 28px; font-weight: 900; letter-spacing: 4px; border: 2px solid #000; border-radius: 6px; padding: 8px 0; margin: 16px 0; }
  .notes { background: #fffbeb; border: 1px solid #f59e0b; border-radius: 6px; padding: 10px; margin-top: 12px; font-size: 11px; line-height: 1.5; }
  .notes h4 { font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px; color: #92400e; margin-bottom: 6px; }
  .print-btn { display: block; width: 100%; margin-top: 20px; padding: 10px; background: #2563eb; color: #fff; border: none; border-radius: 6px; font-size: 14px; font-weight: 700; cursor: pointer; }
  @media print {
    body { background: #fff; display: block; }
    .label { border: 2px solid #000; width: 100%; border-radius: 0; }
    .print-btn { display: none !important; }
  }
</style></head><body>
<div class="label">
  <div class="from">From: ShopX.lk — ${storeName}</div>
  <div class="to-label">Ship To:</div>
  <div class="name">${name}</div>
  <div class="addr">${addr}</div>
  ${phone ? `<div class="phone">📞 ${phone}</div>` : ""}
  <div class="order-id">ORDER #${order.id}</div>
  ${courierNotes ? `<div class="notes"><h4>📦 Courier / Order Notes</h4>${courierNotes}</div>` : ""}
  <button class="print-btn" onclick="window.print()">🖨️ Print Label</button>
</div>
</body></html>`);
        win.document.close();
    }

    return (
        <div className="space-y-6 text-white" onClick={() => setOpenMenu(null)}>
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Orders</h1>
                    <p className="text-sm text-white/40 mt-1">{orders.length} total orders</p>
                </div>
                <button onClick={() => { setLoading(true); fetchOrders(); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/60 hover:text-white hover:bg-white/10 transition-all" id="refresh-orders">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    Refresh
                </button>
            </div>

            <div className="rounded-2xl bg-[#13131f] border border-white/[0.07] overflow-hidden">
                {loading ? (
                    <div className="divide-y divide-white/5">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="px-6 py-4 flex items-center gap-4 animate-pulse">
                                <div className="w-16 h-4 bg-white/5 rounded" />
                                <div className="flex-1 h-4 bg-white/5 rounded" />
                                <div className="w-24 h-4 bg-white/5 rounded" />
                                <div className="w-20 h-4 bg-white/5 rounded" />
                                <div className="w-8 h-8 bg-white/5 rounded-lg" />
                            </div>
                        ))}
                    </div>
                ) : orders.length === 0 ? (
                    <div className="py-20 text-center text-white/30">No orders found</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm" id="orders-table">
                            <thead>
                                <tr className="border-b border-white/5">
                                    {["Order", "Customer", "Date", "Status", "Total", "Actions"].map(h => (
                                        <th key={h} className={`px-6 py-3 text-[10px] font-semibold text-white/30 uppercase tracking-widest ${h === "Total" || h === "Actions" ? "text-right" : "text-left"}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.04]">
                                {orders.map((order) => (
                                    <Fragment key={order.id}>
                                        <tr className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-3.5 font-mono text-violet-400 font-medium">#{order.id}</td>
                                            <td className="px-6 py-3.5 text-white/70">
                                                {[order.billing?.first_name, order.billing?.last_name].filter(Boolean).join(" ") || "—"}
                                            </td>
                                            <td className="px-6 py-3.5 text-white/40 whitespace-nowrap">{fmtDate(order.date_created)}</td>
                                            <td className="px-6 py-3.5">
                                                <div className="flex flex-col items-start gap-1">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${STATUS_COLOR[order.status] ?? "bg-white/5 text-white/40 border-white/10"}`}>
                                                        {order.status}
                                                    </span>
                                                    {order.status === 'pending' && (
                                                        <span className="text-[10px] font-medium text-amber-500/80">
                                                            Payment not completed
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5 text-right text-white font-semibold">{fmtLKR(order.total)}</td>
                                            <td className="px-6 py-3.5 text-right relative">
                                                <button
                                                    id={`order-action-${order.id}`}
                                                    onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === order.id ? null : order.id); }}
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition"
                                                >
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
                                                    </svg>
                                                </button>

                                                {openMenu === order.id && (
                                                    <div className="absolute right-4 top-full mt-1 z-30 w-52 bg-[#1e1e2e] border border-white/10 rounded-xl shadow-2xl shadow-black/50 py-1 overflow-hidden" onClick={e => e.stopPropagation()}>
                                                        <button
                                                            id={`print-invoice-${order.id}`}
                                                            onClick={() => handlePrintInvoice(order)}
                                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                                                        >
                                                            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                                            Print Invoice (A4)
                                                        </button>
                                                        <div className="mx-3 border-t border-white/5" />
                                                        <button
                                                            id={`print-label-${order.id}`}
                                                            onClick={() => handlePrintShippingLabel(order)}
                                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                                                        >
                                                            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                                                            Print Shipping Label
                                                        </button>
                                                        <div className="mx-3 border-t border-white/5" />
                                                        <button
                                                            id={`rts-${order.id}`}
                                                            onClick={() => { setOpenMenu(null); setRtsOrder(order); setRtsNote(""); }}
                                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-amber-400 hover:text-amber-300 hover:bg-white/5 transition-colors"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                            Ready to Ship
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                        {order.status === 'cancelled' && order.cancel_reason && (
                                            <tr className="bg-red-500/5">
                                                <td colSpan={6} className="px-6 py-3 text-xs text-red-400 border-t border-red-500/10 whitespace-pre-wrap">
                                                    <span className="font-bold uppercase tracking-widest text-[10px] mr-2 text-red-500">Cancellation Reason:</span>
                                                    {order.cancel_reason}
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Notes loading overlay */}
            {notesLoading && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#13131f] rounded-2xl p-8 flex flex-col items-center gap-4">
                        <svg className="w-8 h-8 text-violet-400 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <p className="text-white/60 text-sm">Fetching order notes & courier details…</p>
                    </div>
                </div>
            )}

            {/* Print Modal */}
            {printOrder && !notesLoading && (
                <InvoiceModal
                    order={printOrder}
                    notes={printNotes}
                    storeName={storeName}
                    onClose={() => { setPrintOrder(null); setPrintNotes([]); }}
                />
            )}

            {/* RTS Modal */}
            {rtsOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 text-white" onClick={() => !rtsSubmitting && setRtsOrder(null)}>
                    <div className="bg-[#1e1e2e] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg p-6 flex flex-col" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold mb-2">Mark Order #{rtsOrder.id} as Ready to Ship</h2>
                        <p className="text-sm text-white/50 mb-6">This will mark the order as Completed and optionally send a notification note to the customer.</p>

                        <label className="text-sm font-semibold text-white/70 mb-2 block">Note to Customer (Optional)</label>
                        <textarea
                            value={rtsNote}
                            onChange={(e) => setRtsNote(e.target.value)}
                            placeholder="e.g., Your order has been packed and handed over to the courier. Tracking ID: ..."
                            className="w-full h-32 bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500 mb-6 resize-none"
                            disabled={rtsSubmitting}
                        />

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setRtsOrder(null)}
                                disabled={rtsSubmitting}
                                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-semibold transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRtsSubmit}
                                disabled={rtsSubmitting}
                                className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition flex items-center gap-2 disabled:opacity-50"
                            >
                                {rtsSubmitting ? (
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                )}
                                Confirm RTS
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
