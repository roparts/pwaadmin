import fs from "fs";
import path from "path";
import type { Product, Order, Coupon } from "./types";

interface DbStoreData {
  products: Product[];
  categories: any[];
  coupons: Coupon[];
  settings: any;
  banners: any[];
  users: any[];
}

function getDbStorePath(): string {
  const candidates = [
    path.join(process.cwd(), "..", "src", "data", "db-store.json"),
    path.join(process.cwd(), "src", "data", "db-store.json"),
    path.join(process.cwd(), "data", "db-store.json"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

function getOrdersStorePath(): string {
  const candidates = [
    path.join(process.cwd(), "..", "src", "data", "orders.json"),
    path.join(process.cwd(), "src", "data", "orders.json"),
    path.join(process.cwd(), "data", "orders.json"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

export function loadDbStore(): DbStoreData {
  try {
    const p = getDbStorePath();
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, "utf-8");
      return JSON.parse(raw) as DbStoreData;
    }
  } catch (err) {
    console.error("Error reading shared db-store.json in admin-app:", err);
  }
  return {
    products: [],
    categories: [],
    coupons: [],
    settings: {},
    banners: [],
    users: [],
  };
}

export function saveDbStore(data: Partial<DbStoreData>) {
  try {
    const p = getDbStorePath();
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const current = loadDbStore();
    const updated: DbStoreData = {
      ...current,
      ...data,
    };
    fs.writeFileSync(p, JSON.stringify(updated, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving shared db-store.json in admin-app:", err);
  }
}

export function loadOrdersStore(): Order[] {
  try {
    const p = getOrdersStorePath();
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, "utf-8");
      return JSON.parse(raw) as Order[];
    }
  } catch (err) {
    console.error("Error reading orders.json:", err);
  }
  return [];
}

export function saveOrdersStore(orders: Order[]) {
  try {
    const p = getOrdersStorePath();
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(p, JSON.stringify(orders, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving orders.json:", err);
  }
}
