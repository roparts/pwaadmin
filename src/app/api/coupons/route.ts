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
    const minPaise = typeof body.minOrder === "number"
      ? body.minOrder
      : (typeof body.minOrderAmount === "number"
        ? body.minOrderAmount
        : Math.round((Number(body.minOrderRupees) || 0) * 100));

    const isFixed = body.type === "fixed" || body.discountType === "fixed";
    const rawVal = Number(body.value ?? body.discountValue ?? 0);
    const normalizedVal = isFixed && rawVal < 1000 ? Math.round(rawVal * 100) : rawVal;

    createdCoupon = {
      code: String(body.code).trim().toUpperCase(),
      type: isFixed ? "fixed" : "percentage",
      discountType: isFixed ? "fixed" : "percentage",
      value: normalizedVal,
      discountValue: normalizedVal,
      minOrder: minPaise,
      minOrderAmount: minPaise,
      maxDiscount: Number(body.maxDiscount) || 50000,
      maxDiscountAmount: Number(body.maxDiscount) || 50000,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 90 * 86400000).toISOString(),
      usageLimit: Number(body.usageLimit) || 1000,
      usedCount: 0,
      status: "active",
      active: true,
      description: body.description ? String(body.description).trim() : undefined,
      showInCart: body.showInCart !== false,
      showInSuggestions: body.showInCart !== false,
      createdAt: new Date().toISOString(),
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

export async function PATCH(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "Admin session required" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const code = String(body?.code || "").trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ success: false, error: "Code required" }, { status: 400 });
  }

  // 1. Proxy to central backend
  try {
    await proxyToBackend("/admin/coupons", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.warn("Proxying patch coupon to central backend failed:", err);
  }

  // 2. Update local store
  const store = loadDbStore();
  const coupons = store.coupons || [];
  const idx = coupons.findIndex((c) => c.code.toUpperCase() === code);
  if (idx < 0) {
    return NextResponse.json({ success: false, error: "Coupon not found" }, { status: 404 });
  }

  if (typeof body.showInCart === "boolean") {
    coupons[idx].showInCart = body.showInCart;
    coupons[idx].showInSuggestions = body.showInCart;
  }
  if (typeof body.status === "string") {
    coupons[idx].status = body.status;
  }
  saveDbStore({ coupons });

  return NextResponse.json({ success: true, data: { coupon: coupons[idx] } });
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
