import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { loadOrdersStore, saveOrdersStore } from "@/lib/db";
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

  let filtered = [...loadOrdersStore()];

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
  if (idx === -1) {
    return NextResponse.json({ success: false, error: `Order ${body.orderNumber} not found` }, { status: 404 });
  }

  const existing = orders[idx];
  const updatedStatus = (body.status as OrderStatus) || existing.status;
  const updatedFulfillment = (body.fulfillmentType as FulfillmentType) || existing.tracking?.fulfillmentType || "local_delivery";

  const updated: Order = {
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

  return NextResponse.json({
    success: true,
    data: { order: updated, message: `Order ${body.orderNumber} updated successfully!` },
  });
}
