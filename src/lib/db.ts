import fs from "fs";
import path from "path";
import { initialProducts, initialOrders, initialCoupons } from "../data/db-store";
import type { Product, Order, Coupon } from "./types";

interface DbStoreData {
  products: Product[];
  categories: any[];
  coupons: Coupon[];
  settings: any;
  banners: any[];
  users: any[];
}

let memoryStore: DbStoreData = {
  products: [...initialProducts],
  categories: [],
  coupons: [...initialCoupons],
  settings: {},
  banners: [],
  users: [],
};

let memoryOrders: Order[] = [...initialOrders];

function getLocalJsonPath(): string | null {
  try {
    // 1. When running admin-app inside the workspace root (port 3001)
    const rootPath = path.resolve(process.cwd(), "..", "src", "data", "db-store.json");
    if (fs.existsSync(rootPath)) return rootPath;

    // 2. When running at root
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
        return parsed as DbStoreData;
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
      console.log(`[admin-app db] ✓ Successfully synced ${updated.products?.length || 0} products to disk: ${jsonPath}`);
    }
  } catch (err) {
    console.error("[admin-app db] Error writing db-store.json:", err);
  }
}

export function loadOrdersStore(): Order[] {
  return memoryOrders;
}

export function saveOrdersStore(orders: Order[]) {
  memoryOrders = [...orders];
}
