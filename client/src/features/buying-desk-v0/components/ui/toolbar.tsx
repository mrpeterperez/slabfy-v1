// v0-local toolbar for buying desk
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchIcon, Plus } from "lucide-react";
import BuyingDeskColumnsPopover from "../table/columns-popover";

interface Props {
	search: string;
	onSearch: (v: string) => void;
	onAddAssets: () => void;
	columns?: { key: string; label: string; visible: boolean; locked?: boolean }[];
	onToggleColumn?: (key: string) => void;
	onResetColumns?: () => void;
}

export default function BuyingDeskToolbar({ search, onSearch, onAddAssets, columns = [], onToggleColumn, onResetColumns }: Props) {
	return (
		<div className="hidden lg:block border-b border-border px-8 py-3 relative z-30">
			<div className="flex items-center justify-between gap-4">
				<h2 className="font-heading text-2xl font-semibold text-foreground">Buying Desk</h2>
				<div className="flex items-center gap-3">
					<div className="relative w-64">
						<SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input placeholder="Search inventory…" value={search} onChange={(e) => onSearch(e.target.value)} className="pl-10" />
					</div>
					{!!columns.length && onToggleColumn && (
						<BuyingDeskColumnsPopover columns={columns} onToggle={onToggleColumn} onReset={onResetColumns || (() => {})} showReset={!!onResetColumns} />
					)}
					<Button onClick={onAddAssets}>
						<Plus className="w-4 h-4 mr-2" />
						Add Assets
					</Button>
				</div>
			</div>
		</div>
	);
}
