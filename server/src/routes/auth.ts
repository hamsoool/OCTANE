import { Router, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";

// POST /api/auth/signin
router.post("/signin", async (req: Request, res: Response) => {
  try {
    const { operatorId, password } = req.body;

    if (!operatorId || !password) {
      res.status(400).json({ message: "Operator ID and Access Key are required." });
      return;
    }

    const user = await User.findOne({ operatorId: operatorId.toUpperCase().trim() });
    if (!user) {
      res.status(401).json({ message: "Invalid credentials." });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ message: "Invalid credentials." });
      return;
    }

    const token = jwt.sign(
      { id: user._id, userId: user.userId, operatorId: user.operatorId, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      message: "Authorization granted.",
      token,
      userId: user.userId,
      operatorId: user.operatorId,
      role: user.role,
    });
  } catch (error) {
    console.error("Sign-in error:", error);
    res.status(500).json({ message: "System error. Please try again." });
  }
});

// POST /api/auth/register (for initial setup only)
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { operatorId, password } = req.body;

    if (!operatorId || !password) {
      res.status(400).json({ message: "Operator ID and Access Key are required." });
      return;
    }

    const existingUser = await User.findOne({ operatorId: operatorId.toUpperCase().trim() });
    if (existingUser) {
      res.status(409).json({ message: "Operator ID already exists." });
      return;
    }

    const userId = "USR-" + crypto.randomBytes(4).toString("hex").toUpperCase();
    const userCount = await User.countDocuments();
    const role = userCount === 0 ? "admin" : "regular";

    const user = new User({
      userId,
      operatorId: operatorId.toUpperCase().trim(),
      password,
      role,
    });

    await user.save();

    const token = jwt.sign(
      { id: user._id, userId: user.userId, operatorId: user.operatorId, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(201).json({
      message: "Operator registered.",
      token,
      userId: user.userId,
      operatorId: user.operatorId,
      role: user.role,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "System error. Please try again." });
  }
});

export default router;
