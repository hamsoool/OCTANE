import mongoose, { Schema, type Document } from "mongoose";

// Durable copy of the Overpass station list. Station geography changes rarely,
// but the live Overpass API throttles datacenter IPs and Render wipes
// in-memory state on every sleep/redeploy — without this, cold starts
// frequently serve an empty map.
export interface ICachedStation extends Document {
  stationId: string; // OSM id, unique
  name: string;
  brand?: string;
  coordinates: [number, number];
  refreshedAt: Date;
}

const cachedStationSchema = new Schema<ICachedStation>({
  stationId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  brand: { type: String },
  coordinates: { type: [Number], required: true },
  refreshedAt: { type: Date, default: Date.now },
});

export default mongoose.model<ICachedStation>("CachedStation", cachedStationSchema);
