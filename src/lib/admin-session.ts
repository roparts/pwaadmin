import crypto from "crypto";
import { NextRequest } from "next/server";

export const ADMIN_COOKIE_NAME = "roparts_admin_jwt";
const SESSION_SECRET =
  process.env.SESSION_SECRET || "rp_prod_secret_key_tamper_guard_982347182937";

export interface AdminSession {
  adminId: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN";
  mfaVerified: boolean;
  exp: number;
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString();
}

export function createAdminToken(
  adminId: string = "admin_super",
  email: string = "admin@roparts.in",
  role: "SUPER_ADMIN" | "ADMIN" = "SUPER_ADMIN"
): string {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const exp = Math.floor(Date.now() / 1000) + 8 * 3600;

  const payload = base64UrlEncode(
    JSON.stringify({
      adminId,
      email,
      role,
      mfaVerified: true,
      exp,
    })
  );

  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${signature}`;
}

export function verifyAdminToken(token: string): AdminSession | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const expectedSig = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    return null;
  }

  try {
    const session = JSON.parse(base64UrlDecode(payload)) as AdminSession;
    if (session.exp && session.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export async function getAdminSession(request: NextRequest): Promise<AdminSession | null> {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!cookie) return null;
  return verifyAdminToken(cookie);
}

export function createAdminCookieHeader(token: string, maxAgeSeconds: number = 8 * 3600): string {
  const isProd = process.env.NODE_ENV === "production";
  return `${ADMIN_COOKIE_NAME}=${token}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; SameSite=Lax${
    isProd ? "; Secure" : ""
  }`;
}

export function createAdminLogoutCookieHeader(): string {
  return `${ADMIN_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}
