import { useState, useMemo, useCallback, memo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader,
  X,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  ListFilter,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type OwnershipType = 'personal' | 'consignment';

export interface EnhancedCertListItem {
  id: string;
  certNumber: string;
  status: 'pending' | 'success' | 'error' | 'duplicate';
  timestamp: number;
  error?: string;
  metadata?: {
    player: string;
    year: string;
    set: string;
    grade: string;
    title: string;
  };
  fullData?: any;
  ownershipType?: OwnershipType; // default personal
  purchaseDate?: string | null; // yyyy-mm-dd
  purchasePrice?: string; // store as string till submit
  serialInput?: string; // raw "42/100"
  serialNumber?: number | null; // parsed
  serialMax?: number | null; // parsed
  _selected?: boolean; // UI only
}

interface Props {
  certs: EnhancedCertListItem[];
  onChange: (updated: EnhancedCertListItem[]) => void;
  onRemove: (id: string) => void;
  disableActions?: boolean;
}

type SortKey =
  | 'certNumber'
  | 'player'
  | 'grade'
  | 'ownership'
  | 'purchaseDate'
  | 'purchasePrice'
  | 'serial';

interface SortState {
  key: SortKey | null;
  direction: 'asc' | 'desc';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const ScannedCertsTable = memo(function ScannedCertsTable({
  certs,
  onChange,
  onRemove,
  disableActions,
}: Props) {
  const [bulkOwnership, setBulkOwnership] = useState<OwnershipType>('personal');
  const [bulkPurchaseDate, setBulkPurchaseDate] = useState<string>('');
  const [bulkPurchasePrice, setBulkPurchasePrice] = useState<string>('');
  const [bulkSerial, setBulkSerial] = useState<string>('');
  const [sort, setSort] = useState<SortState>({ key: null, direction: 'asc' });

  const anySelected = useMemo(() => certs.some((c) => c._selected), [certs]);
  const allSelected = useMemo(
    () => certs.length > 0 && certs.every((c) => c._selected),
    [certs]
  );

  const updateCert = (id: string, partial: Partial<EnhancedCertListItem>) => {
    onChange(certs.map((c) => (c.id === id ? { ...c, ...partial } : c)));
  };

  const toggleSelect = (id: string, value: boolean) =>
    onChange(certs.map((c) => (c.id === id ? { ...c, _selected: value } : c)));

  const toggleSelectAll = (value: boolean) =>
    onChange(certs.map((c) => ({ ...c, _selected: value })));

  const parseSerial = (
    raw: string
  ): { serialNumber: number | null; serialMax: number | null } => {
    const trimmed = raw.trim();
    if (!trimmed) return { serialNumber: null, serialMax: null };
    const parts = trimmed
      .split('/')
      .map((p) => p.replace(/[^0-9]/g, ''))
      .filter(Boolean);
    if (parts.length === 2)
      return { serialNumber: parseInt(parts[0], 10), serialMax: parseInt(parts[1], 10) };
    if (parts.length === 1)
      return { serialNumber: parseInt(parts[0], 10), serialMax: null };
    return { serialNumber: null, serialMax: null };
  };

  const applyBulk = () => {
    if (!anySelected) return;
    const serialParsed = parseSerial(bulkSerial);
    onChange(
      certs.map((c) => {
        if (!c._selected) return c;
        let updates: Partial<EnhancedCertListItem> = { ownershipType: bulkOwnership };
        if (bulkOwnership === 'personal') {
          if (bulkPurchaseDate) updates.purchaseDate = bulkPurchaseDate;
          if (bulkPurchasePrice) updates.purchasePrice = bulkPurchasePrice;
        } else {
          updates.purchaseDate = null;
          updates.purchasePrice = undefined;
        }
        if (bulkSerial) {
          updates.serialInput = bulkSerial;
          updates.serialNumber = serialParsed.serialNumber;
          updates.serialMax = serialParsed.serialMax;
        }
        return { ...c, ...updates };
      })
    );
  };

  const toggleSort = (key: SortKey) => {
    setSort((prev) => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        return { key: null, direction: 'asc' }; // third click clears
      }
      return { key, direction: 'asc' };
    });
  };

  const getComparable = useCallback(
    (cert: EnhancedCertListItem, key: SortKey): string | number => {
      switch (key) {
        case 'certNumber':
          return cert.certNumber || '';
        case 'player':
          return (cert.metadata?.player || cert.metadata?.title || '').toLowerCase();
        case 'grade':
          return cert.metadata?.grade || '';
        case 'ownership':
          return cert.ownershipType || '';
        case 'purchaseDate':
          return cert.purchaseDate || '';
        case 'purchasePrice':
          return cert.purchasePrice ? parseFloat(cert.purchasePrice) : 0;
        case 'serial':
          return `${cert.serialNumber || ''}/${cert.serialMax || ''}`;
        default:
          return '';
      }
    },
    []
  );

  const sortedCerts = useMemo(() => {
    if (!sort.key) return certs;
    const dir = sort.direction === 'asc' ? 1 : -1;
    return [...certs].sort((a, b) => {
      const av = getComparable(a, sort.key!);
      const bv = getComparable(b, sort.key!);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [certs, sort, getComparable]);

  // -------------------------------------------------------------------------
  // Subcomponents (styled to match PortfolioPage typography + spacing)
  // -------------------------------------------------------------------------
  const SortHeader = ({
    label,
    sortKey,
    className = '',
  }: {
    label: string;
    sortKey: SortKey;
    className?: string;
  }) => {
    const active = sort.key === sortKey;
    return (
      <th
        className={cn(
          'px-3 py-3 text-left font-medium text-xs uppercase tracking-wide text-muted-foreground whitespace-nowrap cursor-pointer hover:bg-muted/50 transition-colors',
          className
        )}
        onClick={() => toggleSort(sortKey)}
        aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        <div className="flex items-center gap-1 select-none">
          <span>{label}</span>
          <span className="flex flex-col leading-none text-muted-foreground">
            {!active && <ChevronsUpDown className="h-3 w-3" />}
            {active && sort.direction === 'asc' && <ChevronUp className="h-3 w-3" />}
            {active && sort.direction === 'desc' && <ChevronDown className="h-3 w-3" />}
          </span>
        </div>
      </th>
    );
  };

  const getStatusIcon = (status: EnhancedCertListItem['status']) => {
    switch (status) {
      case 'pending':
        return <Loader size={14} className="text-primary animate-spin" />;
      case 'success':
        return <span className="inline-block w-2 h-2 rounded-full bg-success" />;
      case 'error':
        return <span className="inline-block w-2 h-2 rounded-full bg-destructive" />;
      case 'duplicate':
        return <span className="inline-block w-2 h-2 rounded-full bg-orange-500" />;
      default:
        return null;
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="mt-2 w-full bg-background text-foreground border border-border rounded-md overflow-hidden">
      {/* Top Bar */}
      <div className="w-full border-b border-border bg-muted/40">
        <div className="mx-auto max-w-full px-4 sm:px-6 py-3 flex flex-col gap-2">
          {/* Row 1: Counts + Selection */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(v) => toggleSelectAll(!!v)}
                aria-label={allSelected ? 'Deselect all' : 'Select all'}
              />
              <span className="whitespace-nowrap">{certs.length} Assets to Add</span>
              {certs.some((c) => c.status === 'pending') && (
                <span className="text-primary flex items-center gap-1">
                  <Loader size={12} className="animate-spin" /> Fetching...
                </span>
              )}
            </div>
            {anySelected && (
              <div className="flex items-center gap-2">
                <ListFilter className="h-3.5 w-3.5" />
                <span className="whitespace-nowrap">{certs.filter((c) => c._selected).length} selected</span>
              </div>
            )}
          </div>

          {/* Row 2: Bulk editor */}
          {anySelected && (
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Ownership</label>
                <Select
                  value={bulkOwnership}
                  onValueChange={(v: OwnershipType) => setBulkOwnership(v)}
                >
                  <SelectTrigger className="h-9 w-36">
                    <SelectValue placeholder="Ownership" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="consignment">Consignment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {bulkOwnership === 'personal' && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Purchase Date</label>
                    <Input
                      type="date"
                      className="h-9"
                      value={bulkPurchaseDate}
                      onChange={(e) => setBulkPurchaseDate(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Purchase Price</label>
                    <Input
                      placeholder="0.00"
                      className="h-9 w-32"
                      value={bulkPurchasePrice}
                      onChange={(e) => setBulkPurchasePrice(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Serial #</label>
                <Input
                  placeholder="42/100"
                  className="h-9 w-28"
                  value={bulkSerial}
                  onChange={(e) => setBulkSerial(e.target.value)}
                />
              </div>

              <Button
                size="sm"
                className="h-9 px-3 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                variant="secondary"
                onClick={applyBulk}
              >
                Apply
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-y-auto max-h-96">
        <table className="min-w-full divide-y-2 divide-border">
          <thead className="sticky top-0 bg-background border-b border-border z-10">
            <tr>
              <th className="px-3 py-3 text-left font-medium text-xs uppercase tracking-wide text-muted-foreground whitespace-nowrap w-10">Sel</th>
              <th className="px-3 py-3 text-left font-medium text-xs uppercase tracking-wide text-muted-foreground whitespace-nowrap w-10">Status</th>
              <SortHeader label="Cert #" sortKey="certNumber" className="w-28" />
              <SortHeader label="Details" sortKey="player" />
              <SortHeader label="Grade" sortKey="grade" className="w-20" />
              <SortHeader label="Ownership" sortKey="ownership" className="w-32" />
              <SortHeader label="Purchase Date" sortKey="purchaseDate" className="w-36" />
              <SortHeader label="Price" sortKey="purchasePrice" className="w-24" />
              <SortHeader label="Serial #" sortKey="serial" className="w-28" />
              <th className="px-3 py-3 text-right font-medium text-xs uppercase tracking-wide text-muted-foreground whitespace-nowrap w-12">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border bg-background">
            {sortedCerts.map((cert) => {
              const editable = cert.status === 'success';
              const ownershipType = cert.ownershipType || 'personal';
              const rowTone =
                cert.status === 'duplicate'
                  ? 'bg-orange-50'
                  : cert.status === 'error'
                  ? 'bg-destructive/5'
                  : '';

              return (
                <tr
                  key={cert.id}
                  className={cn(
                    'group hover:bg-muted/25 transition-colors',
                    rowTone
                  )}
                >
                  <td className="px-3 py-2 align-middle w-10">
                    <Checkbox
                      disabled={!editable}
                      checked={!!cert._selected}
                      onCheckedChange={(v) => toggleSelect(cert.id, !!v)}
                      aria-label={!!cert._selected ? 'Deselect' : 'Select'}
                    />
                  </td>

                  <td className="px-3 py-2 align-middle w-10">
                    <div className="flex items-center justify-start">{getStatusIcon(cert.status)}</div>
                  </td>

                  <td className="px-3 py-2 align-middle font-mono text-[11px] whitespace-nowrap w-28">
                    {cert.certNumber}
                  </td>

                  <td className="px-3 py-2 align-middle min-w-[200px]">
                    {cert.status === 'pending' && (
                      <div className="h-5 w-40 bg-muted rounded animate-pulse" />
                    )}
                    {cert.status === 'error' && (
                      <div className="text-destructive text-xs leading-tight break-words">
                        {cert.error}
                      </div>
                    )}
                    {cert.status === 'success' && cert.metadata && (
                      <div className="max-w-[420px]">
                        <div className="font-medium leading-tight text-sm truncate group-hover:text-foreground">
                          {cert.metadata.player}
                        </div>
                        <div className="text-muted-foreground text-[11px] leading-tight truncate">
                          {cert.metadata.year} {cert.metadata.set}
                        </div>
                      </div>
                    )}
                    {cert.status === 'duplicate' && cert.metadata && (
                      <div className="max-w-[420px]">
                        <div className="font-medium text-orange-800 leading-tight text-sm truncate">
                          {cert.metadata.player}
                        </div>
                        <div className="text-orange-700 text-xs leading-tight truncate">
                          {cert.metadata.year} {cert.metadata.set}
                        </div>
                        <div className="text-[10px] text-orange-600 mt-1">Already Owned</div>
                      </div>
                    )}
                  </td>

                  <td className="px-3 py-2 align-middle w-20 text-center">
                    {cert.status === 'success' && cert.metadata ? (
                      <span className="px-2 inline-flex text-[10px] leading-5 font-semibold rounded-full bg-success-subtle text-success">
                        {cert.metadata.grade}
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">—</span>
                    )}
                  </td>

                  <td className="px-3 py-2 align-middle w-32">
                    <Select
                      value={ownershipType}
                      onValueChange={(v: OwnershipType) => updateCert(cert.id, { ownershipType: v })}
                      disabled={!editable}
                    >
                      <SelectTrigger className="h-8 text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personal">Personal</SelectItem>
                        <SelectItem value="consignment">Consignment</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>

                  <td className="px-3 py-2 align-middle w-36">
                    {ownershipType === 'personal' ? (
                      <Input
                        type="date"
                        className="h-8 text-xs"
                        value={cert.purchaseDate || ''}
                        disabled={!editable}
                        onChange={(e) => updateCert(cert.id, { purchaseDate: e.target.value })}
                      />
                    ) : (
                      <div className="text-[10px] text-muted-foreground">—</div>
                    )}
                  </td>

                  <td className="px-3 py-2 align-middle w-24">
                    {ownershipType === 'personal' ? (
                      <Input
                        placeholder="0.00"
                        className="h-8 text-xs"
                        value={cert.purchasePrice || ''}
                        disabled={!editable}
                        onChange={(e) => updateCert(cert.id, { purchasePrice: e.target.value })}
                      />
                    ) : (
                      <div className="text-[10px] text-muted-foreground">—</div>
                    )}
                  </td>

                  <td className="px-3 py-2 align-middle w-28">
                    <Input
                      placeholder="42/100"
                      className="h-8 text-xs"
                      value={cert.serialInput || ''}
                      disabled={!editable}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const { serialNumber, serialMax } = parseSerial(raw);
                        updateCert(cert.id, { serialInput: raw, serialNumber, serialMax });
                      }}
                    />
                  </td>

                  <td className="px-3 py-2 align-middle text-right w-12">
                    <Button
                      onClick={() => onRemove(cert.id)}
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive/80 hover:bg-destructive-subtle focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      disabled={disableActions}
                      aria-label="Remove"
                    >
                      <X size={14} />
                    </Button>
                  </td>
                </tr>
              );
            })}

            {sortedCerts.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  No certificates scanned.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});

export default ScannedCertsTable;
