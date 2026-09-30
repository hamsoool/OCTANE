import type { Request, Response, NextFunction } from "express";
import { getRedis, reportRedisError } from "../utils/redis";

// Window for tracking distinct emails per IP (in seconds)
const IP_ATTEMPT_WINDOW_SEC = 300; // 5 minutes
// Block duration for IP after too many distinct email attempts (in seconds)
const IP_BLOCK_DURATION_SEC = 1800; // 30 minutes
// Maximum distinct emails allowed per IP in the window before blocking
const IP_MAX_DISTINCT_EMAILS = 5;
// Window for per-email rate limit (in seconds)
const EMAIL_WINDOW_SEC = 300; // 5 minutes
// Maximum forgot password requests allowed per email in the window
const EMAIL_MAX_REQUESTS = 1;

export async function forgotPasswordRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) {
      // If Redis is not available, skip rate limiting (fail open)
      next();
      return;
    }

    const { email } = req.body;
    if (!email || typeof email !== "string") {
      // Let the controller handle validation errors
      next();
      return;
    }

    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const normalizedEmail = email.toLowerCase().trim();

    // --- 1. Per-email rate limit ---
    const emailKey = `forgot:email:${normalizedEmail}`;
    const emailCount = await redis.incr(emailKey);
    if (emailCount === 1) {
      await redis.expire(emailKey, EMAIL_WINDOW_SEC);
    }
    if (emailCount > EMAIL_MAX_REQUESTS) {
      res.status(429).json({
        message: "Too many forgot password requests for this email. Please wait 5 minutes.",
      });
      return;
    }

    // --- 2. Check if IP is currently blocked due to too many distinct email attempts ---
    const ipBlockedKey = `forgot:ip:${ip}:blocked`;
    const isBlocked = await redis.exists(ipBlockedKey);
    if (isBlocked) {
      res.status(429).json({
        message: "Too many forgot password attempts from this IP. Please wait 30 minutes.",
      });
      return;
    }

    // --- 3. Track distinct emails per IP for blocking logic ---
    const ipAttemptKey = `forgot:ip:${ip}:attempts`;
    // Add email to the set of attempted emails for this IP
    await redis.sadd(ipAttemptKey, normalizedEmail);
    // Refresh the window on every attempt. SADD is idempotent for an existing
    // member, so this keeps the TTL sliding without a separate existence check.
    await redis.expire(ipAttemptKey, IP_ATTEMPT_WINDOW_SEC);

    // Get the current count of distinct emails in the set
    const distinctCount = await redis.scard(ipAttemptKey);
    if (distinctCount >= IP_MAX_DISTINCT_EMAILS) {
      // Block the IP for the specified duration
      await redis.set(ipBlockedKey, "1", { ex: IP_BLOCK_DURATION_SEC });
      // Optionally, we could clear the attempt key here to start fresh after block, but not required.
      res.status(429).json({
        message: "Too many forgot password attempts from this IP. Please wait 30 minutes.",
      });
      return;
    }

    // If all checks pass, proceed to the controller
    next();
  } catch (err) {
    reportRedisError("forgot password rate limiter", err);
    // Fail open: if Redis fails, we allow the request to proceed (to avoid blocking legitimate users)
    next();
  }
}