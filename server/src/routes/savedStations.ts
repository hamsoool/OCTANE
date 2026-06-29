import { Router, type Response } from "express";
import { authenticateToken, type AuthRequest } from "../middleware/auth.js";
import SavedStation from "../models/SavedStation.js";
import { getFuelPrices, calculateStationPrices } from "../utils/fuelPrices.js";

const router = Router();

router.use(authenticateToken);

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const stations = await SavedStation.find({ userId: req.user!.id })
      .sort({ savedAt: -1 })
      .lean();

    const {
      pumpPrices,
      adjustments,
      priorPumpPricesWeek,
      priorAdjustmentsWeek,
      priorPumpPricesMonth,
      priorAdjustmentsMonth
    } = await getFuelPrices();

    const enriched = stations.map((s) => {
      const currentPrices = calculateStationPrices(
        s.brand || s.name || "",
        s.coordinates[1],
        pumpPrices,
        adjustments,
        parseInt(s.stationId, 10) || 0
      );

      const priorPricesWeek = calculateStationPrices(
        s.brand || s.name || "",
        s.coordinates[1],
        priorPumpPricesWeek || pumpPrices,
        priorAdjustmentsWeek || adjustments,
        parseInt(s.stationId, 10) || 0
      );

      const priorPricesMonth = calculateStationPrices(
        s.brand || s.name || "",
        s.coordinates[1],
        priorPumpPricesMonth || pumpPrices,
        priorAdjustmentsMonth || adjustments,
        parseInt(s.stationId, 10) || 0
      );

      const preferredGrade = (s.preferredGrade || "ron91") as "ron91" | "ron95" | "ron97" | "diesel";
      const primaryPrice = currentPrices[preferredGrade] || s.price;

      return {
        ...s,
        name: s.name.replace(/_/g, " "),
        brand: s.brand?.replace(/_/g, " "),
        price: primaryPrice,
        fuelData: {
          diesel: currentPrices.diesel || s.fuelData?.diesel,
          ron91: currentPrices.ron91 || s.fuelData?.ron91,
          ron95: currentPrices.ron95 || s.fuelData?.ron95,
          ron97: currentPrices.ron97 || s.fuelData?.ron97,
        },
        priorFuelDataWeek: {
          diesel: priorPricesWeek.diesel || s.fuelData?.diesel,
          ron91: priorPricesWeek.ron91 || s.fuelData?.ron91,
          ron95: priorPricesWeek.ron95 || s.fuelData?.ron95,
          ron97: priorPricesWeek.ron97 || s.fuelData?.ron97,
        },
        priorFuelDataMonth: {
          diesel: priorPricesMonth.diesel || s.fuelData?.diesel,
          ron91: priorPricesMonth.ron91 || s.fuelData?.ron91,
          ron95: priorPricesMonth.ron95 || s.fuelData?.ron95,
          ron97: priorPricesMonth.ron97 || s.fuelData?.ron97,
        }
      };
    });

    res.json(enriched);
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

    const { pumpPrices, adjustments, priorPumpPricesWeek, priorAdjustmentsWeek } = await getFuelPrices();

    const enrichedTop = top.map((s: any) => {
      const currentPrices = calculateStationPrices(
        s.brand || s.name || "",
        s.coordinates[1],
        pumpPrices,
        adjustments,
        parseInt(s.stationId, 10) || 0
      );

      const priorPrices = calculateStationPrices(
        s.brand || s.name || "",
        s.coordinates[1],
        priorPumpPricesWeek || pumpPrices,
        priorAdjustmentsWeek || adjustments,
        parseInt(s.stationId, 10) || 0
      );

      const curDiesel = currentPrices.diesel ? parseFloat(currentPrices.diesel) : s.avgDiesel;
      const priDiesel = priorPrices.diesel ? parseFloat(priorPrices.diesel) : curDiesel;

      const diff = curDiesel - priDiesel;
      const pct = priDiesel > 0 ? (diff / priDiesel) * 100 : 0;

      return {
        ...s,
        avgDiesel: curDiesel,
        priorDiesel: priDiesel,
        pct: Math.abs(pct).toFixed(2),
        direction: diff > 0.005 ? "up" : diff < -0.005 ? "down" : "stable"
      };
    });

    res.json(enrichedTop);
  } catch (err) {
    console.error("Error fetching top saved stations:", err);
    res.status(500).json({ message: "Failed to fetch top saved stations." });
  }
});

export default router;
