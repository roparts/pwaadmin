import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { loadDbStore, saveDbStore } from "@/lib/db";
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

  const store = loadDbStore();
  let filtered = store.products || [];

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

  const newProd: Product = {
    id: `prod_${Date.now().toString(36)}`,
    sku: body.sku || `RP-${Date.now().toString(36).toUpperCase()}`,
    name: String(body.name).trim(),
    slug: String(body.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
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

  products.unshift(newProd);
  saveDbStore({ products });

  return NextResponse.json({ success: true, data: { product: newProd, message: "Product created!" } });
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

  const store = loadDbStore();
  const products = store.products || [];
  const idx = products.findIndex((p) => p.id === body.id);
  if (idx === -1) {
    return NextResponse.json({ success: false, error: `Product not found` }, { status: 404 });
  }

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

  return NextResponse.json({ success: true, data: { product: updated, message: "Product updated across database!" } });
}
