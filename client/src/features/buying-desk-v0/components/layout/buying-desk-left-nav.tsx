import { LeftNav, type LeftNavItem } from "@/components/layout/left-nav";
export type BuyingDeskLeftNavItemV0 = LeftNavItem;
export function BuyingDeskLeftNavV0({ items, activeId, onSelect, bottomItems }: { items: BuyingDeskLeftNavItemV0[]; activeId?: string; onSelect?: (id: string)=>void; bottomItems?: BuyingDeskLeftNavItemV0[]; }) {
  return (
    <div className="hidden lg:block w-64 bg-background border-r border-border flex-shrink-0">
      <LeftNav items={items} activeId={activeId} onSelect={onSelect} bottomItems={bottomItems} />
    </div>
  );
}
