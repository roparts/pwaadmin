import fs from "fs";
import path from "path";
import { initialProducts, initialOrders, initialCoupons } from "../data/db-store";
import type { Product, Order, Coupon } from "./types";

export interface DbStoreData {
  products: Product[];
  categories: any[];
  coupons: Coupon[];
  settings: any;
  banners: any[];
  users: any[];
  orders: Order[];
}

const ADMIN_SOURCE_DB_PATH = path.join(process.cwd(), "src", "data", "db-store.json");

function getLocalJsonPath(): string {
  // Local dev: use source file directly (survives restarts)
  if (fs.existsSync(ADMIN_SOURCE_DB_PATH)) {
    try {
      fs.accessSync(ADMIN_SOURCE_DB_PATH, fs.constants.W_OK);
      return ADMIN_SOURCE_DB_PATH;
    } catch {
      // read-only (serverless)
    }
  }

  // Serverless: copy to /tmp
  const tmpPath = path.join("/tmp", "roparts-admin-db-store.json");
  try {
    if (!fs.existsSync(tmpPath) && fs.existsSync(ADMIN_SOURCE_DB_PATH)) {
      fs.copyFileSync(ADMIN_SOURCE_DB_PATH, tmpPath);
    }
    if (fs.existsSync(tmpPath)) return tmpPath;
  } catch {
    // ignore
  }

  return ADMIN_SOURCE_DB_PATH;
}

// ponytail: no in-memory cache — always read from disk for fresh data
export function loadDbStore(): DbStoreData {
  try {
    const jsonPath = getLocalJsonPath();
    if (fs.existsSync(jsonPath)) {
      const raw = fs.readFileSync(jsonPath, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed.products && Array.isArray(parsed.products)) {
        const seen = new Set<string>();
        const uniqueProducts = parsed.products.filter((p: any) => {
          if (!p || !p.id || seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        });
        return {
          ...parsed,
          products: uniqueProducts,
          orders: parsed.orders && Array.isArray(parsed.orders) ? parsed.orders : initialOrders,
        } as DbStoreData;
      }
    }
  } catch (err) {
    console.warn("Could not read db-store.json from disk, using fallback:", err);
  }
  return {
    products: [...initialProducts],
    categories: [],
    coupons: [...initialCoupons],
    settings: {},
    banners: [],
    users: [],
    orders: [...initialOrders],
  };
}

export function saveDbStore(data: Partial<DbStoreData>) {
  try {
    const current = loadDbStore();
    const updated = { ...current, ...data };
    if (updated.products && Array.isArray(updated.products)) {
      const seen = new Set<string>();
      updated.products = updated.products.filter((p: any) => {
        if (!p || !p.id || seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });
    }
    const json = JSON.stringify(updated, null, 2);

    const jsonPath = getLocalJsonPath();
    try { fs.writeFileSync(jsonPath, json, "utf-8"); } catch { /* read-only */ }

    // Also write to source if different path
    if (jsonPath !== ADMIN_SOURCE_DB_PATH) {
      try { fs.writeFileSync(ADMIN_SOURCE_DB_PATH, json, "utf-8"); } catch { /* serverless */ }
    }

    // Also sync directly to main-app sibling project if running locally
    const siblingMainAppPath = path.resolve(process.cwd(), "..", "main-app", "src", "data", "db-store.json");
    if (fs.existsSync(siblingMainAppPath)) {
      try { fs.writeFileSync(siblingMainAppPath, json, "utf-8"); } catch { /* ignore */ }
    }

    console.log(`[admin-app db] ✓ Saved to: ${jsonPath}`);
  } catch (err) {
    console.error("[admin-app db] Error writing db-store.json:", err);
  }
}

export function loadOrdersStore(): Order[] {
  const store = loadDbStore();
  if (store.orders && Array.isArray(store.orders) && store.orders.length > 0) {
    return store.orders;
  }
  return initialOrders;
}

export function saveOrdersStore(orders: Order[]) {
  saveDbStore({ orders });
}
