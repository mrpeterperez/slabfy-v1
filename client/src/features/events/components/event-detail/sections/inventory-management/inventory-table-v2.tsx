// 🤖 INTERNAL NOTE:
// Purpose: Minimal Inventory V2 table for Events (test tab) mirroring consignment-style columns
// Exports: InventoryTableV2 component
// Feature: events

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import type { Event } from "shared/schema";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, Pencil, ChevronsUpDown, ChevronUp, ChevronDown, MoreHorizontal } from "lucide-react";
import { OwnershipBadge, getOwnershipType } from "@/components/ui/ownership-badge";
import { ConfidenceIndicator as ConfidenceBars } from "@/components/ui/metrics/confidence-indicator";
import { LiquidityIndicator as LiquidityBars } from "@/components/ui/metrics/liquidity-indicator";
import { InventoryMobileCard } from "../../components/InventoryMobileCard";
import InventoryV2Toolbar from "./inventory-v2-toolbar";
import { AddToEventDialog } from "../../../inventory/add-to-event-dialog";
import InventoryV2StatusTabs, { type V2Status } from "./inventory-v2-status-tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AddToCartIconButton } from "@/components/ui/add-to-cart-icon-button";
import { SalesDataStatus } from "@/components/ui/metrics/sales-data-status";
import { TableSkeleton } from "@/components/ui/skeletons/table-skeleton";

type SortColumn = "asset" | "listPrice" | "market" | "profit" | "confidence" | "liquidity" | "status" | "ownership";
type SortDirection = "asc" | "desc";

