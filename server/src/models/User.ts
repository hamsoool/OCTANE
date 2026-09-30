import mongoose, { Schema, type Document } from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { encrypt, decrypt } from "../utils/cipher.js";

export interface IUser extends Document {
  userId: string;
  username: string;
  email: string;
  password: string;
  role: string;
  verified: boolean;
  verificationCode: string | null;
  verificationExpires: Date | null;
  lastCodeSentAt: Date | null;
  resetCode: string | null;
  resetExpires: Date | null;
  lastResetSentAt: Date | null;
  cookiePreferences: { functional: boolean; statistics: boolean; marketing: boolean } | null;
  fullName: string | null;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  birthday: Date | null;
  phone: string | null;
  address: string | null;
  addressCoords: [number, number] | null;
  addressLabel: string | null;
  createdAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  compareVerificationCode(code: string): Promise<boolean>;
  compareResetCode(code: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  userId: {
    type: String,
    required: true,
    unique: true,
    set: encrypt,
    get: decrypt,
  },
  username: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
    enum: ["regular", "admin"],
    default: "regular",
  },
  verified: {
    type: Boolean,
    default: false,
  },
  verificationCode: {
    type: String,
    default: null,
  },
  verificationExpires: {
    type: Date,
    default: null,
  },
  lastCodeSentAt: {
    type: Date,
    default: null,
  },
  resetCode: {
    type: String,
    default: null,
  },
  resetExpires: {
    type: Date,
    default: null,
  },
  lastResetSentAt: {
    type: Date,
    default: null,
  },
  cookiePreferences: {
    type: Schema.Types.Mixed,
    default: null,
  },
  fullName: { type: String, default: null },
  firstName: { type: String, default: null },
  middleName: { type: String, default: null },
  lastName: { type: String, default: null },
  birthday: { type: Date, default: null },
  phone: { type: String, default: null },
  address: { type: String, default: null },
  // Geocoded from `address` by POST /api/auth/profile/geocode. Never accepted
  // straight from the client, so a user cannot pin an arbitrary point.
  addressCoords: { type: [Number], default: null },
  addressLabel: { type: String, default: null },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { toJSON: { getters: true }, toObject: { getters: true } });

userSchema.pre("save", async function (next) {
  const salt = await bcrypt.genSalt(12);
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, salt);
  }
  if (this.isModified("verificationCode") && this.verificationCode) {
    this.verificationCode = await bcrypt.hash(this.verificationCode, salt);
  }
  if (this.isModified("resetCode") && this.resetCode) {
    this.resetCode = await bcrypt.hash(this.resetCode, salt);
  }
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.compareVerificationCode = async function (code: string): Promise<boolean> {
  if (!this.verificationCode) return false;
  return bcrypt.compare(code, this.verificationCode);
};

userSchema.methods.compareResetCode = async function (code: string): Promise<boolean> {
  if (!this.resetCode) return false;
  return bcrypt.compare(code, this.resetCode);
};

const User = mongoose.model<IUser>("User", userSchema);
export default User;
