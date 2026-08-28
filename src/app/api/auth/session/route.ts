import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { generateQrCodeDataUrl, FIXED_ADMIN_TOTP_SECRET, ADMIN_ACCOUNT, ADMIN_ISSUER } from "@/lib/totp";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);
  const qrDataUrl = await generateQrCodeDataUrl();

  return NextResponse.json({
    success: true,
    data: {
      authenticated: Boolean(session),
      admin: session || null,
      qrDataUrl,
      fixedSecret: FIXED_ADMIN_TOTP_SECRET,
      account: ADMIN_ACCOUNT,
      issuer: ADMIN_ISSUER,
    },
  });
}
