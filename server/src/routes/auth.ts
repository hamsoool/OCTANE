import { Router, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import { sendVerificationCode, sendPasswordResetCode } from "../utils/email.js";
import { getRedis, reportRedisError } from "../utils/redis.js";
import { ipRateLimit } from "../middleware/rateLimit.js";
import { forgotPasswordRateLimit } from "../middleware/forgotRateLimit.js";
import { authenticateToken } from "../middleware/auth.js";
import type { AuthRequest } from "../middleware/auth.js";
import { recordAudit, AUDIT_ACTIONS } from "../utils/audit.js";

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
      recordAudit(req, {
        username: normalized,
        role: "unknown",
        action: AUDIT_ACTIONS.SIGNIN_FAILED,
        outcome: "failure",
      });
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
          recordAudit(req, {
            username: normalized,
            role: user.role,
            action: AUDIT_ACTIONS.ACCOUNT_LOCKED,
            outcome: "failure",
          });
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
            recordAudit(req, {
              username: normalized,
              role: user.role,
              action: AUDIT_ACTIONS.ACCOUNT_LOCKED,
              outcome: "failure",
            });
            res.status(429).json({
              message: `Account locked. Try again in ${formatDuration(LOCK_DURATION_SEC)}.`,
              locked: true,
              lockRemaining: LOCK_DURATION_SEC,
            });
            return;
          }
          const remaining = MAX_LOGIN_ATTEMPTS - attempts;
          recordAudit(req, {
            username: normalized,
            role: user.role,
            action: AUDIT_ACTIONS.SIGNIN_FAILED,
            outcome: "failure",
          });
          res.status(401).json({
            message: `Invalid credentials. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`,
            remaining,
          });
          return;
        } catch {
          // Redis unavailable — fall through to generic error
        }
      }

      recordAudit(req, {
        username: normalized,
        role: user.role,
        action: AUDIT_ACTIONS.SIGNIN_FAILED,
        outcome: "failure",
      });
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
      recordAudit(req, {
        username: user.username,
        role: user.role,
        action: AUDIT_ACTIONS.VERIFICATION_CODE_SENT,
        outcome: "success",
      });

      res.json({ needsVerification: true, userId: user.userId, email: user.email });
      return;
    }

    const token = jwt.sign(
      { id: user._id, userId: user.userId, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );
    setSessionCookie(res, token);
    recordAudit(req, {
      username: user.username,
      role: user.role,
      action: AUDIT_ACTIONS.SIGNED_IN,
      outcome: "success",
    });

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
    recordAudit(req, {
      username: user.username,
      role: user.role,
      action: AUDIT_ACTIONS.REGISTERED,
      outcome: "success",
    });

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
      recordAudit(req, {
        username: "unknown",
        role: "unknown",
        action: AUDIT_ACTIONS.VERIFY_FAILED,
        outcome: "failure",
      });
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
      recordAudit(req, {
        username: user.username,
        role: user.role,
        action: AUDIT_ACTIONS.VERIFY_FAILED,
        outcome: "failure",
      });
      res.status(401).json({ message: "Invalid verification code." });
      return;
    }

    user.verified = true;
    user.verificationCode = null;
    user.verificationExpires = null;
    await user.save();
    recordAudit(req, {
      username: user.username,
      role: user.role,
      action: AUDIT_ACTIONS.VERIFIED,
      outcome: "success",
    });

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
      email: user.email,
      cookiePreferences: user.cookiePreferences || null,
      firstName: user.firstName ?? null,
      middleName: user.middleName ?? null,
      lastName: user.lastName ?? null,
      fullName: user.fullName ?? null,
      birthday: user.birthday ?? null,
      phone: user.phone ?? null,
      address: user.address ?? null,
      addressCoords: user.addressCoords ?? null,
      addressLabel: user.addressLabel ?? null,
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
    recordAudit(req, {
      username: req.user!.username,
      role: req.user!.role,
      action: AUDIT_ACTIONS.COOKIE_CONSENT_UPDATED,
      outcome: "success",
      target: `functional=${prefs.functional} statistics=${prefs.statistics} marketing=${prefs.marketing}`,
    });
    res.json({ message: "Cookie preferences saved.", cookiePreferences: prefs });
  } catch {
    res.status(500).json({ message: "System error." });
  }
});

