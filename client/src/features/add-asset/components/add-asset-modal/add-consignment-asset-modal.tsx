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

// Consignment version of add asset modal - matches add-asset-modal-simple UI
// Removes Purchase Price and Date Purchased columns, keeps If Numbered column
// Perfect for consignment workflow where we don't track purchase info

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
  serialInput?: string;
  serialNumber?: number | null;
  serialMax?: number | null;
  selected?: boolean;
  error?: string;
  existingAsset?: {
    serialNumber?: number | null;
    serialMax?: number | null;
    psaImageFrontUrl?: string | null;
  }
}

interface AddConsignmentAssetModalProps {
  triggerButton?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  consignmentId?: string;
  // Backward compatibility props
  isOpen?: boolean;
  onClose?: () => void;
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

// Smart system defaults for immediate usability
const getSystemDefaults = () => ({
  pricingMode: 'market',
  listPercentAboveMarket: 20, // 20% above market - sensible default
  listRounding: 1,
  enableReserveStrategy: true,
  reserveStrategy: 'match', // Match market for reserves - conservative
  reservePercentOfMarket: 100,
  reserveRounding: 1,
  defaultSplitPercentage: 95, // 95% to consignor, 5% house cut
});

// Load consignment settings with smart fallbacks
const loadConsignmentSettings = () => {
  try {
    // Support both legacy and current keys written by settings dialog
    const saved = localStorage.getItem('consignment-settings') || localStorage.getItem('consignmentSettings');
    const defaults = getSystemDefaults();
    
    if (!saved) {
      return defaults;
    }
    
    const userSettings = JSON.parse(saved);
    return { ...defaults, ...userSettings }; // Merge with defaults as fallback
  } catch (error) {
    console.warn('Failed to load consignment settings:', error);
    return getSystemDefaults();
  }
};

// Get market pricing data for an asset
const getMarketPricing = async (globalAssetId: string) => {
  try {
    const response = await apiRequest('POST', '/api/pricing/batch', {
      globalAssetIds: [globalAssetId] // Fix: API expects array of IDs, not object
    });
    const data = await response.json();
    return data[globalAssetId] || null;
  } catch (error) {
    console.warn('Failed to get market pricing:', error);
    return null;
  }
};

// Apply pricing rounding based on settings
const applyRounding = (price: number, roundingValue: 1 | 5 | 10): number => {
  if (!price || price <= 0) return 0;
  
  // Round to nearest rounding value
  return Math.ceil(price / roundingValue) * roundingValue;
};

// Calculate pricing based on market data and settings
const calculatePricing = (marketData: any, settings: any) => {
  console.log(`🔧 calculatePricing called with:`, { marketData, settings });
  
  if (!settings) {
    console.log(`🔧 calculatePricing FAILED: No settings provided`);
    return { listPrice: 0, reservePrice: 0 };
  }

  // pricing/batch returns { averagePrice, ... }
  const avg = Number(marketData?.averagePrice ?? 0);
  
  // If no market data, use fallback defaults based on settings
  if (!avg || avg <= 0) {
    console.log(`🔧 calculatePricing: No market data, using fallback defaults`, { 
      hasMarketData: !!marketData, 
      averagePrice: marketData?.averagePrice, 
      hasSettings: !!settings 
    });
    
    // Apply fallback defaults when no market data is available
    if (settings.pricingMode === 'market') {
      // Use reasonable fallback prices when no market data exists
      // These are placeholder values that user can adjust in the UI
      const fallbackMarketPrice = 50; // Reasonable default for cards
      const percentage = settings.listPercentAboveMarket || 20;
      const listPrice = fallbackMarketPrice * (1 + percentage / 100);
      
      let reservePrice = 0;
      if (settings.enableReserveStrategy) {
        if (settings.reserveStrategy === 'match') {
          reservePrice = fallbackMarketPrice;
        } else if (settings.reserveStrategy === 'percentage') {
          const reservePercent = settings.reservePercentOfMarket || 100;
          reservePrice = fallbackMarketPrice * (reservePercent / 100);
        }
      }
      
      // Apply rounding
      const listRounding = settings.listRounding || 1;
      const reserveRounding = settings.reserveRounding || 1;
      
      return { 
        listPrice: applyRounding(listPrice, listRounding), 
        reservePrice: applyRounding(reservePrice, reserveRounding) 
      };
    }
    
    return { listPrice: 0, reservePrice: 0 };
  }
  
  const marketPrice = avg;
  let listPrice = 0;
  let reservePrice = 0;

  // Calculate list price based on settings
  if (settings.pricingMode === 'market') {
    // Market-based pricing: % above market
    const percentage = settings.listPercentAboveMarket || 20;
    listPrice = marketPrice * (1 + percentage / 100);
    
    // Apply list price rounding
    const listRounding = settings.listRounding || 1;
    listPrice = applyRounding(listPrice, listRounding);

    // Calculate reserve price
    if (settings.enableReserveStrategy) {
      if (settings.reserveStrategy === 'match') {
        // Match market price
        reservePrice = marketPrice;
      } else if (settings.reserveStrategy === 'percentage') {
        // Percentage of market price
        const reservePercent = settings.reservePercentOfMarket || 100;
        reservePrice = marketPrice * (reservePercent / 100);
      }
      
      // Apply reserve price rounding
      const reserveRounding = settings.reserveRounding || 1;
      reservePrice = applyRounding(reservePrice, reserveRounding);
    }
  }

  return { listPrice, reservePrice };
};

export const AddConsignmentAssetModal = ({ triggerButton, open: controlledOpen, onOpenChange, consignmentId, isOpen, onClose }: AddConsignmentAssetModalProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Handle backward compatibility props
  const open = controlledOpen !== undefined ? controlledOpen : (isOpen !== undefined ? isOpen : internalOpen);
  const setOpen = (val: boolean) => {
    if (!val) { setCerts([]); setInput(''); }
    
    // Handle both prop patterns
    if (controlledOpen !== undefined && onOpenChange) {
      onOpenChange(val);
    } else if (isOpen !== undefined && onClose) {
      if (!val) onClose();
    } else {
      setInternalOpen(val);
    }
  };

  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [_, navigate] = useLocation();

  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [certs, setCerts] = useState<CertItem[]>([]);

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
      // Check for duplicates in user's portfolio (just for notification, still allow adding)
      if (user?.id) {
        try {
          const dupRes = await apiRequest('GET', `/api/user/${user.id}/assets/check-duplicate/${certNumber}`);
          const dupData = await dupRes.json();
          if (dupData?.exists) {
            // For consignment, we still show it as a warning but allow adding
            setCerts(prev=>prev.map(c=> c.id===newCert.id ? {
              ...c,
              status: 'duplicate',
              metadata: {
                title: `PSA Cert #${certNumber}`,
                grade: '—',
                player: '',
                year: '',
                set: '',
                certNumber,
                psaImageFrontUrl: null
              },
              error: 'Already in your portfolio (consignment allowed)',
            } : c));
            // Continue to PSA scan even for duplicates in consignment mode
          }
        } catch (e) {
          console.warn('[AddConsignmentAsset] duplicate check failed', e);
        }
      }
      
      // Get PSA data and create global asset for pricing pipeline
      const result = await scanPSACert(certNumber);
      
      // Create global asset to trigger eBay + GROQ pricing
      const globalAssetPayload = mapPSADataToAsset(result.fullData);
      const globalAssetResponse = await apiRequest("POST", "/api/global-assets", globalAssetPayload);
      const globalAsset = await globalAssetResponse.json();
      
      // Enhance with global asset ID for pricing
      const enhancedData = { ...result.fullData, globalAssetId: globalAsset.id };
      
      setCerts(prev=>prev.map(c=> c.id===newCert.id ? { ...c, status: 'success', metadata: result.metadata, fullData: enhancedData } : c));
    } catch(e:any) {
      setCerts(prev=>prev.map(c=> c.id===newCert.id ? { ...c, status: 'error', error: e.message } : c));
      toast({ title: 'Cert Failed', description: e.message, variant: 'destructive' });
    } finally { setTimeout(()=>inputRef.current?.focus(), 50); }
  };

  const updateCert = (id: string, updates: Partial<CertItem>) => {
    setCerts(prev=>prev.map(c=> c.id===id ? { ...c, ...updates } : c));
  };

  const removeCert = (id: string) => setCerts(prev=>prev.filter(c=>c.id!==id));

  const handleAddAssets = async () => {
    const ready = certs.filter(c=>(c.status==='success' || c.status==='duplicate') && c.fullData);
    if (!ready.length) {
      toast({ title: 'No assets', description: 'Scan at least one valid cert', variant: 'destructive' });
      return;
    }
    if (!user?.id) {
      toast({ title: 'Auth error', description: 'Login required', variant: 'destructive' });
      return;
    }
    if (!consignmentId) {
      toast({ title: 'Error', description: 'Consignment ID required', variant: 'destructive' });
      return;
    }
    
    // Load consignment settings for pricing calculations
    const settings = loadConsignmentSettings();
    
    setIsAdding(true);
    try {
      for (let i=0;i<ready.length;i++) {
        const c = ready[i];
        if (i>0) await new Promise(r=>setTimeout(r,1200));
        
        // Use the global asset ID from the enhanced data or create if needed
        let globalAssetId = c.fullData?.globalAssetId;
        
        if (!globalAssetId) {
          // Create global asset first if it doesn't exist
          const assetBase = mapPSADataToAsset(c.fullData);
          const globalAssetResponse = await apiRequest("POST", "/api/global-assets", assetBase);
          const globalAsset = await globalAssetResponse.json();
          globalAssetId = globalAsset.id;
        }

        // Asset creation without immediate pricing - let market data trigger pricing later
        // Pricing will be applied automatically when market data becomes available
        
        // Add to consignment using the consignment assets endpoint
        const defaultSplit = (() => {
          const v = settings?.defaultSplitPercentage;
          const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
          return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 95;
        })();

        const consignmentPayload = {
          globalAssetId: globalAssetId,
          askingPrice: null, // No initial pricing - will be set when market data arrives
          splitPercentage: defaultSplit,
        };
        
        const res = await apiRequest('POST', `/api/consignments/${consignmentId}/assets`, consignmentPayload);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to add asset to consignment');
        }
        
        // Reserve pricing will be applied automatically when market data becomes available
      }
      
      // Invalidate consignment-specific queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [`/api/consignments/${consignmentId}/assets`] }),
        queryClient.invalidateQueries({ queryKey: [`consignment-pricing`, consignmentId] }),
        queryClient.invalidateQueries({ queryKey: ['/api/consignments'] }),
        queryClient.invalidateQueries({ queryKey: [`/api/consignments/${consignmentId}`] }),
        // 🔥 CRITICAL: Invalidate portfolio query so consignment assets appear in "My Portfolio"
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            const k = query.queryKey as any[];
            return Array.isArray(k) && k.length > 0 && typeof k[0] === 'string' && k[0].includes('/api/user/') && k[0].includes('/assets');
          }
        }),
        // Invalidate any pricing queries for this consignment
        queryClient.invalidateQueries({
          predicate: (query) => {
            const k = query.queryKey as any[];
            return Array.isArray(k) && k[0] === 'consignment-pricing' && k[1] === consignmentId;
          }
        })
      ]);
      
      toast({ title: 'Consignment Assets Added', description: `Added ${ready.length} asset${ready.length!==1?'s':''} to consignment.` });
      setCerts([]); setOpen(false); 
      // Navigate to the consignment
      navigate(`/consignments/${consignmentId}`);
    } catch(e:any) {
      toast({ title: 'Add failed', description: e.message, variant: 'destructive' });
    } finally { setIsAdding(false); }
  };

  const anySuccess = certs.some(c=>c.status==='success' || c.status==='duplicate');

  return (
    <>
      {triggerButton && <div onClick={()=>setOpen(true)}>{triggerButton}</div>}
      {open && (
        <div className="fixed inset-0 z-50 bg-background text-foreground" role="dialog" aria-modal="true">
          <div className="relative flex items-center justify-between p-4 sm:p-6 border-b border-border">
            <button onClick={()=>setOpen(false)} className="p-2 hover:bg-muted rounded-lg transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
            <h2 className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-2xl font-heading font-semibold">Add Consignment Assets</h2>
            {/* Top-right CTA */}
            <div className="flex items-center gap-2">
              <Button
                size="lg"
                disabled={isAdding || !anySuccess || certs.some(c=>c.status==='pending')}
                onClick={handleAddAssets}
              >
                {isAdding ? (
                  <><Loader className="w-4 h-4 mr-2 animate-spin"/>Saving...</>
                ) : (
                  `Add ${certs.filter(c=>c.status==='success' || c.status==='duplicate').length} Asset${certs.filter(c=>c.status==='success' || c.status==='duplicate').length!==1?'s':''}`
                )}
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
                    <h3 className="text-lg font-medium">Scan PSA Slabs for Consignment</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">Scan PSA QR codes or enter cert numbers for consignment assets. No purchase info needed.</p>
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
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min={1}
                                  placeholder="#"
                                  className="w-20"
                                  value={cert.serialNumber ?? ''}
                                  onChange={(e)=>{
                                    const val = e.target.value;
                                    updateCert(cert.id,{ serialNumber: val ? parseInt(val,10) : null });
                                  }}
                                />
                                <span className="text-muted-foreground">/</span>
                                <Input
                                  type="number"
                                  min={1}
                                  placeholder="out of"
                                  className="w-24"
                                  value={cert.serialMax ?? ''}
                                  onChange={(e)=>{
                                    const val = e.target.value;
                                    updateCert(cert.id,{ serialMax: val ? parseInt(val,10) : null });
                                  }}
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
            </div>{/* /max-width wrapper */}
          </div>
        </div>
      )}
    </>
  );
};

export default AddConsignmentAssetModal;
