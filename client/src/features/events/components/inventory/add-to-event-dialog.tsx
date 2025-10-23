// 🤖 INTERNAL NOTE:
// Purpose: Full-screen dialog to add items to an event inventory with tabs for Assets and Collections
// Exports: AddToEventDialog component
// Feature: events
// Layout: Matches add-assets-dialog.tsx full-screen structure

import React, { useMemo, useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { apiRequest } from "@/lib/queryClient";
import { Search, X, Plus, Loader2 } from "lucide-react";
import type { Event } from "@shared/schema";
import { OwnershipBadge, getOwnershipType } from "@/components/ui/ownership-badge";
import { useToast } from "@/hooks/use-toast";
import { PLACEHOLDER_IMAGE_URL } from "@/lib/constants";

interface AddToEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event;
}

interface BasicAsset {
  id: string;
  globalAssetId: string;
  playerName?: string | null;
  setName?: string | null;
  year?: number | string | null;
  grade?: string | null;
  cardNumber?: string | null;
  variant?: string | null;
  psaImageFrontUrl?: string | null;
  imageUrl?: string | null;
  type: "portfolio" | "consignment";
  consignmentTitle?: string;
  // Optional cert fields (various possible shapes across sources)
  certNumber?: string | number | null;
  certificateNumber?: string | number | null;
  cert?: string | number | null;
  certNo?: string | number | null;
  certno?: string | number | null;
}

