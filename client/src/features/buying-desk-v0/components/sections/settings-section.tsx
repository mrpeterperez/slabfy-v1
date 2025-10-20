import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Edit2, Save, X } from "lucide-react";
import { buyingDeskApi } from "../../lib/api";
import type { BuySession } from "../../types";
import { useQueryClient } from "@tanstack/react-query";
import { BuySessionStatusPill, type BuySessionStatus } from "@/components/status/buy-session-status-pill";
import { useSessionV0 as useSession } from "../../hooks/use-sessions";

type Status = BuySession["status"];

// Simplified status options - just active or closed (80/20 rule)
const STATUS_OPTIONS: Status[] = ["active", "closed"];
function formatDate(d?: string) { if (!d) return "—"; try { return new Date(d).toLocaleString(); } catch { return d; } }
function statusLabel(s: Status) { return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()); }

export function BuyingDeskSettingsSectionV0({ sessionId }: { sessionId: string }) {
	const { data: session } = useSession(sessionId);
	const { toast } = useToast();
	const qc = useQueryClient();
	const [isEditing, setIsEditing] = React.useState(false);
	const [status, setStatus] = React.useState<Status>("active");
	const [saving, setSaving] = React.useState(false);
	React.useEffect(() => { if (session?.status) setStatus(session.status as Status); }, [session?.status]);
	const handleCancel = () => { setStatus((session?.status as Status) ?? "active"); setIsEditing(false); };
	const handleSave = async () => { 
		if (!sessionId) return; 
		setSaving(true); 
		try { 
			await buyingDeskApi.sessions.update(sessionId, { status }); 
			qc.invalidateQueries({ queryKey: ["buying-desk", "session", sessionId] }); 
			qc.invalidateQueries({ queryKey: ["buying-desk", "sessions"] }); 
			
			// Show different message if closing (which auto-archives)
			if (status === 'closed') {
				toast({ 
					title: "Session closed & archived", 
					description: "This session has been moved to the Archive tab" 
				});
			} else {
				toast({ title: "Saved", description: "Session settings updated" });
			}
			
			setIsEditing(false); 
		} catch { 
			toast({ title: "Error", description: "Failed to update settings", variant: "destructive" }); 
		} finally { 
			setSaving(false); 
		} 
	};
	return (
		<div className="p-6 pb-24 space-y-8 max-w-7xl mx-auto">
			<section>
				<div className="flex items-center justify-between mb-4">
					<div><h3 className="text-lg font-semibold">Session Details</h3><p className="text-sm text-muted-foreground">Manage your session information</p></div>
					{!isEditing ? (<Button variant="outline" size="sm" onClick={() => setIsEditing(true)}><Edit2 className="h-4 w-4 mr-2" /> Edit</Button>) : (<div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={handleCancel}><X className="h-4 w-4 mr-2" /> Cancel</Button><Button size="sm" onClick={handleSave} disabled={saving}><Save className="h-4 w-4 mr-2" /> {saving ? "Saving…" : "Save"}</Button></div>)}
				</div>
				<Card>
					<CardContent className="p-6 space-y-6">
						<div className="space-y-1"><label className="text-sm font-medium">Session #</label><p className="text-sm text-muted-foreground">{session?.sessionNumber ?? "—"}</p></div>
						<div className="space-y-2"><label className="text-sm font-medium">Status</label>{!isEditing ? (<div className="flex items-center gap-3"><BuySessionStatusPill status={(session?.status as BuySessionStatus) ?? "active"} /></div>) : (<Select value={status} onValueChange={(v) => setStatus(v as Status)}><SelectTrigger className="w-56"><SelectValue /></SelectTrigger><SelectContent>{STATUS_OPTIONS.map((opt) => (<SelectItem key={opt} value={opt}>{statusLabel(opt)}</SelectItem>))}</SelectContent></Select>)}
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
							<div className="space-y-1"><label className="text-sm font-medium">Associated Event</label><p className="text-sm text-muted-foreground">{session?.event?.name ?? "—"}</p></div>
							<div className="space-y-1"><label className="text-sm font-medium">Seller</label><p className="text-sm text-muted-foreground">{session?.seller?.name ?? "—"}</p></div>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
							<div className="space-y-1"><label className="text-sm font-medium">Created</label><p className="text-sm text-muted-foreground">{formatDate(session?.createdAt)}</p></div>
							<div className="space-y-1"><label className="text-sm font-medium">Last Updated</label><p className="text-sm text-muted-foreground">{formatDate(session?.updatedAt)}</p></div>
						</div>
					</CardContent>
				</Card>
			</section>
		</div>
	);
}
