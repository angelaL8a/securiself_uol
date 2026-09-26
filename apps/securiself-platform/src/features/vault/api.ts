import { apiClient, type DataEnvelope } from "@/lib/api-client";
import type { Vault } from "./types";

export function fetchVault(): Promise<Vault> {
  return apiClient
    .get<DataEnvelope<Vault>>("/api/v1/vault")
    .then((res) => res.data);
}

export function updateVault(
  payload: Record<string, string | null>,
): Promise<Vault> {
  return apiClient
    .put<DataEnvelope<Vault>>("/api/v1/vault", payload)
    .then((res) => res.data);
}
