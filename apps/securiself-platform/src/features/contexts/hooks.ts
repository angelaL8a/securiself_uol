"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  createContext,
  deleteContext,
  fetchContext,
  fetchContexts,
  updateContext,
} from "./api";
import type { Context } from "./types";

export function useContexts() {
  return useQuery({
    queryKey: queryKeys.contexts.list(),
    queryFn: fetchContexts,
  });
}

export function useContext(contextId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.contexts.detail(contextId ?? ""),
    queryFn: () => fetchContext(contextId as string),
    enabled: Boolean(contextId),
  });
}

export function useCreateContext() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => createContext(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contexts.all });
    },
  });
}

export function useUpdateContext(contextId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      updateContext(contextId, payload),
    onSuccess: (context: Context) => {
      queryClient.setQueryData(queryKeys.contexts.detail(contextId), context);
      queryClient.invalidateQueries({ queryKey: queryKeys.contexts.list() });
    },
  });
}

export function useDeleteContext() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contextId: string) => deleteContext(contextId),
    onSuccess: (_data, contextId) => {
      queryClient.removeQueries({
        queryKey: queryKeys.contexts.detail(contextId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.contexts.list() });
    },
  });
}
