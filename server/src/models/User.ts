import mongoose, { Schema, type Document } from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { encrypt, decrypt } from "../utils/cipher.js";

export interface IUser extends Document {
  userId: string;
  operatorId: string;
  password: string;
  role: string;
  createdAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  userId: {
    type: String,
    required: true,
    unique: true,
    set: encrypt,
    get: decrypt,
  },
  operatorId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { toJSON: { getters: true }, toObject: { getters: true } });

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model<IUser>("User", userSchema);
export default User;
