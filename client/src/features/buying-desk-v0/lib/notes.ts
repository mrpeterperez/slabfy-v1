// Copied from buying-desk/lib/notes.ts
import { v4 as uuid } from "uuid";
export type NoteItem = { id: string; text: string; createdAt: string };
export function parseNotes(raw: unknown): NoteItem[] {
  if (!raw) return [];
  if (typeof raw === "string") {
    const str = raw.trim();
    if (!str) return [];
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((n) => n && typeof n.text === "string")
          .map((n) => ({
            id: n.id || uuid(),
            text: String(n.text),
            createdAt: n.createdAt || new Date().toISOString(),
          }));
      }
      return [{ id: uuid(), text: str, createdAt: new Date().toISOString() }];
    } catch {
      return [{ id: uuid(), text: str, createdAt: new Date().toISOString() }];
    }
  }
  return [];
}
export function latestNoteText(raw: unknown): string | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    const str = raw.trim();
    if (!str) return null;
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const n = parsed[0];
        if (n && typeof n.text === "string" && n.text.trim().length) return n.text.trim();
      }
      return str;
    } catch {
      return str;
    }
  }
  return null;
}
