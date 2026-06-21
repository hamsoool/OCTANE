import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.js";

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI ?? "";

if (!MONGODB_URI) {
  console.error("MONGODB_URI environment variable is not set.");
  console.error("Copy server/.env.example to server/.env and fill in your MongoDB Atlas connection string.");
  process.exit(1);
}

// Middleware
const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:3000", "http://127.0.0.1:3000"];
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "online", timestamp: new Date().toISOString() });
});

// Connect to MongoDB and start server
async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB Atlas");

    app.listen(PORT, () => {
      console.log(`OCTANE server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1);
  }
}

start();
