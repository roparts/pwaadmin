// Shared types for the entire app. Mirrors future DynamoDB schema.

export type MainCategory = "domestic" | "commercial" | "industrial";

export interface MainCategoryInfo {
  id: MainCategory;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  icon: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  shortDescription?: string;
  longDescription?: string;
  mainCategory?: MainCategory;
  categoryId: string;
  subcategoryId?: string;
  brand: string;
  source?: string;
  images: string[];
  specifications?: Record<string, string>;
  compatibility?: string[];
  weight?: number;
  dimensions?: { l: number; w: number; h: number };
  hsnCode?: string;
  gstRate?: number;
  sellingPrice: number; // paise
  mrp: number; // paise
  stock: number;
  lowStockThreshold?: number;
  status: "active" | "draft" | "archived" | "out_of_stock";
  isFeatured?: boolean;
  isBestseller?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  relatedProductIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  mainCategory?: MainCategory;
  image: string;
  parentId?: string;
  sortOrder: number;
  productCount: number;
  seoTitle: string;
  seoDescription: string;
  status: "active" | "draft";
}

export interface Coupon {
  code: string;
  discountType?: "percentage" | "flat" | "fixed";
  type?: "percentage" | "flat" | "fixed";
  discountValue?: number;
  value?: number;
  minOrderAmount?: number;
  minOrder?: number;
  maxDiscountAmount?: number;
  maxDiscount?: number;
  expiresAt?: string;
  startDate?: string;
  endDate?: string;
  usageLimit?: number;
  usedCount: number;
  active?: boolean;
  status?: "active" | "expired" | "disabled";
  createdAt?: string;
}

export type OrderStatus =
  | "pending_payment"
  | "payment_processing"
  | "paid"
  | "confirmed"
  | "processing"
  | "packed"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "refund_pending"
  | "refunded"
  | "payment_failed";

export type FulfillmentType = "local_delivery" | "courier";

export interface Address {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  gpsAccuracy?: number;
  mapUrl?: string;
}

export interface OrderItem {
  productId: string;
  sku: string;
  name: string;
  image?: string;
  unitPrice?: number;
  price?: number;
  mrp?: number;
  gstRate?: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderTrackingInfo {
  status?: OrderStatus;
  fulfillmentType: FulfillmentType;
  courierPartner?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  deliveryPersonName?: string;
  deliveryPersonPhone?: string;
  vehicleNumber?: string;
  deliverySlot?: string;
  dispatchedAt?: string;
  estimatedDeliveryAt?: string;
  deliveredAt?: string;
  currentLocation?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerMobile: string;
  items: OrderItem[];
  subtotal: number;
  total: number;
  status: OrderStatus;
  shippingAddress: Address;
  tracking: OrderTrackingInfo;
  createdAt: string;
  updatedAt: string;
}