const MAX_NAME = 80;
const MAX_PHONE = 32;
const MAX_ADDRESS = 240;
const NOMINATIM_USER_AGENT = "octane-fuel-intelligence-client";

// Service area. Derived from the live station set (lat 14.81-15.80, lon
// 119.91-120.31) and padded so an address just outside the station points still
// resolves. Without this, "Tokyo" would become a user's origin and every station
// distance would be meaningless. Manila (lon ~120.98) is deliberately excluded.
const REGION_BOUNDS = { minLat: 14.5, maxLat: 16.2, minLon: 119.6, maxLon: 120.7 };

function isInServiceArea([lng, lat]: [number, number]): boolean {
  return (
    lat >= REGION_BOUNDS.minLat &&
    lat <= REGION_BOUNDS.maxLat &&
    lng >= REGION_BOUNDS.minLon &&
    lng <= REGION_BOUNDS.maxLon
  );
}

// PATCH /api/auth/profile — save name parts, birthday, phone and address.
// Email is deliberately absent: the account is identified by the address it
// registered with, so there is no email-change path at all.
router.patch("/profile", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { firstName, middleName, lastName, birthday, phone, address } = req.body ?? {};

    const current = await User.findById(req.user!.id).lean();
    if (!current) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    const clean = (v: unknown, max: number) => {
      if (v === undefined) return undefined;
      const s = String(v).trim().slice(0, max);
      return s || null;
    };

    const update: Record<string, unknown> = {};
    const f = clean(firstName, 60);
    const m = clean(middleName, 60);
    const l = clean(lastName, 60);
    if (f !== undefined) update.firstName = f;
    if (m !== undefined) update.middleName = m;
    if (l !== undefined) update.lastName = l;

    // fullName is kept as a convenience aggregate for the audit log and any
    // future surface that wants one string, rather than re-joining on read.
    if (f !== undefined || m !== undefined || l !== undefined) {
      const joined = [f ?? current.firstName, m ?? current.middleName, l ?? current.lastName]
        .filter(Boolean)
        .join(" ");
      update.fullName = joined || null;
    }

    if (phone !== undefined) {
      update.phone = clean(phone, MAX_PHONE);
    }
    if (birthday !== undefined) {
      if (birthday === null || birthday === "") {
        update.birthday = null;
      } else {
        const parsed = new Date(String(birthday));
        if (Number.isNaN(parsed.getTime())) {
          res.status(400).json({ message: "Birthday must be a valid date." });
          return;
        }
        if (parsed.getTime() > Date.now()) {
          res.status(400).json({ message: "Birthday cannot be in the future." });
          return;
        }
        update.birthday = parsed;
      }
    }
    if (address !== undefined) {
      const nextAddress = clean(address, MAX_ADDRESS);
      update.address = nextAddress;
      // Coordinates must be re-resolved whenever the address text changes,
      // otherwise a stale pin would silently point at the old address.
      if (nextAddress !== (current.address ?? null)) {
        update.addressCoords = null;
        update.addressLabel = null;
      }
    }

    if (Object.keys(update).length > 0) {
      await User.findByIdAndUpdate(req.user!.id, update);
    }

    recordAudit(req, {
      username: req.user!.username,
      role: req.user!.role,
      action: AUDIT_ACTIONS.PROFILE_UPDATED,
      outcome: "success",
      target: Object.keys(update).join(","),
    });

    const user = await User.findById(req.user!.id).lean();
    res.json({
      message: "Profile saved.",
      firstName: user?.firstName ?? null,
      middleName: user?.middleName ?? null,
      lastName: user?.lastName ?? null,
      fullName: user?.fullName ?? null,
      birthday: user?.birthday ?? null,
      phone: user?.phone ?? null,
      address: user?.address ?? null,
      addressCoords: user?.addressCoords ?? null,
      addressLabel: user?.addressLabel ?? null,
    });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ message: "System error." });
  }
});

