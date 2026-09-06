import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { clearLiveStorefrontCache } from "@/lib/api-client";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "Admin session required" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const cleared = await clearLiveStorefrontCache(body?.slug);

  return NextResponse.json({
    success: true,
    cleared,
    message: "Live website storefront cache cleared successfully!",
  });
}
