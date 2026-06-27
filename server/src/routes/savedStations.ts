import { Router, type Response } from "express";
import { authenticateToken, type AuthRequest } from "../middleware/auth.js";
import SavedStation from "../models/SavedStation.js";

const router = Router();

router.use(authenticateToken);

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const stations = await SavedStation.find({ userId: req.user!.id })
      .sort({ savedAt: -1 })
      .lean();
    res.json(stations);
  } catch (err) {
    console.error("Error fetching saved stations:", err);
    res.status(500).json({ message: "Failed to fetch saved stations." });
  }
});

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { stationId, name, brand, coordinates, preferredGrade, price, priceGrade, fuelData } = req.body;

    if (!stationId || !name || !coordinates) {
      res.status(400).json({ message: "stationId, name, and coordinates are required." });
      return;
    }

    const existing = await SavedStation.findOne({ userId: req.user!.id, stationId });
    if (existing) {
      res.status(409).json({ message: "Station already saved." });
      return;
    }

    const saved = await SavedStation.create({
      userId: req.user!.id,
      stationId,
      name,
      brand,
      coordinates,
      preferredGrade,
      price,
      priceGrade,
      fuelData,
    });

    res.status(201).json(saved);
  } catch (err) {
    console.error("Error saving station:", err);
    res.status(500).json({ message: "Failed to save station." });
  }
});

router.delete("/:stationId", async (req: AuthRequest, res: Response) => {
  try {
    const result = await SavedStation.findOneAndDelete({
      userId: req.user!.id,
      stationId: req.params.stationId,
    });

    if (!result) {
      res.status(404).json({ message: "Saved station not found." });
      return;
    }

    res.json({ message: "Station removed from saved." });
  } catch (err) {
    console.error("Error removing saved station:", err);
    res.status(500).json({ message: "Failed to remove saved station." });
  }
});

export default router;
