"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  createClient,
  fetchClient,
  fetchClients,
  rotateClientSecret,
} from "./api";
import type { CreateClientValues } from "./schemas";
import type { CreatedClientResponse } from "./types";

export function useClients() {
  return useQuery({
    queryKey: queryKeys.clients.list(),
    queryFn: fetchClients,
  });
}

export function useClient(clientId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.clients.detail(clientId ?? ""),
    queryFn: () => fetchClient(clientId as string),
    enabled: Boolean(clientId),
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateClientValues) => createClient(payload),
    onSuccess: (result: CreatedClientResponse) => {
      queryClient.setQueryData(
        queryKeys.clients.detail(result.application.id),
        result.application,
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.list() });
    },
  });
}

export function useRotateClientSecret(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => rotateClientSecret(clientId),
    onSuccess: (result: CreatedClientResponse) => {
      queryClient.setQueryData(
        queryKeys.clients.detail(clientId),
        result.application,
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.list() });
    },
  });
}
