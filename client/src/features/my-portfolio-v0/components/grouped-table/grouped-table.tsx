import React, { useMemo } from 'react';
import type { Asset } from '@shared/schema';
import { useSimplePricing } from '../../hooks/use-simple-pricing';
import { groupAssets } from './grouping-utils';
import { GroupedTableRow } from './grouped-table-row';
import { GroupedGroupRow } from './grouped-group-row';

interface Props { 
  assets: Asset[]; 
  visible?: Record<string, boolean>; 
  onEdit?: (asset: Asset) => void;
  onDelete?: (asset: Asset) => void;
}

export const GroupedPortfolioTableV0: React.FC<Props> = ({ assets, visible, onEdit, onDelete }) => {
  const groups = useMemo(() => groupAssets(assets), [assets]);
  const { pricing } = useSimplePricing(assets);
  const show = useMemo(() => ({
    ownership: visible?.ownership ?? true,
    type: visible?.type ?? true,
    qty: visible?.qty ?? true,
    price: visible?.price ?? true,
    current: visible?.current ?? true,
    unrealized: visible?.unrealized ?? true,
    confidence: visible?.confidence ?? true,
    liquidity: visible?.liquidity ?? true,
    trend: visible?.trend ?? true,
  }), [visible]);

  const handleClick = (a: Asset) => { window.location.href = `/assets/${a.id}`; };

  return (
    <table className="min-w-full divide-y divide-border text-sm">
      <thead className="bg-background">
        <tr>
          <th className="text-left px-3 py-2 font-medium">Asset</th>
          {show.ownership && <th className="text-right px-3 py-2 font-medium">Owner</th>}
          {show.type && <th className="text-right px-3 py-2 font-medium">Type</th>}
          {show.qty && <th className="text-right px-3 py-2 font-medium">Qty</th>}
          {show.price && <th className="text-right px-3 py-2 font-medium">Buy Price</th>}
          {show.unrealized && <th className="text-right px-3 py-2 font-medium">Unrealized</th>}
          {show.confidence && <th className="text-center px-3 py-2 font-medium">Confidence</th>}
          {show.liquidity && <th className="text-center px-3 py-2 font-medium">Liquidity</th>}
          {show.current && <th className="text-right px-3 py-2 font-medium sticky right-24 bg-background z-0">Price</th>}
          {show.trend && <th className="text-left px-4 py-2 font-medium sticky right-0 bg-background z-0">Trend</th>}
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {groups.map(g => g.length === 1 ? (
          <GroupedTableRow key={g[0].id} asset={g[0]} market={pricing[g[0].globalAssetId || g[0].id]} show={show} onClick={handleClick} onEdit={onEdit} onDelete={onDelete} />
        ) : (
          <GroupedGroupRow key={g[0].id + '_' + g.length} assets={g} show={show} marketData={pricing as any} onClickAsset={handleClick} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </tbody>
    </table>
  );
};
