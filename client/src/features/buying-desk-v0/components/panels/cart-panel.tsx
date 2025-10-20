import React from "react";
import { useParams } from "wouter";
import { useSessionAssets } from "../../hooks/use-assets";
import { useCartActionsV0 as useCartActions } from "../../hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { CheckoutDialog } from "../dialogs/checkout-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { buyingDeskApi } from "../../lib/api";
import { X, Edit2, Check, ExternalLink } from "lucide-react";
import { getDraftPrice } from "../../lib/draft-prices";

interface Props { onClose?: () => void }

export function CartPanel({ onClose }: Props) {
        const { id } = useParams<{ id: string }>();
        const qc = useQueryClient();
        const { data: assets = [], isLoading } = useSessionAssets(id || "");
        const cartItems = assets.filter((a) => a.status === "ready");
        const [checkoutOpen, setCheckoutOpen] = React.useState(false);
        const { removeFromCart } = useCartActions(id || "");
        const { toast } = useToast();

        const [imgSrcByAsset, setImgSrcByAsset] = React.useState<Record<string, string>>({});
        const [imgLoaded, setImgLoaded] = React.useState<Record<string, boolean>>({});
        React.useEffect(() => {
                // Only update state if we actually add new entries; otherwise keep same ref to avoid re-renders
                setImgSrcByAsset((prev) => {
                        let changed = false;
                        const next = { ...prev } as Record<string, string>;
                        for (const row of cartItems as any[]) {
                                const gaid = row?.asset?.id as string | undefined;
                                const url = row?.asset?.psaImageFrontUrl as string | undefined;
                                if (gaid && url && !next[gaid]) { next[gaid] = url; changed = true; }
                        }
                        return changed ? next : prev;
                });
        }, [cartItems]);

        const globalIds = React.useMemo(() => cartItems.map((r: any) => r.asset?.id).filter(Boolean), [cartItems]);
        const { data: marketData = {}, isFetching: fetchingPricing } = useQuery({
                queryKey: ["/api/pricing/batch", globalIds],
                queryFn: async () => { if (!globalIds.length) return {} as Record<string, any>; const res = await apiRequest("POST", "/api/pricing/batch", { globalAssetIds: globalIds }); return res.json(); },
                enabled: globalIds.length > 0,
                staleTime: 60_000,
                placeholderData: (prev) => prev as any,
                refetchOnMount: false,
                refetchOnReconnect: false,
        });

        const totals = React.useMemo(() => {
                const offerTotal = cartItems.reduce((s: number, r: any) => s + (Number(r.offerPrice || 0) || 0), 0);
                const marketValue = cartItems.reduce((s: number, r: any) => { const gaid = r.asset?.id; const avg = gaid ? Number((marketData as any)[gaid]?.averagePrice || 0) || 0 : 0; return s + avg; }, 0);
                const expectedProfit = marketValue - offerTotal; return { offerTotal, marketValue, expectedProfit };
        }, [cartItems, marketData]);

        const [editingId, setEditingId] = React.useState<string | null>(null);
        const [editingPrice, setEditingPrice] = React.useState<string>("");
        const [saveState, setSaveState] = React.useState<Record<string, "saving" | "saved">>({});
        const editRef = React.useRef<HTMLInputElement>(null);
        const startEdit = (row: any) => { setEditingId(row.id); setEditingPrice((Number(row.offerPrice || 0) || 0).toFixed(2)); setTimeout(() => { editRef.current?.focus(); editRef.current?.select(); }, 50); };
        const savePrice = async (row: any) => { 
                const num = parseFloat(editingPrice); 
                if (isNaN(num) || num < 0) { setEditingId(null); setEditingPrice(""); return; } 
                try { 
                        setSaveState((p) => ({ ...p, [row.id]: "saving" })); 
                        await apiRequest("PATCH", `/api/buying-desk/sessions/${id}/assets/${row.id}`, { offerPrice: num }); 
                        // Optimistically update the price in the row
                        row.offerPrice = num; 
                        // Update the cached data directly instead of invalidating
                        const current = qc.getQueryData<any[]>(["buying-desk", "assets", id]);
                        if (Array.isArray(current)) {
                                qc.setQueryData(["buying-desk", "assets", id], current.map(item => 
                                        item.id === row.id ? { ...item, offerPrice: num } : item
                                ));
                        }
                        setSaveState((p) => ({ ...p, [row.id]: "saved" })); 
                        setTimeout(() => setSaveState((p) => { const n = { ...p }; delete n[row.id]; return n; }), 1500); 
                } catch (e: any) { 
                        toast({ title: "Failed to update price", description: e?.message || "", variant: "destructive" }); 
                } finally { 
                        setEditingId(null); setEditingPrice(""); 
                } 
        };

        const [sending, setSending] = React.useState(false);
        const [removing, setRemoving] = React.useState<Record<string, boolean>>({});
        const handleSendOffer = async () => { if (!id) return; try { setSending(true); await buyingDeskApi.sessions.update(id, { status: "sent" as any }); toast({ title: "Offer sent" }); } catch (e: any) { toast({ title: "Failed to send offer", description: e?.message || "", variant: "destructive" }); } finally { setSending(false); } };

        return (
                <div className="bg-background border-l h-full flex flex-col">
                        <div className="p-6 border-b flex-shrink-0">
                                <div className="flex items-center justify-between">
                                        <h3 className="text-m font-semibold text-muted-foreground">Buy List ({cartItems.length})</h3>
                                        {onClose && (<Button variant="ghost" size="icon" onClick={onClose} aria-label="Close buy list"><X className="h-5 w-5" /></Button>)}
                                </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                                <div className="w-full">
                                        {isLoading ? (<div className="p-6 text-muted-foreground">Loading…</div>) : cartItems.length === 0 ? (<div className="p-6 text-muted-foreground">Your buy list is empty.</div>) : (
                                                cartItems.map((row: any) => {
                                                        const avg = Number((marketData as any)?.[row.asset?.id]?.averagePrice || 0) || 0;
                                                        const draft = row.asset?.id ? getDraftPrice(id || "", row.asset.id) : undefined;
                                                        const buy = Number((draft ?? row.offerPrice) || 0) || 0;
                                                        const profit = avg - buy; const pctOfComp = avg > 0 ? Math.round((buy / avg) * 100) : 0; const profitMargin = avg > 0 ? Math.round((profit / avg) * 100) : 0;
                                                        return (
                                                                <div key={row.id} className={`w-full border-b p-4 hover:bg-muted/50 transition-colors ${removing[row.id] ? "opacity-60" : ""}`}>
                                                                        <div className="w-full flex items-start gap-3">
                                                                                <div className="w-16 h-28 relative bg-muted rounded border flex-shrink-0 overflow-hidden">
                                                                                        {(() => { const gaid = row.asset?.id as string | undefined; const cached = gaid ? imgSrcByAsset[gaid] : undefined; const current = row.asset?.psaImageFrontUrl as string | undefined; const src = cached || current; const loaded = gaid ? !!imgLoaded[gaid] : false; return (<>{src ? (<img src={src} alt="Card" className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`} draggable={false} decoding="async" loading="lazy" onLoad={() => { if (gaid) setImgLoaded((p) => ({ ...p, [gaid]: true })); }} />) : null}<div className={`absolute inset-0 flex items-center justify-center ${src && loaded ? "opacity-0" : "opacity-100"} transition-opacity duration-200`}><div className="w-full h-full bg-muted animate-pulse" /></div></>); })()}
                                                                                </div>
                                                                                <div className="flex-1 pt-2 min-w-0 w-full flex justify-between items-start">
                                                                                        <div className="flex-1 min-w-0">
                                                                                                <div className="text-xs font-medium tracking-wide uppercase text-muted-foreground leading-tight truncate">{row.asset?.year} {row.asset?.setName}</div>
                                                                                                <button onClick={() => { const gaid = row.asset?.id; if (gaid) window.open(`/assets/${gaid}`, "_blank"); }} className="font-semibold text-sm leading-tight truncate text-foreground cursor-pointer flex items-center gap-1 group"><span className="truncate">{row.asset?.playerName || row.asset?.title || "Unknown"}</span><ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" /></button>
                                                                                                <div className="text-xs text-foreground leading-tight">#{row.asset?.cardNumber} • {row.asset?.grader ? `${row.asset?.grader} ${row.asset?.grade || ""}` : (row.asset?.grade || "").trim()}</div>
                                                                                                {row.asset?.certNumber && (<div className="text-xs text-muted-foreground leading-tight">Cert# {row.asset?.certNumber}</div>)}
                                                                                                <button onClick={async () => { try { setRemoving((p) => ({ ...p, [row.id]: true })); await removeFromCart.mutateAsync(row.id); } catch (e: any) { toast({ title: "Remove failed", description: e?.message || "", variant: "destructive" }); } finally { setRemoving((p) => { const n = { ...p }; delete n[row.id]; return n; }); } }} disabled={!!removing[row.id]} className="text-xs text-muted-foreground hover:text-foreground mt-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">{removing[row.id] ? "Removing…" : "Remove"}</button>
                                                                                        </div>
                                                                                        <div className="flex flex-col items-end text-right">
                                                                                                <div className="text-xs text-muted-foreground mb-1">Buy Price</div>
                                                                                                {editingId === row.id ? (
                                                                                                        <div className="flex items-center gap-2">
                                                                                                                <Input ref={editRef} type="number" step="0.01" min="0" value={editingPrice} onChange={(e) => setEditingPrice(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") savePrice(row); if (e.key === "Escape") { setEditingId(null); setEditingPrice(""); } }} onBlur={() => savePrice(row)} className="w-20 h-8 text-sm text-right" />
                                                                                                                <Button variant="ghost" size="sm" onClick={() => { setEditingId(null); setEditingPrice(""); }} className="h-6 w-6 p-0"><X className="h-3 w-3" /></Button>
                                                                                                        </div>
                                                                                                ) : (
                                                                                                        <div className="flex items-center gap-2">
                                                                                                                <div className="font-bold text-foreground text-lg">${(Number(row.offerPrice || 0) || 0).toFixed(2)}</div>
                                                                                                                {saveState[row.id] === "saving" && (<div className="animate-spin rounded-full h-3 w-3 border-b border-muted-foreground"></div>)}
                                                                                                                {saveState[row.id] === "saved" && (<Check className="h-3 w-3 text-success" />)}
                                                                                                                <Button variant="ghost" size="sm" onClick={() => startEdit(row)} className="h-6 w-6 p-0 hover:bg-muted"><Edit2 className="h-3 w-3" /></Button>
                                                                                                        </div>
                                                                                                )}
                                                                                                <div className="text-sm flex items-center gap-2 mt-2"><div className="text-xs text-muted-foreground">{pctOfComp}% • Profit:</div><Badge variant="secondary" className={(profitMargin ?? 0) < 0 ? "bg-destructive/10 text-destructive border-destructive" : "bg-success/10 text-success border-success"}>{profitMargin}%</Badge><span className="font-medium text-foreground">${profit.toFixed(2)}</span></div>
                                                                                        </div>
                                                                                </div>
                                                                        </div>
                                                                </div>
                                                        );
                                                })
                                        )}
                                </div>
                        </div>
                        {cartItems.length > 0 && (
                                <div className="border-t p-6 flex-shrink-0 bg-background">
                                        <div className="space-y-3">
                                                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Items</span><span className="font-medium text-foreground">{cartItems.length}</span></div>
                                                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Market Value</span><span className="font-medium text-foreground">${totals.marketValue.toFixed(2)}</span></div>
                                                <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Expected Profit</span><div className="flex items-center gap-2"><span className={`font-medium ${totals.expectedProfit < 0 ? "text-destructive" : "text-foreground"}`}>${totals.expectedProfit.toFixed(2)}</span><Badge variant="secondary" className={(totals.marketValue || 0) > 0 && Math.round((totals.expectedProfit / (totals.marketValue || 1)) * 100) < 0 ? "bg-destructive/10 text-destructive border-destructive" : "bg-success/10 text-success border-success"}>{(() => { const pct = (totals.marketValue || 0) > 0 ? Math.round((totals.expectedProfit / (totals.marketValue || 1)) * 100) : 0; return `${pct}%`; })()}</Badge></div></div>
                                                <div className="flex justify-between font-semibold text-lg border-t pt-3"><span className="text-foreground">Total Buy Price</span><span className="text-foreground">${totals.offerTotal.toFixed(2)}</span></div>
                                        </div>
                                        <div className="mt-6 space-y-3">
                                                <Button className="w-full" disabled={cartItems.length === 0} onClick={() => setCheckoutOpen(true)}>Checkout</Button>
                                                <Button variant="outline" className="w-full" disabled={cartItems.length === 0 || sending} onClick={handleSendOffer}>{sending ? "Sending…" : "Send Offer"}</Button>
                                        </div>
                                </div>
                        )}
                        <CheckoutDialog open={checkoutOpen} onOpenChange={setCheckoutOpen} sessionId={id || ""} items={cartItems.map((c: any) => ({ id: c.id, title: c.asset?.title, playerName: c.asset?.playerName, offerPrice: c.offerPrice }))} />
                </div>
        );
}

