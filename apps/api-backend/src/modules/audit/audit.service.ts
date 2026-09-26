import { type AuditAction, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

export interface RecordAuditInput {
  userId: string;
  action: AuditAction;
  applicationId?: string | null;
  contextId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export function recordAudit(input: RecordAuditInput) {
  return prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      applicationId: input.applicationId ?? null,
      contextId: input.contextId ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      metadata: input.metadata ?? Prisma.JsonNull,
    },
  });
}

export function listAuditLogs(userId: string) {
  return prisma.auditLog.findMany({
    where: { userId },
    orderBy: { timestamp: "desc" },
  });
}
