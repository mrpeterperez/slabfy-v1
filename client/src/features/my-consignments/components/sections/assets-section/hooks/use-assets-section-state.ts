// 🤖 INTERNAL NOTE:
// Purpose: Asset section state management hook
// Exports: useAssetsSectionState hook
// Feature: my-consignments

import { useState, useMemo, useEffect, useRef } from 'react';
import type { ConsignmentWithDetails } from '@shared/schema';
import type { ConsignmentAssetStatus } from '../../../consignment-asset-status-tabs';
import type { 
  SortColumn, 
  SortDirection, 
  ColumnConfig, 
  SkipSaveState, 
  DeleteDialogState,
  BulkDeleteDialogState, 
  PendingSplitApply 
} from '../types';

export function useAssetsSectionState(consignment: ConsignmentWithDetails) {
  // Effective default split to use when an asset doesn't have its own splitPercentage
  const [consignmentDefaultSplit, setConsignmentDefaultSplit] = useState<number>(() => {
    const raw = consignment?.defaultSplitPercentage;
    const n = typeof raw === 'number' ? raw : parseFloat(raw as any);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 95;
  });

  // Keep local default in sync if consignment prop changes
  useEffect(() => {
    const raw = consignment?.defaultSplitPercentage;
    const n = typeof raw === 'number' ? raw : parseFloat((raw as any) ?? '');
    if (Number.isFinite(n)) setConsignmentDefaultSplit(Math.max(0, Math.min(100, n)));
  }, [consignment?.defaultSplitPercentage]);

  // Row success flash state
  const [recentlyUpdated, setRecentlyUpdated] = useState<Set<string>>(new Set());
  const updateFlashTimers = useRef<Record<string, number>>({});
  
  const markUpdated = (id: string) => {
    setRecentlyUpdated(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    if (updateFlashTimers.current[id]) {
      clearTimeout(updateFlashTimers.current[id]);
    }
    updateFlashTimers.current[id] = window.setTimeout(() => {
      setRecentlyUpdated(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      delete updateFlashTimers.current[id];
    }, 900);
  };

  useEffect(() => () => {
    // cleanup timers on unmount
    Object.values(updateFlashTimers.current).forEach(t => clearTimeout(t));
    updateFlashTimers.current = {};
  }, []);
  // Selection and sorting state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<SortColumn>('asset');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [columnsOpen, setColumnsOpen] = useState(false);

  // Status filtering state
  const [activeStatus, setActiveStatus] = useState<ConsignmentAssetStatus>('all');

  // Column edit mode state
  const [editCols, setEditCols] = useState<Set<'list' | 'reserve' | 'split' | 'status'>>(new Set());

  // Skip-save flags to allow Esc to cancel without persisting
  const [skipSave, setSkipSave] = useState<SkipSaveState>({ 
    list: new Set(), 
    reserve: new Set(), 
    split: new Set(), 
    status: new Set() 
  });

  // Column configuration
  const defaultColumns: ColumnConfig[] = [
    { key: 'asset', label: 'Asset', visible: true, locked: true },
    { key: 'list', label: 'List Price', visible: true },
    { key: 'reserve', label: 'Reserve', visible: true },
    { key: 'market', label: 'Market Price', visible: true },
    { key: 'split', label: 'Split %', visible: false },
    { key: 'profit', label: 'House Cut', visible: true },
    { key: 'confidence', label: 'Confidence', visible: false },
    { key: 'liquidity', label: 'Liquidity', visible: false },
    { key: 'status', label: 'Status', visible: true },
    { key: 'days', label: 'Days', visible: false },
    { key: 'action', label: 'Action', visible: true },
  ];

  // Persist column visibility per consignment
  const columnsStorageKey = useMemo(() =>
    consignment?.id ? `consignmentAssetsColumns:${consignment.id}` : null,
    [consignment?.id]
  );

  // Load columns from localStorage on mount
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    if (!columnsStorageKey) return [...defaultColumns];
    try {
      const saved = localStorage.getItem(columnsStorageKey);
      if (saved) {
        const savedVisibility = JSON.parse(saved);
        return defaultColumns.map(col => ({
          ...col,
          visible: savedVisibility[col.key] ?? col.visible
        }));
      }
    } catch (e) {
      console.warn('Failed to load column preferences:', e);
    }
    return [...defaultColumns];
  });

  // Save columns to localStorage when they change
  useEffect(() => {
    if (!columnsStorageKey) return;
    try {
      const visibility = columns.reduce<Record<string, boolean>>((acc, col) => {
        acc[col.key] = col.visible;
        return acc;
      }, {});
      localStorage.setItem(columnsStorageKey, JSON.stringify(visibility));
    } catch (e) {
      console.warn('Failed to save column preferences:', e);
    }
  }, [columns, columnsStorageKey]);

  // Pricing state
  const [listPrices, setListPrices] = useState<Record<string, number>>({});
  const [reservePrices, setReservePrices] = useState<Record<string, number>>({});
  const [splitPercents, setSplitPercents] = useState<Record<string, number>>({});
  const [statusValues, setStatusValues] = useState<Record<string, string>>({});
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});
  const [reserveInputs, setReserveInputs] = useState<Record<string, string>>({});
  const [splitInputs, setSplitInputs] = useState<Record<string, string>>({});

  // Modal states
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
    open: false,
    assetId: null,
    assetTitle: '',
  });
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState<BulkDeleteDialogState>({
    open: false,
    assetIds: [],
    count: 0,
  });

  // Bulk actions state
  const [bulkPricesOpen, setBulkPricesOpen] = useState(false);
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [bulkApplyList, setBulkApplyList] = useState(true);
  const [bulkApplyReserve, setBulkApplyReserve] = useState(false);
  const [bulkListPrice, setBulkListPrice] = useState('');
  const [bulkReservePrice, setBulkReservePrice] = useState('');
  const [bulkSplitPercentage, setBulkSplitPercentage] = useState(95);
  const [bulkStatus, setBulkStatus] = useState<string>('active');
  const [bulkLoading, setBulkLoading] = useState(false);

  // Smart market-based bulk pricing state
  const [bulkPriceMode, setBulkPriceMode] = useState<'fixed' | 'market'>('fixed');
  const [marketListPct, setMarketListPct] = useState<number>(20);
  const [marketReserveMode, setMarketReserveMode] = useState<'match' | 'percent'>('match');
  const [marketReservePct, setMarketReservePct] = useState<number>(100);
  const [listRoundStep, setListRoundStep] = useState<number>(5);
  const [reserveRoundStep, setReserveRoundStep] = useState<number>(1);

  // Split apply-after-change banner state
  const [pendingSplitApply, setPendingSplitApply] = useState<PendingSplitApply | null>(null);
  const [isApplyingSplit, setIsApplyingSplit] = useState(false);

  // Helper functions
  const toggleEditCol = (col: 'list' | 'reserve' | 'split' | 'status') => {
    setEditCols(prev => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col); else next.add(col);
      return next;
    });
  };

  const markSkip = (col: 'list' | 'reserve' | 'split' | 'status', id: string) => {
    setSkipSave(prev => {
      const next = { ...prev };
      const setFor = new Set(next[col]);
      setFor.add(id);
      (next as any)[col] = setFor;
      return next;
    });
  };

  const toggleColumn = (key: string) => {
    const col = columns.find(c => c.key === key);
    if (col?.locked) return;
    setColumns(cols => cols.map(c => c.key === key ? { ...c, visible: !c.visible } : c));
  };

  const resetColumns = () => setColumns([...defaultColumns]);

  const visible = columns.reduce<Record<string, boolean>>((acc, c) => { 
    acc[c.key] = c.visible; 
    return acc; 
  }, {});

  const isDefaultColumns = useMemo(() => {
    const defMap = new Map<string, boolean>(defaultColumns.map(dc => [dc.key, !!dc.visible]));
    return columns.every(c => defMap.get(c.key) === c.visible);
  }, [columns]);

  // Enable/disable bulk Apply button based on mode and inputs
  const isBulkApplyEnabled = useMemo(() => {
    if (!bulkPricesOpen) return true;
    if (bulkPriceMode === 'fixed') {
      const doList = bulkApplyList && bulkListPrice.trim() !== '' && !isNaN(parseFloat(bulkListPrice));
      const doReserve = bulkApplyReserve && bulkReservePrice.trim() !== '' && !isNaN(parseFloat(bulkReservePrice));
      return doList || doReserve;
    }
    // market mode: at least one target (list or reserve)
    return bulkApplyList || bulkApplyReserve;
  }, [bulkPricesOpen, bulkPriceMode, bulkApplyList, bulkListPrice, bulkApplyReserve, bulkReservePrice]);

  return {
    // Consignment defaults
    consignmentDefaultSplit,
    setConsignmentDefaultSplit,

    // Flash state
    recentlyUpdated,
    setRecentlyUpdated,
    markUpdated,

    // Selection and sorting
    selectedItems,
    setSelectedItems,
    sortColumn,
    setSortColumn,
    sortDirection,
    setSortDirection,
    searchQuery,
    setSearchQuery,
    columnsOpen,
    setColumnsOpen,

    // Status filtering
    activeStatus,
    setActiveStatus,

    // Column editing
    editCols,
    setEditCols,
    toggleEditCol,
    skipSave,
    setSkipSave,
    markSkip,

    // Columns
    columns,
    setColumns,
    columnsStorageKey,
    defaultColumns,
    toggleColumn,
    resetColumns,
    visible,
    isDefaultColumns,

    // Pricing
    listPrices,
    setListPrices,
    reservePrices,
    setReservePrices,
    splitPercents,
    setSplitPercents,
    statusValues,
    setStatusValues,
    priceInputs,
    setPriceInputs,
    reserveInputs,
    setReserveInputs,
    splitInputs,
    setSplitInputs,

    // Modals
    showAddAssetModal,
    setShowAddAssetModal,
    deleteDialog,
    setDeleteDialog,
    bulkDeleteDialog,
    setBulkDeleteDialog,

    // Bulk actions
    bulkPricesOpen,
    setBulkPricesOpen,
    bulkStatusOpen,
    setBulkStatusOpen,
    bulkApplyList,
    setBulkApplyList,
    bulkApplyReserve,
    setBulkApplyReserve,
    bulkListPrice,
    setBulkListPrice,
    bulkReservePrice,
    setBulkReservePrice,
    bulkSplitPercentage,
    setBulkSplitPercentage,
    bulkStatus,
    setBulkStatus,
    bulkLoading,
    setBulkLoading,

    // Smart bulk pricing
    bulkPriceMode,
    setBulkPriceMode,
    isBulkApplyEnabled,
    marketListPct,
    setMarketListPct,
    marketReserveMode,
    setMarketReserveMode,
    marketReservePct,
    setMarketReservePct,
    listRoundStep,
    setListRoundStep,
    reserveRoundStep,
    setReserveRoundStep,

    // Split apply
    pendingSplitApply,
    setPendingSplitApply,
    isApplyingSplit,
    setIsApplyingSplit,
  };
}