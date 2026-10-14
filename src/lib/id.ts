import { randomBytes } from "node:crypto";

/** Short, URL-safe, collision-resistant id (128 bits). */
export function createId(): string {
  return randomBytes(16).toString("base64url");
}

/** Longer secret used in customer ticket links (192 bits). */
export function createAccessKey(): string {
  return randomBytes(24).toString("base64url");
}
