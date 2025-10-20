import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import { Trash2, Plus } from "lucide-react";
import { v4 as uuid } from "uuid";
import { useSessionV0 as useSession } from "../../hooks/use-sessions";

type NoteItem = { id: string; text: string; createdAt: string };

function parseNotes(raw: unknown): NoteItem[] {
	if (!raw) return [];
	if (typeof raw === "string") {
		try {
			const parsed = JSON.parse(raw);
			if (Array.isArray(parsed)) {
				return parsed.filter((n) => n && typeof n.text === "string").map((n) => ({ id: n.id || uuid(), text: String(n.text), createdAt: n.createdAt || new Date().toISOString() }));
			}
			if (raw.trim().length) { return [{ id: uuid(), text: raw.trim(), createdAt: new Date().toISOString() }]; }
			return [];
		} catch {
			if (raw.trim().length) { return [{ id: uuid(), text: raw.trim(), createdAt: new Date().toISOString() }]; }
			return [];
		}
	}
	return [];
}

export function BuyingDeskNotesSectionV0({ sessionId }: { sessionId: string }) {
	const { data: session } = useSession(sessionId);
	const qc = useQueryClient();
	const { toast } = useToast();
	const [notes, setNotes] = React.useState<NoteItem[]>([]);
	const [newNote, setNewNote] = React.useState("");
	const [saving, setSaving] = React.useState(false);
	const inputRef = React.useRef<HTMLInputElement | null>(null);

	React.useEffect(() => { setNotes(parseNotes(session?.notes)); }, [session?.notes]);

	const persist = async (next: NoteItem[]) => {
		setSaving(true);
		try {
			await apiRequest("PATCH", `/api/buying-desk/sessions/${sessionId}`, { notes: JSON.stringify(next) });
			qc.setQueryData(["buying-desk", "session", sessionId], (prev: any) => ({ ...prev, notes: JSON.stringify(next) }));
			toast({ title: "Saved", description: "Notes updated" });
		} catch {
			toast({ title: "Error", description: "Failed to save notes", variant: "destructive" });
		} finally { setSaving(false); }
	};

	const handleAdd = async () => { const text = newNote.trim(); if (!text) return; const next = [{ id: uuid(), text, createdAt: new Date().toISOString() }, ...notes]; setNotes(next); setNewNote(""); await persist(next); };
	const handleDelete = async (id: string) => { const next = notes.filter((n) => n.id !== id); setNotes(next); await persist(next); };

	return (
		<div className="p-6 pb-24 space-y-8 max-w-7xl mx-auto">
			<div className="space-y-4">
				<h2 className="text-xl font-semibold">Session Notes</h2>
				<div className="flex gap-2">
					<Input ref={inputRef} value={newNote} onChange={(e) => setNewNote(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { if (e.shiftKey) { e.preventDefault(); const el = inputRef.current; if (!el) return; const start = el.selectionStart ?? newNote.length; const end = el.selectionEnd ?? newNote.length; const next = newNote.slice(0, start) + "\n" + newNote.slice(end); setNewNote(next); requestAnimationFrame(() => { try { el.setSelectionRange(start + 1, start + 1); } catch {} }); } else { e.preventDefault(); if (!saving && newNote.trim()) { handleAdd(); } } } }} placeholder="Type a quick note… (Enter to save, Shift+Enter for newline)" disabled={saving} />
					<Button onClick={handleAdd} disabled={saving || !newNote.trim()}><Plus className="h-4 w-4 mr-1" /> Add</Button>
				</div>
				{notes.length === 0 ? (
					<p className="text-sm text-muted-foreground">No notes yet. Add your first note above.</p>
				) : (
					<ul className="divide-y rounded-lg border bg-card">
						{notes.map((n) => (
							<li key={n.id} className="p-4 flex items-start justify-between gap-4">
								<div className="space-y-1">
									<p className="text-sm leading-relaxed whitespace-pre-wrap">{n.text}</p>
									<p className="text-xs text-muted-foreground">{format(new Date(n.createdAt), "MMM d, yyyy • h:mm a")} · {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
								</div>
								<Button variant="ghost" size="icon" onClick={() => handleDelete(n.id)} disabled={saving}><Trash2 className="h-4 w-4" /></Button>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}