// Stable SortableHeader component - defined outside to prevent re-creation on every render
const SortableHeader = ({ column, children, align = 'left', onToggleEdit, isEditing, onSort, sortColumn, sortDirection }: { 
  column: SortColumn; 
  children: React.ReactNode; 
  align?: 'left' | 'center' | 'right'; 
  onToggleEdit?: () => void; 
  isEditing?: boolean;
  onSort: (col: SortColumn) => void;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
}) => (
  <th className={`px-3 py-3 ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'} text-sm font-medium text-muted-foreground whitespace-nowrap transition-colors`}>
    <div className={`flex items-center gap-2 w-full ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''}`}>
      <button
        className={`inline-flex items-center gap-1 hover:text-foreground ${align === 'right' || align === 'center' ? 'justify-end' : ''}`}
        onClick={() => onSort(column)}
      >
        {children}
        {sortColumn === column ? (
          sortDirection === 'asc' ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )
        ) : (
          <ChevronsUpDown className="h-3 w-3 text-muted-foreground" />
        )}
      </button>
      {onToggleEdit && (
        <button
          type="button"
          className={`h-7 w-7 inline-flex items-center justify-center rounded hover:bg-muted/50 ${isEditing ? 'bg-muted/70 text-foreground' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggleEdit(); }}
          aria-label="Toggle column edit"
          title={isEditing ? 'Stop editing' : 'Edit column'}
          data-testid={`edit-toggle-${column}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
      {isEditing && (
        <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-foreground/80">Editing</span>
      )}
    </div>
  </th>
);

interface Props {
        event: Event;
        onToggleCart?: () => void;
        cartCount?: number;
        onAddToCart?: (item: any) => void;
        isInCart?: (id: string) => boolean;
        onRemoveFromCart?: (id: string) => void;
}

export function InventoryTableV2({ event, onToggleCart, cartCount, onAddToCart, isInCart, onRemoveFromCart }: Props) {
        // Single source of truth for missing-image placeholder
        const NO_IMAGE_PLACEHOLDER = "https://koeoplnomfmuzreldryz.supabase.co/storage/v1/object/public/bucketv0/No-Image-Placeholder-Slabfy.png";
        const queryClient = useQueryClient();
        const [openAdd, setOpenAdd] = useState(false);
        const [search, setSearch] = useState("");
        const [editCols, setEditCols] = useState<Set<'list' | 'status'>>(new Set());
        const toggleEditCol = (col: 'list' | 'status') => {
                setEditCols(prev => { const n = new Set(prev); n.has(col) ? n.delete(col) : n.add(col); return n; });
        };
        const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});
        const [selected, setSelected] = useState<Set<string>>(new Set());
        const [sortColumn, setSortColumn] = useState<SortColumn>("asset");
        const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
        const [undoDialog, setUndoDialog] = useState<{ open: boolean; item?: any }>({ open: false });
        const [undoConfirmed, setUndoConfirmed] = useState(false);
        const [, navigateTo] = useLocation();

        const { data: items = [], isLoading } = useQuery({
                queryKey: ["/api/events", event.id, "inventory"],
                queryFn: async () => {
                        const res = await apiRequest("GET", `/api/events/${event.id}/inventory`);
                        return res.json();
                },
        });

        // Fetch sales data to get buyer information for sold items
        const { data: sales = [] } = useQuery({
                queryKey: ["/api/events", event.id, "sales"],
                queryFn: async () => {
                        const res = await apiRequest("GET", `/api/events/${event.id}/sales`);
                        return res.json();
                },
        });

        // Create lookup map from eventInventoryId to buyer info and sale details
        const buyerLookup = useMemo(() => {
                const lookup = new Map();
                sales.forEach((sale: any) => {
                        if (sale.eventInventoryId) {
                                lookup.set(sale.eventInventoryId, {
                                        contactName: sale.buyer?.name || sale.buyerName,
                                        email: sale.buyerEmail,
                                        phone: sale.buyerPhone,
                                        // buyerId in sales_transactions IS the contact ID (not buyer table ID)
                                        contactId: sale.buyerId || sale.buyer?.id,
                                        saleDate: sale.saleDate,
                                        paymentMethod: sale.paymentMethod
                                });
                        }
                });
                return lookup;
        }, [sales]);

        // Status filter and counts
        const [status, setStatus] = useState<V2Status>('available');
        const statusCounts = useMemo(() => {
                const c = { all: 0, available: 0, reserved: 0, sold: 0, removed: 0, inCart: 0 } as Record<string, number>;
                (items as any[]).forEach((it: any) => {
                        const raw = (it.status || 'available').toLowerCase();
                        const s = raw === 'pending' ? 'reserved' : raw;
                        c.all++;
                        const inCart = !!isInCart?.(it.id);
                        if (inCart) c.inCart++;
                        if (s === 'available') {
                                // Exclude items that are currently in the cart from Available count
                                if (!inCart) c.available++;
                        } else if (c[s] != null) {
                                c[s]++;
                        }
                });
                return c as any;
        }, [items, isInCart]);

        // Columns visibility (simple, persisted per event)
        const defaultColumns = useMemo(() => ([
                { key: 'asset', label: 'Asset', visible: true, locked: true },
                { key: 'list', label: 'List Price', visible: true },
                { key: 'market', label: 'Market Price', visible: true },
                { key: 'profit', label: 'Profit', visible: true },
                { key: 'confidence', label: 'Confidence', visible: true },
                { key: 'liquidity', label: 'Liquidity', visible: true },
                { key: 'status', label: 'Status', visible: true },
                { key: 'ownership', label: 'Ownership', visible: true },
        ] as const), []);

        const storageKey = `eventInventoryV2Columns:${event.id}`;
        const [columns, setColumns] = useState<Array<{ key: string; label: string; visible: boolean; locked?: boolean }>>(() => {
                try {
                        const saved = localStorage.getItem(storageKey);
                        if (!saved) return [...(defaultColumns as any)];
                        const map = JSON.parse(saved) as Record<string, boolean>;
                        return (defaultColumns as any).map((c: any) => ({ ...c, visible: c.locked ? true : (map[c.key] ?? c.visible) }));
                } catch { return [...(defaultColumns as any)]; }
        });
        const toggleColumn = (key: string) => setColumns(cols => cols.map(c => c.key === key && !c.locked ? { ...c, visible: !c.visible } : c));
        const resetColumns = () => setColumns([...(defaultColumns as any)]);
        const visible = useMemo(() => columns.reduce<Record<string, boolean>>((acc, c) => { acc[c.key] = !!c.visible; return acc; }, {}), [columns]);
        // persist
        useEffect(() => {
                try {
                        const map = columns.reduce<Record<string, boolean>>((a, c) => { a[c.key] = !!c.visible; return a; }, {});
                        localStorage.setItem(storageKey, JSON.stringify(map));
                } catch {}
        }, [columns]);

        const globalAssetIds = useMemo(() => items.map((i: any) => i.globalAssetId).filter(Boolean), [items]);
        const { data: marketData = {}, isLoading: isPricing } = useQuery({
                queryKey: ["/api/pricing/batch", globalAssetIds],
                queryFn: async () => {
                        if (!globalAssetIds.length) return {} as Record<string, any>;
                        const res = await apiRequest("POST", "/api/pricing/batch", { globalAssetIds });
                        return res.json();
                },
                enabled: globalAssetIds.length > 0,
                staleTime: 60_000,
        });

                const rows = useMemo(() => {
                const base = (items as any[]).map((it: any) => {
                        const m = marketData?.[it.globalAssetId] || {};
                        const averagePrice = Number(m?.averagePrice || 0) || 0;
                        const confidence = Number(m?.confidence || 0) || 0;
                                const liquidity = (m?.liquidityRating || 'cool') as string;
                                const salesCount = Number(m?.salesCount || 0) || 0;
                        const listPrice = Number(it?.askingPrice || 0) || 0;
                                const purchasePrice = Number(it?.purchasePrice || 0) || 0;
                                const profit = (() => {
                                if (listPrice > 0 && purchasePrice > 0) return listPrice - purchasePrice; // vs cost
                                if (listPrice > 0 && averagePrice > 0) return listPrice - averagePrice;   // vs market
                                return null;
                        })();
                                const compPct = averagePrice > 0 && listPrice > 0 ? Math.round((listPrice / averagePrice) * 100) : null;
                                return { item: it, market: m, averagePrice, salesCount, confidence, liquidity, listPrice, purchasePrice, displayProfit: profit, compPct };
                });
                // apply status filter (supports inCart virtual status)
                const filtered = base.filter((r: any) => {
                        if (status === 'all') return true;
                        if (status === 'inCart') return !!isInCart?.(r.item.id);
                        const s = (r.item.status || 'available').toLowerCase();
                        if (status === 'available') return s === 'available' && !isInCart?.(r.item.id);
                        if (status === 'reserved') return s === 'reserved' || s === 'pending';
                        return s === status;
                });
                return filtered;
        }, [items, marketData, status, isInCart]);

 

        const sorted = useMemo(() => {
                const list = [...rows];
                const dir = sortDirection === 'asc' ? 1 : -1;
                const getVal = (r: any) => {
                        const i = r.item;
                        switch (sortColumn) {
                                case 'asset': return `${i.playerName || ''} ${i.setName || ''} ${i.year || ''} ${i.cardNumber || ''}`.toLowerCase();
                                case 'listPrice': return r.listPrice || 0;
                                case 'market': return r.averagePrice || 0;
                                case 'profit': return r.displayProfit ?? -Infinity;
                                case 'confidence': return r.confidence || 0;
                                case 'liquidity': {
                                        const order = { cold: 1, cool: 2, warm: 3, hot: 4, fire: 5 } as Record<string, number>;
                                        return order[(r.liquidity || 'cool').toLowerCase()] || 2;
                                }
                                case 'status': return (i.status || 'available').toLowerCase();
                                case 'ownership': return getOwnershipType(i) === 'consignment' ? 1 : 0;
                                default: return 0;
                        }
                };
                list.sort((a, b) => {
                        const av = getVal(a);
                        const bv = getVal(b);
                        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
                        return String(av).localeCompare(String(bv)) * dir;
                });
                return list;
        }, [rows, sortColumn, sortDirection]);

        // Apply search filter and optional pagination (rows per page) AFTER sorted exists
        const visibleRows = useMemo(() => {
                const q = (search || "").trim().toLowerCase();
                const filtered = !q
                        ? sorted
                        : sorted.filter((r: any) => {
                                const i = r.item;
                                const hay = [i.playerName, i.setName, i.year, i.cardNumber, i.grade, i.certNumber || i.cert_number || i.cert || i.certNo || i.certno]
                                        .filter(Boolean)
                                        .join(" ")
                                        .toLowerCase();
                                return hay.includes(q);
                        });
                return filtered;
        }, [sorted, search]);

        const headerIds = useMemo(() => visibleRows.map(r => r.item.id), [visibleRows]);
        const headerChecked = selected.size > 0 && headerIds.every(id => selected.has(id));
        const headerInd = selected.size > 0 && !headerChecked && headerIds.some(id => selected.has(id));

        const setAll = (checked: boolean) => {
                const next = new Set(selected);
                if (checked) headerIds.forEach(id => next.add(id)); else headerIds.forEach(id => next.delete(id));
                setSelected(next);
        };
        const toggleOne = (id: string) => {
                const next = new Set(selected);
                next.has(id) ? next.delete(id) : next.add(id);
                setSelected(next);
        };

        const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
        const handleSort = (col: SortColumn) => {
                if (sortColumn === col) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); else { setSortColumn(col); setSortDirection('asc'); }
        };

        const handleAssetClick = (it: any) => {
                const isSold = String(it.status || 'available').toLowerCase() === 'sold';
                
                // For sold items, navigate to PUBLIC storefront view (no ownership data)
                if (isSold && it.globalAssetId) {
                        navigateTo(`/storefront/${event.userId}/asset/${it.globalAssetId}`);
                        return;
                }
                
                // For non-sold items, use personal asset view
                const own = getOwnershipType(it);
                if (own === 'portfolio' && it.userAssetId) {
                        window.open(`/assets/${it.userAssetId}?from=events`, '_blank');
                        return;
                }
                if (it.globalAssetId) window.open(`/assets/${it.globalAssetId}?from=events`, '_blank');
        };

        const patchListPrice = async (id: string, price: number) => {
                const prev = queryClient.getQueryData<any[]>(["/api/events", event.id, "inventory"]) || [];
                queryClient.setQueryData<any[]>(["/api/events", event.id, "inventory"], (old) => (old || []).map((i: any) => i.id === id ? { ...i, askingPrice: String(price) } : i));
                try {
                        await apiRequest("PATCH", `/api/events/${event.id}/inventory/${id}`, { askingPrice: price });
                } catch {
                        queryClient.setQueryData(["/api/events", event.id, "inventory"], prev as any);
                }
        };
        const patchStatus = async (id: string, status: string) => {
                const prev = queryClient.getQueryData<any[]>(["/api/events", event.id, "inventory"]) || [];
                queryClient.setQueryData<any[]>(["/api/events", event.id, "inventory"], (old) => (old || []).map((i: any) => i.id === id ? { ...i, status } : i));
                try {
                        await apiRequest("PATCH", `/api/events/${event.id}/inventory/${id}`, { status });
                } catch {
                        queryClient.setQueryData(["/api/events", event.id, "inventory"], prev as any);
                }
        };

        const confirmUndoSell = async () => {
                try {
                        if (undoDialog.item?.id) {
                                await apiRequest("PATCH", `/api/events/${event.id}/inventory/${undoDialog.item.id}/undo-sell`, {});
                                
                                // Invalidate ALL related queries to force fresh data
                                await Promise.all([
                                        queryClient.invalidateQueries({ queryKey: ["/api/events", event.id, "inventory"] }),
                                        queryClient.invalidateQueries({ queryKey: ["/api/events", event.id, "sales"] }),
                                        queryClient.invalidateQueries({ queryKey: ["/api/events", event.id, "orders"] }),
                                        queryClient.invalidateQueries({ queryKey: ["eventOrders", event.id] }),
                                ]);
                        }
                } finally {
                        setUndoDialog({ open: false, item: undefined });
                        setUndoConfirmed(false);
                }
        };

        const priceTimers = useRef<Record<string, number>>({});

                // Columns config for mobile card (match existing inventory mobile)
                const mobileColumns = useMemo(() => ([
                        { key: 'asset', visible: true },
                        { key: 'listPrice', visible: true },
                        { key: 'value', visible: true },
                        { key: 'profit', visible: true },
                        { key: 'confidence', visible: true },
                        { key: 'liquidity', visible: true },
                        { key: 'status', visible: true },
                        { key: 'ownership', visible: true },
                        { key: 'action', visible: false },
                ] as const), []);

                const handleDeleteItem = async (itemId: string) => {
                        try {
                                // If the item is currently in the cart, remove it from the cart first
                                if (isInCart?.(itemId)) {
                                        onRemoveFromCart?.(itemId);
                                }
                                
                                await apiRequest("DELETE", `/api/events/${event.id}/inventory/${itemId}`);
                                await queryClient.invalidateQueries({ queryKey: ["/api/events", event.id, "inventory"] });
                        } catch {}
                };

                return (
                        <div className="flex-1 min-w-0 w-full max-w-full">
                                {/* Toolbar (desktop) */}
                                <div className="w-full">
                                <InventoryV2Toolbar
                                        count={items.length}
                                        search={search}
                                        onSearch={setSearch}
                                        onAddAssets={() => setOpenAdd(true)}
                                        onToggleCart={onToggleCart}
                                        cartCount={cartCount}
                                        columns={columns as any}
                                        onToggleColumn={toggleColumn}
                                        onResetColumns={resetColumns}
                                />
                                </div>
                                {/* Status tabs (match V1 style/placement) */}
                                <div className="hidden lg:block px-6 pb-0 border-border sticky top-16 border-b z-20 bg-background w-full max-w-full">
                                        <InventoryV2StatusTabs value={status} onChange={setStatus} counts={statusCounts as any} />
                                </div>

                                {/* Mobile: card list to avoid column overlap */}
                                <div className="lg:hidden px-3 py-3 w-full max-w-full">
                                        <div className="divide-y divide-border">
                                                {visibleRows.map((row: any) => (
                                                        <InventoryMobileCard
                                                                key={row.item.id}
                                                                row={row}
                                                                columns={mobileColumns as any}
                                                                onListPriceChange={patchListPrice}
                                                                onAssetClick={handleAssetClick}
                                                                onDeleteItem={handleDeleteItem}
                                                                onOpenStatusDialog={() => { /* no-op for v2 */ }}
                                                                onAddToCart={onAddToCart}
                                                                isInCart={isInCart}
                                                                onRemoveFromCart={onRemoveFromCart}
                                                        />
                                                ))}
                                                {(!isLoading && visibleRows.length === 0) && (
                                                        <div className="py-8 text-center text-muted-foreground">No inventory yet</div>
                                                )}
                                        </div>
                                </div>

                                {/* Desktop: table */}
                                <div className="hidden lg:block overflow-x-auto w-full max-w-full">
                                        <table className="min-w-full w-full text-sm">
                                                <thead className="bg-background border-b border-border sticky top-0 z-30">
                                                <tr>
                                                        <th className="px-3 py-3 text-left font-medium text-foreground whitespace-nowrap">
                                                                <Checkbox
                                                                        checked={headerChecked}
                                                                        onCheckedChange={setAll}
                                                                        aria-label="Select all"
                                                                        className="data-[state=indeterminate]:bg-primary/50"
                                                                        style={{ ...(headerInd && { opacity: 0.7 }) }}
                                                                        ref={(el) => { if (el) (el as any).indeterminate = headerInd; }}
                                                                />
                                                        </th>
                                                        <SortableHeader column="asset" onSort={handleSort} sortColumn={sortColumn} sortDirection={sortDirection}>Asset</SortableHeader>
                                                        {visible.list && (<SortableHeader column="listPrice" align="right" onToggleEdit={status !== 'sold' ? () => toggleEditCol('list') : undefined} isEditing={editCols.has('list')} onSort={handleSort} sortColumn={sortColumn} sortDirection={sortDirection}>List Price</SortableHeader>)}
                                                        {visible.market && (<SortableHeader column="market" align="right" onSort={handleSort} sortColumn={sortColumn} sortDirection={sortDirection}>Market Price</SortableHeader>)}
                                                        {visible.profit && (<SortableHeader column="profit" align="right" onSort={handleSort} sortColumn={sortColumn} sortDirection={sortDirection}>Profit</SortableHeader>)}
                                                        {status === 'sold' ? (
                                                                <>
                                                                        <th className="px-3 py-3 text-left text-sm font-medium text-muted-foreground whitespace-nowrap">Buyer</th>
                                                                        <th className="px-3 py-3 text-left text-sm font-medium text-muted-foreground whitespace-nowrap">Sold Date</th>
                                                                        <th className="px-3 py-3 text-left text-sm font-medium text-muted-foreground whitespace-nowrap">Payment</th>
                                                                </>
                                                        ) : (
                                                                <>
                                                                        {visible.confidence && (<SortableHeader column="confidence" align="center" onSort={handleSort} sortColumn={sortColumn} sortDirection={sortDirection}>Confidence</SortableHeader>)}
                                                                        {visible.liquidity && (<SortableHeader column="liquidity" align="center" onSort={handleSort} sortColumn={sortColumn} sortDirection={sortDirection}>Liquidity</SortableHeader>)}
                                                                </>
                                                        )}
                                                        {visible.status && (<SortableHeader column="status" align="center" onToggleEdit={status !== 'sold' ? () => toggleEditCol('status') : undefined} isEditing={editCols.has('status')} onSort={handleSort} sortColumn={sortColumn} sortDirection={sortDirection}>Status</SortableHeader>)}
                                                        {visible.ownership && (<SortableHeader column="ownership" align="center" onSort={handleSort} sortColumn={sortColumn} sortDirection={sortDirection}>Ownership</SortableHeader>)}
                                                        {/* Actions header (no title) */}
                                                        <th className="sticky right-0 bg-background px-3 py-3 text-right text-sm font-medium text-muted-foreground whitespace-nowrap" />
                                                </tr>
                                        </thead>
                                                                                        <tbody className="divide-y divide-border bg-background">
                                                                                                                        {isLoading ? (
                                                                                                                                <TableSkeleton rows={6} showAssetThumb={false} columns={["list","market","profit","confidence","liquidity","status","actions"]} />
                                                                                                                        ) : visibleRows.length === 0 ? (
                                                                <tr>
                                                                                <td colSpan={2 + (visible.list?1:0) + (visible.market?1:0) + (visible.profit?1:0) + (status === 'sold' ? 3 : (visible.confidence?1:0) + (visible.liquidity?1:0)) + (visible.status?1:0) + (visible.ownership?1:0) + 1} className="px-6 py-10 text-center text-muted-foreground">No inventory yet</td>
                                                                </tr>
                                                        ) : (
                                                                visibleRows.map(({ item, averagePrice, salesCount, confidence, liquidity, displayProfit }) => {
                                                                        const currentList = Number(item?.askingPrice || 0) || 0;
                                                                        const displayList = priceInputs[item.id] ?? currentList.toFixed(2);
                                                                        const cert = item.certNumber ?? item.cert_number ?? item.cert ?? item.certNo ?? item.certno ?? null;
                                                                        const profit = displayProfit as number | null;
                                                                        const inCart = !!isInCart?.(item.id);
                                                                        const isSold = String(item.status || 'available').toLowerCase() === 'sold';
                                                                        return (
                                                                        <tr key={item.id} className={`group hover:bg-muted/50 transition-colors ${inCart ? 'opacity-60' : ''}`}>
                                                                                <td className="px-3 py-3 whitespace-nowrap">
                                                                                        <Checkbox checked={selected.has(item.id)} onCheckedChange={() => toggleOne(item.id)} aria-label={`Select ${item.playerName || ''} ${item.setName || ''}`} />
                                                                                </td>
                                                                                                                        <td className="px-3 py-3 align-middle">
                                                                                                                                <div className="flex items-start gap-3">
                                                                                                                                        <div className="h-auto w-10 rounded-sm bg-muted overflow-hidden flex-shrink-0">
                                                                                                                                                <img
                                                                                                                                                        src={item.psaImageFrontUrl || NO_IMAGE_PLACEHOLDER}
                                                                                                                                                        alt="Card"
                                                                                                                                                        className="w-full h-full object-cover"
                                                                                                                                                        onError={(e) => {
                                                                                                                                                                const img = e.currentTarget as HTMLImageElement;
                                                                                                                                                                if (img.src !== NO_IMAGE_PLACEHOLDER) img.src = NO_IMAGE_PLACEHOLDER;
                                                                                                                                                        }}
                                                                                                                                                />
                                                                                                                                        </div>
                                                                                                                                        <button onClick={() => handleAssetClick(item)} className="text-left min-w-0 group">
                                                                                                                                                <div className="text-xs font-medium tracking-wide uppercase text-muted-foreground leading-tight truncate">
                                                                                                                                                        {item.year} {item.setName}
                                                                                                                                                </div>
                                                                                                                                                <div className="font-semibold text-sm leading-tight truncate flex items-center gap-2">
                                                                                                                                                        <span className="truncate">{item.playerName || 'Unknown'}</span>
                                                                                                                                                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                                                                                                        {inCart && (
                                                                                                                                                                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-primary/10 text-primary border-primary/20">In Cart</Badge>
                                                                                                                                                        )}
                                                                                                                                                </div>
                                                                                                                                                <div className="text-xs text-foreground leading-tight">
                                                                                                                                                        #{item.cardNumber} • {item.grade ? `PSA ${item.grade}` : ''}
                                                                                                                                                </div>
                                                                                                                                                {cert && (
                                                                                                                                                        <div className="text-xs text-muted-foreground leading-tight">Cert# {cert}</div>
                                                                                                                                                )}
                                                                                                                                        </button>
                                                                                                                                </div>
                                                                                                                        </td>
                                                                                                                                                {visible.list && (
                                                                                <td className="px-3 py-3 whitespace-nowrap text-right">
                                                                                        {editCols.has('list') ? (
                                                                                                <div className="relative w-24 ml-auto">
                                                                                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">$</span>
                                                                                                        <Input
                                                                                                                type="text"
                                                                                                                value={displayList}
                                                                                                                onChange={(e) => {
                                                                                                                        const v = e.target.value;
                                                                                                                        setPriceInputs(prev => ({ ...prev, [item.id]: v }));
                                                                                                                        if (v !== '' && /^\d*\.?\d*$/.test(v)) {
                                                                                                                                const num = parseFloat(v);
                                                                                                                                if (!isNaN(num)) {
                                                                                                                                        if (priceTimers.current[item.id]) clearTimeout(priceTimers.current[item.id]);
                                                                                                                                        priceTimers.current[item.id] = window.setTimeout(() => {
                                                                                                                                                const valid = Math.max(0, num);
                                                                                                                                                patchListPrice(item.id, valid);
                                                                                                                                                delete priceTimers.current[item.id];
                                                                                                                                        }, 500);
                                                                                                                                }
                                                                                                                        }
                                                                                                                }}
                                                                                                                onBlur={(e) => {
                                                                                                                        if (priceTimers.current[item.id]) { clearTimeout(priceTimers.current[item.id]); delete priceTimers.current[item.id]; }
                                                                                                                        const raw = e.target.value; const num = parseFloat(raw);
                                                                                                                        const valid = !isNaN(num) ? Math.max(0, num) : 0;
                                                                                                                        patchListPrice(item.id, valid);
                                                                                                                        setPriceInputs(prev => { const n = { ...prev }; delete n[item.id]; return n; });
                                                                                                                }}
                                                                                                                className="h-10 text-sm font-medium text-center pl-6 pr-2 border bg-card text-foreground w-24 placeholder:text-muted-foreground/50"
                                                                                                                placeholder="0.00"
                                                                                                        />
                                                                                                </div>
                                                                                        ) : (
                                                                                                <div className="font-medium text-foreground text-sm">{formatCurrency(currentList)}</div>
                                                                                        )}
                                                                                </td>) }
                                                                                {visible.market && (
                                                                                <td className="px-3 py-3 whitespace-nowrap text-right">
                                                                                        {isPricing ? (
                                                                                                <div className="animate-pulse h-5 w-16 bg-muted rounded ml-auto" />
                                                                                        ) : (
                                                                                                <>
                                                                                                        <div className="font-medium text-foreground text-sm">{formatCurrency(averagePrice)}</div>
                                                                                                        <SalesDataStatus salesCount={salesCount || 0} className="text-xs" />
                                                                                                </>
                                                                                        )}
                                                                                </td>
                                                                                )}
                                                                                {visible.profit && (
                                                                                        <td className="px-3 py-3 whitespace-nowrap text-right">
                                                                                                                                {profit == null ? (
                                                                                                <span className="text-muted-foreground">—</span>
                                                                                        ) : (
                                                                                                                                        <span className={`font-medium text-sm ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>{profit >= 0 ? '+' : ''}{formatCurrency(Math.abs(profit))}</span>
                                                                                        )}
                                                                                        </td>
                                                                                )}
                                                                                {status === 'sold' ? (
                                                                                        <>
                                                                                                {/* Buyer column */}
                                                                                                <td className="px-3 py-3 whitespace-nowrap text-left">
                                                                                                        {(() => {
                                                                                                                const buyerInfo = buyerLookup.get(item.id);
                                                                                                                if (buyerInfo?.contactId) {
                                                                                                                        return (
                                                                                                                                <button
                                                                                                                                        onClick={() => navigateTo(`/contacts/${buyerInfo.contactId}`)}
                                                                                                                                        className="text-primary hover:underline font-medium" 
                                                                                                                                >
                                                                                                                                        {buyerInfo.contactName || 'Unknown'}
                                                                                                                                </button>
                                                                                                                        );
                                                                                                                } else if (buyerInfo?.contactName) {
                                                                                                                        return <span className="font-medium">{buyerInfo.contactName}</span>;
                                                                                                                }
                                                                                                                return <span className="text-muted-foreground">—</span>;
                                                                                                        })()}
                                                                                                </td>
                                                                                                {/* Sold Date column */}
                                                                                                <td className="px-3 py-3 whitespace-nowrap text-left text-muted-foreground">
                                                                                                        {(() => {
                                                                                                                const buyerInfo = buyerLookup.get(item.id);
                                                                                                                return buyerInfo?.saleDate 
                                                                                                                        ? new Date(buyerInfo.saleDate).toLocaleDateString()
                                                                                                                        : '—';
                                                                                                        })()}
                                                                                                </td>
                                                                                                {/* Payment column */}
                                                                                                <td className="px-3 py-3 whitespace-nowrap text-left">
                                                                                                        {(() => {
                                                                                                                const buyerInfo = buyerLookup.get(item.id);
                                                                                                                return buyerInfo?.paymentMethod 
                                                                                                                        ? <span className="capitalize">{String(buyerInfo.paymentMethod).replace(/_/g, ' ')}</span>
                                                                                                                        : <span className="text-muted-foreground">—</span>;
                                                                                                        })()}
                                                                                                </td>
                                                                                        </>
                                                                                ) : (
                                                                                        <>
                                                                                                {visible.confidence && (
                                                                                                <td className="px-3 py-3 whitespace-nowrap text-center">
                                                                                                        {isPricing ? (
                                                                                                                <div className="animate-pulse h-5 w-16 bg-muted rounded mx-auto" />
                                                                                                        ) : (
                                                                                                                <ConfidenceBars value={confidence || 0} />
                                                                                                        )}
                                                                                                </td>
                                                                                                )}
                                                                                                {visible.liquidity && (
                                                                                                <td className="px-3 py-3 whitespace-nowrap text-center">
                                                                                                        {isPricing ? (
                                                                                                                <div className="animate-pulse h-5 w-12 bg-muted rounded mx-auto" />
                                                                                                        ) : (
                                                                                                                <LiquidityBars value={(liquidity || 'cool') as any} />
                                                                                                        )}
                                                                                                </td>
                                                                                                )}
                                                                                        </>
                                                                                )}
                                                                                {visible.status && (
                                                                                <td className="px-3 py-3 whitespace-nowrap text-center">
                                                                                        {editCols.has('status') ? (
                                                                                                <Select value={(item.status || 'available')} onValueChange={(v: string) => patchStatus(item.id, v)}>
                                                                                                        <SelectTrigger className="h-8 w-[110px] text-xs">
                                                                                                                <SelectValue />
                                                                                                        </SelectTrigger>
                                                                                                        <SelectContent>
                                                                                                                <SelectItem value="available">Available</SelectItem>
                                                                                                                <SelectItem value="pending">Pending</SelectItem>
                                                                                                                <SelectItem value="reserved">Reserved</SelectItem>
                                                                                                                <SelectItem value="sold">Sold</SelectItem>
                                                                                                                <SelectItem value="removed">Removed</SelectItem>
                                                                                                        </SelectContent>
                                                                                                </Select>
                                                                                        ) : (
                                                                                                <span className="px-2 py-1 rounded text-xs font-medium bg-muted text-foreground">{(item.status || 'available').charAt(0).toUpperCase() + (item.status || 'available').slice(1)}</span>
                                                                                        )}
                                                                                </td>
                                                                                )}
                                                                                {visible.ownership && (
                                                                                <td className="px-3 py-3 whitespace-nowrap text-center">
                                                                                        <OwnershipBadge type={getOwnershipType(item)} />
                                                                                </td>
                                                                                )}
                                                                                {/* Actions column */}
                                                                                <td className="sticky right-0 bg-background px-3 py-3 whitespace-nowrap text-right">
                                                                                        <div className="flex items-center justify-end gap-2">
                                                                                                {!isSold && (
                                                                                                        inCart ? (
                                                                                                                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">In Cart</Badge>
                                                                                                        ) : (
                                                                                                                <AddToCartIconButton
                                                                                                                        onClick={(e) => { e.stopPropagation(); onAddToCart?.(item); }}
                                                                                                                        disabled={!(item.status === 'available' || item.status === 'pending' || !item.status)}
                                                                                                                />
                                                                                                        )
                                                                                                )}
                                                                                                                                                                                                <DropdownMenu>
                                                                                                        <DropdownMenuTrigger asChild>
                                                                                                                <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                                                                                                                        <span className="sr-only">Open menu</span>
                                                                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                                                                </Button>
                                                                                                        </DropdownMenuTrigger>
                                                                                                                                                                                                                                                                                                                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                                                                                                                                                                                                                                                                                                                <DropdownMenuItem onClick={() => handleAssetClick(item)}>View Asset</DropdownMenuItem>
                                                                                                                                                                                                                                                                                                                {inCart && (
                                                                                                                                                                                                                                                                                                                        <DropdownMenuItem onClick={() => onRemoveFromCart?.(item.id)}>
                                                                                                                                                                                                                                                                                                                                Remove From Cart
                                                                                                                                                                                                                                                                                                                        </DropdownMenuItem>
                                                                                                                                                                                                                                                                                                                )}
                                                                                                                                                                                                                <DropdownMenuSeparator />
                                                                                                                                                                                                                {isSold ? (
                                                                                                                                                                                                                        <DropdownMenuItem onClick={() => setUndoDialog({ open: true, item })}>
                                                                                                                                                                                                                                Undo Sell
                                                                                                                                                                                                                        </DropdownMenuItem>
                                                                                                                                                                                                                ) : (
                                                                                                                                                                                                                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteItem(item.id)}>
                                                                                                                                                                                                                                Remove from Show
                                                                                                                                                                                                                        </DropdownMenuItem>
                                                                                                                                                                                                                )}
                                                                                                                                                                                                        </DropdownMenuContent>
                                                                                                </DropdownMenu>
                                                                                        </div>
                                                                                </td>
                                                                        </tr>
                                                                );
                                                        })
                                                )}
                                        </tbody>
                                </table>
                                </div>

                                {/* Add to Event dialog */}
                                <AddToEventDialog open={openAdd} onOpenChange={(v: boolean) => { setOpenAdd(v); if (!v) { queryClient.invalidateQueries({ queryKey: ["/api/events", event.id, "inventory"] }); } }} event={event} />
                                {/* Undo Sell confirmation dialog */}
                                <Dialog open={undoDialog.open} onOpenChange={(open) => { setUndoDialog((prev) => ({ open, item: open ? prev.item : undefined })); setUndoConfirmed(false); }}>
                                        <DialogContent className="max-w-lg">
                                                <DialogHeader>
                                                        <DialogTitle className="text-2xl">Move Back to Available Inventory</DialogTitle>
                                                        <DialogDescription className="text-base pt-2">
                                                                You are about to move <span className="font-bold text-foreground">"{undoDialog.item?.playerName?.toUpperCase() || 'ITEM'}"</span> back to available inventory.
                                                        </DialogDescription>
                                                </DialogHeader>
                                                <div className="space-y-4 py-4">
                                                        <div className="flex gap-2">
                                                                <span className="text-yellow-600">⚠️</span>
                                                                <div>
                                                                        <p className="font-semibold text-destructive">Warning: This action will:</p>
                                                                        <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-muted-foreground">
                                                                                <li>Mark the item as available for sale again</li>
                                                                                <li>Allow the item to appear in storefront and inventory</li>
                                                                                <li>NOT delete the sales transaction record (history is preserved)</li>
                                                                                <li>This action can be reversed by marking it as sold again</li>
                                                                        </ul>
                                                                </div>
                                                        </div>
                                                        <p className="text-sm text-muted-foreground">
                                                                Are you sure you want to proceed? Consider if the sale was actually completed before reversing the sold status.
                                                        </p>
                                                        <div className="flex items-start gap-2 pt-2">
                                                                <Checkbox 
                                                                        id="undo-confirm" 
                                                                        checked={undoConfirmed}
                                                                        onCheckedChange={(checked) => setUndoConfirmed(checked as boolean)}
                                                                />
                                                                <label htmlFor="undo-confirm" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                                                                        I understand and confirm this action
                                                                </label>
                                                        </div>
                                                </div>
                                                <DialogFooter>
                                                        <Button variant="outline" onClick={() => { setUndoDialog({ open: false }); setUndoConfirmed(false); }}>Cancel</Button>
                                                        <Button onClick={confirmUndoSell} disabled={!undoConfirmed} className="bg-primary">Yes, Move to Available</Button>
                                                </DialogFooter>
                                        </DialogContent>
                                </Dialog>
                </div>
        );
}

export default InventoryTableV2;

