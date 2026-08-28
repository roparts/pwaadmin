import { NextRequest, NextResponse } from "next/server";
import { verifyTotpCode } from "@/lib/totp";
import { createAdminToken, createAdminCookieHeader } from "@/lib/admin-session";
import { loadAdminCredentials, verifyAdminPassword } from "@/lib/admin-auth";
import { mfaOtpStore } from "../mfa-whatsapp/route";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  const username = String(body?.username || "").trim();
  const password = String(body?.password || "");
  const totpCode = String(body?.totpCode || body?.otp || "").trim();
  const stage = body?.stage || (totpCode && !password ? "totp" : "full");

  const adminCreds = loadAdminCredentials();

  // STAGE 1: Check Password
  if (stage === "password") {
    if (!username || !password) {
      return NextResponse.json({ success: false, error: "Username and password required" }, { status: 400 });
    }

    const normUser = username.toLowerCase();
    const isUserValid =
      normUser === adminCreds.username.toLowerCase() ||
      normUser === adminCreds.email.toLowerCase() ||
      normUser === adminCreds.mobile;

    if (!isUserValid || !verifyAdminPassword(password)) {
      return NextResponse.json({ success: false, error: "Invalid User ID or Password" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      data: {
        step1Verified: true,
        mfaRequired: true,
        message: "Password verified. Please enter the 6-digit MFA code.",
      },
    });
  }

  // STAGE 2: Check MFA (TOTP or WhatsApp OTP or Master PIN)
  if (!totpCode || totpCode.length !== 6) {
    return NextResponse.json({ success: false, error: "Please enter the 6-digit MFA code" }, { status: 400 });
  }

  if (stage === "full" && password) {
    const isUserValid =
      username.toLowerCase() === adminCreds.username.toLowerCase() ||
      username.toLowerCase() === adminCreds.email.toLowerCase() ||
      username === adminCreds.mobile;

    if (!isUserValid || !verifyAdminPassword(password)) {
      return NextResponse.json({ success: false, error: "Invalid User ID or Password" }, { status: 401 });
    }
  }

  const isTotpValid = verifyTotpCode(totpCode);
  const waRecord = mfaOtpStore?.get?.(`admin_mfa_${adminCreds.mobile}`);
  const isWaValid = Boolean(waRecord && waRecord.otp === totpCode && Date.now() <= waRecord.expiresAt);
  const isMasterPin = totpCode === "797978";

  if (!isTotpValid && !isWaValid && !isMasterPin) {
    return NextResponse.json(
      { success: false, error: "Invalid code. Tap the code in Authenticator to reveal, or request WhatsApp OTP." },
      { status: 401 }
    );
  }

  const token = createAdminToken("admin_super", adminCreds.email, "SUPER_ADMIN");
  const cookieHeader = createAdminCookieHeader(token);

  const res = NextResponse.json({
    success: true,
    data: {
      authenticated: true,
      message: "Admin authentication successful!",
      admin: { adminId: "admin_super", email: adminCreds.email, role: "SUPER_ADMIN" },
    },
  });

  res.headers.set("Set-Cookie", cookieHeader);
  return res;
}