// POST /api/auth/profile/geocode — resolve an address to coordinates.
// Runs server-side so the Nominatim User-Agent lives in one place, and so the
// client cannot post its own coordinates. Nominatim's public instance is
// rate-limited, so identical addresses reuse a short-lived Redis cache entry.
router.post("/profile/geocode", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { address } = req.body ?? {};
    const normalized = String(address ?? "").trim().slice(0, MAX_ADDRESS);
    if (!normalized) {
      res.status(400).json({ message: "Address is required." });
      return;
    }

    const redis = getRedis();
    const cacheKey = `geocode:addr:${Buffer.from(normalized.toLowerCase()).toString("base64url")}`;

    if (redis) {
      try {
        const cached = await redis.get<{ coords: [number, number]; label: string }>(cacheKey);
        if (cached) {
          res.json({ ...cached, cached: true });
          return;
        }
      } catch {
        // Cache is an optimisation only; fall through to a live lookup.
        reportRedisError("profile geocode cache", null);
      }
    }

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(normalized)}&format=json&limit=1&addressdetails=1`,
      { headers: { "User-Agent": NOMINATIM_USER_AGENT } }
    );
    if (!response.ok) {
      res.status(502).json({ message: "Address lookup unavailable. Try again shortly." });
      return;
    }

    const results = (await response.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    if (!results || results.length === 0) {
      res.status(404).json({ message: "Could not find that address." });
      return;
    }

    const hit = results[0];
    const coords: [number, number] = [parseFloat(hit.lon), parseFloat(hit.lat)];
    const label = hit.display_name;
    if (!Number.isFinite(coords[0]) || !Number.isFinite(coords[1])) {
      res.status(502).json({ message: "Address lookup returned an unusable result." });
      return;
    }

    // Out-of-region results are rejected rather than stored, so a stray address
    // cannot become an origin where no station coverage exists.
    if (!isInServiceArea(coords)) {
      res.status(422).json({
        message:
          "That address is outside the OCTANE service area (Zambales / Olongapo). " +
          "Distances to nearby stations would be meaningless.",
      });
      return;
    }

    const payload = { coords, label };
    if (redis) {
      try {
        await redis.set(cacheKey, payload, { ex: 60 * 60 * 24 * 7 });
      } catch {
        reportRedisError("profile geocode cache", null);
      }
    }

    // Persist the resolved point so the map can use it as the saved origin.
    await User.findByIdAndUpdate(req.user!.id, { addressCoords: coords, addressLabel: label });

    res.json({ ...payload, cached: false });
  } catch (err) {
    console.error("Profile geocode error:", err);
    res.status(500).json({ message: "Address lookup failed." });
  }
});

// POST /api/auth/profile/change-password — start a password change.
// Requires the CURRENT password, then emails a 6-digit code to the registered
// address. The code is stored in the dedicated resetCode/resetExpires fields
// (not verificationCode) so it can never collide with a signup verification or
// be replayed by one.
router.post("/profile/change-password", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword } = req.body ?? {};
    if (!currentPassword) {
      res.status(400).json({ message: "Current password is required." });
      return;
    }

    const user = await User.findById(req.user!.id);
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    if (!(await user.comparePassword(String(currentPassword)))) {
      recordAudit(req, {
        username: user.username,
        role: user.role,
        action: AUDIT_ACTIONS.PASSWORD_CHANGE_FAILED,
        outcome: "failure",
      });
      res.status(401).json({ message: "Current password is incorrect." });
      return;
    }

    const code = generateCode();
    user.resetCode = code;
    user.resetExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.lastResetSentAt = new Date();
    await user.save();
    sendPasswordResetCode({ to: user.email, username: user.username, code }).catch(console.error);

    res.json({ message: "A confirmation code has been sent to your email." });
  } catch (err) {
    console.error("Change-password request error:", err);
    res.status(500).json({ message: "System error." });
  }
});

// POST /api/auth/profile/confirm-password — finish a password change with the code.
router.post("/profile/confirm-password", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { code, newPassword, confirmPassword } = req.body ?? {};
    if (!code || !newPassword) {
      res.status(400).json({ message: "Code and new password are required." });
      return;
    }
    if (String(newPassword) !== String(confirmPassword)) {
      res.status(400).json({ message: "New passwords do not match." });
      return;
    }
    if (String(newPassword).length < 8) {
      res.status(400).json({ message: "Password must be at least 8 characters." });
      return;
    }

    const user = await User.findById(req.user!.id);
    if (!user || !user.resetCode || !user.resetExpires || user.resetExpires < new Date()) {
      res.status(400).json({ message: "Your confirmation code has expired. Please start again." });
      return;
    }

    if (!(await user.compareResetCode(String(code)))) {
      recordAudit(req, {
        username: user.username,
        role: user.role,
        action: AUDIT_ACTIONS.PASSWORD_CHANGE_FAILED,
        outcome: "failure",
      });
      res.status(401).json({ message: "Invalid confirmation code." });
      return;
    }

    user.password = String(newPassword);
    user.resetCode = null;
    user.resetExpires = null;
    await user.save();

    recordAudit(req, {
      username: user.username,
      role: user.role,
      action: AUDIT_ACTIONS.PASSWORD_CHANGED,
      outcome: "success",
    });

    res.json({ message: "Password updated." });
  } catch (err) {
    console.error("Confirm-password error:", err);
    res.status(500).json({ message: "System error." });
  }
});

// POST /api/auth/logout — clear session cookie
router.post("/logout", (req: Request, res: Response) => {
  // Unauthenticated on purpose (the cookie may already be gone), so identity is
  // read best-effort off the JWT purely to attribute the sign-out in the log.
  try {
    const token = req.cookies?.session;
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET) as { username: string; role: string };
      recordAudit(req, {
        username: decoded.username,
        role: decoded.role,
        action: AUDIT_ACTIONS.SIGNED_OUT,
        outcome: "success",
      });
    }
  } catch {
    // Expired or malformed token — nothing to attribute.
  }

  const isProduction = process.env.NODE_ENV === "production";
  res.clearCookie("session", {
    path: "/",
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
  });
  res.json({ message: "Logged out." });
});

// POST /api/auth/forgot-password
router.post("/forgot-password", forgotPasswordRateLimit, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: "Email is required." });
      return;
    }
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Don't leak whether the email exists
      res.json({ message: "If an account exists, a reset code has been sent." });
      return;
    }

    const code = generateCode();
    user.verificationCode = code;
    user.verificationExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.lastCodeSentAt = new Date();
    await user.save();
    sendPasswordResetCode({ to: user.email, username: user.username, code }).catch(console.error);
    recordAudit(req, {
      username: user.username,
      role: user.role,
      action: AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
      outcome: "success",
    });

    res.json({ message: "If an account exists, a reset code has been sent.", userId: user.userId });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "System error." });
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { userId, code, password } = req.body;
    if (!userId || !code || !password) {
      res.status(400).json({ message: "All fields are required." });
      return;
    }
    const user = await User.findOne({ userId });
    if (!user || !user.verificationCode || !user.verificationExpires || user.verificationExpires < new Date()) {
      res.status(400).json({ message: "Invalid or expired code." });
      return;
    }

    const isValid = await user.compareVerificationCode(code);
    if (!isValid) {
      res.status(401).json({ message: "Invalid verification code." });
      return;
    }

    user.password = password;
    user.verificationCode = null;
    user.verificationExpires = null;
    await user.save();
    recordAudit(req, {
      username: user.username,
      role: user.role,
      action: AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
      outcome: "success",
    });

    res.json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "System error." });
  }
});

export default router;
