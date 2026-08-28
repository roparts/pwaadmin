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

let memoryStore: DbStoreData = {
  products: [...initialProducts],
  categories: [],
  coupons: [...initialCoupons],
  settings: {},
  banners: [],
  users: [],
  orders: [...initialOrders],
};

function getLocalJsonPath(): string | null {
  try {
    // 1. When running admin-app alongside main-app
    const siblingPath = path.resolve(process.cwd(), "..", "main-app", "src", "data", "db-store.json");
    if (fs.existsSync(siblingPath)) return siblingPath;

    // 2. When running admin-app inside the workspace root (port 3001)
    const rootPath = path.resolve(process.cwd(), "..", "src", "data", "db-store.json");
    if (fs.existsSync(rootPath)) return rootPath;

    // 3. When running at root
    const cwdPath = path.resolve(process.cwd(), "src", "data", "db-store.json");
    if (fs.existsSync(cwdPath)) return cwdPath;
  } catch {
    // Serverless / isolated environment fallback
  }
  return null;
}

export function loadDbStore(): DbStoreData {
  try {
    const jsonPath = getLocalJsonPath();
    if (jsonPath) {
      const raw = fs.readFileSync(jsonPath, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed.products && Array.isArray(parsed.products)) {
        return {
          ...parsed,
          orders: parsed.orders && Array.isArray(parsed.orders) ? parsed.orders : initialOrders,
        } as DbStoreData;
      }
    }
  } catch (err) {
    console.warn("Could not read db-store.json from disk, using memory store:", err);
  }
  return memoryStore;
}

export function saveDbStore(data: Partial<DbStoreData>) {
  memoryStore = {
    ...memoryStore,
    ...data,
  };

  try {
    const jsonPath = getLocalJsonPath();
    if (jsonPath) {
      let current: DbStoreData = {
        products: [],
        categories: [],
        coupons: [],
        settings: {},
        banners: [],
        users: [],
        orders: [],
      };
      try {
        const raw = fs.readFileSync(jsonPath, "utf-8");
        current = JSON.parse(raw);
      } catch {
        // use default
      }
      const updated = {
        ...current,
        ...data,
      };
      fs.writeFileSync(jsonPath, JSON.stringify(updated, null, 2), "utf-8");
      console.log(`[admin-app db] ✓ Successfully synced db-store to disk: ${jsonPath}`);
    }
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
