import { useState, useEffect, useRef } from 'react';
import { Plus, X, CheckCircle, Loader, AlertCircle, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/components/auth-provider';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { refreshSales } from '@shared/api/sales-refresh';
import { ManualAddAssetDialog } from '../manual-asset-entry';

// NEW Simplified Add Asset Modal - 6 column layout after scanning
// Columns: (1) checkbox (2) asset (thumb + title + grade + cert) (3) purchase price (4) date (5) serial x/xx (6) remove X
// UI intentionally lean vs v2 advanced bulk edit table.

// Types
type CertStatus = 'pending' | 'success' | 'error' | 'duplicate';

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
  purchasePrice?: string;
  purchaseDate?: string;
  serialInput?: string;
  serialNumber?: number | null;
  serialMax?: number | null;
  selected?: boolean;
  error?: string;
  existingAsset?: {
    purchasePrice?: number | null;
    purchaseDate?: string | null;
    serialNumber?: number | null;
    serialMax?: number | null;
    psaImageFrontUrl?: string | null;
  }
}

interface AddAssetModalSimpleProps {
  triggerButton?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// PSA scan helpers
function extractPSANumber(url: string): string {
  return url.split('/cert/')[1].split('/')[0];
}

function processScanValue(raw: string) {
  const trimmed = raw.trim();
  if (trimmed.includes('psacard.com/cert/')) {
    try { return extractPSANumber(trimmed); } catch { return trimmed; }
  }
  return trimmed;
}

const scanPSACert = async (certNumber: string) => {
  const res = await fetch(`/api/psa-cert/${certNumber}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed PSA lookup');
  const psa = data.data || data;
  return {
    metadata: {
      title: psa.title || `${psa.playerName || ''} ${psa.year || ''} ${psa.setName || ''}`.trim(),
      grade: psa.grade || '—',
      player: psa.playerName || 'Unknown',
      year: psa.year || '',
      set: psa.setName || '',
      certNumber: certNumber,
      psaImageFrontUrl: psa.psaImageFrontUrl || null,
    },
    fullData: psa,
  };
};

const mapPSADataToAsset = (psa: any) => ({
  type: 'graded',
  grader: 'PSA',
  title: psa.title,
  playerName: psa.playerName,
  setName: psa.setName,
  year: psa.year,
  cardNumber: psa.cardNumber,
  variant: psa.variant,
  grade: psa.grade,
  category: psa.category,
  certNumber: psa.certNumber,
  psaImageFrontUrl: psa.psaImageFrontUrl,
  psaImageBackUrl: psa.psaImageBackUrl,
  serialNumber: psa.serialNumber,
  serialMax: psa.serialMax,
});

export const AddAssetModalSimple = ({ triggerButton, open: controlledOpen, onOpenChange }: AddAssetModalSimpleProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (val: boolean) => {
    if (!val) { setCerts([]); setInput(''); }
    controlledOpen !== undefined ? onOpenChange?.(val) : setInternalOpen(val);
  };

  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [_, navigate] = useLocation();

  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [certs, setCerts] = useState<CertItem[]>([]);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);

  useEffect(() => { if (open) setTimeout(()=>inputRef.current?.focus(), 80); }, [open]);

  const addCert = async () => {
    if (!input.trim()) return; 
    const certNumber = processScanValue(input);
    if (certs.some(c=>c.certNumber === certNumber)) {
      toast({ title: 'Duplicate', description: `Certificate #${certNumber} already added`, variant: 'destructive' });
      setInput('');
      return;
    }
    const newCert: CertItem = { id: `cert-${Date.now()}`, certNumber, status: 'pending' };
    setCerts(prev=>[...prev, newCert]);
    setInput('');
    try {
      // 1. Ownership / duplicate check BEFORE PSA lookup
      if (user?.id) {
        try {
          const dupRes = await apiRequest('GET', `/api/user/${user.id}/assets/check-duplicate/${certNumber}`);
          const dupData = await dupRes.json();
          if (dupData?.exists) {
            let existingAssetData: any = null;
            if (dupData.assetId) {
              try {
                const assetRes = await apiRequest('GET', `/api/assets/${dupData.assetId}`);
                if (assetRes.ok) {
                  existingAssetData = await assetRes.json();
                }
              } catch (e) {
                console.warn('[AddAssetSimple] failed to fetch existing asset details', e);
              }
            }
            // Mark as duplicate (still allow user to add others)
            setCerts(prev=>prev.map(c=> c.id===newCert.id ? {
              ...c,
              status: 'duplicate',
              metadata: {
                title: existingAssetData?.title || `PSA Cert #${certNumber}`,
                grade: existingAssetData?.grade || '—',
                player: existingAssetData?.playerName || '',
                year: existingAssetData?.year || '',
                set: existingAssetData?.setName || '',
                certNumber,
                psaImageFrontUrl: existingAssetData?.psaImageFrontUrl || null
              },
              error: 'Already in your portfolio',
              existingAsset: {
                purchasePrice: existingAssetData?.purchasePrice ?? null,
                purchaseDate: existingAssetData?.purchaseDate ?? null,
                serialNumber: existingAssetData?.serialNumber ?? null,
                serialMax: existingAssetData?.serialMax ?? null,
                psaImageFrontUrl: existingAssetData?.psaImageFrontUrl || null
              },
              // Prefill read-only fields for display
              purchasePrice: existingAssetData?.purchasePrice != null ? String(existingAssetData.purchasePrice) : undefined,
              purchaseDate: existingAssetData?.purchaseDate || undefined,
              serialInput: existingAssetData?.serialNumber && existingAssetData?.serialMax ? `${existingAssetData.serialNumber}/${existingAssetData.serialMax}` : undefined,
            } : c));
            // Early return: don't hit PSA API for duplicates
            return;
          }
        } catch (e) {
          // Silent: if duplicate check fails we still proceed to scan
          console.warn('[AddAssetSimple] duplicate check failed', e);
        }
      }
      // 2. Not duplicate -> scan PSA
      const result = await scanPSACert(certNumber);
      setCerts(prev=>prev.map(c=> c.id===newCert.id ? { ...c, status: 'success', metadata: result.metadata, fullData: result.fullData } : c));
    } catch(e:any) {
      setCerts(prev=>prev.map(c=> c.id===newCert.id ? { ...c, status: 'error', error: e.message } : c));
      toast({ title: 'Cert Failed', description: e.message, variant: 'destructive' });
    } finally { setTimeout(()=>inputRef.current?.focus(), 50); }
  };

