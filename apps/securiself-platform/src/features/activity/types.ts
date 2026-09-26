export type AuditAction =
  | "ACCESS_GRANTED"
  | "PROFILE_READ"
  | "ACCESS_REVOKED"
  | "BLOCKED_ANOMALY"
  | "TOKEN_EXCHANGE_FAILED";

/** An audit log entry as returned by the backend. */
export interface AuditLog {
  id: string;
  userId: string;
  applicationId: string | null;
  contextId: string | null;
  action: AuditAction;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  timestamp: string;
}
