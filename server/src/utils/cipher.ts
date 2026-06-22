import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || "fallback-secret";
  return crypto.createHash("sha256").update(secret).digest();
}

function getIv(plaintext: string): Buffer {
  return crypto.createHash("sha256").update(plaintext).digest().subarray(0, IV_LENGTH);
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = getIv(plaintext);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = cipher.update(plaintext, "utf8", "hex");
  cipher.final();
  const authTag = cipher.getAuthTag();
  return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted;
}

export function decrypt(ciphertext: string): string {
  const key = getKey();
  const parts = ciphertext.split(":");
  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted, "hex", "utf8") + decipher.final("utf8");
}
