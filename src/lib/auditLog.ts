/**
 * Admin action audit logging for accountability and compliance
 * Tracks all admin modifications with timestamp, IP, and details
 */

import { prisma } from "./db";

export interface AuditLogEntry {
  adminEmail: string;
  action: string; // "create_order", "delete_order", "add_product", etc.
  resourceId?: string;
  resourceType?: string;
  details?: Record<string, any>;
  ipAddress?: string;
}

/**
 * Log an admin action to the audit trail
 */
export async function logAdminAction(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        adminEmail: entry.adminEmail,
        action: entry.action,
        resourceId: entry.resourceId,
        resourceType: entry.resourceType,
        details: entry.details ? JSON.stringify(entry.details) : null,
        ipAddress: entry.ipAddress,
      },
    });
  } catch (error) {
    // Don't fail the operation if audit logging fails, but log the error
    console.error(
      `[ERROR] Failed to log admin action ${entry.action}:`,
      error
    );
  }
}

/**
 * Get audit logs for a specific admin
 */
export async function getAuditLogs(
  adminEmail?: string,
  action?: string,
  limit: number = 100
) {
  try {
    return await prisma.auditLog.findMany({
      where: {
        ...(adminEmail && { adminEmail }),
        ...(action && { action }),
      },
      orderBy: { timestamp: "desc" },
      take: limit,
    });
  } catch (error) {
    console.error("[ERROR] Failed to retrieve audit logs:", error);
    return [];
  }
}

/**
 * Get audit logs for a specific resource (e.g., order deletion history)
 */
export async function getResourceAuditLog(
  resourceId: string,
  resourceType?: string,
  limit: number = 50
) {
  try {
    return await prisma.auditLog.findMany({
      where: {
        resourceId,
        ...(resourceType && { resourceType }),
      },
      orderBy: { timestamp: "desc" },
      take: limit,
    });
  } catch (error) {
    console.error("[ERROR] Failed to retrieve resource audit logs:", error);
    return [];
  }
}
