import { CountBadge } from "@/components/ui/count-badge";

export type BuyingDeskStatus = 'evaluating' | 'buyList' | 'purchased' | 'all';

interface Props {
        value: BuyingDeskStatus;
        onChange: (status: BuyingDeskStatus) => void;
        counts: Record<BuyingDeskStatus, number>;
}

export default function BuyingDeskStatusTabs({ value, onChange, counts }: Props) {
        const tabs: Array<{ key: BuyingDeskStatus; label: string; count: number }> = [
                { key: 'evaluating', label: 'Evaluating', count: counts.evaluating || 0 },
                { key: 'buyList', label: 'Buy List', count: counts.buyList || 0 },
                { key: 'purchased', label: 'Purchased', count: counts.purchased || 0 },
                { key: 'all', label: 'All', count: counts.all || 0 },
        ];

        return (
                <nav className="flex overflow-x-auto scrollbar-hide">
                        {tabs.map((t) => {
                                const isActive = value === t.key;
                                return (
                                        <button
                                                key={t.key}
                                                onClick={() => onChange(t.key)}
                                                className={
                                                        `whitespace-nowrap py-2 px-4 text-sm font-medium flex-shrink-0 transition-colors ` +
                                                        (isActive ? "border-b-4 border-primary text-primary" : "text-muted-foreground hover:text-foreground hover:border-border")
                                                }
                                                aria-current={isActive ? 'page' : undefined}
                                        >
                                                <span className="inline-flex items-center gap-2">
                                                        <span>{t.label}</span>
                                                        <CountBadge value={t.count} />
                                                </span>
                                        </button>
                                );
                        })}
                </nav>
        );
}
