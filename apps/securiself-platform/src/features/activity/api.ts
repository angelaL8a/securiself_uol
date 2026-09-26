import { apiClient, type DataEnvelope } from "@/lib/api-client";
import type { AuditLog } from "./types";

export function fetchAuditLogs(): Promise<AuditLog[]> {
  return apiClient
    .get<DataEnvelope<AuditLog[]>>("/api/v1/audit-logs")
    .then((res) => res.data);
}
