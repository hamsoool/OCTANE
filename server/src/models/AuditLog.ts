import mongoose, { Schema, type Document } from "mongoose";

/**
 * Append-only record of operator activity, surfaced in the admin console.
 * `username` is stored denormalized (plaintext) rather than as a User ref so
 * the log survives account deletion and needs no join to render.
 */
export interface IAuditLog extends Document {
  username: string;
  role: string;
  action: string;
  outcome: "success" | "failure";
  target?: string;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
  username: { type: String, required: true },
  role: { type: String, required: true },
  action: { type: String, required: true },
  outcome: { type: String, required: true, enum: ["success", "failure"] },
  target: { type: String },
  ip: { type: String },
  userAgent: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// Serves the admin log query: filtered by action/username, newest first.
auditLogSchema.index({ action: 1, username: 1, createdAt: -1 });
// TTL index: rows are purged by MongoDB's background monitor ~60 days after
// createdAt, so the log cannot grow unbounded. A single-key index also serves
// the newest-first sort, so no separate createdAt index is needed.
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });

export default mongoose.model<IAuditLog>("AuditLog", auditLogSchema);
