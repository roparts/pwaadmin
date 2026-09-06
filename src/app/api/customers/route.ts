import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { loadOrdersStore } from "@/lib/db";
import { proxyToBackend } from "@/lib/api-client";
import type { CustomerProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "Admin session required" }, { status: 401 });
  }

  // 1. Try to fetch from main admin backend
  try {
    const res = await proxyToBackend("/admin/customers");
    if (res.ok) {
      const liveData = await res.json();
      if (liveData?.data?.customers && Array.isArray(liveData.data.customers)) {
        return NextResponse.json({
          success: true,
          data: liveData.data,
        });
      }
    }
  } catch (err) {
    console.warn("Could not fetch customers from backend proxy, falling back to local orders:", err);
  }

  // 2. Local fallback: Aggregate from local orders store
  const orders = loadOrdersStore();
  const customerMap = new Map<string, CustomerProfile>();

  for (const ord of orders) {
    const rawMobile = String(
      ord.customerMobile || ord.shippingAddress?.mobile || ""
    ).replace(/\D/g, "");
    const mobile = rawMobile.length >= 10 ? rawMobile.slice(-10) : rawMobile || ord.id;
    if (!mobile) continue;

    if (!customerMap.has(mobile)) {
      const rawName = ord.customerName || ord.shippingAddress?.name || "Customer";
      const rawEmail = ord.customerEmail || ord.shippingAddress?.email || "";
      customerMap.set(mobile, {
        id: mobile,
        mobile: rawMobile.length >= 10 ? rawMobile.slice(-10) : rawMobile,
        name: rawName,
        email: rawEmail,
        addresses: [],
        totalOrders: 0,
        totalSpent: 0,
        lastOrderDate: ord.createdAt,
        orders: [],
        activeCart: null,
      });
    }

    const cust = customerMap.get(mobile)!;
    cust.totalOrders += 1;
    cust.totalSpent += (Number(ord.total) || 0);

    if (ord.customerName && cust.name === "Customer") cust.name = ord.customerName;
    if (ord.customerEmail && !cust.email) cust.email = ord.customerEmail;
    if (new Date(ord.createdAt) > new Date(cust.lastOrderDate || 0)) {
      cust.lastOrderDate = ord.createdAt;
      if (ord.customerName) cust.name = ord.customerName;
      if (ord.customerEmail) cust.email = ord.customerEmail;
    }

    const addr = ord.shippingAddress;
    if (addr && (addr.line1 || addr.city)) {
      const exists = cust.addresses.some(
        (a) => a.line1 === addr.line1 && a.pincode === addr.pincode
      );
      if (!exists) {
        cust.addresses.push(addr);
      }
    }

    cust.orders.push(ord);
  }

  const customerList = Array.from(customerMap.values());
  customerList.sort((a, b) => new Date(b.lastOrderDate || 0).getTime() - new Date(a.lastOrderDate || 0).getTime());

  const totalRevenue = customerList.reduce((sum, c) => sum + c.totalSpent, 0);

  return NextResponse.json({
    success: true,
    data: {
      customers: customerList,
      guestCarts: [],
      count: customerList.length,
      stats: {
        totalCustomers: customerList.length,
        totalRevenue,
        activeCartsCount: 0,
        repeatCustomers: customerList.filter((c) => c.totalOrders > 1).length,
      },
    },
  });
}
