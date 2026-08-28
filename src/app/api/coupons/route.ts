import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import type { Coupon } from "@/lib/types";

export const dynamic = "force-dynamic";

let couponsStore: Coupon[] = [
  {
    code: "WELCOME10",
    type: "percentage",
    value: 10,
    minOrder: 50000,
    maxDiscount: 50000,
    startDate: "2026-01-01T00:00:00Z",
    endDate: "2026-12-31T23:59:59Z",
    usageLimit: 1000,
    usedCount: 84,
    status: "active",
  },
  {
    code: "ROBULK15",
    type: "percentage",
    value: 15,
    minOrder: 150000,
    maxDiscount: 150000,
    startDate: "2026-01-01T00:00:00Z",
    endDate: "2026-12-31T23:59:59Z",
    usageLimit: 500,
    usedCount: 29,
    status: "active",
  },
];

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "Admin session required" }, { status: 401 });
  }
  return NextResponse.json({ success: true, data: { coupons: couponsStore, count: couponsStore.length } });
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "Admin session required" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.code || !body?.value) {
    return NextResponse.json({ success: false, error: "Code and Value required" }, { status: 400 });
  }

  const newCoupon: Coupon = {
    code: String(body.code).trim().toUpperCase(),
    type: "percentage",
    value: Number(body.value),
    minOrder: Number(body.minOrder) || 0,
    maxDiscount: Number(body.maxDiscount) || 50000,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 90 * 86400000).toISOString(),
    usageLimit: 1000,
    usedCount: 0,
    status: "active",
  };

  couponsStore.push(newCoupon);
  return NextResponse.json({ success: true, data: { coupon: newCoupon, message: "Coupon created!" } });
}

export async function DELETE(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "Admin session required" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code) {
    return NextResponse.json({ success: false, error: "Code required" }, { status: 400 });
  }

  couponsStore = couponsStore.filter((c) => c.code.toUpperCase() !== code.toUpperCase());
  return NextResponse.json({ success: true, message: `Coupon ${code} deleted!` });
}
