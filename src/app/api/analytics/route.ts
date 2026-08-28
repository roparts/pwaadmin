import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "Admin session required" }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    data: {
      totalSales: 241732,
      totalOrders: 2,
      pendingOrders: 1,
      outForDeliveryOrders: 1,
      deliveredOrders: 0,
      totalProducts: 3,
      lowStockProducts: 0,
      totalUsers: 14,
    },
  });
}
