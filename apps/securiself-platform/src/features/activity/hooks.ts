"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { fetchAuditLogs } from "./api";

export function useAuditLogs() {
  return useQuery({
    queryKey: queryKeys.audit.list,
    queryFn: fetchAuditLogs,
  });
}
