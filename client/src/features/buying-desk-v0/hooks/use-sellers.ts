import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SellerWithContact } from "../types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth-provider";
import { apiRequest } from "@/lib/queryClient";

const key = { sellers: ["buying-desk", "sellers"] as const };

export function useSellersV0() {
	const { user, loading: authLoading } = useAuth();
	return useQuery({
		queryKey: key.sellers,
		queryFn: async () => {
			const res = await apiRequest('GET', `/api/buying-desk/sellers`);
			const data = await res.json();
			return (Array.isArray(data) ? data : []).map((item: any) => ({
				id: item.seller?.id ?? item.id,
				name: item.contact?.name,
				email: item.contact?.email,
				company: item.contact?.companyName,
				phoneNumber: item.contact?.phoneNumber,
				description: item.contact?.notes,
			})) as SellerWithContact[];
		},
		enabled: !!user && !authLoading,
		staleTime: 5 * 60 * 1000, // 5 minutes
		refetchOnWindowFocus: true, // Refetch when returning to tab
		refetchOnMount: true, // Refetch when component remounts
	});
}

export function useCreateSellerV0() {
	const qc = useQueryClient();
	const { toast } = useToast();
	return useMutation({
		mutationFn: async (contact: { name: string; email?: string; phone?: string; companyName?: string; notes?: string }) => {
			const res = await apiRequest('POST', `/api/buying-desk/sellers`, {
				name: contact.name,
				email: contact.email,
				phoneNumber: contact.phone,
				companyName: contact.companyName,
			});
			return res.json();
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: key.sellers });
			// 🎯 CRITICAL: Invalidate contacts cache since sellers are contacts
			qc.invalidateQueries({ queryKey: ["/api/contacts"], exact: false });
			toast({ title: "Success", description: "Seller created" });
		},
	});
}