export function AddToEventDialog({ open, onOpenChange, event }: AddToEventDialogProps) {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState("assets");
  const [search, setSearch] = useState("");
  // Filters for assets
  // Default to "all" to show both ownership types by default
  const [ownershipFilter, setOwnershipFilter] = useState<"all" | "portfolio" | "consignment">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "graded" | "raw" | "sealed" | "other">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set()); // Now stores globalAssetIds instead of ids
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set());
  // Filters for collections
  const [collectionsSearch, setCollectionsSearch] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "public" | "private">("all");
  // Submit/loading states
  const [isAddingAssets, setIsAddingAssets] = useState(false);
  const [isAttachingCollections, setIsAttachingCollections] = useState(false);

  // Refs for focus management
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Effect to manage focus when dialog opens
  useEffect(() => {
    if (open) {
      closeButtonRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSelected(new Set());
      setSelectedCollections(new Set());
      setSearch("");
      // Reset to "all" on close so next open starts with inclusive view
      setOwnershipFilter("all");
      setTab("assets");
    }
  }, [open]);

  // Load current event inventory to exclude already-added assets (per-show filtering)
  const inventoryQueryKey = ["/api/events", event.id, "inventory"] as const;
  const { data: eventInventory = [], refetch: refetchEventInventory } = useQuery({
    queryKey: inventoryQueryKey,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/events/${event.id}/inventory`);
      return res.json();
    },
    enabled: open && !!event?.id,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (open) {
      // Force refresh on open to avoid excluding removed items due to stale cache
      queryClient.invalidateQueries({ queryKey: inventoryQueryKey });
      // Also trigger an immediate refetch
      refetchEventInventory();
    }
  }, [open]);

  const excludeGlobalAssetIds = useMemo(() => {
    const active = (eventInventory as any[]).filter((it: any) => (String(it.status || 'available').toLowerCase() !== 'removed'));
    return new Set<string>(active.map((it: any) => it.globalAssetId).filter(Boolean));
  }, [eventInventory]);

  // Load user portfolio assets
  const { data: portfolioAssets = [] } = useQuery({
    queryKey: ["/api/user", user?.id, "assets"],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await apiRequest("GET", `/api/user/${user.id}/assets`);
      const list = await res.json();
      // Server may include consignment items in this endpoint; keep only true portfolio here
      const portfolioOnly = (list || []).filter((a: any) => {
        const ownership = String(a.ownershipStatus || a.ownershipType || 'own').toLowerCase();
        return ownership !== 'consignment';
      });
      return (portfolioOnly || []).map((a: any) => ({
        id: a.id,
        globalAssetId: a.globalAssetId,
        playerName: a.playerName,
        setName: a.setName,
        year: a.year,
        grade: a.grade,
        cardNumber: a.cardNumber,
        variant: a.variant,
        psaImageFrontUrl: a.psaImageFrontUrl,
        imageUrl: a.imageUrl,
        type: "portfolio" as const,
        certNumber: a.certNumber ?? a.certificateNumber ?? a.cert ?? a.certNo ?? a.certno ?? null,
      })) as BasicAsset[];
    },
    enabled: open && !!user?.id && !authLoading,
  });

  // Load consignment assets (all consignments for the user)
  const { data: consignments = [] } = useQuery({
    queryKey: ["/api/consignments/user", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await apiRequest("GET", `/api/consignments/user/${user.id}`);
      return res.json();
    },
    enabled: open && !!user?.id && !authLoading,
  });

  const { data: consignmentAssets = [] } = useQuery({
    queryKey: ["/api/consignments/assets", consignments.map((c: any) => c.id)],
    queryFn: async () => {
      if (!consignments.length) return [];
      const all = await Promise.all(
        consignments.map(async (c: any) => {
          const res = await apiRequest("GET", `/api/consignments/${c.id}/assets`);
          const assets = await res.json();
          // Filter out sold or inactive consignment assets from selection
          const activeAssets = (assets || []).filter((a: any) => {
            const status = String(a.status || '').toLowerCase();
            return status !== 'sold' && status !== 'removed' && status !== 'archived';
          });
          return activeAssets.map((a: any) => ({
            id: a.id,
            globalAssetId: a.globalAssetId,
            playerName: a.playerName,
            setName: a.setName,
            year: a.year,
            grade: a.grade,
            cardNumber: a.cardNumber,
            variant: a.variant,
            psaImageFrontUrl: a.psaImageFrontUrl,
            imageUrl: a.imageUrl,
            type: "consignment" as const,
            consignmentTitle: c.title,
            certNumber: a.certNumber ?? a.certificateNumber ?? a.cert ?? a.certNo ?? a.certno ?? null,
          })) as BasicAsset[];
        })
      );
      return all.flat();
    },
    enabled: open && consignments.length > 0,
  });

  const allAssets: BasicAsset[] = useMemo(() => {
    const p = (portfolioAssets || []).filter((a: any) => a.globalAssetId);
    const c = (consignmentAssets || []).filter((a: any) => a.globalAssetId);
    
    // Deduplicate by globalAssetId - prefer portfolio over consignment for primary display
    const combined = [...p, ...c];
    const deduplicatedMap = new Map<string, BasicAsset>();
    
    // First pass: add all consignment assets
    c.forEach(asset => {
      if (asset.globalAssetId) {
        deduplicatedMap.set(asset.globalAssetId, asset);
      }
    });
    
    // Second pass: portfolio assets override consignment (portfolio preferred)
    p.forEach(asset => {
      if (asset.globalAssetId) {
        deduplicatedMap.set(asset.globalAssetId, asset);
      }
    });
    
    return Array.from(deduplicatedMap.values());
  }, [portfolioAssets, consignmentAssets]);

  // Exclude assets already in this event (per-show)
  const excludeFiltered = useMemo(() => {
    return (allAssets || []).filter((a) => a.globalAssetId && !excludeGlobalAssetIds.has(a.globalAssetId));
  }, [allAssets, excludeGlobalAssetIds]);

  // Determine asset type for filter and display
  const getAssetType = (a: BasicAsset): "graded" | "raw" | "sealed" | "other" => {
    if (a.grade) return "graded";
    const v = `${a.variant || ""} ${a.setName || ""}`.toLowerCase();
    if (/(sealed|wax|box|blaster|hanger|mega)/.test(v)) return "sealed";
    // default to raw when ungraded
    return "raw";
  };

  // Step 1: search + ownership + type filters
  const filteredPre = useMemo(() => {
    const s = search.trim().toLowerCase();
    return excludeFiltered.filter((a) => {
      const searchable = [a.playerName, a.setName, String(a.year || ""), a.consignmentTitle]
        .filter(Boolean)
        .map(String)
        .join(" ")
        .toLowerCase();
      const matchSearch = s ? searchable.includes(s) : true;
      const matchOwner = ownershipFilter === "all" ? true : a.type === ownershipFilter;
      const at = getAssetType(a);
      const matchType = typeFilter === "all" ? true : at === typeFilter;
      return matchSearch && matchOwner && matchType;
    });
  }, [excludeFiltered, search, ownershipFilter, typeFilter]);

  // Batch market values for visible assets
  const gaids = useMemo(
    () => Array.from(new Set((filteredPre || []).map((a) => a.globalAssetId).filter(Boolean))) as string[],
    [filteredPre]
  );

  const { data: marketBatch = {} } = useQuery({
    queryKey: ["/api/pricing/batch", gaids],
    queryFn: async () => {
      if (!gaids.length) return {} as Record<string, any>;
      const res = await apiRequest("POST", `/api/pricing/batch`, { globalAssetIds: gaids });
      return res.json();
    },
    enabled: open && gaids.length > 0,
  });

  // Final filtered list (no comps filter)
  const filtered = useMemo(() => filteredPre, [filteredPre]);

  const toggle = (globalAssetId: string) => {
    const next = new Set(selected);
    next.has(globalAssetId) ? next.delete(globalAssetId) : next.add(globalAssetId);
    setSelected(next);
  };

  // Header Select All for assets
  const allVisibleSelected = useMemo(() => filtered.length > 0 && filtered.every((a) => selected.has(a.globalAssetId)), [filtered, selected]);
  const someVisibleSelected = useMemo(() => filtered.some((a) => selected.has(a.globalAssetId)) && !allVisibleSelected, [filtered, selected, allVisibleSelected]);
  const toggleSelectAllVisible = () => {
    const next = new Set(selected);
    if (allVisibleSelected) {
      filtered.forEach((a) => next.delete(a.globalAssetId));
    } else {
      filtered.forEach((a) => next.add(a.globalAssetId));
    }
    setSelected(next);
  };

  // Collections data
  const { data: collections = [], isLoading: collectionsLoading } = useQuery({
    queryKey: ["/api/collections/user", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await apiRequest("GET", `/api/collections/user/${user.id}`);
      return res.json();
    },
    enabled: open && !!user?.id && !authLoading,
  });

  // Fetch assets for each collection to determine how many would be new for this event
  const { data: collectionsAssetsMap = {} } = useQuery({
    queryKey: ["/api/collections/assets/byCollection", (collections || []).map((c: any) => c.id), event?.id],
    queryFn: async () => {
      if (!collections?.length) return {} as Record<string, any[]>;
      const results = await Promise.all(
        collections.map(async (c: any) => {
          try {
            const res = await apiRequest("GET", `/api/collections/${c.id}/assets`);
            const assets = await res.json();
            return { id: c.id, assets };
          } catch {
            return { id: c.id, assets: [] };
          }
        })
      );
      return results.reduce((acc: any, { id, assets }) => {
        acc[id] = assets;
        return acc;
      }, {} as Record<string, any[]>);
    },
    enabled: open && !!event?.id && (collections?.length ?? 0) > 0,
  });

  const collectionsWithNew = useMemo(() => {
    return (collections || []).map((c: any) => {
      const assets = (collectionsAssetsMap as any)?.[c.id] || [];
      const total = Number(c.totalAssets ?? c.assetCount ?? assets.length ?? 0);
      const newCount = assets.filter((a: any) => a?.globalAssetId && !excludeGlobalAssetIds.has(a.globalAssetId)).length;
      return { ...c, __total: total, __new: newCount };
    });
  }, [collections, collectionsAssetsMap, excludeGlobalAssetIds]);

  const toggleCollection = (id: string) => {
    const next = new Set(selectedCollections);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedCollections(next);
  };

  const handleAddSelected = async () => {
    // selected now contains globalAssetIds directly
    const globalAssetIds = Array.from(selected);
    if (!globalAssetIds.length) return;
    try {
      setIsAddingAssets(true);
      await apiRequest("POST", `/api/events/${event.id}/assets`, { globalAssetIds });
      // Refresh event inventory to update exclusion immediately
      await queryClient.invalidateQueries({ queryKey: ["/api/events", event.id, "inventory"] });
      toast({ title: "Assets added", description: `${globalAssetIds.length} asset${globalAssetIds.length === 1 ? "" : "s"} added to ${event.name}.` });
      handleClose();
    } catch (e) {
      console.error("Failed to add assets to event", e);
      toast({ title: "Add failed", description: "Could not add selected assets.", variant: "destructive" });
    } finally {
      setIsAddingAssets(false);
    }
  };

  const handleAttachCollections = async () => {
    const collectionIds = Array.from(selectedCollections);
    if (!collectionIds.length) return;
    try {
      setIsAttachingCollections(true);
      await apiRequest("POST", `/api/events/${event.id}/collections`, { collectionIds });
  await queryClient.invalidateQueries({ queryKey: ["/api/events", event.id, "inventory"] });
  toast({ title: "Collections added", description: `${collectionIds.length} collection${collectionIds.length === 1 ? "" : "s"} attached to ${event.name}.` });
      handleClose();
    } catch (e) {
      console.error("Failed to add collections to event", e);
  toast({ title: "Add failed", description: "Could not attach selected collections.", variant: "destructive" });
    } finally {
      setIsAttachingCollections(false);
    }
  };

  const handleClose = () => {
    setSelected(new Set());
    setSelectedCollections(new Set());
    setSearch("");
    setTab("assets");
    onOpenChange(false);
  };

  if (!open) return null;

  const getActionButton = () => {
    if (tab === "assets") {
      return (
        <Button
          size="lg"
          onClick={handleAddSelected}
          disabled={selected.size === 0 || isAddingAssets}
          aria-busy={isAddingAssets}
          className="whitespace-nowrap"
        >
          <span className="lg:hidden flex items-center">
            {isAddingAssets ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />} 
            {isAddingAssets ? "Adding…" : "Add"}
          </span>
          <span className="hidden lg:flex lg:items-center">
            {isAddingAssets ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            {isAddingAssets ? "Adding Assets…" : `Add Assets (${selected.size})`}
          </span>
        </Button>
      );
    } else {
      return (
        <Button
          size="lg"
          onClick={handleAttachCollections}
          disabled={selectedCollections.size === 0 || isAttachingCollections}
          aria-busy={isAttachingCollections}
          className="whitespace-nowrap"
        >
          <span className="lg:hidden flex items-center">
            {isAttachingCollections ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />} 
            {isAttachingCollections ? "Adding…" : "Add"}
          </span>
          <span className="hidden lg:flex lg:items-center">
            {isAttachingCollections ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            {isAttachingCollections ? "Adding Collections…" : `Add Collections (${selectedCollections.size})`}
          </span>
        </Button>
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-background text-foreground"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      ref={dialogRef}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border lg:grid lg:grid-cols-3">
        <div className="flex items-center gap-3 lg:justify-start">
          <Button
            onClick={handleClose}
            variant="ghost"
            size="icon"
            aria-label="Close dialog"
            ref={closeButtonRef}
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </Button>
          
          <h1 id="dialog-title" className="font-heading text-lg sm:text-xl font-semibold text-foreground truncate lg:hidden">
            Add to {event.name}
          </h1>
        </div>

        <h1 id="dialog-title" className="hidden lg:block font-heading text-lg sm:text-xl font-semibold text-foreground text-center truncate">
          Add to {event.name}
        </h1>

  <div className="flex justify-end">{getActionButton()}</div>
      </div>

      {/* Scrollable Content Container */}
      <div className="flex justify-center overflow-y-auto h-[calc(100vh-88px)] sm:h-[calc(100vh-96px)]">
        <div className="w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
          {/* Tabs */}
          <Tabs value={tab} onValueChange={setTab} className="w-full mb-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="assets">Assets</TabsTrigger>
              <TabsTrigger value="collections">Collections</TabsTrigger>
            </TabsList>

            <TabsContent value="assets" className="mt-6">
              {/* Search + Filters */}
              <div className="mb-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Search by player, set, year, consignment..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      size="lg"
                      className="pl-12"
                      aria-label="Search assets"
                    />
                    <Search
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      aria-label="Ownership filter"
                      value={ownershipFilter}
                      onChange={(e) => setOwnershipFilter(e.target.value as any)}
                      className="h-14 px-4 text-base border border-border rounded-lg bg-card text-card-foreground"
                    >
                      <option value="all">All Ownership</option>
                      <option value="portfolio">Ownership: Portfolio</option>
                      <option value="consignment">Ownership: Consignment</option>
                    </select>
                    <select
                      aria-label="Type filter"
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value as any)}
                      className="h-14 px-4 text-base border border-border rounded-lg bg-card text-card-foreground"
                    >
                      <option value="all">All Types</option>
                      <option value="graded">Type: Graded</option>
                      <option value="raw">Type: Raw</option>
                      <option value="sealed">Type: Sealed</option>
                      <option value="other">Type: Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Assets Table */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="max-h-[calc(100vh-300px)] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-background border-b border-border">
                      <tr>
                        <th className="w-12 p-3 text-left">
                          <div className="inline-flex items-center" onClick={(e) => e.stopPropagation()}>
                            <div className="scale-[1.25] origin-left">
                              <Checkbox
                                checked={allVisibleSelected}
                                aria-checked={someVisibleSelected ? "mixed" : allVisibleSelected ? "true" : "false"}
                                onCheckedChange={toggleSelectAllVisible}
                              />
                            </div>
                          </div>
                        </th>
                        <th className="p-3 text-left font-medium text-foreground min-w-[250px]">Asset</th>
                        <th className="p-3 text-center font-medium text-foreground w-24">Ownership</th>
                        <th className="p-3 text-center font-medium text-foreground w-20">Type</th>
                        <th className="p-3 text-right font-medium text-foreground w-32">Market Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((a) => {
                        const mv = Number((marketBatch as any)?.[a.globalAssetId]?.averagePrice || 0) || 0;
                        const sales = Number((marketBatch as any)?.[a.globalAssetId]?.salesCount || 0) || 0;
                        const cert = a.certNumber ?? (a as any).certificateNumber ?? (a as any).cert ?? (a as any).certNo ?? (a as any).certno ?? null;
                        const isSelected = selected.has(a.globalAssetId);
                        return (
                          <tr
                            key={a.globalAssetId}
                            className={`border-b border-border hover:bg-muted/40 cursor-pointer ${isSelected ? "bg-muted/40" : ""}`}
                            onClick={() => toggle(a.globalAssetId)}
                            role="row"
                            aria-selected={isSelected}
                          >
                            <td className="p-3 align-top" onClick={(e) => e.stopPropagation()}>
                              <div className="scale-[1.25]">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggle(a.globalAssetId)}
                                  data-testid={`checkbox-asset-${a.globalAssetId}`}
                                />
                              </div>
                            </td>
                            <td className="p-3 align-top min-w-[250px]">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-24 rounded-sm bg-muted overflow-hidden flex-shrink-0">
                                  <img src={a.psaImageFrontUrl || a.imageUrl || PLACEHOLDER_IMAGE_URL} alt="Asset thumbnail" className="h-full w-auto object-cover" />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-medium truncate text-foreground">
                                    {a.playerName || "Unknown"}
                                  </div>
                                  <div className="text-muted-foreground truncate">
                                    {a.year} {a.setName} {a.cardNumber ? `#${a.cardNumber}` : ""} {a.grade ? `• PSA ${a.grade}` : ""}
                                  </div>
                                  {cert && (
                                    <div className="pt-2 text-xs text-muted-foreground">Cert# {cert}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-3 align-top text-center w-24">
                              <OwnershipBadge type={getOwnershipType(a)} />
                            </td>
                            <td className="p-3 align-top text-center w-20 capitalize">
                              {getAssetType(a)}
                            </td>
                            <td className="p-3 align-top text-right w-32">
                              {mv > 0 ? (
                                <div>
                                  <div className="font-medium">${mv.toFixed(2)}</div>
                                  <div className="text-xs text-muted-foreground">{sales} comps</div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
            {!filtered.length && (
                        <tr>
              <td colSpan={5} className="p-8 text-center text-muted-foreground">
                            {allAssets.length === 0 ? "No assets available." : "No assets found matching your search."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="collections" className="mt-6">
              {/* Search + Filters */}
              <div className="mb-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Search collections..."
                      value={collectionsSearch}
                      onChange={(e) => setCollectionsSearch(e.target.value)}
                      size="lg"
                      className="pl-12"
                      aria-label="Search collections"
                    />
                    <Search
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      aria-label="Visibility filter"
                      value={visibilityFilter}
                      onChange={(e) => setVisibilityFilter(e.target.value as any)}
                      className="h-14 px-4 text-base border border-border rounded-lg bg-card text-card-foreground"
                    >
                      <option value="all">Visibility: All</option>
                      <option value="public">Visibility: Public</option>
                      <option value="private">Visibility: Private</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Collections Stats */}
              <div className="mb-6">
                <div className="text-sm text-muted-foreground">
                  {collectionsLoading ? "Loading collections..." : `${(collectionsWithNew.filter((c: any) => {
                    const nameMatch = collectionsSearch ? String(c.name || "").toLowerCase().includes(collectionsSearch.toLowerCase()) : true;
                    const visMatch = visibilityFilter === 'all' ? true : (visibilityFilter === 'public' ? !!c.isPublic : !c.isPublic);
                    return c.__new > 0 && nameMatch && visMatch;
                  })).length} collections with new assets`}
                </div>
              </div>

              {/* Collections Table */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="max-h-[calc(100vh-300px)] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-background border-b border-border">
                      <tr>
                        <th className="w-12 p-3 text-left">
                          <div className="inline-flex items-center" onClick={(e) => e.stopPropagation()}>
                            <div className="scale-[1.25] origin-left">
                              <Checkbox
                                checked={(collectionsWithNew.filter((c: any) => c.__new > 0 && (collectionsSearch ? String(c.name || '').toLowerCase().includes(collectionsSearch.toLowerCase()) : true) && (visibilityFilter === 'all' ? true : (visibilityFilter === 'public' ? !!c.isPublic : !c.isPublic))).length > 0) && (collectionsWithNew.filter((c: any) => c.__new > 0 && (collectionsSearch ? String(c.name || '').toLowerCase().includes(collectionsSearch.toLowerCase()) : true) && (visibilityFilter === 'all' ? true : (visibilityFilter === 'public' ? !!c.isPublic : !c.isPublic))).every((c: any) => selectedCollections.has(c.id)))}
                                // mixed state aria when some but not all selected
                                aria-checked={(() => {
                                  const visible = collectionsWithNew.filter((c: any) => c.__new > 0 && (collectionsSearch ? String(c.name || '').toLowerCase().includes(collectionsSearch.toLowerCase()) : true) && (visibilityFilter === 'all' ? true : (visibilityFilter === 'public' ? !!c.isPublic : !c.isPublic)));
                                  const allSel = visible.length > 0 && visible.every((c: any) => selectedCollections.has(c.id));
                                  const someSel = visible.some((c: any) => selectedCollections.has(c.id));
                                  return someSel && !allSel ? 'mixed' : (allSel ? 'true' : 'false');
                                })()}
                                onCheckedChange={() => {
                                  const visible = collectionsWithNew.filter((c: any) => c.__new > 0 && (collectionsSearch ? String(c.name || '').toLowerCase().includes(collectionsSearch.toLowerCase()) : true) && (visibilityFilter === 'all' ? true : (visibilityFilter === 'public' ? !!c.isPublic : !c.isPublic)));
                                  const allSel = visible.length > 0 && visible.every((c: any) => selectedCollections.has(c.id));
                                  const next = new Set(selectedCollections);
                                  if (allSel) visible.forEach((c: any) => next.delete(c.id)); else visible.forEach((c: any) => next.add(c.id));
                                  setSelectedCollections(next);
                                }}
                              />
                            </div>
                          </div>
                        </th>
                        <th className="p-3 text-left font-medium text-foreground min-w-[300px]">Collection</th>
                        <th className="p-3 text-center font-medium text-foreground w-24">Assets (new)</th>
                        <th className="p-3 text-center font-medium text-foreground w-20">Visibility</th>
                      </tr>
                    </thead>
                    <tbody>
                      {collectionsWithNew
                        .filter((c: any) => c.__new > 0)
                        .filter((c: any) => (collectionsSearch ? String(c.name || "").toLowerCase().includes(collectionsSearch.toLowerCase()) : true))
                        .filter((c: any) => visibilityFilter === 'all' ? true : (visibilityFilter === 'public' ? !!c.isPublic : !c.isPublic))
                        .map((c: any) => {
                          const isSelected = selectedCollections.has(c.id);
                          return (
                            <tr
                              key={c.id}
                              className={`border-b border-border hover:bg-muted/40 cursor-pointer ${isSelected ? 'bg-muted/40' : ''}`}
                              onClick={() => toggleCollection(c.id)}
                              aria-selected={isSelected}
                            >
                              <td className="p-3 align-top" onClick={(e) => e.stopPropagation()}>
                                <div className="scale-[1.25]">
                                  <Checkbox 
                                    checked={isSelected}
                                    onCheckedChange={() => toggleCollection(c.id)} 
                                  />
                                </div>
                              </td>
                              <td className="p-3 align-top min-w-[300px]">
                                <div className="font-medium text-foreground">{c.name}</div>
                                {c.description && (
                                  <div className="text-muted-foreground truncate mt-1">{c.description}</div>
                                )}
                              </td>
                              <td className="p-3 align-top text-center w-24">
                                {c.__new}
                              </td>
                              <td className="p-3 align-top text-center w-20">
                                {c.isPublic ? "Public" : "Private"}
                              </td>
                            </tr>
                          );
                        })}
                      {!collectionsLoading && collectionsWithNew.filter((c: any) => c.__new > 0).length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-muted-foreground">
                            No collections found. Create a collection first to add it to this event.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Bottom spacing */}
          <div className="h-16"></div>
        </div>
      </div>
    </div>
  );
}
