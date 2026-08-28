import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { loadDbStore, loadOrdersStore } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "Admin session required" }, { status: 401 });
  }

  const store = loadDbStore();
  const orders = loadOrdersStore();
  const products = store.products || [];
  const users = store.users || [];

  const totalSales = orders
    .filter((o) => o.paymentStatus !== "failed")
    .reduce((sum, o) => sum + (o.total || 0), 0);

  const pendingOrders = orders.filter((o) =>
    ["pending", "confirmed", "processing", "packed"].includes(o.status)
  ).length;

  const outForDeliveryOrders = orders.filter((o) => o.status === "out_for_delivery").length;
  const deliveredOrders = orders.filter((o) => o.status === "delivered").length;
  const lowStockProducts = products.filter((p) => (p.stock || 0) <= (p.lowStockThreshold || 10)).length;

  return NextResponse.json({
    success: true,
    data: {
      totalSales,
      totalOrders: orders.length,
      pendingOrders,
      outForDeliveryOrders,
      deliveredOrders,
      totalProducts: products.length,
      lowStockProducts,
      totalUsers: users.length || 14,
    },
  });
}
