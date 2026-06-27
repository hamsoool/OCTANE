import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.js";
import stationsRoutes from "./routes/stations.js";
import savedStationsRoutes from "./routes/savedStations.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI ?? "";

if (!MONGODB_URI) {
  console.error("MONGODB_URI environment variable is not set.");
  console.error("Copy server/.env.example to server/.env and fill in your MongoDB Atlas connection string.");
  process.exit(1);
}

app.set("trust proxy", true);

// Middleware
const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:3000", "http://127.0.0.1:3000"];
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Routes
if (process.env.NODE_ENV !== "production") {
  app.get("/", (_req, res) => {
    res.redirect("/api/health");
  });
}
app.use("/api/auth", authRoutes);
app.use("/api/stations", stationsRoutes);
app.use("/api/saved-stations", savedStationsRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "online", timestamp: new Date().toISOString() });
});

// Serve built frontend in production
if (process.env.NODE_ENV === "production") {
  const clientDist = path.resolve(__dirname, "../../dist");
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
  console.log(`Serving frontend from ${clientDist}`);
}

// Connect to MongoDB and start server
async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB Atlas");
    await mongoose.connection.syncIndexes();
    console.log("Indexes synced");

    app.listen(PORT, () => {
      console.log(`OCTANE server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1);
  }
}

start();
