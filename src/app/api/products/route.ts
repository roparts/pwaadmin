import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { loadDbStore, saveDbStore } from "@/lib/db";
import { proxyToBackend } from "@/lib/api-client";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "Admin session required" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const query = searchParams.get("q")?.toLowerCase();

  let products: Product[] = [];

  // 1. Try to fetch live products from main backend API
  try {
    const res = await proxyToBackend(`/admin/products${request.url.includes("?") ? "?" + request.url.split("?")[1] : ""}`);
    if (res.ok) {
      const liveData = await res.json();
      if (liveData?.data?.products && Array.isArray(liveData.data.products) && liveData.data.products.length > 0) {
        products = liveData.data.products;
      }
    }
  } catch (err) {
    console.warn("Could not fetch live products from backend proxy, using local store:", err);
  }

  // 2. Fallback to local store
  if (products.length === 0) {
    const store = loadDbStore();
    products = store.products || [];
  }

  let filtered = products;

  if (category && category !== "all") {
    filtered = filtered.filter((p) => p.categoryId === category || p.mainCategory === category);
  }
  if (query) {
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.brand?.toLowerCase().includes(query)
    );
  }

  return NextResponse.json({ success: true, data: { products: filtered, count: filtered.length } });
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "Admin session required" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.name || !body?.sellingPrice) {
    return NextResponse.json({ success: false, error: "Name and Price required" }, { status: 400 });
  }

  const store = loadDbStore();
  const products = store.products || [];

  const normName = String(body.name || "").trim().toLowerCase();
  const normSlug = String(body.name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const existingProduct = products.find(
    (p) =>
      (p.name && p.name.trim().toLowerCase() === normName) ||
      (p.slug && p.slug.trim().toLowerCase() === normSlug)
  );

  if (existingProduct) {
    return NextResponse.json(
      {
        success: false,
        error: `A product with the name "${body.name.trim()}" already exists (SKU: ${existingProduct.sku}). Please edit the existing product or use a different name.`,
      },
      { status: 409 }
    );
  }

  let createdProduct: Product | null = null;

  // 1. Create on central backend first (main-app / DynamoDB)
  try {
    const res = await proxyToBackend("/admin/products", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.data?.product) {
        createdProduct = data.data.product;
      }
    }
  } catch (err) {
    console.warn("Proxying new product to central backend failed:", err);
  }

  // 2. If not created via proxy, create locally
  if (!createdProduct) {
    createdProduct = {
      id: `prod_${Date.now().toString(36)}`,
      sku: body.sku || `RP-${Date.now().toString(36).toUpperCase()}`,
      name: String(body.name).trim(),
      slug: normSlug,
      categoryId: body.categoryId || "cat-membrane",
      brand: body.brand || "Drop Purity",
      images: body.images || ["https://placehold.co/600x600/1a365d/ffffff?text=RO+Part"],
      sellingPrice: Math.round(Number(body.sellingPrice)),
      mrp: Math.round(Number(body.mrp) || Number(body.sellingPrice) * 1.5),
      stock: Number(body.stock) || 50,
      status: "active",
      shortDescription: body.shortDescription || body.name,
      longDescription: body.longDescription || body.name,
      mainCategory: body.mainCategory || "domestic",
      source: body.source || "Direct Factory Sourcing",
      specifications: body.specifications || {},
      compatibility: Array.isArray(body.compatibility) ? body.compatibility : ["Standard RO Systems"],
      weight: Number(body.weight) || 500,
      hsnCode: body.hsnCode || "84219900",
      gstRate: Number(body.gstRate) || 18,
      lowStockThreshold: Number(body.lowStockThreshold) || 10,
      isFeatured: Boolean(body.isFeatured),
      isBestseller: Boolean(body.isBestseller),
      seoTitle: body.seoTitle || `${body.name} | ROParts.in`,
      seoDescription: body.seoDescription || body.shortDescription || body.name,
      seoKeywords: body.seoKeywords || ["ro spare parts", "water purifier spares"],
      relatedProductIds: body.relatedProductIds || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const existingIdx = products.findIndex((p) => p.id === createdProduct!.id);
  if (existingIdx >= 0) {
    products[existingIdx] = createdProduct;
  } else {
    products.unshift(createdProduct);
  }
  saveDbStore({ products });

  return NextResponse.json({ success: true, data: { product: createdProduct, message: "Product created!" } });
}

export async function PUT(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: "Admin session required" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.id) {
    return NextResponse.json({ success: false, error: "Product ID required" }, { status: 400 });
  }

  let liveUpdatedProduct: Product | null = null;

  // 1. Send update directly to the central backend (main-app / DynamoDB)
  try {
    const res = await proxyToBackend("/admin/products", {
      method: "PUT",
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.data?.product) {
        liveUpdatedProduct = data.data.product;
      }
    }
  } catch (err) {
    console.warn("Proxying product update to central backend failed:", err);
  }

  // 2. Also update local store
  const store = loadDbStore();
  const products = store.products || [];
  const idx = products.findIndex((p) => p.id === body.id);

  if (idx !== -1) {
    const existing = products[idx];
    const updated: Product = {
      ...existing,
      ...body,
      sellingPrice: body.sellingPrice !== undefined ? Math.round(Number(body.sellingPrice)) : existing.sellingPrice,
      mrp: body.mrp !== undefined ? Math.round(Number(body.mrp)) : existing.mrp,
      stock: body.stock !== undefined ? Number(body.stock) : existing.stock,
      updatedAt: new Date().toISOString(),
    };
    products[idx] = updated;
    saveDbStore({ products });
    if (!liveUpdatedProduct) liveUpdatedProduct = updated;
  } else if (liveUpdatedProduct) {
    const existingIdx = products.findIndex((p) => p.id === liveUpdatedProduct!.id);
    if (existingIdx >= 0) {
      products[existingIdx] = liveUpdatedProduct;
    } else {
      products.unshift(liveUpdatedProduct);
    }
    saveDbStore({ products });
  }

  if (!liveUpdatedProduct && idx === -1) {
    return NextResponse.json({ success: false, error: `Product ${body.id} not found` }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: { product: liveUpdatedProduct, message: "Product updated successfully!" },
  });
}
