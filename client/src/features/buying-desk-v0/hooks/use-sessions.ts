// v0-local session hooks (copied)
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { buyingDeskApi } from "../lib/api";
import type { BuySession } from "../types";
import { useToast } from "@/hooks/use-toast";

const key = { session: (id: string) => ["buying-desk", "session", id] as const };

export function useCreateSessionV0() {
        const { toast } = useToast();
        const qc = useQueryClient();
        return useMutation({
                mutationFn: buyingDeskApi.sessions.create,
                onSuccess: () => {
                        toast({ title: "Success", description: "Session created" });
                        // Invalidate both global and event-scoped caches
                        qc.invalidateQueries({ queryKey: ["buying-desk", "sessions"] });
                        qc.invalidateQueries({ queryKey: ["buying-desk", "sessions", "event"], exact: false });
                },
        });
}

export function useSessionV0(id: string, enabled = true) {
	return useQuery<BuySession>({
		queryKey: key.session(id),
		enabled: enabled && !!id,
		// Cache settings handled by global QueryClient defaults
	});
}

export function useDeleteSessionV0() {
        const { toast } = useToast();
        const qc = useQueryClient();
        return useMutation({
                mutationFn: buyingDeskApi.sessions.delete,
                onSuccess: () => {
                        toast({ title: "Success", description: "Session deleted" });
                        qc.invalidateQueries({ queryKey: ["buying-desk", "sessions"] });
                },
                onError: () => {
                        toast({ title: "Error", description: "Failed to delete session", variant: "destructive" });
                },
        });
}
