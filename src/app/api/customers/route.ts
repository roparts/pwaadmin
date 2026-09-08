import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { loadDbStore } from "@/lib/db";
import { proxyToBackend } from "@/lib/api-client";
import type { CustomerProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "Admin session required" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const qStr = searchParams.toString();
  const endpoint = `/admin/customers${qStr ? `?${qStr}` : ""}`;

  // 1. Try to fetch from main admin backend
  try {
    const res = await proxyToBackend(endpoint);
    if (res.ok) {
      const liveData = await res.json();
      const payload = liveData?.data || liveData;
      if (payload?.customers && Array.isArray(payload.customers)) {
        return NextResponse.json({
          success: true,
          data: payload,
        });
      }
    }
  } catch (err) {
    console.warn("Could not fetch customers from backend proxy, falling back to local orders:", err);
  }

  // 2. Local fallback: Aggregate from users, carts, and orders store
  const dbStore = loadDbStore();
  const orders = dbStore.orders || [];
  const users = dbStore.users || [];
  const products = dbStore.products || [];
  const productMap = new Map(products.map((p) => [p.id, p]));

  const customerMap = new Map<string, CustomerProfile>();

  // Initialize from registered users
  for (const u of users) {
    if (u.role === "ADMIN") continue;
    const rawMobile = String(u.mobile || "").replace(/\D/g, "");
    const cleanMobile = rawMobile.length >= 10 ? rawMobile.slice(-10) : rawMobile;
    const key = u.userId || u.id || cleanMobile;
    if (!key) continue;

    const carts = (dbStore as any).carts || {};
    const wishlists = (dbStore as any).wishlists || {};
    const cartKey = `user_${key}`;
    const cartRecord = carts[cartKey] || (u.userId ? carts[`user_${u.userId}`] : null) || (cleanMobile ? carts[`user_mob_${cleanMobile}`] : null);
    const rawCartItems = cartRecord?.items || (Array.isArray(u.cart) ? u.cart : []);

    let activeCart = null;
    if (Array.isArray(rawCartItems) && rawCartItems.length > 0) {
      const lineItems = rawCartItems.map((it: any) => {
        const prod = productMap.get(it.productId);
        const price = prod?.sellingPrice || 0;
        return {
          productId: it.productId,
          name: prod?.name || `Product ${it.productId}`,
          sku: prod?.sku || "",
          sellingPrice: price,
          mrp: prod?.mrp || 0,
          image: prod?.images?.[0] || "",
          quantity: it.quantity || 1,
          lineTotal: price * (it.quantity || 1),
          stock: prod?.stock || 0,
        };
      });
      activeCart = {
        sessionId: `user_${key}`,
        items: lineItems,
        itemCount: lineItems.reduce((acc: number, cur: any) => acc + cur.quantity, 0),
        subtotal: lineItems.reduce((acc: number, cur: any) => acc + cur.lineTotal, 0),
        updatedAt: cartRecord?.updatedAt || u.updatedAt || Date.now(),
        customer: { name: u.name, mobile: cleanMobile, email: u.email },
      };
    }

    const wishlistRecord = wishlists[cartKey] || (u.userId ? wishlists[`user_${u.userId}`] : null) || (cleanMobile ? wishlists[`user_mob_${cleanMobile}`] : null);
    const wishlistItems = wishlistRecord?.items || (Array.isArray(u.wishlist) ? u.wishlist : []);

    customerMap.set(key, {
      id: key,
      mobile: cleanMobile,
      name: u.name || "Customer",
      email: u.email || "",
      addresses: u.addresses || [],
      totalOrders: 0,
      totalSpent: 0,
      lastOrderDate: undefined,
      orders: [],
      activeCart,
      wishlist: wishlistItems,
    });
  }

  for (const ord of orders) {
    const rawMobile = String(
      ord.customerMobile || (ord as any).customer?.mobile || ord.shippingAddress?.mobile || ""
    ).replace(/\D/g, "");
    const mobile = rawMobile.length >= 10 ? rawMobile.slice(-10) : rawMobile || ord.id;
    const key = ord.customerId || (ord as any).userId || mobile;
    if (!key) continue;

    if (!customerMap.has(key)) {
      const rawName = ord.customerName || (ord as any).customer?.name || ord.shippingAddress?.name || "Customer";
      const rawEmail = ord.customerEmail || (ord as any).customer?.email || ord.shippingAddress?.email || "";
      customerMap.set(key, {
        id: key,
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

    const cust = customerMap.get(key)!;
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

  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const filter = searchParams.get("filter") || "all";
  const sort = searchParams.get("sort") || "recent";
  const isExportAll = searchParams.get("all") === "true";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = isExportAll
    ? 100000
    : Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "25", 10)));

  const customerList = Array.from(customerMap.values()).filter(
    (c) => c.totalOrders > 0 || (c.activeCart && c.activeCart.items?.length > 0)
  );

  const totalRevenue = customerList.reduce((sum, c) => sum + c.totalSpent, 0);
  const activeCartsCount = customerList.filter((c) => c.activeCart && c.activeCart.items?.length > 0).length;
  const repeatCustomers = customerList.filter((c) => c.totalOrders > 1).length;
  const wishlistedCount = customerList.filter((c) => c.wishlist && c.wishlist.length > 0).length;
  const highValueCount = customerList.filter((c) => (c.totalSpent || 0) >= 500000).length;

  let filtered = customerList;
  if (filter === "active_cart") {
    filtered = filtered.filter((c) => c.activeCart && c.activeCart.items?.length > 0);
  } else if (filter === "wishlist") {
    filtered = filtered.filter((c) => c.wishlist && c.wishlist.length > 0);
  } else if (filter === "repeat") {
    filtered = filtered.filter((c) => c.totalOrders > 1);
  } else if (filter === "high_value") {
    filtered = filtered.filter((c) => (c.totalSpent || 0) >= 500000);
  }

  if (q) {
    const cleanQDigits = q.replace(/\D/g, "");
    filtered = filtered.filter((c) => {
      if (c.name && c.name.toLowerCase().includes(q)) return true;
      if (c.mobile && (c.mobile.includes(q) || (cleanQDigits && c.mobile.includes(cleanQDigits)))) return true;
      if (c.email && c.email.toLowerCase().includes(q)) return true;
      if (
        c.addresses &&
        c.addresses.some(
          (a: any) =>
            (a.city && a.city.toLowerCase().includes(q)) ||
            (a.state && a.state.toLowerCase().includes(q)) ||
            (a.pincode && a.pincode.includes(q)) ||
            (a.line1 && a.line1.toLowerCase().includes(q))
        )
      )
        return true;
      if (
        c.orders &&
        c.orders.some(
          (o: any) =>
            (o.id && o.id.toLowerCase().includes(q)) ||
            (o.orderNumber && o.orderNumber.toLowerCase().includes(q))
        )
      )
        return true;
      if (
        c.activeCart?.items?.some(
          (it: any) =>
            (it.name && it.name.toLowerCase().includes(q)) ||
            (it.sku && it.sku.toLowerCase().includes(q))
        )
      )
        return true;
      if (
        c.wishlist?.some((pid: string) => {
          const prod = productMap.get(pid);
          return (prod && prod.name.toLowerCase().includes(q)) || pid.toLowerCase().includes(q);
        })
      )
        return true;

      return false;
    });
  }

  if (sort === "ltv_desc") {
    filtered.sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0));
  } else if (sort === "ltv_asc") {
    filtered.sort((a, b) => (a.totalSpent || 0) - (b.totalSpent || 0));
  } else if (sort === "orders_desc") {
    filtered.sort((a, b) => b.totalOrders - a.totalOrders);
  } else if (sort === "cart_desc") {
    filtered.sort((a, b) => (b.activeCart?.subtotal || 0) - (a.activeCart?.subtotal || 0));
  } else if (sort === "name_asc") {
    filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  } else {
    filtered.sort(
      (a, b) =>
        new Date(b.lastOrderDate || 0).getTime() - new Date(a.lastOrderDate || 0).getTime()
    );
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedCustomers = filtered.slice(startIndex, startIndex + limit);

  return NextResponse.json({
    success: true,
    data: {
      customers: paginatedCustomers,
      guestCarts: [],
      count: paginatedCustomers.length,
      total,
      page,
      limit,
      totalPages,
      stats: {
        totalCustomers: customerList.length,
        totalRevenue,
        activeCartsCount,
        repeatCustomers,
        wishlistedCount,
        highValueCount,
      },
    },
  });
}

export async function DELETE(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "Admin session required" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const mobile = searchParams.get("mobile");

  if (!id && !mobile) {
    return NextResponse.json({ success: false, error: "Customer ID or mobile number required" }, { status: 400 });
  }

  const normMobile = mobile ? mobile.replace(/\D/g, "").slice(-10) : "";

  // 1. Try deleting via central backend
  try {
    await proxyToBackend(`/admin/customers?id=${encodeURIComponent(id || "")}&mobile=${encodeURIComponent(normMobile || "")}`, {
      method: "DELETE",
    });
  } catch (err) {
    console.warn("Proxying delete customer to central backend failed:", err);
  }

  // 2. Remove from local store
  const { loadDbStore, saveDbStore } = await import("@/lib/db");
  const store = loadDbStore();
  const currentUsers = Array.isArray(store.users) ? store.users : [];
  const remainingUsers = currentUsers.filter(
    (u) =>
      u.userId !== id &&
      u.id !== id &&
      (!normMobile || !u.mobile || u.mobile.replace(/\D/g, "").slice(-10) !== normMobile)
  );
  saveDbStore({ users: remainingUsers });

  return NextResponse.json({
    success: true,
    message: `Customer account ${id || normMobile} deleted successfully.`,
  });
}
