import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";

export interface AuthRequest extends Request {
  user?: { id: string; operatorId: string };
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: "Access token required." });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; operatorId: string };
    req.user = decoded;
    next();
  } catch {
    res.status(403).json({ message: "Invalid or expired token." });
  }
};
