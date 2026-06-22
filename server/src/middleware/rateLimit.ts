import type { Request, Response, NextFunction } from "express";
import { getRedis } from "../utils/redis.js";

const IP_WINDOW_SEC = 300;
const IP_MAX_REQUESTS = 10;

export async function ipRateLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    next();
    return;
  }

  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const key = `ratelimit:ip:${ip}`;

  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, IP_WINDOW_SEC);
  }

  const remaining = Math.max(0, IP_MAX_REQUESTS - count);
  res.setHeader("X-RateLimit-Limit", String(IP_MAX_REQUESTS));
  res.setHeader("X-RateLimit-Remaining", String(remaining));

  if (count > IP_MAX_REQUESTS) {
    res.status(429).json({ message: "Too many requests. Try again later." });
    return;
  }

  next();
}
