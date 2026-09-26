import { apiClient, type DataEnvelope } from "@/lib/api-client";
import type { Context } from "./types";

type ContextPayload = Record<string, unknown>;

export function fetchContexts(): Promise<Context[]> {
  return apiClient
    .get<DataEnvelope<Context[]>>("/api/v1/contexts")
    .then((res) => res.data);
}

export function fetchContext(contextId: string): Promise<Context> {
  return apiClient
    .get<DataEnvelope<Context>>(`/api/v1/contexts/${contextId}`)
    .then((res) => res.data);
}

export function createContext(payload: ContextPayload): Promise<Context> {
  return apiClient
    .post<DataEnvelope<Context>>("/api/v1/contexts", payload)
    .then((res) => res.data);
}

export function updateContext(
  contextId: string,
  payload: ContextPayload,
): Promise<Context> {
  return apiClient
    .put<DataEnvelope<Context>>(`/api/v1/contexts/${contextId}`, payload)
    .then((res) => res.data);
}

export function deleteContext(contextId: string): Promise<void> {
  return apiClient.delete<void>(`/api/v1/contexts/${contextId}`);
}
