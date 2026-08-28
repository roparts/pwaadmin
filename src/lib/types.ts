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
  price: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderTrackingInfo {
  status: OrderStatus;
  fulfillmentType: FulfillmentType;
  courierPartner?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  deliveryPersonName?: string;
  deliveryPersonPhone?: string;
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

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  categoryId: string;
  brand: string;
  images: string[];
  sellingPrice: number; // paise
  mrp: number; // paise
  stock: number;
  lowStockThreshold?: number;
  status: "active" | "draft" | "archived" | "out_of_stock";
}

export interface Coupon {
  code: string;
  type: "percentage" | "fixed";
  value: number;
  minOrder: number;
  maxDiscount: number;
  startDate: string;
  endDate: string;
  usageLimit: number;
  usedCount: number;
  status: "active" | "expired" | "disabled";
}
