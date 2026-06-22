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
  createdAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  compareVerificationCode(code: string): Promise<boolean>;
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
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.compareVerificationCode = async function (code: string): Promise<boolean> {
  if (!this.verificationCode) return false;
  return bcrypt.compare(code, this.verificationCode);
};

const User = mongoose.model<IUser>("User", userSchema);
export default User;
