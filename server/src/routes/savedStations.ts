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
    res.json(stations.map((s) => ({
      ...s,
      name: s.name.replace(/_/g, " "),
      brand: s.brand?.replace(/_/g, " "),
    })));
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

// GET /top — most-saved stations across all users (with avg diesel price)
router.get("/top", async (_req: AuthRequest, res: Response) => {
  try {
    const top = await SavedStation.aggregate([
      { $match: { "fuelData.diesel": { $exists: true, $nin: [null, ""] } } },
      {
        $group: {
          _id: "$stationId",
          name: { $first: "$name" },
          brand: { $first: "$brand" },
          userIds: { $addToSet: "$userId" },
          dieselPrices: { $push: { $toDouble: "$fuelData.diesel" } },
          coordinates: { $first: "$coordinates" },
        },
      },
      {
        $addFields: {
          userCount: { $size: "$userIds" },
          avgDiesel: { $round: [{ $avg: "$dieselPrices" }, 2] },
          name: { $replaceAll: { input: "$name", find: "_", replacement: " " } },
          brand: { $cond: { if: { $ne: ["$brand", undefined] }, then: { $replaceAll: { input: "$brand", find: "_", replacement: " " } }, else: "$brand" } },
        },
      },
      { $match: { avgDiesel: { $ne: null } } },
      { $sort: { userCount: -1 } },
      { $limit: 4 },
      {
        $project: {
          _id: 0,
          stationId: "$_id",
          name: 1,
          brand: 1,
          userCount: 1,
          avgDiesel: 1,
          coordinates: 1,
        },
      },
    ]);
    res.json(top);
  } catch (err) {
    console.error("Error fetching top saved stations:", err);
    res.status(500).json({ message: "Failed to fetch top saved stations." });
  }
});

export default router;
