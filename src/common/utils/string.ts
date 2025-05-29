import crypto from "crypto";

export function createSalt(size: number): string {
  return crypto.randomBytes(size).toString("base64");
}

export function hashPassword(salt: string, password: string): string {
  const saltedPassword = password + salt;
  const hash = crypto.createHash("sha256").update(saltedPassword).digest("hex");
  return hash;
}

export function randomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }
  return result;
}
