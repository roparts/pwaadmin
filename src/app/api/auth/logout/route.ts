import { NextResponse } from "next/server";
import { createAdminLogoutCookieHeader } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ success: true, message: "Logged out successfully" });
  res.headers.set("Set-Cookie", createAdminLogoutCookieHeader());
  return res;
}
