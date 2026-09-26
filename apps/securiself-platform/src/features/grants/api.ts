import { apiClient, type DataEnvelope } from "@/lib/api-client";
import type { Grant } from "./types";

export function fetchGrants(): Promise<Grant[]> {
  return apiClient
    .get<DataEnvelope<Grant[]>>("/api/v1/grants")
    .then((res) => res.data);
}

export function revokeGrant(grantId: string): Promise<void> {
  return apiClient
    .post<{ status: "success"; message: string }>(
      `/api/v1/grants/${grantId}/revoke`,
    )
    .then(() => undefined);
}
