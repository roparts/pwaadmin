import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import type { Order, OrderStatus, FulfillmentType } from "@/lib/types";

export const dynamic = "force-dynamic";

// In-memory / persistent mock orders store for standalone admin app
let ordersStore: Order[] = [
  {
    id: "ord_live_001",
    orderNumber: "RP-ORD-2026-8921",
    customerId: "usr_tech_001",
    customerMobile: "9876543210",
    items: [
      {
        productId: "prod_mem_001",
        sku: "RP-MEM-100G-01",
        name: "100 GPD High Recovery RO Membrane (Drop Purity)",
        price: 45000,
        quantity: 2,
        lineTotal: 90000,
      },
      {
        productId: "prod_pump_001",
        sku: "RP-PMP-100G-01",
        name: "100 GPD Heavy-Duty RO Booster Pump 24V",
        price: 85000,
        quantity: 1,
        lineTotal: 85000,
      },
    ],
    subtotal: 175000,
    total: 197482,
    status: "out_for_delivery",
    shippingAddress: {
      id: "addr_001",
      name: "Suresh Sharma (Water Clinic)",
      mobile: "9876543210",
      line1: "#45/2, 1st Cross, Indiranagar",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560038",
      latitude: 12.9716,
      longitude: 77.5946,
      gpsAccuracy: 6,
      mapUrl: "https://www.google.com/maps?q=12.9716,77.5946",
    },
    tracking: {
      status: "out_for_delivery",
      fulfillmentType: "local_delivery",
      deliveryPersonName: "Ramesh Kumar (Bengaluru Direct)",
      deliveryPersonPhone: "+91 9876543210",
      currentLocation: "Out for delivery in Indiranagar / Domlur sector",
    },
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "ord_live_002",
    orderNumber: "RP-ORD-2026-8922",
    customerId: "usr_tech_002",
    customerMobile: "7979784087",
    items: [
      {
        productId: "prod_sed_001",
        sku: "RP-FLT-SED-01",
        name: "5 Micron Spun PP Sediment Filter (Drop Guard)",
        price: 7500,
        quantity: 5,
        lineTotal: 37500,
      },
    ],
    subtotal: 37500,
    total: 44250,
    status: "confirmed",
    shippingAddress: {
      id: "addr_002",
      name: "Amit Patel (Aquatech Spares)",
      mobile: "7979784087",
      line1: "Shop 12, GIDC Phase 2, Vatva",
      city: "Ahmedabad",
      state: "Gujarat",
      pincode: "382445",
      latitude: 22.9567,
      longitude: 72.6321,
      gpsAccuracy: 8,
      mapUrl: "https://www.google.com/maps?q=22.9567,72.6321",
    },
    tracking: {
      status: "confirmed",
      fulfillmentType: "courier",
      courierPartner: "Delhivery",
      trackingNumber: "DL982347189IN",
      trackingUrl: "https://www.delhivery.com/track/package/DL982347189IN",
      currentLocation: "Order packed, pickup scheduled",
    },
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "Admin session required" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const query = searchParams.get("q")?.toLowerCase();

  let filtered = [...ordersStore];

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

  const idx = ordersStore.findIndex((o) => o.orderNumber === body.orderNumber);
  if (idx === -1) {
    return NextResponse.json({ success: false, error: `Order ${body.orderNumber} not found` }, { status: 404 });
  }

  const existing = ordersStore[idx];
  const updated: Order = {
    ...existing,
    status: (body.status as OrderStatus) || existing.status,
    tracking: {
      ...existing.tracking,
      status: (body.status as OrderStatus) || existing.status,
      fulfillmentType: (body.fulfillmentType as FulfillmentType) || existing.tracking.fulfillmentType,
      courierPartner: body.courierPartner !== undefined ? body.courierPartner : existing.tracking.courierPartner,
      trackingNumber: body.trackingNumber !== undefined ? body.trackingNumber : existing.tracking.trackingNumber,
      trackingUrl: body.trackingUrl !== undefined ? body.trackingUrl : existing.tracking.trackingUrl,
      deliveryPersonName:
        body.deliveryPersonName !== undefined ? body.deliveryPersonName : existing.tracking.deliveryPersonName,
      deliveryPersonPhone:
        body.deliveryPersonPhone !== undefined ? body.deliveryPersonPhone : existing.tracking.deliveryPersonPhone,
      currentLocation: body.currentLocation !== undefined ? body.currentLocation : existing.tracking.currentLocation,
    },
    updatedAt: new Date().toISOString(),
  };

  ordersStore[idx] = updated;

  return NextResponse.json({
    success: true,
    data: { order: updated, message: `Order ${body.orderNumber} updated successfully!` },
  });
}
