import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { loadOrdersStore, saveOrdersStore } from "@/lib/db";
import { proxyToBackend } from "@/lib/api-client";
import type { Order, OrderStatus, FulfillmentType } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "Admin session required" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const query = searchParams.get("q")?.toLowerCase();

  let orders: Order[] = [];

  // 1. Try to fetch live orders from main backend API (port 3000 / production)
  try {
    const res = await proxyToBackend(`/admin/orders${request.url.includes("?") ? "?" + request.url.split("?")[1] : ""}`);
    if (res.ok) {
      const liveData = await res.json();
      if (liveData?.data?.orders && Array.isArray(liveData.data.orders) && liveData.data.orders.length > 0) {
        orders = liveData.data.orders;
      }
    }
  } catch (err) {
    console.warn("Could not fetch live orders from backend proxy, using local store:", err);
  }

  // 2. Fallback to local store
  if (orders.length === 0) {
    orders = [...loadOrdersStore()];
  }

  let filtered = orders;

  if (status && status !== "all") {
    filtered = filtered.filter((o) => o.status === status);
  }

  if (query) {
    filtered = filtered.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(query) ||
        o.shippingAddress?.name?.toLowerCase().includes(query) ||
        o.shippingAddress?.mobile?.includes(query) ||
        o.shippingAddress?.pincode?.includes(query)
    );
  }

  // Sort latest first
  filtered.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  return NextResponse.json({ success: true, data: { orders: filtered, count: filtered.length } });
}

export async function PUT(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "Admin session required" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.orderNumber) {
    return NextResponse.json({ success: false, error: "Order number is required" }, { status: 400 });
  }

  const orders = loadOrdersStore();
  const idx = orders.findIndex((o) => o.orderNumber === body.orderNumber);
  let updated: Order;

  if (idx !== -1) {
    const existing = orders[idx];
    const updatedStatus = (body.status as OrderStatus) || existing.status;
    const updatedFulfillment = (body.fulfillmentType as FulfillmentType) || existing.tracking?.fulfillmentType || "local_delivery";

    updated = {
      ...existing,
      status: updatedStatus,
      tracking: {
        status: updatedStatus,
        fulfillmentType: updatedFulfillment,
        courierPartner: body.courierPartner !== undefined ? body.courierPartner : existing.tracking?.courierPartner,
        trackingNumber: body.trackingNumber !== undefined ? body.trackingNumber : existing.tracking?.trackingNumber,
        trackingUrl: body.trackingUrl !== undefined ? body.trackingUrl : existing.tracking?.trackingUrl,
        deliveryPersonName:
          body.deliveryPersonName !== undefined ? body.deliveryPersonName : existing.tracking?.deliveryPersonName,
        deliveryPersonPhone:
          body.deliveryPersonPhone !== undefined ? body.deliveryPersonPhone : existing.tracking?.deliveryPersonPhone,
        currentLocation: body.currentLocation !== undefined ? body.currentLocation : existing.tracking?.currentLocation,
      },
      updatedAt: new Date().toISOString(),
    };

    orders[idx] = updated;
    saveOrdersStore(orders);
  } else {
    updated = body as Order;
  }

  // Proxy update to central backend (DynamoDB)
  try {
    await proxyToBackend("/admin/orders", {
      method: "PUT",
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.warn("Proxying order update to central backend failed:", err);
  }

  return NextResponse.json({
    success: true,
    data: { order: updated, message: `Order ${body.orderNumber} updated successfully!` },
  });
}
