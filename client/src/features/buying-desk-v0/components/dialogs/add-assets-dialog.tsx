// v0-local AddAssetsDialog (UI parity with AddAssetModalSimple, wired to buying-desk session APIs)
import React, { useEffect, useRef, useState } from "react";
import { Plus, X, CheckCircle, Loader, AlertCircle, ScanLine, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { psaApi, buyingDeskApi } from "../../lib/api";
import { apiRequest } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { evaluateScan, loadBuyingDeskSettings } from "../../lib/auto-accept-engine";
import type { MarketData, AssetData } from "../../lib/auto-accept-engine";

type CertStatus = "pending" | "success" | "error" | "duplicate" | "consignment";

interface CertMetadata {
  title: string;
  grade: string;
  player: string;
  year: string;
  set: string;
  certNumber?: string;
  psaImageFrontUrl?: string | null;
}

interface CertItem {
  id: string;
  certNumber: string;
  status: CertStatus;
  metadata?: CertMetadata;
  fullData?: any;
  // Only serial inputs are needed here
  serialNumber?: number | null;
  serialMax?: number | null;
  selected?: boolean;
  error?: string;
}

interface Props { open: boolean; onOpenChange: (open: boolean) => void; sessionId: string }

function extractPSANumber(url: string): string { return url.split('/cert/')[1]?.split('/')?.[0] || url; }
function processScanValue(raw: string) { const t = raw.trim(); return t.includes('psacard.com/cert/') ? extractPSANumber(t) : t; }
function mapPSADataToGlobalAsset(psa: any) {
  return { type: 'graded', grader: 'PSA', title: psa.title, playerName: psa.playerName, setName: psa.setName, year: psa.year, cardNumber: psa.cardNumber, variant: psa.variant, grade: psa.grade, category: psa.category, certNumber: psa.certNumber, psaImageFrontUrl: psa.psaImageFrontUrl || null, psaImageBackUrl: psa.psaImageBackUrl || null };
}

export function AddAssetsDialog({ open, onOpenChange, sessionId }: Props) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [certs, setCerts] = useState<CertItem[]>([]);
  const [existingAssets, setExistingAssets] = useState<Set<string>>(new Set());
  const [consignmentCerts, setConsignmentCerts] = useState<Set<string>>(new Set());
  const [ownedCerts, setOwnedCerts] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Focus and fetch current session certs on open
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    fetchExistingAssets();
    fetchConsignmentCerts();
    fetchOwnedCerts();
    return () => clearTimeout(t);
  }, [open]);
  const fetchExistingAssets = async () => {
    try {
      const response = await apiRequest('GET', `/api/buying-desk/sessions/${sessionId}/assets`);
      const assets = await response.json();
      const certNumbers = new Set(
        (assets || []).map((a: any) => a.asset?.certNumber).filter(Boolean) as string[]
      );
      setExistingAssets(certNumbers);
    } catch {}
  };

  const fetchConsignmentCerts = async () => {
    try {
      const response = await apiRequest('GET', '/api/consignments?archived=false');
      const consignments = await response.json();
      const certNumbers = new Set<string>();
      
      // Get all assets from all active consignments
      for (const consignment of consignments || []) {
        try {
          const assetsResponse = await apiRequest('GET', `/api/consignments/${consignment.id}/assets`);
          const assets = await assetsResponse.json();
          (assets || []).forEach((asset: any) => {
            if (asset.certNumber) {
              certNumbers.add(asset.certNumber);
            }
          });
        } catch {
          // Skip failed consignment assets fetch
        }
      }
      setConsignmentCerts(certNumbers);
    } catch {
      // Silently fail - consignment warning is nice-to-have
    }
  };

  const fetchOwnedCerts = async () => {
    try {
      // Get user ID from Supabase auth using proper client import
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        console.log('⚠️ No user session found for ownership check');
        return;
      }
      const userId = session.user.id;
      
      // Get user's personal collection assets
      const assetsResponse = await apiRequest('GET', `/api/user/${userId}/assets`);
      const assets = await assetsResponse.json();
      const certNumbers = new Set(
        (assets || []).map((asset: any) => asset.certNumber).filter(Boolean) as string[]
      );
      console.log(`🔍 Loaded ${certNumbers.size} owned cert numbers for duplicate checking`);
      setOwnedCerts(certNumbers);
    } catch (error) {
      console.error('❌ Failed to fetch owned certs:', error);
      // Silently fail - ownership checking is nice-to-have
    }
  };

  const getFriendlyErrorMessage = (error: any): string => {
    const errorMsg = error?.message || error?.toString() || '';
    if (errorMsg.includes('404') || errorMsg.includes('Certificate not found') || errorMsg.includes('Not Found')) return 'Invalid PSA #';
    if (errorMsg.includes('429') || errorMsg.includes('rate limit') || errorMsg.includes('too many requests')) return 'Rate limit reached';
    if (errorMsg.includes('network') || errorMsg.includes('connection') || errorMsg.includes('timeout')) return 'Connection failed';
    if (errorMsg.includes('500') || errorMsg.includes('Edge Function') || errorMsg.includes('server error')) return 'PSA lookup failed';
    if (errorMsg.includes('401') || errorMsg.includes('unauthorized') || errorMsg.includes('authentication')) return 'Authentication failed';
    return 'PSA lookup failed';
  };

  const updateCert = (id: string, patch: Partial<CertItem>) => { setCerts(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c))); };
  const removeCert = (id: string) => setCerts(prev => prev.filter(c => c.id !== id));

  const addCert = async () => {
    if (!input.trim()) return;
    const certNumber = processScanValue(input);
    
    console.log(`🔍 Checking cert ${certNumber}:`, {
      isDuplicate: certs.some(c => c.certNumber === certNumber),
      isOwned: ownedCerts.has(certNumber),
      ownedCertsSize: ownedCerts.size,
      isInSession: existingAssets.has(certNumber),
      isConsignment: consignmentCerts.has(certNumber)
    });
    
    if (certs.some(c => c.certNumber === certNumber)) {
      toast({ title: 'Duplicate', description: `Certificate #${certNumber} already added`, variant: 'destructive' });
      setInput("");
      return;
    }
    // Check if user already owns this cert number in their personal collection
    if (ownedCerts.has(certNumber)) {
      console.log(`🚫 BLOCKED: User already owns cert ${certNumber}`);
      toast({ 
        title: 'Already Owned', 
        description: `Certificate #${certNumber} is already in your personal collection. You can't buy something you already own!`,
        variant: 'destructive',
        duration: 5000
      });
      setInput("");
      return;
    }
    
    if (existingAssets.has(certNumber)) {
      const id = `cert-${Date.now()}`;
      setCerts(prev => [...prev, { id, certNumber, status: 'duplicate', selected: false, metadata: { title: `PSA Cert #${certNumber}`, grade: '—', player: '', year: '', set: '', certNumber } }]);
      setInput(""); setTimeout(() => inputRef.current?.focus(), 50); return;
    }
    
    // Check if this cert number exists in user's consignments
    if (consignmentCerts.has(certNumber)) {
      toast({ 
        title: '⚠️ Consignment Item', 
        description: `Certificate #${certNumber} is in your consignments. You can still add it to evaluate buying back your own item.`,
        variant: 'default',
        duration: 5000
      });
    }
    
    const id = `cert-${Date.now()}`;
    setCerts(prev => [...prev, { id, certNumber, status: 'pending' }]);
    setInput("");
    try {
      const psa = await psaApi.getByCert(certNumber);
      const data = (psa as any).data || psa;
      const metadata: CertMetadata = {
        title: data.title || '',
        grade: data.grade || '',
        player: data.playerName || '',
        year: data.year || '',
        set: data.setName || '',
        certNumber,
        psaImageFrontUrl: data.psaImageFrontUrl || null
      };
      
      // Mark as consignment item if it matches
      const status = consignmentCerts.has(certNumber) ? 'consignment' : 'success';
      updateCert(id, { status, metadata, fullData: data });
    } catch (e: any) {
      const friendlyError = getFriendlyErrorMessage(e);
      updateCert(id, { status: 'error', error: friendlyError });
      toast({ title: 'Cert Failed', description: friendlyError, variant: 'destructive' });
    } finally {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };
  
  // Batch add all successful certs to session (including consignment items)
  const handleBatchAdd = async () => {
    const successCerts = certs.filter(c => c.status === 'success' || c.status === 'consignment');
    if (successCerts.length === 0) return;
    
    // Capture data before clearing state
    const certsToAdd = [...successCerts];
    const currentSessionId = sessionId;
    
    // Load buying desk settings for auto-accept engine
    const settings = loadBuyingDeskSettings();
    
    // Close dialog and show processing toast IMMEDIATELY (mirror simple modal behavior)
    setCerts([]);
    onOpenChange(false);
    toast({ 
      title: 'Processing Assets...', 
      description: `Evaluating ${certsToAdd.length} asset${certsToAdd.length!==1?'s':''} with smart filtering`,
      duration: 3000
    });
    
    // Process everything in the background without blocking UI
    (async () => {
      let autoAcceptedCount = 0;
      let autoDeniedCount = 0;
      let reviewCount = 0;
      
      try {
        for (const cert of certsToAdd) {
          if (!cert.fullData) continue;
          
          // 1. Create global asset
          const globalAssetPayload = mapPSADataToGlobalAsset(cert.fullData);
          const globalAssetResponse = await apiRequest("POST", "/api/global-assets", globalAssetPayload);
          const globalAsset = await globalAssetResponse.json();
          
          // 2. Fetch market data for this asset
          let marketData: MarketData | null = null;
          try {
            const pricingResponse = await apiRequest("GET", `/api/pricing/${globalAsset.id}`);
            const pricingData = await pricingResponse.json();
            marketData = {
              averagePrice: pricingData.averagePrice || 0,
              confidence: pricingData.confidence || 0,
              liquidity: pricingData.liquidity || 'cold',
              salesCount: pricingData.salesCount || 0,
            };
          } catch (e) {
            console.warn('[Auto-Accept] Failed to fetch market data, using defaults:', e);
            marketData = {
              averagePrice: 0,
              confidence: 0,
              liquidity: 'cold',
              salesCount: 0,
            };
          }
          
          // 3. Run auto-accept engine evaluation
          const assetData: AssetData = {
            id: globalAsset.id,
            playerName: cert.fullData.playerName,
            setName: cert.fullData.setName,
            year: cert.fullData.year,
            cardNumber: cert.fullData.cardNumber,
            grade: cert.fullData.grade,
            certNumber: cert.certNumber,
          };
          
          const evaluation = evaluateScan(assetData, marketData, settings);
          
          // 4. Handle based on evaluation result
          if (evaluation.action === 'auto-deny') {
            autoDeniedCount++;
            console.log(`🚫 Auto-denied: ${cert.certNumber} - ${evaluation.reason}`);
            // Don't add to session - just log it
            continue;
          }
          
          // 5. Add to session first (API only accepts assetId/certNumber)
          const addResponse = await buyingDeskApi.sessions.addStagingAsset(currentSessionId, { 
            assetId: globalAsset.id
          });
          const evaluationAsset = await addResponse.json();
          
          // 6. Update with calculated buy price and status if auto-accepted
          if (evaluation.action === 'auto-accept' && evaluation.buyPrice) {
            try {
              await apiRequest("PATCH", `/api/buying-desk/sessions/${currentSessionId}/assets/${evaluationAsset.id}`, {
                offerPrice: evaluation.buyPrice
              });
              autoAcceptedCount++;
              console.log(`✅ Auto-accepted: ${cert.certNumber} - Buy: $${evaluation.buyPrice}`);
            } catch (e) {
              console.warn('[Auto-Accept] Failed to set offer price:', e);
              reviewCount++;
            }
          } else {
            reviewCount++;
            console.log(`⚠️ Needs review: ${cert.certNumber} - ${evaluation.reason}`);
          }
        }
        
        // Invalidate assets so the new rows show immediately
        await queryClient.invalidateQueries({ queryKey: ["buying-desk", "assets", currentSessionId] });
        // Force immediate refetch to ensure data appears quickly
        await queryClient.refetchQueries({ queryKey: ["buying-desk", "assets", currentSessionId] });
        // Invalidate market data to ensure pricing appears immediately
        await queryClient.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "/api/market" });
        await queryClient.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "/api/pricing/batch" });
        
        // Show summary toast
        const parts = [];
        if (autoAcceptedCount > 0) parts.push(`✅ ${autoAcceptedCount} auto-accepted`);
        if (reviewCount > 0) parts.push(`⚠️ ${reviewCount} need review`);
        if (autoDeniedCount > 0) parts.push(`🚫 ${autoDeniedCount} auto-denied`);
        
        toast({ 
          title: 'Smart Filtering Complete', 
          description: parts.join(' • ') || 'All assets processed',
          duration: 5000
        });
      } catch (e: any) {
        console.error('[Background] Failed to add assets to buying session:', e);
        toast({ title: 'Some assets failed to add', description: e.message, variant: 'destructive' });
      }
    })(); // Close the async IIFE
  };

  if (!open) return null;
  const anySuccess = certs.some(c => c.status === 'success' || c.status === 'consignment');
  const successCount = certs.filter(c => c.status === 'success' || c.status === 'consignment').length;
  return (
    <div className="fixed inset-0 z-50 bg-background text-foreground" role="dialog" aria-modal="true">
      <div className="relative flex items-center justify-between p-4 sm:p-6 border-b border-border">
        <button onClick={() => onOpenChange(false)} className="p-2 hover:bg-muted rounded-lg transition-colors" aria-label="Close">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
        <h2 className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-2xl font-heading font-semibold">Add Assets</h2>
        {/* Top-right CTA to add to session */}
        <div className="flex items-center gap-2">
          <Button
            disabled={!anySuccess || certs.some(c=>c.status==='pending')}
            onClick={handleBatchAdd}
            size="lg"
          >
            {`Add ${successCount} Asset${successCount!==1?'s':''} to Session`}
          </Button>
        </div>
      </div>
      <div className="px-4 sm:px-6 py-6 overflow-y-auto h-[calc(100vh-80px)] sm:h-[calc(100vh-88px)]">
        <div className="max-w-6xl mx-auto">
          {certs.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-center gap-8 pt-6">
              <div className="space-y-5">
                <div className="p-6 border-2 border-dashed border-border rounded-lg inline-block">
                  <ScanLine className="h-14 w-14 text-muted-foreground" />
                </div>
                <div className="space-y-2 max-w-md mx-auto">
                  <h3 className="text-lg font-medium">Scan PSA Slabs</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">Scan a PSA QR code or manually type a certification number below. </p>
                </div>
              </div>
              <div className="flex w-full max-w-xl">
                <Input
                  ref={inputRef}
                  placeholder="Scan QR Code or Enter Cert #"
                  value={input}
                  onChange={e=>setInput(e.target.value)}
                  onKeyDown={e=>{ if(e.key==='Enter') addCert(); }}
                  className="rounded-r-none h-12"
                />
                <Button disabled={!input.trim()} onClick={addCert} className="rounded-l-none px-5 h-12"><Plus className="w-5 h-5"/></Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Scan Row (compact) */}
              <div className="flex w-full max-w-full">
                <Input
                  ref={inputRef}
                  placeholder="Scan QR Code or Enter Cert #"
                  value={input}
                  onChange={e=>setInput(e.target.value)}
                  onKeyDown={e=>{ if(e.key==='Enter') addCert(); }}
                  className="rounded-r-none"
                />
                <Button disabled={!input.trim()} onClick={addCert} className="rounded-l-none px-4"><Plus className="w-5 h-5"/></Button>
              </div>
              <div className="w-full max-w-6xl mx-auto">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-transparent text-xs uppercase tracking-wide text-muted-foreground">
                      <tr className="h-9">
                        <th className="w-8 px-2 text-left font-medium whitespace-nowrap">
                          <Checkbox
                            aria-label="Select all"
                            className="h-5 w-5"
                            checked={certs.length>0 && certs.every(c=>c.selected)}
                            onCheckedChange={(val)=>setCerts(prev=>prev.map(c=>({...c, selected: !!val })))}
                          />
                        </th>
                        <th className="text-left font-medium px-2 whitespace-nowrap">Asset</th>
                        {/* Purchase Price / Date columns intentionally omitted for buying desk */}
                        <th className="text-left font-medium px-2 w-44 whitespace-nowrap">If Numbered</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {certs.map(cert=>{
                        const { metadata } = cert;
                        return (
                          <tr key={cert.id} className="border-t align-middle">
                            <td className="px-2">
                              <Checkbox
                                className="h-5 w-5"
                                checked={!!cert.selected}
                                onCheckedChange={(val)=>updateCert(cert.id,{ selected: !!val })}
                              />
                            </td>
                            <td className="px-2 align-middle">
                              <div className="flex items-center gap-3">
                                {/* Thumb */}
                                <div className="w-12 h-20 bg-muted rounded overflow-hidden flex items-center justify-center text-[10px] font-medium shrink-0">
                                  {metadata?.psaImageFrontUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={metadata.psaImageFrontUrl} alt={metadata.title} className="max-h-full max-w-full object-contain"/>
                                  ) : (
                                    (metadata?.player || metadata?.title || 'IMG').toString().slice(0,3).toUpperCase()
                                  )}
                                </div>
                                <div className="leading-tight">
                                  <div className="flex items-center gap-1">
                                    <span className="font-medium text-sm line-clamp-1 max-w-[320px]">{metadata?.title || `PSA Cert #${cert.certNumber}`}</span>
                                    {cert.status==='success' && <CheckCircle className="w-3.5 h-3.5 text-primary"/>}
                                    {cert.status==='consignment' && <Package className="w-3.5 h-3.5 text-blue-500"/>}
                                    {cert.status==='pending' && <Loader className="w-3.5 h-3.5 animate-spin text-muted-foreground"/>}
                                    {cert.status==='error' && <AlertCircle className="w-3.5 h-3.5 text-destructive"/>}
                                    {cert.status==='duplicate' && <AlertCircle className="w-3.5 h-3.5 text-orange-500"/>}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    PSA {metadata?.grade || '—'} · Cert #{cert.certNumber}
                                    {cert.status === 'consignment' && (
                                      <span className="ml-2 text-blue-500">In your consignments</span>
                                    )}
                                    {cert.error && (
                                      <span className={`ml-2 ${cert.status==='duplicate' ? 'text-orange-500' : 'text-destructive'}`}>{cert.error}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-2">
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min={1}
                                  placeholder="#"
                                  className={`w-20 ${cert.status==='duplicate' ? 'pointer-events-none bg-muted/40' : ''}`}
                                  value={cert.serialNumber ?? ''}
                                  onChange={(e)=>{
                                    const val = e.target.value;
                                    updateCert(cert.id,{ serialNumber: val ? parseInt(val,10) : null });
                                  }}
                                  disabled={cert.status==='duplicate'}
                                  readOnly={cert.status==='duplicate'}
                                  tabIndex={cert.status==='duplicate' ? -1 : undefined}
                                />
                                <span className="text-muted-foreground">/</span>
                                <Input
                                  type="number"
                                  min={1}
                                  placeholder="out of"
                                  className={`w-24 ${cert.status==='duplicate' ? 'pointer-events-none bg-muted/40' : ''}`}
                                  value={cert.serialMax ?? ''}
                                  onChange={(e)=>{
                                    const val = e.target.value;
                                    updateCert(cert.id,{ serialMax: val ? parseInt(val,10) : null });
                                  }}
                                  disabled={cert.status==='duplicate'}
                                  readOnly={cert.status==='duplicate'}
                                  tabIndex={cert.status==='duplicate' ? -1 : undefined}
                                />
                              </div>
                            </td>
                            <td className="px-2 text-right">
                              <button onClick={()=>removeCert(cert.id)} className="p-1 text-destructive hover:bg-destructive/10 rounded-md" aria-label="Remove"><X className="w-4 h-4"/></button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          <div className="h-6"/>
        </div>
      </div>
    </div>
  );
}

export default AddAssetsDialog;
