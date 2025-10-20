import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const key = { offers: ["buying-desk", "offers"] as const };

export function useBuyOffersV0(params?: { archived?: boolean; eventId?: string }) {
	const { user } = useAuth();
	return useQuery({
		queryKey: [...key.offers, { archived: params?.archived, eventId: params?.eventId }],
		queryFn: async () => {
			let url = `/api/buying-desk/sessions`;
			const qs: string[] = [];
			if (params?.archived !== undefined) qs.push(`archived=${params.archived}`);
			if (params?.eventId) qs.push(`eventId=${encodeURIComponent(params.eventId)}`);
			if (qs.length) url += `?${qs.join("&")}`;
			const res = await apiRequest("GET", url);
			const sessions = await res.json();
			const mapped = (sessions as any[]).map((s) => ({
				buyOffer: { 
					id: s.id, 
					offerNumber: s.sessionNumber ?? s.offerNumber, 
					status: s.status ?? "active", 
					notes: s.notes ?? null, 
					createdAt: s.createdAt ?? new Date().toISOString(), 
					expiryDate: s.expiryDate ?? null 
				},
				contact: s.seller ? { 
					id: s.seller.id,
					name: s.seller.name, 
					email: s.seller.email ?? null, 
					phone: s.seller.phone ?? null 
				} : null,
				event: s.event ? {
					id: s.event.id,
					name: s.event.name,
					location: s.event.location ?? null
				} : null,
				cartSummary: { 
					count: Number(s.cartCount ?? 0), 
					totalValue: Number(s.totalValue ?? 0), 
					expectedProfit: Number(s.expectedProfit ?? 0) 
				},
			}));
			return mapped;
		},
		enabled: !!user,
		staleTime: 60_000,
	});
}

export function useDeleteBuyOfferV0() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/buying-desk/sessions/${id}`); },
		onSuccess: () => { qc.invalidateQueries({ queryKey: key.offers }); },
	});
}

export function useUpdateBuyOfferV0() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (payload: { id: string; data: { status?: string; notes?: string } }) => { const res = await apiRequest("PATCH", `/api/buying-desk/sessions/${payload.id}`, payload.data); return res.json(); },
		onSuccess: () => { qc.invalidateQueries({ queryKey: key.offers }); },
	});
}

// Bulk archive buying sessions
export function useBulkArchiveBuyingSessions() {
	const queryClient = useQueryClient();
	const { toast } = useToast();

	return useMutation({
		mutationFn: async (sessionIds: string[]) => {
			const response = await apiRequest("PATCH", "/api/buying-desk/bulk/archive", { sessionIds });
			return response.json();
		},
		onSuccess: (data, sessionIds) => {
			// Invalidate all session queries
			queryClient.invalidateQueries({ queryKey: key.offers });

			// Show partial success if there were failures
			if (data.failedCount && data.failedCount > 0) {
				// Build detailed error message
				const errorDetails = data.errors?.map((e: any) => `• ${e.error}`).join('\n') || '';
				toast({
					title: "⚠️ Partial success",
					description: `Archived ${data.archivedCount} of ${sessionIds.length} session(s).\n\n${data.failedCount} failed:\n${errorDetails}`,
					variant: "default",
				});
			} else {
				toast({
					title: "✅ Sessions archived",
					description: data.message,
				});
			}
		},
		onError: (error: any) => {
			toast({
				title: "Error",
				description: error?.message || "Failed to archive sessions",
				variant: "destructive",
			});
		},
	});
}

// Archive single session
export function useArchiveBuyingSession() {
	const queryClient = useQueryClient();
	const { toast } = useToast();

	return useMutation({
		mutationFn: async (sessionId: string) => {
			const response = await apiRequest("PATCH", "/api/buying-desk/bulk/archive", { sessionIds: [sessionId] });
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: key.offers });
			toast({
				title: "✅ Session archived",
				description: "Session moved to archive",
			});
		},
		onError: (error: any) => {
			toast({
				title: "Error",
				description: error?.message || "Failed to archive session",
				variant: "destructive",
			});
		},
	});
}

// Restore/unarchive single session
export function useRestoreBuyingSession() {
	const queryClient = useQueryClient();
	const { toast } = useToast();

	return useMutation({
		mutationFn: async (sessionId: string) => {
			const response = await apiRequest("PATCH", "/api/buying-desk/bulk/unarchive", { sessionIds: [sessionId] });
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: key.offers });
			toast({
				title: "✅ Session restored",
				description: "Session moved back to active",
			});
		},
		onError: (error: any) => {
			toast({
				title: "Error",
				description: error?.message || "Failed to restore session",
				variant: "destructive",
			});
		},
	});
}


// Bulk unarchive buying sessions
export function useBulkUnarchiveBuyingSessions() {
	const queryClient = useQueryClient();
	const { toast } = useToast();

	return useMutation({
		mutationFn: async (sessionIds: string[]) => {
			const response = await apiRequest("PATCH", "/api/buying-desk/bulk/unarchive", { sessionIds });
			return response.json();
		},
		onSuccess: (data, sessionIds) => {
			// Invalidate all session queries
			queryClient.invalidateQueries({ queryKey: key.offers });

			// Show partial success if there were failures
			if (data.failedCount && data.failedCount > 0) {
				// Build detailed error message
				const errorDetails = data.errors?.map((e: any) => `• ${e.error}`).join('\n') || '';
				toast({
					title: "⚠️ Partial success",
					description: `Unarchived ${data.unarchivedCount} of ${sessionIds.length} session(s).\n\n${data.failedCount} failed:\n${errorDetails}`,
					variant: "default",
				});
			} else {
				toast({
					title: "✅ Sessions unarchived",
					description: data.message,
				});
			}
		},
		onError: (error: any) => {
			toast({
				title: "Error",
				description: error?.message || "Failed to unarchive sessions",
				variant: "destructive",
			});
		},
	});
}

// Bulk delete buying sessions (only archived sessions)
export function useBulkDeleteBuyingSessions() {
	const queryClient = useQueryClient();
	const { toast } = useToast();

	return useMutation({
		mutationFn: async (sessionIds: string[]) => {
			const response = await apiRequest("DELETE", "/api/buying-desk/bulk/delete", { sessionIds });
			return response.json();
		},
		onSuccess: (data, sessionIds) => {
			// Invalidate all session queries
			queryClient.invalidateQueries({ queryKey: key.offers });

			// Show partial success if there were failures
			if (data.failedCount && data.failedCount > 0) {
				// Build detailed error message
				const errorDetails = data.errors?.map((e: any) => `• ${e.error}`).join('\n') || '';
				toast({
					title: "⚠️ Partial success",
					description: `Deleted ${data.deletedCount} of ${sessionIds.length} session(s).\n\n${data.failedCount} failed:\n${errorDetails}`,
					variant: "default",
				});
			} else {
				toast({
					title: "✅ Sessions deleted",
					description: data.message,
				});
			}
		},
		onError: (error: any) => {
			toast({
				title: "Error",
				description: error?.message || "Failed to delete sessions",
				variant: "destructive",
			});
		},
	});
}
