import { NextRequest, NextResponse } from "next/server";
import { updateAdminPassword } from "@/lib/admin-auth";
import { resetOtpStore } from "../send-otp/route";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const otp = String(body?.otp || "").trim();
  const newPassword = String(body?.newPassword || "");

  if (!otp || otp.length !== 6) {
    return NextResponse.json({ success: false, error: "Please enter the 6-digit WhatsApp OTP" }, { status: 400 });
  }

  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json({ success: false, error: "New password must be at least 8 characters long" }, { status: 400 });
  }

  const record = resetOtpStore.get(`admin_reset_7979784087`);
  if (!record || record.otp !== otp || Date.now() > record.expiresAt) {
    return NextResponse.json({ success: false, error: "Invalid or expired WhatsApp OTP" }, { status: 400 });
  }

  resetOtpStore.delete(`admin_reset_7979784087`);
  updateAdminPassword(newPassword);

  return NextResponse.json({
    success: true,
    data: {
      message: "Password updated successfully. Please enter your Google Authenticator code to log in.",
      mfaRequired: true,
    },
  });
}
