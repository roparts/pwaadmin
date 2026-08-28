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

// In-memory runtime cache for serverless environment
let memoryStore: DbStoreData = {
  products: [...initialProducts],
  categories: [],
  coupons: [...initialCoupons],
  settings: {},
  banners: [],
  users: [],
};

let memoryOrders: Order[] = [...initialOrders];

export function loadDbStore(): DbStoreData {
  return memoryStore;
}

export function saveDbStore(data: Partial<DbStoreData>) {
  memoryStore = {
    ...memoryStore,
    ...data,
  };
}

export function loadOrdersStore(): Order[] {
  return memoryOrders;
}

export function saveOrdersStore(orders: Order[]) {
  memoryOrders = [...orders];
}
