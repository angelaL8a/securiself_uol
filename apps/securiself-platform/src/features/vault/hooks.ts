"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { fetchVault, updateVault } from "./api";
import type { Vault } from "./types";

export function useVault() {
  return useQuery({
    queryKey: queryKeys.vault.detail,
    queryFn: fetchVault,
  });
}

export function useUpdateVault() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, string | null>) =>
      updateVault(payload),
    onSuccess: (vault: Vault) => {
      queryClient.setQueryData(queryKeys.vault.detail, vault);
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });
}
