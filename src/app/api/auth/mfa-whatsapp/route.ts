import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { loadAdminCredentials } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export const mfaOtpStore = new Map<string, { otp: string; expiresAt: number }>();

export async function POST(request: NextRequest) {
  const admin = loadAdminCredentials();
  const targetMobile = admin.mobile || "7979784087";

  const otp = crypto.randomInt(100000, 999999).toString();
  const expiresAt = Date.now() + 600000; // 10 mins

  mfaOtpStore.set(`admin_mfa_${targetMobile}`, { otp, expiresAt });

  const token =
    process.env.WHATSAPP_API_TOKEN ||
    "EAAUCAAyPqm4BSA5TTp9vcSygOLNnVgq86YQ5s1AwOckCWAYmBn5vCNjH3ixyZB0dDbrriO2ani8ZBkXxpBJvN3eslZBFKzA5BmMVTdAKFbQWMsjMUmlZCMtPsNpJZA1mpZA8gQVuVqSxL30LMlkObN2RPQZAX72dQZBoou0DZAk1m0bfr0ciZCFjFUhqBLBW6G4PBa4QZDZD";
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || "1186771747862693";

  try {
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: `91${targetMobile}`,
      type: "template",
      template: {
        name: "verify_code_app",
        language: { code: "en_US" },
        components: [
          { type: "body", parameters: [{ type: "text", text: otp }] },
          { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: otp }] },
        ],
      },
    };

    await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("WhatsApp dispatch error:", err);
  }

  return NextResponse.json({
    success: true,
    data: {
      mobile: targetMobile,
      message: `Login MFA Code sent to WhatsApp (+91 ${targetMobile})`,
      expiresAt: new Date(expiresAt).toISOString(),
    },
  });
}
