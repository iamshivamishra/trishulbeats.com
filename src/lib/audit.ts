import { logger } from "./logger";

export type AuditAction =
  | "user.signup"
  | "user.login"
  | "user.role_change"
  | "beat.create"
  | "beat.update"
  | "beat.delete"
  | "beat.publish"
  | "beat.unpublish"
  | "license.create"
  | "license.update"
  | "license.delete"
  | "payment.order_created"
  | "payment.signature_invalid"
  | "payment.verified"
  | "payment.failed"
  | "payment.upgrade_order_created"
  | "download.links_generated"
  | "download.signed_url"
  | "upload.presign"
  | "cart.checkout"
  | "webhook.payment_captured"
  | "webhook.payment_failed"
  | "admin.action";

interface AuditEntry {
  action: AuditAction;
  userId?: string;
  resourceType?: string;
  resourceId?: string;
  ip?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Structured audit logger for security-sensitive actions.
 *
 * Currently writes to stdout in structured JSON format.
 * In production, these logs can be ingested by a log aggregation
 * service (Datadog, CloudWatch, Loki, etc.) for monitoring and alerting.
 */
export function audit(entry: AuditEntry): void {
  const record = {
    type: "AUDIT",
    timestamp: new Date().toISOString(),
    ...entry,
  };

  logger.info(`AUDIT: ${entry.action}`, record);
}
