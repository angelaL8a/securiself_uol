import { apiClient, type DataEnvelope } from "@/lib/api-client";
import type { CreateClientValues } from "./schemas";
import type { ApplicationClient, CreatedClientResponse } from "./types";

export function fetchClients(): Promise<ApplicationClient[]> {
  return apiClient
    .get<DataEnvelope<ApplicationClient[]>>("/api/v1/clients")
    .then((res) => res.data);
}

export function fetchClient(clientId: string): Promise<ApplicationClient> {
  return apiClient
    .get<DataEnvelope<ApplicationClient>>(`/api/v1/clients/${clientId}`)
    .then((res) => res.data);
}

export function createClient(
  payload: CreateClientValues,
): Promise<CreatedClientResponse> {
  return apiClient
    .post<DataEnvelope<CreatedClientResponse>>("/api/v1/clients", payload)
    .then((res) => res.data);
}

export function rotateClientSecret(
  clientId: string,
): Promise<CreatedClientResponse> {
  return apiClient
    .post<DataEnvelope<CreatedClientResponse>>(
      `/api/v1/clients/${clientId}/rotate-secret`,
    )
    .then((res) => res.data);
}
