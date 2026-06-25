import { Router, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import { sendVerificationCode } from "../utils/email.js";
import { getRedis } from "../utils/redis.js";
import { ipRateLimit } from "../middleware/rateLimit.js";
import { authenticateToken } from "../middleware/auth.js";
import type { AuthRequest } from "../middleware/auth.js";

const router = Router();

router.use(ipRateLimit);

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";
const CODE_COOLDOWN_MS = 5 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const LOCK_DURATION_SEC = LOCK_DURATION_MS / 1000;

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getRateLimitRemaining(user: { lastCodeSentAt: Date | null }): number | null {
  if (!user.lastCodeSentAt) return null;
  const elapsed = Date.now() - user.lastCodeSentAt.getTime();
  if (elapsed >= CODE_COOLDOWN_MS) return null;
  return Math.ceil((CODE_COOLDOWN_MS - elapsed) / 1000);
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function setSessionCookie(res: Response, token: string): void {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie("session", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 24 * 60 * 60 * 1000,
    path: "/",
  });
}

// POST /api/auth/signin
router.post("/signin", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ message: "Username and password are required." });
      return;
    }

    const normalized = username.toUpperCase().trim();
    const user = await User.findOne({ username: normalized });
    if (!user) {
      res.status(401).json({ message: "Invalid credentials." });
      return;
    }

    let redis: Awaited<ReturnType<typeof getRedis>> | null = null;
    try {
      redis = getRedis();
    } catch {
      redis = null;
    }
    const lockKey = `login:locked:${normalized}`;
    const attemptKey = `login:attempts:${normalized}`;

    if (redis) {
      try {
        const locked = await redis.get(lockKey);
        if (locked) {
          const ttl = await redis.ttl(lockKey);
          res.status(429).json({
            message: `Account locked. Try again in ${formatDuration(ttl > 0 ? ttl : LOCK_DURATION_SEC)}.`,
            locked: true,
            lockRemaining: ttl > 0 ? ttl : LOCK_DURATION_SEC,
          });
          return;
        }
      } catch {
        redis = null;
      }
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      if (redis) {
        try {
          const attempts = await redis.incr(attemptKey);
          if (attempts === 1) {
            await redis.expire(attemptKey, LOCK_DURATION_SEC);
          }
          if (attempts >= MAX_LOGIN_ATTEMPTS) {
            await redis.setex(lockKey, LOCK_DURATION_SEC, "1");
            await redis.del(attemptKey);
            res.status(429).json({
              message: `Account locked. Try again in ${formatDuration(LOCK_DURATION_SEC)}.`,
              locked: true,
              lockRemaining: LOCK_DURATION_SEC,
            });
            return;
          }
          const remaining = MAX_LOGIN_ATTEMPTS - attempts;
          res.status(401).json({
            message: `Invalid credentials. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`,
            remaining,
          });
          return;
        } catch {
          // Redis unavailable — fall through to generic error
        }
      }

      res.status(401).json({ message: "Invalid credentials." });
      return;
    }

    if (redis) {
      try {
        await redis.del(lockKey, attemptKey);
      } catch {
        // ignore
      }
    }

    if (!user.verified) {
      const remaining = getRateLimitRemaining(user);
      if (remaining !== null) {
        res.status(429).json({ message: `Please wait ${remaining} seconds before requesting a new code.` });
        return;
      }

      const code = generateCode();
      user.verificationCode = code;
      user.verificationExpires = new Date(Date.now() + 10 * 60 * 1000);
      user.lastCodeSentAt = new Date();
      await user.save();
      sendVerificationCode({ to: user.email, username: user.username, code }).catch(console.error);

      res.json({ needsVerification: true, userId: user.userId, email: user.email });
      return;
    }

    const token = jwt.sign(
      { id: user._id, userId: user.userId, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );
    setSessionCookie(res, token);

    res.json({
      message: "Authorization granted.",
      token,
      userId: user.userId,
      username: user.username,
      role: user.role,
      cookiePreferences: user.cookiePreferences || null,
    });
  } catch (error) {
    console.error("Sign-in error:", error);
    res.status(500).json({ message: "System error. Please try again." });
  }
});

// POST /api/auth/register
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ message: "Username, email address, and password are required." });
      return;
    }

    const existingUser = await User.findOne({
      $or: [
        { username: username.toUpperCase().trim() },
        { email: email.toLowerCase().trim() },
      ],
    });
    if (existingUser) {
      const field = existingUser.username === username.toUpperCase().trim() ? "Username" : "Email";
      res.status(409).json({ message: field + " already exists." });
      return;
    }

    const userId = "USR-" + crypto.randomBytes(4).toString("hex").toUpperCase();
    const userCount = await User.countDocuments();
    const role = userCount === 0 ? "admin" : "regular";
    const code = generateCode();

    const user = new User({
      userId,
      username: username.toUpperCase().trim(),
      email: email.toLowerCase().trim(),
      password,
      role,
      verificationCode: code,
      verificationExpires: new Date(Date.now() + 10 * 60 * 1000),
      lastCodeSentAt: new Date(),
    });

    await user.save();
    sendVerificationCode({ to: user.email, username: user.username, code }).catch(console.error);

    res.status(201).json({
      message: "Operator registered. Check your email for the verification code.",
      needsVerification: true,
      userId: user.userId,
      email: user.email,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "System error. Please try again." });
  }
});

// POST /api/auth/verify
router.post("/verify", async (req: Request, res: Response) => {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      res.status(400).json({ message: "User ID and verification code are required." });
      return;
    }

    const user = await User.findOne({ userId });
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    if (user.verified) {
      res.status(400).json({ message: "Already verified." });
      return;
    }

    if (!user.verificationExpires || user.verificationExpires < new Date()) {
      res.status(400).json({ message: "Verification code has expired. Please sign in again to request a new one." });
      return;
    }

    const isValid = await user.compareVerificationCode(code);
    if (!isValid) {
      res.status(401).json({ message: "Invalid verification code." });
      return;
    }

    user.verified = true;
    user.verificationCode = null;
    user.verificationExpires = null;
    await user.save();

    const token = jwt.sign(
      { id: user._id, userId: user.userId, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );
    setSessionCookie(res, token);

    res.json({
      message: "Verification successful.",
      token,
      userId: user.userId,
      username: user.username,
      role: user.role,
      cookiePreferences: user.cookiePreferences || null,
    });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ message: "System error. Please try again." });
  }
});

// GET /api/auth/me — return current user from cookie session
router.get("/me", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!.id).lean();
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }
    res.json({
      userId: user.userId,
      username: user.username,
      role: user.role,
      cookiePreferences: user.cookiePreferences || null,
    });
  } catch {
    res.status(500).json({ message: "System error." });
  }
});

// PATCH /api/auth/cookie-preferences — save cookie preferences
router.patch("/cookie-preferences", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { functional, statistics, marketing } = req.body;
    const prefs = { functional: !!functional, statistics: !!statistics, marketing: !!marketing };
    await User.findByIdAndUpdate(req.user!.id, { cookiePreferences: prefs });
    res.json({ message: "Cookie preferences saved.", cookiePreferences: prefs });
  } catch {
    res.status(500).json({ message: "System error." });
  }
});

// POST /api/auth/logout — clear session cookie
router.post("/logout", (_req: Request, res: Response) => {
  const isProduction = process.env.NODE_ENV === "production";
  res.clearCookie("session", {
    path: "/",
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
  });
  res.json({ message: "Logged out." });
});

export default router;
