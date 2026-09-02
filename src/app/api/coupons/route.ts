import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { proxyToBackend } from "@/lib/api-client";
import { loadDbStore, saveDbStore } from "@/lib/db";
import type { Coupon } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "Admin session required" }, { status: 401 });
  }

  let coupons: Coupon[] = [];

  // 1. Try fetching from live backend
  try {
    const res = await proxyToBackend("/admin/coupons");
    if (res.ok) {
      const liveData = await res.json();
      if (liveData?.data?.coupons && Array.isArray(liveData.data.coupons)) {
        coupons = liveData.data.coupons;
      }
    }
  } catch (err) {
    console.warn("Could not fetch live coupons from backend proxy, using local store:", err);
  }

  // 2. Fallback to local store
  if (coupons.length === 0) {
    const store = loadDbStore();
    coupons = store.coupons || [];
  }

  return NextResponse.json({ success: true, data: { coupons, count: coupons.length } });
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

  let createdCoupon: Coupon | null = null;

  // 1. Create on central backend first
  try {
    const res = await proxyToBackend("/admin/coupons", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const liveData = await res.json();
      if (liveData?.data?.coupon) {
        createdCoupon = liveData.data.coupon;
      }
    }
  } catch (err) {
    console.warn("Proxying new coupon to central backend failed:", err);
  }

  // 2. Fallback local creation
  if (!createdCoupon) {
    createdCoupon = {
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
  }

  const store = loadDbStore();
  const coupons = store.coupons || [];
  const idx = coupons.findIndex((c) => c.code.toUpperCase() === createdCoupon!.code.toUpperCase());
  if (idx >= 0) {
    coupons[idx] = createdCoupon;
  } else {
    coupons.push(createdCoupon);
  }
  saveDbStore({ coupons });

  return NextResponse.json({ success: true, data: { coupon: createdCoupon, message: "Coupon created!" } });
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

  // 1. Delete on central backend
  try {
    await proxyToBackend(`/admin/coupons?code=${encodeURIComponent(code)}`, {
      method: "DELETE",
    });
  } catch (err) {
    console.warn("Proxying delete coupon to central backend failed:", err);
  }

  // 2. Delete locally
  const store = loadDbStore();
  const coupons = (store.coupons || []).filter((c) => c.code.toUpperCase() !== code.toUpperCase());
  saveDbStore({ coupons });

  return NextResponse.json({ success: true, message: `Coupon ${code} deleted!` });
}
