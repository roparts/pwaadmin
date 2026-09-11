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
  description?: string;
  showInCart?: boolean;
  showInSuggestions?: boolean;
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
  gstin?: string;
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
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerMobile: string;
  items: OrderItem[];
  subtotal: number;
  discount?: number;
  shipping?: number;
  gst?: number;
  couponCode?: string;
  couponDiscount?: number;
  total: number;
  status: OrderStatus;
  shippingAddress: Address;
  recipientName?: string;
  recipientMobile?: string;
  billingAddress?: Address;
  paymentId?: string;
  paymentMethod?: string;
  paymentDetails?: {
    upiApp?: string;
    upiVpa?: string;
    cardLast4?: string;
    cardBrand?: string;
    bankName?: string;
  };
  paymentStatus?: string;
  tracking: OrderTrackingInfo;
  milestones?: Array<{
    status: OrderStatus;
    title: string;
    description: string;
    timestamp: string;
    completed: boolean;
  }>;
  invoiceNumber?: string;
  invoiceDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaxInvoice {
  id: string;
  invoiceNumber: string;
  orderNumber: string;
  orderId: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  customerEmail?: string;
  sellerDetails: {
    legalName: string;
    tradeName: string;
    gstin: string;
    address: string;
    city: string;
    state: string;
    stateCode: string;
    pincode: string;
    phone: string;
    email: string;
  };
  buyerDetails: {
    name: string;
    mobile: string;
    email?: string;
    line1: string;
    line2?: string;
    landmark?: string;
    city: string;
    state: string;
    pincode: string;
    gstin?: string;
  };
  placeOfSupply: string;
  items: Array<{
    name: string;
    hsn: string;
    quantity: number;
    unitPrice: number;
    taxableAmount: number;
    gstRate: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalAmount: number;
  }>;
  financialSummary: {
    subtotal: number;
    couponDiscount: number;
    shippingCharges: number;
    totalTaxableAmount: number;
    cgstTotal: number;
    sgstTotal: number;
    igstTotal: number;
    totalGst: number;
    grandTotal: number;
    amountInWords: string;
  };
  paymentMethod: "online" | "upi" | "cod" | "card" | "netbanking" | string;
  paymentDetails?: {
    upiApp?: string;
    upiVpa?: string;
    cardLast4?: string;
    cardBrand?: string;
    bankName?: string;
  };
  paymentStatus: "pending" | "paid" | "failed" | "refunded" | "cod" | string;
  status: "issued" | "cancelled";
  createdAt: string;
  updatedAt?: string;
}

export interface CartItemDetail {
  productId: string;
  name: string;
  sku?: string;
  sellingPrice: number;
  mrp?: number;
  image?: string;
  quantity: number;
  lineTotal: number;
  stock?: number;
}

export interface ActiveCartInfo {
  sessionId: string;
  items: CartItemDetail[];
  itemCount: number;
  subtotal: number;
  updatedAt?: number | string;
  customer?: {
    name?: string;
    mobile?: string;
    email?: string;
  } | null;
}

export interface CustomerProfile {
  id: string;
  mobile: string;
  name: string;
  email?: string;
  addresses: Address[];
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string;
  orders: Order[];
  sessions?: string[];
  activeCart?: ActiveCartInfo | null;
  wishlist?: string[];
}

export interface CustomerStats {
  totalCustomers: number;
  totalRevenue: number;
  activeCartsCount: number;
  repeatCustomers: number;
  wishlistedCount?: number;
  highValueCount?: number;
}

// -------------------------------------------------------------
// Field Service & Technician Types for Admin Dashboard
// -------------------------------------------------------------

export type ServiceStatus =
  | "BOOKED"
  | "ASSIGNED"
  | "IN_TRANSIT"
  | "IN_PROGRESS"
  | "WAITING_APPROVAL"
  | "COMPLETED"
  | "CANCELLED";

export interface ProposedPartItem {
  productId: string;
  name: string;
  sku?: string;
  unitPrice: number; // in paise (e.g. 25000 = ₹250)
  quantity: number;
  totalPrice: number; // in paise
  image?: string;
}

export interface ServiceProposal {
  id?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  parts: ProposedPartItem[];
  totalAmount: number; // in paise
  technicianNotes?: string;
  customerNotes?: string;
  createdAt?: string;
  resolvedAt?: string;
}

export interface ServiceBooking {
  id: string; // SRV-xxxx
  customerName: string;
  customerPhone: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
    latitude?: number;
    longitude?: number;
  };
  serviceType: "STANDARD_RO_SERVICE" | "MEMBRANE_REPLACEMENT" | "FILTER_CHANGE" | "FULL_INSTALLATION" | "LEAKAGE_REPAIR";
  problemDescription?: string;
  bookingFee: number; // 4900 paise (₹49)
  status: ServiceStatus;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  assignedTechnicianPhone?: string;
  assignedAt?: string;
  cancellationOtp?: string;
  cancellationReason?: string;
  approvalAttemptsCount: number; // Max 3
  currentApprovalId?: string;
  latestProposal?: ServiceProposal;
  proposals?: ServiceProposal[];
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Technician {
  id: string; // TECH-xxxx
  name: string;
  phone: string; // 10-digit whitelist phone
  alternatePhone?: string;
  status: "ACTIVE" | "INACTIVE" | "ON_DUTY" | "SUSPENDED";
  assignedCity: string;
  registeredByAdminId?: string;
  dailyJobsCount?: number;
  currentJobId?: string;
  rating?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceEvent {
  id: string; // EVT-xxxx
  serviceId: string;
  actorType: "CUSTOMER" | "TECHNICIAN" | "ADMIN" | "SYSTEM";
  actorId: string;
  eventType: string;
  previousStatus?: ServiceStatus;
  newStatus?: ServiceStatus;
  metadata?: Record<string, any>;
  createdAt: string;
}