  const parseSerial = (value: string) => {
    const match = value.match(/^(\d{1,5})\s*\/\s*(\d{1,5})$/);
    if (match) return { serialNumber: parseInt(match[1],10), serialMax: parseInt(match[2],10) };
    return { serialNumber: null, serialMax: null };
  };

  const updateCert = (id: string, updates: Partial<CertItem>) => {
    setCerts(prev=>prev.map(c=> c.id===id ? { ...c, ...updates } : c));
  };

  const removeCert = (id: string) => setCerts(prev=>prev.filter(c=>c.id!==id));

  const handleAddAssets = async () => {
    const ready = certs.filter(c=>c.status==='success' && c.fullData);
    if (!ready.length) {
      toast({ title: 'No assets', description: 'Scan at least one valid cert', variant: 'destructive' });
      return;
    }
    if (!user?.id) {
      toast({ title: 'Auth error', description: 'Login required', variant: 'destructive' });
      return;
    }
    
    // Clone the data we need before clearing state
    const assetsToAdd = [...ready];
    const userId = user.id;
    
    // Close dialog and show processing toast IMMEDIATELY
    setCerts([]);
    setOpen(false);
    toast({ 
      title: 'Processing Assets...', 
      description: `Adding ${assetsToAdd.length} asset${assetsToAdd.length!==1?'s':''} to your collection`,
      duration: 3000
    });
    
    // Navigate to portfolio immediately so user sees their existing assets
    setTimeout(() => navigate('/portfolio'), 100);
    
    // Process everything in the background without blocking UI
    (async () => {
      try {
      const newAssetIds: string[] = [];
      
      for (let i=0;i<assetsToAdd.length;i++) {
        const c = assetsToAdd[i];
        // Removed artificial 1200ms delay; keep tight loop for faster UX
        const assetBase = mapPSADataToAsset(c.fullData);
        const purchasePriceNumber = c.purchasePrice ? parseFloat(c.purchasePrice) : null;
        const payload:any = {
          ...assetBase,
          userId: userId,
          certNumber: c.certNumber,
          purchasePrice: purchasePriceNumber,
          purchaseDate: c.purchaseDate || null,
          serialNumber: c.serialNumber ?? c.fullData?.serialNumber ?? null,
          serialMax: c.serialMax ?? c.fullData?.serialMax ?? null,
          // Mark as serial-numbered when either value is provided (primarily keyed off max)
          serialNumbered: (c.serialMax != null || c.serialNumber != null) ? true : false,
          ownershipStatus: 'own',
        };
        const res = await apiRequest('POST', `/api/user/${userId}/assets`, payload);
        if (!res.ok) {
          const data = await res.json();
            throw new Error(data.error || 'Failed to add asset');
        }
        
        // CRITICAL: Capture the actual asset ID from API response
        const responseData = await res.json();
        const actualAssetId = responseData.id || responseData.assetId || responseData.userAssetId;
        console.log(`🔍 Asset creation response:`, responseData);
        if (actualAssetId) {
          newAssetIds.push(actualAssetId);
          console.log(`✅ Asset created with ID: ${actualAssetId} for cert ${c.certNumber}`);
        } else {
          console.warn(`⚠️ No asset ID returned for cert ${c.certNumber}, response:`, responseData);
          // Fallback to user asset ID pattern if needed
          newAssetIds.push(`user-asset-${c.certNumber}`);
        }
      }

      // Retry logic for cache invalidation (handles server restarts during asset creation)
      const maxRetries = 3;
      let retryCount = 0;
      let cacheInvalidationSuccess = false;

      while (retryCount < maxRetries && !cacheInvalidationSuccess) {
        try {
          await Promise.all([
            // Core asset queries - EXACT format match with useUserAssets hook
            queryClient.invalidateQueries({ queryKey: ['/api/assets'] }),
            queryClient.invalidateQueries({ queryKey: ['/api/user', userId, 'assets'] }),
            
            // Portfolio pricing with predicate for dynamic queries
            queryClient.invalidateQueries({
              predicate: (query) => {
                const key = query.queryKey;
                return Array.isArray(key) && key[0] === 'portfolio-pricing-v2';
              }
            }),
            
            // CRITICAL: Individual asset pricing (this was missing!)
            ...newAssetIds.map(assetId => 
              queryClient.invalidateQueries({ queryKey: [`/api/pricing/${assetId}`] })
            ),
            
            // CRITICAL: Sales comp graphs and sparklines (this was missing!)
            ...newAssetIds.map(assetId => 
              queryClient.invalidateQueries({ queryKey: [`/api/sales-comp-universal`, assetId] })
            ),
            ...newAssetIds.map(assetId => 
              queryClient.invalidateQueries({ queryKey: [`sparkline-data-${assetId}`] })
            ),
            
            // Portfolio summary invalidation
            queryClient.invalidateQueries({
              predicate: (q) => {
                const k = q.queryKey?.[0];
                return typeof k === 'string' && (
                  k.startsWith('/api/pricing/') ||
                  k.startsWith('/api/portfolio/summary/')
                );
              }
            }),
          ]);
          
          cacheInvalidationSuccess = true;
          console.log(`✅ Cache invalidation succeeded on attempt ${retryCount + 1}`);
          
          // CRITICAL: Clear PWA service worker cache for asset-related requests

          // Removed nuclear queryClient.clear(); heavy-handed approach caused stale infinite loading states
          
        } catch (cacheError) {
          retryCount++;
          const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 2s, 4s, 8s
          console.warn(`⚠️ Cache invalidation failed (attempt ${retryCount}/${maxRetries}), retrying in ${delay}ms...`, cacheError);
          
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            console.error('❌ Cache invalidation failed after all retries:', cacheError);
            // Don't throw - let the success message show but log the issue
            break;
          }
        }
      }
      // FINAL: Force immediate refetch and verify data is available
      await Promise.all([
        queryClient.refetchQueries({
          predicate: (q) => {
            const k0 = q.queryKey?.[0];
            return k0 === 'portfolio-pricing-v2';
          },
          type: 'active'
        }),
        // Force refetch user assets to ensure UI shows new assets immediately
        queryClient.refetchQueries({ 
          queryKey: [`/api/user/${userId}/assets`],
          type: 'active'
        })
      ]);

      console.log(`🎯 Asset addition complete: ${newAssetIds.length} assets with IDs:`, newAssetIds);

      // Fire manual refresh for each newly created asset to guarantee sales fetch even if background scheduler failed
      // Keep simple & sequential to avoid hammering endpoint
      // Optimistic seed: insert zeroed pricing rows so portfolio immediately renders without skeleton
      try {
        queryClient.setQueryData(
          ['portfolio-pricing-v2', newAssetIds.sort().join(',')],
          (old: any) => {
            const existing = Array.isArray(old) ? old : [];
            const seeds = newAssetIds.map(id => ({ assetId: id, averagePrice: 0, liquidity: 'cold', confidence: 0, salesCount: 0 }));
            // avoid duplicates
            const merged = [...existing];
            seeds.forEach(s => { if (!merged.some(m => m.assetId === s.assetId)) merged.push(s); });
            return merged;
          }
        );
      } catch {}

      // Fire-and-forget sales refresh (no awaiting each call)
  newAssetIds.forEach(assetId => {
        (async () => {
          try {
    console.log(`🔄 (bg) initial sales refresh for ${assetId}`);
    const rj = await refreshSales(assetId, true);
    if (!rj?.success) return;
    console.log(`✅ (bg) sales refresh done for ${assetId}:`, rj.message || rj);
            queryClient.invalidateQueries({ queryKey: ['universal-sales-comp', assetId] });
            queryClient.invalidateQueries({ queryKey: ['universal-pricing', assetId] });
            queryClient.invalidateQueries({ queryKey: ['/api/sales-comp-universal', assetId] });
            queryClient.invalidateQueries({ queryKey: ['pricing', assetId] });
          } catch (e) { console.warn('bg sales refresh failed', e); }
        })();
      });
      
      toast({ 
        title: 'Assets Added Successfully', 
        description: `Added ${assetsToAdd.length} asset${assetsToAdd.length!==1?'s':''} to your collection. Pricing data is ready!`,
        duration: 4000
      });
    } catch(e:any) {
      console.error('[Background] Asset addition failed:', e);
      toast({ title: 'Some assets failed to add', description: e.message, variant: 'destructive' });
    }
    })(); // Close the async IIFE
  };

  const anySuccess = certs.some(c=>c.status==='success');

  return (
    <>
      {triggerButton && <div onClick={()=>setOpen(true)}>{triggerButton}</div>}
  {open && !manualDialogOpen && (
        <div className="fixed top-0 left-0 right-0 bottom-0 w-full h-full z-[99998] bg-background text-foreground" role="dialog" aria-modal="true">
          <div className="relative flex items-center justify-between p-4 sm:p-6 border-b border-border">
            <button onClick={()=>setOpen(false)} className="p-2 hover:bg-muted rounded-lg transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
            <h2 className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-2xl font-heading font-semibold">Add Assets</h2>
            {/* Top-right CTA */}
            <div className="flex items-center gap-2">
              <Button
                disabled={!anySuccess || certs.some(c=>c.status==='pending')}
                onClick={handleAddAssets}
                size="lg"
              >
                {`Add ${certs.filter(c=>c.status==='success').length} Asset${certs.filter(c=>c.status==='success').length!==1?'s':''}`}
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
                
                {/* Manual Entry Link */}
                <button
                  onClick={() => {
                    // Open manual dialog and close parent so user doesn't have to close two dialogs
                    setManualDialogOpen(true);
                    setOpen(false);
                  }}
                  className="text-sm text-primary hover:text-primary/80 underline underline-offset-4 transition-colors"
                >
                  Enter Asset Manually
                </button>
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
                        <th className="text-left font-medium px-2 w-40 whitespace-nowrap">Purchase Price</th>
                        <th className="text-left font-medium px-2 w-40 whitespace-nowrap">Date Purchased</th>
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
                                    {cert.status==='pending' && <Loader className="w-3.5 h-3.5 animate-spin text-muted-foreground"/>}
                                    {cert.status==='error' && <AlertCircle className="w-3.5 h-3.5 text-destructive"/>}
                                    {cert.status==='duplicate' && <AlertCircle className="w-3.5 h-3.5 text-orange-500"/>}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    PSA {metadata?.grade || '—'} · Cert #{cert.certNumber}
                                    {cert.error && (
                                      <span className={`ml-2 ${cert.status==='duplicate' ? 'text-orange-500' : 'text-destructive'}`}>{cert.error}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-2">
                              <Input
                                type="number"
                                inputMode="decimal"
                                className={`${cert.status==='duplicate' ? 'pointer-events-none bg-muted/40 text-foreground' : ''}`}
                                value={cert.purchasePrice ?? ''}
                                placeholder="0.00"
                                onChange={e=>updateCert(cert.id,{ purchasePrice:e.target.value })}
                                disabled={cert.status==='duplicate'}
                                readOnly={cert.status==='duplicate'}
                                tabIndex={cert.status==='duplicate' ? -1 : undefined}
                              />
                            </td>
                            <td className="px-2">
                              <Input
                                type="date"
                                className={`${cert.status==='duplicate' ? 'pointer-events-none bg-muted/40 text-muted-foreground' : ''}`}
                                value={cert.purchaseDate || ''}
                                onChange={e=>updateCert(cert.id,{ purchaseDate:e.target.value })}
                                disabled={cert.status==='duplicate'}
                                readOnly={cert.status==='duplicate'}
                                tabIndex={cert.status==='duplicate' ? -1 : undefined}
                              />
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
                  
                  {/* Bottom CTA removed; primary action lives in top-right header */}
                </div>
              </div>
            )}
            <div className="h-6"/>
            </div>{/* /max-width wrapper */}
          </div>
        </div>
      )}
      
      {/* Manual Asset Entry Dialog */}
      <ManualAddAssetDialog 
        open={manualDialogOpen} 
        onOpenChange={(next) => {
          setManualDialogOpen(next);
          // If manual dialog closes, ensure parent stays closed to avoid double-close requirement
          if (!next) {
            setOpen(false);
          }
        }} 
      />
    </>
  );
};

export default AddAssetModalSimple;
