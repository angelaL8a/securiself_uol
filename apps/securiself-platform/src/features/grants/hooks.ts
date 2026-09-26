"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { fetchGrants, revokeGrant } from "./api";

export function useGrants() {
  return useQuery({
    queryKey: queryKeys.grants.list(),
    queryFn: fetchGrants,
  });
}

export function useRevokeGrant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (grantId: string) => revokeGrant(grantId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.grants.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.audit.list });
    },
  });
}
