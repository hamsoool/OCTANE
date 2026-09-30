import type { Request } from "express";
import AuditLog from "../models/AuditLog.js";

export type AuditOutcome = "success" | "failure";

export interface AuditEntry {
  username: string;
  role: string;
  action: string;
  outcome: AuditOutcome;
  target?: string;
  ip?: string;
  userAgent?: string;
}

/**
 * Fire-and-forget audit write. Never awaits, never throws: a failed log write
 * must not break or delay the request it is recording. Callers pass username and
 * role explicitly (rather than reading req.user) so events that happen before an
 * identity is known — a failed sign-in, a lockout — can still be recorded.
 */
export function recordAudit(req: Request, entry: AuditEntry): void {
  try {
    AuditLog.create({
      ...entry,
      ip: entry.ip ?? req.ip,
      userAgent: entry.userAgent ?? req.get("user-agent")?.slice(0, 200),
    }).catch((err) => {
      console.error("[audit] write failed:", err instanceof Error ? err.message : err);
    });
  } catch (err) {
    console.error("[audit] write threw:", err instanceof Error ? err.message : err);
  }
}

/** Action names, kept in one place so the log and its UI filters stay in sync. */
export const AUDIT_ACTIONS = {
  REGISTERED: "REGISTERED",
  SIGNIN_FAILED: "SIGNIN_FAILED",
  ACCOUNT_LOCKED: "ACCOUNT_LOCKED",
  VERIFICATION_CODE_SENT: "VERIFICATION_CODE_SENT",
  SIGNED_IN: "SIGNED_IN",
  VERIFIED: "VERIFIED",
  VERIFY_FAILED: "VERIFY_FAILED",
  SIGNED_OUT: "SIGNED_OUT",
  PASSWORD_RESET_REQUESTED: "PASSWORD_RESET_REQUESTED",
  PASSWORD_RESET_COMPLETED: "PASSWORD_RESET_COMPLETED",
  PASSWORD_CHANGED: "PASSWORD_CHANGED",
  PASSWORD_CHANGE_FAILED: "PASSWORD_CHANGE_FAILED",
  COOKIE_CONSENT_UPDATED: "COOKIE_CONSENT_UPDATED",
  STATION_SAVED: "STATION_SAVED",
  STATION_REMOVED: "STATION_REMOVED",
  PROFILE_UPDATED: "PROFILE_UPDATED",
  AUDIT_LOG_VIEWED: "AUDIT_LOG_VIEWED",
} as const;
