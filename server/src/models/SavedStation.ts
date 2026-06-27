import mongoose, { Schema, type Document } from "mongoose";

export interface ISavedStation extends Document {
  userId: mongoose.Types.ObjectId;
  stationId: string;
  name: string;
  brand?: string;
  coordinates: [number, number];
  preferredGrade?: string;
  price: string;
  priceGrade?: string;
  fuelData?: {
    diesel?: string;
    ron91?: string;
    ron95?: string;
    ron97?: string;
  };
  savedAt: Date;
}

const savedStationSchema = new Schema<ISavedStation>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  stationId: { type: String, required: true },
  name: { type: String, required: true },
  brand: { type: String },
  coordinates: { type: [Number], required: true },
  preferredGrade: { type: String },
  price: { type: String, required: true },
  priceGrade: { type: String },
  fuelData: {
    type: Schema.Types.Mixed,
    default: {},
  },
  savedAt: { type: Date, default: Date.now },
});

savedStationSchema.index({ userId: 1, stationId: 1 }, { unique: true });

export default mongoose.model<ISavedStation>("SavedStation", savedStationSchema);
