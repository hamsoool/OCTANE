import { Router, type Response } from "express";
import { authenticateToken, type AuthRequest } from "../middleware/auth.js";
import AuditLog from "../models/AuditLog.js";
import { recordAudit, AUDIT_ACTIONS } from "../utils/audit.js";

const router = Router();

router.use(authenticateToken);

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "admin") {
      res.status(403).json({ message: "Administrator access required." });
      return;
    }

    const rawPage = parseInt(String(req.query.page ?? "1"), 10);
    const rawLimit = parseInt(String(req.query.limit ?? DEFAULT_LIMIT), 10);
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : DEFAULT_LIMIT;

    const query: Record<string, unknown> = {};
    if (req.query.action) query.action = String(req.query.action);
    if (req.query.username) query.username = String(req.query.username).toUpperCase().trim();

    const [entries, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    // Only the unfiltered first page counts as "viewing" the log. Writing a row
    // for every page/filter read would grow the log every time an admin reads it.
    if (page === 1 && !req.query.action && !req.query.username) {
      recordAudit(req, {
        username: req.user!.username,
        role: req.user!.role,
        action: AUDIT_ACTIONS.AUDIT_LOG_VIEWED,
        outcome: "success",
      });
    }

    res.json({
      entries,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    console.error("Error fetching audit log:", err);
    res.status(500).json({ message: "Failed to fetch audit log." });
  }
});

export default router;
