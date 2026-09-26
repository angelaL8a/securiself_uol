import {
  CircleCheck,
  CircleSlash,
  Eye,
  ShieldAlert,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { AuditAction } from "@/features/activity/types";
import { StatusBadge, type StatusTone } from "./status-badge";

interface ActionMeta {
  label: string;
  tone: StatusTone;
  icon: LucideIcon;
}

const ACTION_META: Record<AuditAction, ActionMeta> = {
  ACCESS_GRANTED: { label: "Access granted", tone: "success", icon: CircleCheck },
  PROFILE_READ: { label: "Profile read", tone: "info", icon: Eye },
  ACCESS_REVOKED: { label: "Access revoked", tone: "neutral", icon: CircleSlash },
  BLOCKED_ANOMALY: { label: "Blocked anomaly", tone: "danger", icon: ShieldAlert },
  TOKEN_EXCHANGE_FAILED: {
    label: "Token exchange failed",
    tone: "warning",
    icon: XCircle,
  },
};

interface AuditActionBadgeProps {
  action: AuditAction;
  className?: string;
}

export function AuditActionBadge({ action, className }: AuditActionBadgeProps) {
  const meta = ACTION_META[action] ?? {
    label: action,
    tone: "neutral" as StatusTone,
    icon: CircleSlash,
  };
  return (
    <StatusBadge tone={meta.tone} icon={meta.icon} className={className}>
      {meta.label}
    </StatusBadge>
  );
}

export const AUDIT_ACTIONS: AuditAction[] = [
  "ACCESS_GRANTED",
  "PROFILE_READ",
  "ACCESS_REVOKED",
  "BLOCKED_ANOMALY",
  "TOKEN_EXCHANGE_FAILED",
];
