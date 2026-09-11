"use client";

import { useState, useEffect, useCallback } from "react";
import type { Order, OrderStatus, FulfillmentType, Product, Coupon, CustomerProfile, ActiveCartInfo, CustomerStats, Technician, ServiceBooking, ServiceStatus } from "@/lib/types";
import {
  ShieldIcon,
  RefreshIcon,
  LogoutIcon,
  OrderBoxIcon,
  ProductTagIcon,
  CouponIcon,
  UsersIcon,
  UserIcon,
  SearchIcon,
  KeyLockIcon,
  PlusIcon,
  WhatsAppIcon,
  PinIcon,
  HeartIcon,
  ExternalLinkIcon,
  PrinterIcon,
  DownloadIcon,
  InvoiceIcon,
  WrenchIcon,
  TechnicianIcon,
  CameraIcon,
  CartIcon,
  LightningIcon,
  EditIcon,
  GearIcon,
  CloseIcon,
  CheckIcon,
  BookIcon,
  FlaskIcon,
  LinkIcon,
  HomeIcon,
  BuildingIcon,
  FactoryIcon,
  PhoneIcon,
} from "@/components/AdminIcons";
import { TechniciansTab } from "@/components/TechniciansTab";
import { ServicesTab } from "@/components/ServicesTab";
import InvoiceDocument from "@/components/InvoiceDocument";
import { createTaxInvoiceFromOrder } from "@/lib/invoice-helper";

function formatPrice(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

interface AdminSessionInfo {
  authenticated: boolean;
  admin?: {
    adminId: string;
    email: string;
    role: string;
  };
  qrDataUrl: string;
  fixedSecret: string;
  account: string;
  issuer: string;
}

interface AnalyticsData {
  totalSales: number;
  totalOrders: number;
  pendingOrders: number;
  outForDeliveryOrders: number;
  deliveredOrders: number;
  totalProducts: number;
  lowStockProducts: number;
  totalUsers: number;
}

export default function StandaloneAdminDashboard() {
  const [authLoading, setAuthLoading] = useState(true);
  const [sessionInfo, setSessionInfo] = useState<AdminSessionInfo | null>(null);
  const [authStep, setAuthStep] = useState<"credentials" | "totp" | "forgot_password">("credentials");

  const [adminUsername, setAdminUsername] = useState("admin");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [totpDigits, setTotpDigits] = useState(["", "", "", "", "", ""]);
  const [loginError, setLoginError] = useState("");
  const [submittingAuth, setSubmittingAuth] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const [resetOtp, setResetOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [sendingResetOtp, setSendingResetOtp] = useState(false);
  const [resetMsg, setResetMsg] = useState("");
  const [sendingWaMfa, setSendingWaMfa] = useState(false);
  const [waMfaMsg, setWaMfaMsg] = useState("");

  const [activeTab, setActiveTab] = useState<"orders" | "services" | "technicians" | "products" | "coupons" | "customers" | "search" | "security">("orders");
  const [services, setServices] = useState<ServiceBooking[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [techFilterForServices, setTechFilterForServices] = useState<string | null>(null);
  const [searchDictItems, setSearchDictItems] = useState<Array<{ type: string; key: string; expansions?: string[]; words?: string[] }>>([]);
  const [loadingDict, setLoadingDict] = useState(false);
  const [rebuildingIndex, setRebuildingIndex] = useState(false);
  const [rebuildResult, setRebuildResult] = useState<string | null>(null);
  const [newSynKey, setNewSynKey] = useState("");
  const [newSynExpansions, setNewSynExpansions] = useState("");
  const [addingSyn, setAddingSyn] = useState(false);
  const [searchTestQuery, setSearchTestQuery] = useState("");
  const [searchTestResult, setSearchTestResult] = useState<any>(null);
  const [testingSearch, setTestingSearch] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [orderFilter, setOrderFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [guestCarts, setGuestCarts] = useState<ActiveCartInfo[]>([]);
  const [customerStats, setCustomerStats] = useState<CustomerStats | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customerFilter, setCustomerFilter] = useState<"all" | "active_cart" | "repeat" | "wishlist" | "high_value" | "guest_cart">("all");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [selectedGuestCart, setSelectedGuestCart] = useState<ActiveCartInfo | null>(null);
  const [customerViewMode, setCustomerViewMode] = useState<"table" | "cards">("table");
  const [customerSort, setCustomerSort] = useState<"recent" | "ltv_desc" | "ltv_asc" | "orders_desc" | "cart_desc" | "name_asc">("recent");
  const [customerPage, setCustomerPage] = useState(1);
  const [customerPageSize, setCustomerPageSize] = useState(25);
  const [customerTotal, setCustomerTotal] = useState(0);
  const [customerTotalPages, setCustomerTotalPages] = useState(1);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  const [exportingCsv, setExportingCsv] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [previewInvoiceOrder, setPreviewInvoiceOrder] = useState<Order | null>(null);
  const [editStatus, setEditStatus] = useState<OrderStatus>("confirmed");
  const [editFulfillment, setEditFulfillment] = useState<FulfillmentType>("local_delivery");
  const [editCourier, setEditCourier] = useState("Delhivery");
  const [editAwb, setEditAwb] = useState("");
  const [editTrackingUrl, setEditTrackingUrl] = useState("");
  const [editBoyName, setEditBoyName] = useState("Ramesh Kumar (Bengaluru Direct)");
  const [editBoyPhone, setEditBoyPhone] = useState("+91 9876543210");
  const [editLocationNote, setEditLocationNote] = useState("");
  const [savingOrder, setSavingOrder] = useState(false);
  const [orderActionMsg, setOrderActionMsg] = useState("");

  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editStock, setEditStock] = useState<number>(0);
  const [savingProduct, setSavingProduct] = useState(false);
  const [productActionMsg, setProductActionMsg] = useState("");
  const [clearingCache, setClearingCache] = useState(false);

  const [productStatusFilter, setProductStatusFilter] = useState<"all" | "active" | "draft" | "archived">("all");
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");

  const [editingProductFull, setEditingProductFull] = useState<Product | null>(null);
  const [fullEditName, setFullEditName] = useState("");
  const [fullEditCategory, setFullEditCategory] = useState("cat-membrane");
  const [fullEditMainCategory, setFullEditMainCategory] = useState<"domestic" | "commercial" | "industrial">("domestic");
  const [fullEditBrand, setFullEditBrand] = useState("Drop Purity");
  const [fullEditPrice, setFullEditPrice] = useState("");
  const [fullEditMrp, setFullEditMrp] = useState("");
  const [fullEditStock, setFullEditStock] = useState("");
  const [fullEditStatus, setFullEditStatus] = useState<"active" | "draft" | "archived">("active");
  const [fullEditShortDesc, setFullEditShortDesc] = useState("");
  const [fullEditLongDesc, setFullEditLongDesc] = useState("");
  const [fullEditKeywords, setFullEditKeywords] = useState<string[]>([]);
  const [fullEditKeywordInput, setFullEditKeywordInput] = useState("");
  const [fullEditWeight, setFullEditWeight] = useState("500");
  const [fullEditDimensions, setFullEditDimensions] = useState("");
  const [fullEditImages, setFullEditImages] = useState<string[]>([]);
  const [fullEditImageError, setFullEditImageError] = useState("");

  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [newProdName, setNewProdName] = useState("");
  const [newProdCategory, setNewProdCategory] = useState("cat-membrane");
  const [newProdMainCategory, setNewProdMainCategory] = useState<"domestic" | "commercial" | "industrial">("domestic");
  const [newProdBrand, setNewProdBrand] = useState("Drop Purity");
  const [newProdPrice, setNewProdPrice] = useState("450");
  const [newProdMrp, setNewProdMrp] = useState("899");
  const [newProdStock, setNewProdStock] = useState("50");
  const [newProdShortDesc, setNewProdShortDesc] = useState("");
  const [newProdLongDesc, setNewProdLongDesc] = useState("");
  const [newProdKeywords, setNewProdKeywords] = useState<string[]>([]);
  const [newProdKeywordInput, setNewProdKeywordInput] = useState("");
  const [newProdWeight, setNewProdWeight] = useState("500");
  const [newProdDimensions, setNewProdDimensions] = useState("");
  const [newProdImages, setNewProdImages] = useState<string[]>([]);
  const [newProdImageError, setNewProdImageError] = useState("");

  const [showNewCouponModal, setShowNewCouponModal] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponDiscount, setNewCouponDiscount] = useState("10");
  const [newCouponType, setNewCouponType] = useState<"percentage" | "fixed">("percentage");
  const [newCouponMinOrder, setNewCouponMinOrder] = useState("");
  const [newCouponDescription, setNewCouponDescription] = useState("");
  const [newCouponShowInCart, setNewCouponShowInCart] = useState(true);
  const [savingCoupon, setSavingCoupon] = useState(false);
  const [togglingCoupon, setTogglingCoupon] = useState<string | null>(null);

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session");
      const json = await res.json();
      if (json.success) setSessionInfo(json.data);
    } catch {
      setSessionInfo(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const loadDashboardData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [anaRes, ordRes, prodRes, cpnRes, custRes, srvRes, techRes] = await Promise.all([
        fetch("/api/analytics").then((r) => r.json()).catch(() => ({ data: null })),
        fetch("/api/orders").then((r) => r.json()).catch(() => ({ data: { orders: [] } })),
        fetch("/api/products").then((r) => r.json()).catch(() => ({ data: { products: [] } })),
        fetch("/api/coupons").then((r) => r.json()).catch(() => ({ data: { coupons: [] } })),
        fetch("/api/customers").then((r) => r.json()).catch(() => ({ data: { customers: [], guestCarts: [] } })),
        fetch("/api/services").then((r) => r.json()).catch(() => ({ data: { services: [] } })),
        fetch("/api/technicians").then((r) => r.json()).catch(() => ({ data: { technicians: [] } })),
      ]);

      if (anaRes.data) setAnalytics(anaRes.data);
      if (ordRes.data?.orders) setOrders(ordRes.data.orders);
      if (prodRes.data?.products) setProducts(prodRes.data.products);
      if (cpnRes.data?.coupons) setCoupons(cpnRes.data.coupons);
      if (custRes.data?.customers) setCustomers(custRes.data.customers);
      if (custRes.data?.guestCarts) setGuestCarts(custRes.data.guestCarts);
      if (custRes.data?.stats) setCustomerStats(custRes.data.stats);
      if (custRes.data?.total !== undefined) setCustomerTotal(custRes.data.total);
      if (custRes.data?.totalPages !== undefined) setCustomerTotalPages(custRes.data.totalPages);
      if (srvRes.data?.services) setServices(srvRes.data.services);
      if (techRes.data?.technicians) setTechnicians(techRes.data.technicians);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleAssignTechnician = async (serviceId: string, tech: Technician) => {
    try {
      const res = await fetch("/api/services", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          assignedTechnicianId: tech.id,
          assignedTechnicianName: tech.name,
          assignedTechnicianPhone: tech.phone,
          status: "ASSIGNED",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setServices((prev) =>
          prev.map((s) =>
            s.id === serviceId
              ? {
                  ...s,
                  assignedTechnicianId: tech.id,
                  assignedTechnicianName: tech.name,
                  assignedTechnicianPhone: tech.phone,
                  status: "ASSIGNED",
                  assignedAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }
              : s
          )
        );
        return { success: true };
      }
      return { success: false, error: data.error || "Failed to assign technician" };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to assign technician" };
    }
  };

  const handleUpdateServiceStatus = async (serviceId: string, status: ServiceStatus) => {
    try {
      const res = await fetch("/api/services", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, status }),
      });
      const data = await res.json();
      if (data.success) {
        setServices((prev) =>
          prev.map((s) => (s.id === serviceId ? { ...s, status, updatedAt: new Date().toISOString() } : s))
        );
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleAddTechnician = async (techData: {
    name: string;
    phone: string;
    assignedCity: string;
    alternatePhone?: string;
  }) => {
    try {
      const res = await fetch("/api/technicians", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(techData),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setTechnicians((prev) => [data.data, ...prev]);
        return { success: true };
      }
      return { success: false, error: data.error || "Failed to add technician" };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error" };
    }
  };

  const handleUpdateTechnicianStatus = async (
    id: string,
    status: "ACTIVE" | "INACTIVE" | "ON_DUTY" | "SUSPENDED"
  ) => {
    try {
      const res = await fetch("/api/technicians", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (data.success) {
        setTechnicians((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t))
        );
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleDeleteTechnician = async (id: string) => {
    try {
      const res = await fetch(`/api/technicians?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setTechnicians((prev) => prev.filter((t) => t.id !== id));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleViewServicesForTech = (technicianId: string) => {
    setTechFilterForServices(technicianId);
    setActiveTab("services");
  };

  const fetchCustomersList = useCallback(async () => {
    setLoadingCustomers(true);
    try {
      const q = encodeURIComponent(customerSearchQuery.trim());
      const res = await fetch(`/api/customers?page=${customerPage}&limit=${customerPageSize}&q=${q}&filter=${customerFilter}&sort=${customerSort}`);
      const json = await res.json();
      if (json.success && json.data) {
        if (json.data.customers) setCustomers(json.data.customers);
        if (json.data.guestCarts) setGuestCarts(json.data.guestCarts);
        if (json.data.stats) setCustomerStats(json.data.stats);
        if (json.data.total !== undefined) setCustomerTotal(json.data.total);
        if (json.data.totalPages !== undefined) setCustomerTotalPages(json.data.totalPages);
      }
    } catch (e) {
      console.warn("Failed to fetch paginated customers:", e);
    } finally {
      setLoadingCustomers(false);
    }
  }, [customerPage, customerPageSize, customerSearchQuery, customerFilter, customerSort]);

  useEffect(() => {
    if (activeTab === "customers") {
      const timer = setTimeout(() => {
        fetchCustomersList();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [activeTab, fetchCustomersList]);

  const handleExportCustomersCsv = async () => {
    setExportingCsv(true);
    try {
      const q = encodeURIComponent(customerSearchQuery.trim());
      const res = await fetch(`/api/customers?all=true&q=${q}&filter=${customerFilter}&sort=${customerSort}`);
      const json = await res.json();
      const list: CustomerProfile[] = json.data?.customers || customers;

      const headers = [
        "Customer ID",
        "Name",
        "Mobile",
        "Email",
        "Total Orders",
        "Lifetime Value (INR)",
        "Primary City",
        "Primary State",
        "Pincode",
        "Active Cart Items Count",
        "Active Cart Value (INR)",
        "Wishlist Items Count",
        "Last Order Date",
      ];

      const rows = list.map((c) => {
        const addr = c.addresses?.[0];
        const cartItems = c.activeCart?.items?.length || 0;
        const cartVal = (c.activeCart?.subtotal ? c.activeCart.subtotal / 100 : 0).toFixed(2);
        const ltv = ((c.totalSpent || 0) / 100).toFixed(2);
        const lastOrder = c.lastOrderDate ? new Date(c.lastOrderDate).toISOString().slice(0, 10) : "";

        return [
          `"${c.id || ""}"`,
          `"${(c.name || "Customer").replace(/"/g, '""')}"`,
          `"${c.mobile || ""}"`,
          `"${(c.email || "").replace(/"/g, '""')}"`,
          c.totalOrders || 0,
          ltv,
          `"${(addr?.city || "").replace(/"/g, '""')}"`,
          `"${(addr?.state || "").replace(/"/g, '""')}"`,
          `"${addr?.pincode || ""}"`,
          cartItems,
          cartVal,
          c.wishlist?.length || 0,
          `"${lastOrder}"`,
        ].join(",");
      });

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `roparts_customers_export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      alert("Failed to export customers CSV.");
    } finally {
      setExportingCsv(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (sessionInfo?.authenticated) {
      loadDashboardData();
    }
  }, [sessionInfo, loadDashboardData]);

  const loadSearchDictionary = useCallback(async () => {
    setLoadingDict(true);
    try {
      const res = await fetch("/api/search-dictionary");
      const json = await res.json();
      if (json.success && json.data?.items) {
        setSearchDictItems(json.data.items);
      }
    } catch (e) {
      console.warn("Failed to load search dictionary:", e);
    } finally {
      setLoadingDict(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "search") {
      loadSearchDictionary();
    }
  }, [activeTab, loadSearchDictionary]);

  const handleRebuildIndex = async () => {
    setRebuildingIndex(true);
    setRebuildResult("⏳ Scanning all products and generating inverted index tokens...");
    try {
      const res = await fetch("/api/rebuild-search-index", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setRebuildResult(`✅ Search Index Rebuilt Successfully! Indexed ${json.data?.totalIndexedEntries || "all"} entries across ${json.data?.totalProducts || products.length} products.`);
      } else {
        setRebuildResult(`❌ Rebuild failed: ${json.error || "Unknown error"}`);
      }
    } catch (err: any) {
      setRebuildResult(`❌ Rebuild failed: ${err.message}`);
    } finally {
      setRebuildingIndex(false);
    }
  };

  const handleAddSynonym = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSynKey.trim() || !newSynExpansions.trim()) return;
    setAddingSyn(true);
    try {
      const expansions = newSynExpansions.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
      const res = await fetch("/api/search-dictionary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "synonym",
          key: newSynKey.trim().toLowerCase(),
          expansions,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNewSynKey("");
        setNewSynExpansions("");
        loadSearchDictionary();
      }
    } catch (err) {
      console.warn("Error adding synonym:", err);
    } finally {
      setAddingSyn(false);
    }
  };

  const handleDeleteSynonym = async (key: string) => {
    if (!confirm(`Delete synonym mapping for "${key}"?`)) return;
    try {
      await fetch("/api/search-dictionary", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "synonym", key }),
      });
      loadSearchDictionary();
    } catch (err) {
      console.warn("Error deleting synonym:", err);
    }
  };

  const handleTestSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTestQuery.trim()) return;
    setTestingSearch(true);
    try {
      const res = await fetch(`https://gateway.roparts.in/api/v1/search?q=${encodeURIComponent(searchTestQuery.trim())}`);
      const json = await res.json();
      setSearchTestResult(json.data);
    } catch (err: any) {
      setSearchTestResult({ error: err.message });
    } finally {
      setTestingSearch(false);
    }
  };

  // Step 1: Submit Username & Password
  const handlePasswordStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setSubmittingAuth(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: adminUsername,
          password: adminPassword,
          stage: "password",
        }),
      });
      const json = await res.json();
      if (json.success) {
        setAuthStep("totp");
      } else {
        setLoginError(json.error || "Invalid User ID or Password");
      }
    } catch {
      setLoginError("Failed to connect to authentication server");
    } finally {
      setSubmittingAuth(false);
    }
  };

  // Step 2: Submit Google Authenticator Code
  const handleTotpChange = (index: number, val: string) => {
    const cleaned = val.replace(/\D/g, "");
    if (!cleaned && val === "") {
      const next = [...totpDigits];
      next[index] = "";
      setTotpDigits(next);
      return;
    }

    if (cleaned.length > 1) {
      const pasted = cleaned.slice(0, 6).split("");
      const next = [...totpDigits];
      pasted.forEach((ch, idx) => {
        if (idx < 6) next[idx] = ch;
      });
      setTotpDigits(next);
      document.getElementById(`sa-totp-${Math.min(pasted.length, 5)}`)?.focus();
      if (pasted.length === 6) verifyTotp(next.join(""));
      return;
    }

    const next = [...totpDigits];
    next[index] = cleaned;
    setTotpDigits(next);

    if (cleaned && index < 5) {
      document.getElementById(`sa-totp-${index + 1}`)?.focus();
    }

    if (index === 5 && cleaned) {
      const full = [...next];
      full[5] = cleaned;
      if (full.every((d) => d.length === 1)) {
        verifyTotp(full.join(""));
      }
    }
  };

  const verifyTotp = async (code: string) => {
    setLoginError("");
    setSubmittingAuth(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: adminUsername,
          password: adminPassword,
          totpCode: code,
          stage: "totp",
        }),
      });
      const json = await res.json();
      if (json.success) {
        await checkSession();
      } else {
        setLoginError(json.error || "Invalid Authenticator Code");
      }
    } catch {
      setLoginError("Failed to connect to authentication gateway");
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleSendWaMfa = async () => {
    setWaMfaMsg("");
    setLoginError("");
    setSendingWaMfa(true);
    try {
      const res = await fetch("/api/auth/mfa-whatsapp", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setWaMfaMsg(json.data.message || "✓ Code sent to WhatsApp (+91 7979784087)");
      } else {
        setLoginError(json.error || "Failed to send WhatsApp code");
      }
    } catch {
      setLoginError("Failed to send WhatsApp MFA code");
    } finally {
      setSendingWaMfa(false);
    }
  };

  // Forgot Password: Send WhatsApp OTP
  const handleSendResetOtp = async () => {
    setResetMsg("");
    setLoginError("");
    setSendingResetOtp(true);
    try {
      const res = await fetch("/api/auth/forgot-password/send-otp", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setResetMsg(json.data.message || "✓ OTP sent to WhatsApp (+91 7979784087)");
      } else {
        setLoginError(json.error || "Failed to send OTP");
      }
    } catch {
      setLoginError("Failed to send WhatsApp OTP");
    } finally {
      setSendingResetOtp(false);
    }
  };

  // Forgot Password: Verify & Reset
  const handleVerifyResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setSubmittingAuth(true);
    try {
      const res = await fetch("/api/auth/forgot-password/verify-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: resetOtp, newPassword }),
      });
      const json = await res.json();
      if (json.success) {
        alert("✓ Password updated successfully! Now complete Step 2 with Google Authenticator.");
        setAuthStep("totp");
      } else {
        setLoginError(json.error || "Invalid WhatsApp OTP");
      }
    } catch {
      setLoginError("Failed to reset password");
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthStep("credentials");
    setAdminPassword("");
    setTotpDigits(["", "", "", "", "", ""]);
    await checkSession();
  };

  const openOrderModal = (o: Order) => {
    setSelectedOrder(o);
    setEditStatus(o.status);
    setEditFulfillment(o.tracking?.fulfillmentType || "local_delivery");
    setEditCourier(o.tracking?.courierPartner || "Delhivery");
    setEditAwb(o.tracking?.trackingNumber || "");
    setEditTrackingUrl(o.tracking?.trackingUrl || "");
    setEditBoyName(o.tracking?.deliveryPersonName || "Ramesh Kumar (Bengaluru Direct)");
    setEditBoyPhone(o.tracking?.deliveryPersonPhone || "+91 9876543210");
    setEditLocationNote(o.tracking?.currentLocation || "");
    setOrderActionMsg("");
  };

  const handleSaveOrderUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setSavingOrder(true);
    try {
      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: selectedOrder.orderNumber,
          status: editStatus,
          fulfillmentType: editFulfillment,
          courierPartner: editFulfillment === "courier" ? editCourier : undefined,
          trackingNumber: editFulfillment === "courier" ? editAwb : undefined,
          trackingUrl: editFulfillment === "courier" ? editTrackingUrl : undefined,
          deliveryPersonName: editFulfillment === "local_delivery" ? editBoyName : undefined,
          deliveryPersonPhone: editFulfillment === "local_delivery" ? editBoyPhone : undefined,
          currentLocation: editLocationNote,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setOrderActionMsg("✓ Order tracking updated!");
        await loadDashboardData();
        setTimeout(() => setSelectedOrder(null), 1200);
      } else {
        setOrderActionMsg(json.error || "Failed to update order");
      }
    } finally {
      setSavingOrder(false);
    }
  };

  const handleQuickStatusChange = async (id: string, newStatus: "active" | "draft" | "archived") => {
    setSavingProduct(true);
    setProductActionMsg(`⏳ Changing status to ${newStatus.toUpperCase()}...`);
    try {
      const res = await fetch("/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setProductActionMsg(`❌ Failed to update status: ${json.error || "Server error"}`);
        return;
      }
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p)));
      setProductActionMsg(`✅ Status updated to "${newStatus.toUpperCase()}"!`);
      setTimeout(() => setProductActionMsg(""), 4500);
      await loadDashboardData();
    } catch (err: any) {
      setProductActionMsg(`❌ Network error changing status: ${err?.message || err}`);
    } finally {
      setSavingProduct(false);
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1000;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          resolve(dataUrl);
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (
    files: FileList | null,
    currentImages: string[],
    setImages: (imgs: string[]) => void,
    setError: (msg: string) => void
  ) => {
    if (!files || files.length === 0) return;
    setError("");

    // Remove any dummy placeholder from list if user is adding real photos
    const existing = currentImages.filter((img) => !img.includes("placehold.co"));
    const remainingSlots = 4 - existing.length;
    if (remainingSlots <= 0) {
      setError("Maximum 4 photos allowed per product.");
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    const newImgs: string[] = [];

    for (const file of filesToProcess) {
      if (file.size > 5 * 1024 * 1024) {
        setError(`"${file.name}" exceeds 5MB limit. Please choose a smaller photo.`);
        return;
      }
      try {
        const optimized = await compressImage(file);
        if (optimized) {
          newImgs.push(optimized);
        }
      } catch {
        // ignore
      }
    }

    if (newImgs.length > 0) {
      setImages([...existing, ...newImgs]);
    }
  };

  const handleAddKeyword = (
    kw: string,
    currentList: string[],
    setList: (list: string[]) => void,
    setInput: (val: string) => void
  ) => {
    const trimmed = kw.trim().replace(/^,+|,+$/g, "");
    if (!trimmed) return;
    const parts = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
    const updated = [...currentList];
    for (const p of parts) {
      if (!updated.includes(p)) {
        updated.push(p);
      }
    }
    setList(updated);
    setInput("");
  };

  const handleRemoveKeyword = (
    indexToRemove: number,
    currentList: string[],
    setList: (list: string[]) => void
  ) => {
    setList(currentList.filter((_, idx) => idx !== indexToRemove));
  };

  const openFullEditModal = (p: Product) => {
    setEditingProductFull(p);
    setFullEditName(p.name);
    setFullEditCategory(p.categoryId || "cat-membrane");
    setFullEditMainCategory((p.mainCategory as "domestic" | "commercial" | "industrial") || "domestic");
    setFullEditBrand(p.brand || "Drop Purity");
    setFullEditPrice((p.sellingPrice / 100).toString());
    setFullEditMrp((p.mrp / 100).toString());
    setFullEditStock(p.stock.toString());
    setFullEditStatus((p.status as "active" | "draft" | "archived") || "active");
    setFullEditShortDesc(p.shortDescription || p.name);
    setFullEditLongDesc(p.longDescription || p.name);
    setFullEditKeywords(
      Array.isArray(p.seoKeywords)
        ? p.seoKeywords
        : p.seoKeywords
        ? String(p.seoKeywords).split(",").map((s) => s.trim()).filter(Boolean)
        : []
    );
    setFullEditKeywordInput("");
    setFullEditWeight((p.weight || 500).toString());
    setFullEditDimensions((p.specifications as any)?.dimensions || "Standard");
    setFullEditImages(p.images && p.images.length > 0 ? p.images : []);
    setFullEditImageError("");
  };

  const handleSaveProductInline = async (id: string) => {
    setSavingProduct(true);
    setProductActionMsg("⏳ Sending price update to database...");
    try {
      const priceInPaise = Math.round(Number(editPrice) * 100);
      const stockCount = Number(editStock);
      const targetProd = products.find((p) => p.id === id);
      const targetName = targetProd?.name || id;

      const res = await fetch("/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          sellingPrice: priceInPaise,
          stock: stockCount,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setProductActionMsg(`❌ Update Failed: ${json.error || "Server error"}`);
        return;
      }

      setEditingProductId(null);
      setProductActionMsg(` Verifying live database & storefront state...`);

      // Verify from database API
      await new Promise((r) => setTimeout(r, 500));
      const verifyRes = await fetch(`/api/products?t=${Date.now()}`, { cache: "no-store" });
      const verifyJson = await verifyRes.json();
      const freshProducts: Product[] = verifyJson.data?.products || [];
      const verifiedItem = freshProducts.find((p) => p.id === id);

      if (verifiedItem && verifiedItem.sellingPrice === priceInPaise) {
        setProducts(freshProducts);
        setProductActionMsg(`✅ LIVE & CACHE PURGED: "${targetName}" updated to ₹${editPrice} (Stock: ${stockCount})`);
      } else {
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, sellingPrice: priceInPaise, stock: stockCount } : p))
        );
        setProductActionMsg(`✓ Saved & Cache Purged! Price: ₹${editPrice} | Stock: ${stockCount}`);
      }

      setTimeout(() => setProductActionMsg(""), 6000);
      await loadDashboardData();
    } catch (err: any) {
      setProductActionMsg(`❌ Network error updating product: ${err?.message || err}`);
    } finally {
      setSavingProduct(false);
    }
  };

  const handleSaveProductFull = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProductFull) return;
    setSavingProduct(true);
    setProductActionMsg("⏳ Saving full product updates to database...");
    const targetId = editingProductFull.id;
    const targetName = fullEditName;

    try {
      const priceInPaise = Math.round(Number(fullEditPrice) * 100);
      const mrpInPaise = Math.round(Number(fullEditMrp) * 100);
      const stockCount = Number(fullEditStock);

      const finalKeywords = [...fullEditKeywords];
      if (fullEditKeywordInput.trim() && !finalKeywords.includes(fullEditKeywordInput.trim())) {
        finalKeywords.push(fullEditKeywordInput.trim());
      }

      const res = await fetch("/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: targetId,
          name: fullEditName.trim(),
          categoryId: fullEditCategory,
          mainCategory: fullEditMainCategory,
          brand: fullEditBrand.trim() || "Drop Purity",
          sellingPrice: priceInPaise,
          mrp: mrpInPaise,
          stock: stockCount,
          status: fullEditStatus,
          shortDescription: fullEditShortDesc.trim() || fullEditName.trim(),
          longDescription: fullEditLongDesc.trim() || fullEditName.trim(),
          weight: Number(fullEditWeight) || 500,
          specifications: {
            dimensions: fullEditDimensions.trim() || "Standard",
            brand: fullEditBrand.trim() || "Drop Purity",
          },
          seoKeywords: finalKeywords,
          images: fullEditImages.length > 0 ? fullEditImages : ["https://placehold.co/600x600/1a365d/ffffff?text=RO+Part"],
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setProductActionMsg(`❌ Update Failed: ${json.error || "Server error"}`);
        return;
      }

      setEditingProductFull(null);
      setProductActionMsg(` Verifying updates directly from database...`);

      await new Promise((r) => setTimeout(r, 500));
      const verifyRes = await fetch(`/api/products?t=${Date.now()}`, { cache: "no-store" });
      const verifyJson = await verifyRes.json();
      const freshProducts: Product[] = verifyJson.data?.products || [];
      const verifiedItem = freshProducts.find((p) => p.id === targetId);

      if (verifiedItem && verifiedItem.sellingPrice === priceInPaise) {
        setProducts(freshProducts);
        setProductActionMsg(`✅ LIVE & CACHE PURGED: "${targetName}" updated to ₹${fullEditPrice} (Stock: ${stockCount})`);
      } else {
        setProductActionMsg(`✓ Product "${targetName}" updated & live cache purged!`);
      }

      setTimeout(() => setProductActionMsg(""), 6000);
      await loadDashboardData();
    } catch (err: any) {
      setProductActionMsg(`❌ Network error updating product: ${err?.message || err}`);
    } finally {
      setSavingProduct(false);
    }
  };

  const handleClearLiveCache = async () => {
    setClearingCache(true);
    setProductActionMsg("⏳ Sending cache purge request to live website...");
    try {
      const res = await fetch("/api/revalidate", { method: "POST" });
      const json = await res.json();
      if (res.ok && json.success) {
        setProductActionMsg("⚡ Live website cache purged successfully! Fresh prices are live.");
      } else {
        setProductActionMsg(`⚠️ Cache purge: ${json.message || "Completed"}`);
      }
    } catch (err: any) {
      setProductActionMsg(`Cache note: ${err?.message || err}`);
    } finally {
      setClearingCache(false);
      setTimeout(() => setProductActionMsg(""), 6000);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newProdName.trim();
    if (!trimmedName) return;

    // Check duplicate name on client
    const existing = products.find(
      (p) => p.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (existing) {
      setProductActionMsg(`❌ A product named "${trimmedName}" already exists (SKU: ${existing.sku}). Please choose a unique name or edit the existing product.`);
      return;
    }

    setSavingProduct(true);
    setProductActionMsg("⏳ Creating product in database...");
    try {
      const finalKeywords = [...newProdKeywords];
      if (newProdKeywordInput.trim() && !finalKeywords.includes(newProdKeywordInput.trim())) {
        finalKeywords.push(newProdKeywordInput.trim());
      }

      const computedSlug = trimmedName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const computedSku = `RP-${Date.now().toString(36).toUpperCase()}`;

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          slug: computedSlug,
          sku: computedSku,
          mainCategory: newProdMainCategory,
          categoryId: newProdCategory,
          brand: newProdBrand.trim() || "Drop Purity",
          sellingPrice: Math.round(Number(newProdPrice) * 100),
          mrp: Math.round(Number(newProdMrp) * 100),
          stock: Number(newProdStock),
          shortDescription: newProdShortDesc.trim() || newProdName.trim(),
          longDescription: newProdLongDesc.trim() || newProdName.trim(),
          weight: Number(newProdWeight) || 500,
          specifications: {
            dimensions: newProdDimensions.trim() || "Standard",
            brand: newProdBrand.trim() || "Drop Purity",
          },
          seoKeywords: finalKeywords,
          images: newProdImages.length > 0 ? newProdImages : ["/hero-products.jpg"],
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setShowNewProductModal(false);
        setNewProdName("");
        setNewProdPrice("450");
        setNewProdMrp("899");
        setNewProdStock("50");
        setNewProdShortDesc("");
        setNewProdLongDesc("");
        setNewProdKeywords([]);
        setNewProdKeywordInput("");
        setNewProdWeight("500");
        setNewProdDimensions("");
        setNewProdImages([]);
        setNewProdImageError("");
        setProductActionMsg("✅ New product created and live in catalog!");
        setTimeout(() => setProductActionMsg(""), 5000);
        await loadDashboardData();
      } else {
        setProductActionMsg(`❌ Product creation failed: ${json.error || "Server error"}`);
      }
    } catch (err: any) {
      setProductActionMsg(`❌ Network error: ${err?.message || err}`);
    } finally {
      setSavingProduct(false);
    }
  };

  const generateRandomCouponCode = () => {
    const prefixes = ["ROPARTS", "SUPER", "SAVE", "MEMBRANE", "DROPTECH", "WATER", "FLASH"];
    const discounts = ["10", "15", "20", "25", "30", "50"];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = discounts[Math.floor(Math.random() * discounts.length)];
    setNewCouponCode(`${prefix}${num}`);
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = newCouponCode.trim().toUpperCase();
    if (!cleanCode) return;
    setSavingCoupon(true);
    try {
      const minOrderNum = Math.max(0, parseFloat(newCouponMinOrder) || 0);
      const discountNum = Math.max(0, parseFloat(newCouponDiscount) || 0);
      const isFixed = newCouponType === "fixed";
      const finalValue = isFixed ? Math.round(discountNum * 100) : discountNum;
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: cleanCode,
          type: newCouponType,
          discountType: newCouponType,
          value: finalValue,
          discountValue: finalValue,
          minOrder: Math.round(minOrderNum * 100), // in paise
          minOrderAmount: Math.round(minOrderNum * 100),
          minOrderRupees: minOrderNum,
          description: newCouponDescription.trim() || undefined,
          showInCart: newCouponShowInCart,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || (data && !data.success)) {
        throw new Error(data?.error || "Failed to create coupon");
      }
      setShowNewCouponModal(false);
      setNewCouponCode("");
      setNewCouponDiscount("10");
      setNewCouponMinOrder("");
      setNewCouponDescription("");
      setNewCouponType("percentage");
      setNewCouponShowInCart(true);
      await loadDashboardData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create coupon");
    } finally {
      setSavingCoupon(false);
    }
  };

  const handleToggleCouponVisibility = async (code: string, currentShowInCart: boolean) => {
    const nextVal = !currentShowInCart;
    setTogglingCoupon(code);
    setCoupons((prev) =>
      prev.map((c) => (c.code === code ? { ...c, showInCart: nextVal, showInSuggestions: nextVal } : c))
    );
    try {
      const res = await fetch("/api/coupons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, showInCart: nextVal }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || (data && !data.success)) {
        throw new Error(data?.error || "Failed to update visibility");
      }
    } catch (err) {
      setCoupons((prev) =>
        prev.map((c) => (c.code === code ? { ...c, showInCart: currentShowInCart, showInSuggestions: currentShowInCart } : c))
      );
      alert(err instanceof Error ? err.message : "Failed to update coupon visibility");
    } finally {
      setTogglingCoupon(null);
    }
  };

  const handleDeleteCoupon = async (code: string) => {
    if (confirm(`Delete coupon ${code}?`)) {
      await fetch(`/api/coupons?code=${encodeURIComponent(code)}`, { method: "DELETE" });
      await loadDashboardData();
    }
  };

  const copyFixedKey = () => {
    if (sessionInfo?.fixedSecret) {
      navigator.clipboard.writeText(sessionInfo.fixedSecret);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff", color: "#0f172a" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🔐</div>
          <div style={{ fontSize: "1.125rem", fontWeight: 700 }}>Checking Security Clearance...</div>
        </div>
      </div>
    );
  }

  // 2-Step Login View
  if (!sessionInfo?.authenticated) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          padding: "1.5rem",
          color: "#f8fafc",
        }}
      >
        <div
          style={{
            maxWidth: "460px",
            width: "100%",
            background: "#ffffff", border: "1px solid #e2e8f0",
            borderRadius: "24px",
            padding: "2rem 1.75rem",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "18px",
              background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.75rem",
              marginBottom: "1rem",
              boxShadow: "0 10px 20px -5px rgba(59, 130, 246, 0.4)",
            }}
          >
            🛡️
          </div>

          <h1 style={{ fontSize: "1.375rem", fontWeight: 800, margin: "0 0 0.375rem", color: "#0f172a" }}>
            ROParts Master Admin
          </h1>

          {/* STEP 1 */}
          {authStep === "credentials" && (
            <form onSubmit={handlePasswordStep} style={{ textAlign: "left", marginTop: "1.25rem" }}>
              <div style={{ fontSize: "0.8125rem", color: "#334155", textAlign: "center", marginBottom: "1.25rem" }}>
                Step 1 of 2: Enter Master Admin Credentials
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.375rem" }}>
                  Admin User ID / Mobile / Email
                </label>
                <input
                  type="text"
                  required
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="admin or 7979784087"
                  style={{ width: "100%", padding: "0.6875rem 0.875rem", borderRadius: "10px", background: "#f8fafc", border: "1px solid #e2e8f0", color: "#fff", fontSize: "0.875rem" }}
                />
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.375rem" }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#1e293b" }}>Password</label>
                  <button type="button" onClick={() => setAuthStep("forgot_password")} style={{ background: "none", border: "none", color: "#0369a1", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}>
                    Forgot Password?
                  </button>
                </div>

                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••••••"
                    style={{ width: "100%", padding: "0.6875rem 0.875rem", borderRadius: "10px", background: "#f8fafc", border: "1px solid #e2e8f0", color: "#fff", fontSize: "0.875rem" }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#334155", fontSize: "0.8125rem", cursor: "pointer" }}>
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {loginError && (
                <div style={{ background: "#7f1d1d", color: "#fecaca", padding: "0.625rem", borderRadius: "10px", fontSize: "0.75rem", marginBottom: "1rem" }}>
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={submittingAuth}
                style={{
                  width: "100%",
                  padding: "0.875rem",
                  borderRadius: "12px",
                  border: "none",
                  background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: "0.9375rem",
                  cursor: "pointer",
                }}
              >
                {submittingAuth ? "Checking..." : "Continue to Step 2 (MFA) →"}
              </button>
            </form>
          )}

          {/* STEP 2 */}
          {authStep === "totp" && (
            <div style={{ marginTop: "1rem" }}>
              <div style={{ fontSize: "0.8125rem", color: "#4ade80", fontWeight: 700, marginBottom: "0.5rem" }}>
                ✓ Step 1 Verified: Password Accepted
              </div>
              <p style={{ fontSize: "0.75rem", color: "#334155", margin: "0 0 1.25rem" }}>
                Step 2: Enter 6-digit dynamic code from <strong>Google Authenticator</strong>.
              </p>

              {/* MFA Lock Badge (QR Code Hidden for Security) */}
              <div
                style={{
                  background: "#f8fafc", border: "1px solid #e2e8f0",
                  borderRadius: "16px",
                  padding: "1.25rem 1rem",
                  marginBottom: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <div style={{ fontSize: "2.25rem", marginBottom: "0.375rem" }}></div>
                <div style={{ fontSize: "0.875rem", fontWeight: 800, color: "#fff" }}>
                  Google Authenticator MFA
                </div>
                <div style={{ fontSize: "0.75rem", color: "#334155", marginTop: "0.25rem" }}>
                  Enter the 6-digit dynamic code from your phone
                </div>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); verifyTotp(totpDigits.join("")); }}>
                <div style={{ display: "flex", gap: "0.375rem", justifyContent: "center", marginBottom: "1.25rem" }}>
                  {totpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`sa-totp-${idx}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={idx === 0 ? 6 : 1}
                      value={digit}
                      onChange={(e) => handleTotpChange(idx, e.target.value)}
                      style={{
                        width: "48px",
                        height: "54px",
                        textAlign: "center",
                        fontSize: "1.375rem",
                        fontWeight: 800,
                        borderRadius: "12px",
                        border: digit ? "2px solid #3b82f6" : "1px solid #475569",
                        background: "#0f172a",
                        color: "#0369a1",
                        outline: "none",
                      }}
                    />
                  ))}
                </div>

                {loginError && (
                  <div style={{ background: "#7f1d1d", color: "#fecaca", padding: "0.625rem", borderRadius: "10px", fontSize: "0.75rem", marginBottom: "1rem" }}>
                    {loginError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submittingAuth || totpDigits.join("").length !== 6}
                  style={{
                    width: "100%",
                    padding: "0.875rem",
                    borderRadius: "12px",
                    border: "none",
                    background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: "0.9375rem",
                    cursor: submittingAuth || totpDigits.join("").length !== 6 ? "not-allowed" : "pointer",
                    opacity: submittingAuth || totpDigits.join("").length !== 6 ? 0.6 : 1,
                  }}
                >
                  {submittingAuth ? "Verifying..." : "Unlock Admin Dashboard →"}
                </button>

                <div style={{ marginTop: "1rem" }}>
                  <button type="button" onClick={() => setAuthStep("credentials")} style={{ background: "none", border: "none", color: "#334155", fontSize: "0.75rem", cursor: "pointer" }}>
                    ← Back to Step 1
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* FORGOT PASSWORD */}
          {authStep === "forgot_password" && (
            <div style={{ marginTop: "1.25rem", textAlign: "left" }}>
              <div style={{ fontSize: "0.8125rem", color: "#0369a1", fontWeight: 700, marginBottom: "0.5rem", textAlign: "center" }}>
                🔑 Password Reset via WhatsApp OTP
              </div>
              <p style={{ fontSize: "0.75rem", color: "#334155", marginBottom: "1rem", textAlign: "center" }}>
                OTP will be delivered to registered WhatsApp: <strong>+91 7979784087</strong>.
              </p>

              <button
                type="button"
                onClick={handleSendResetOtp}
                disabled={sendingResetOtp}
                style={{
                  width: "100%",
                  padding: "0.625rem",
                  borderRadius: "8px",
                  border: "none",
                  background: "#25D366",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: "0.8125rem",
                  cursor: "pointer",
                  marginBottom: "1rem",
                }}
              >
                {sendingResetOtp ? "Sending to WhatsApp..." : "📲 Send OTP to WhatsApp (+91 7979784087)"}
              </button>

              {resetMsg && (
                <div style={{ background: "#14532d", color: "#15803d", padding: "0.5rem", borderRadius: "8px", fontSize: "0.75rem", marginBottom: "1rem", fontWeight: 700 }}>
                  {resetMsg}
                </div>
              )}

              <form onSubmit={handleVerifyResetPassword}>
                <div style={{ marginBottom: "0.75rem" }}>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.25rem" }}>
                    6-Digit WhatsApp OTP *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter 6-digit OTP"
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "8px", background: "#f8fafc", border: "1px solid #e2e8f0", color: "#fff", fontSize: "0.875rem" }}
                  />
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.25rem" }}>
                    New Password * (min 8 chars)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "8px", background: "#f8fafc", border: "1px solid #e2e8f0", color: "#fff", fontSize: "0.875rem" }}
                  />
                </div>

                {loginError && (
                  <div style={{ background: "#7f1d1d", color: "#fecaca", padding: "0.5rem", borderRadius: "8px", fontSize: "0.75rem", marginBottom: "1rem" }}>
                    {loginError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submittingAuth || resetOtp.length !== 6 || newPassword.length < 8}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "10px",
                    border: "none",
                    background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: "0.875rem",
                    cursor: "pointer",
                  }}
                >
                  {submittingAuth ? "Updating..." : "Reset Password & Proceed to MFA →"}
                </button>

                <div style={{ textAlign: "center", marginTop: "1rem" }}>
                  <button type="button" onClick={() => setAuthStep("credentials")} style={{ background: "none", border: "none", color: "#334155", fontSize: "0.75rem", cursor: "pointer" }}>
                    ← Back to Login
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Dashboard view
  const filteredOrders = orders.filter((o) => {
    if (orderFilter !== "all" && o.status !== orderFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.shippingAddress?.name?.toLowerCase().includes(q) ||
        o.shippingAddress?.mobile?.includes(q)
      );
    }
    return true;
  }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a", paddingBottom: "4rem" }}>
      {/* Header */}
      <header style={{ background: "#ffffff", borderBottom: "1px solid #e2e8f0", padding: "0.875rem 1.5rem", position: "sticky", top: 0, zIndex: 40, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShieldIcon size={20} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "1rem", color: "#0f172a", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span>ROParts Master Admin</span>
                <span style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", fontSize: "0.625rem", fontWeight: 800, padding: "0.125rem 0.375rem", borderRadius: "999px" }}>
                  MFA Active
                </span>
              </div>
              <div style={{ fontSize: "0.6875rem", color: "#475569" }}>Admin: {sessionInfo?.admin?.email} | Mobile: +91 7979784087</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button onClick={loadDashboardData} disabled={refreshing} style={{ background: "#ffffff", color: "#0f172a", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "0.375rem 0.75rem", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <RefreshIcon size={13} color="#0f172a" />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
            <button onClick={handleLogout} style={{ background: "#ffffff", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: "8px", padding: "0.375rem 0.75rem", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <LogoutIcon size={13} color="#b91c1c" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: 1400, margin: "0 auto", padding: "1.5rem" }}>
        {/* KPI Tiles */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "1rem", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
            <div style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 700 }}>TOTAL REVENUE</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", marginTop: "0.25rem" }}>
              {formatPrice(analytics?.totalSales || 0)}
            </div>
          </div>
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "1rem", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
            <div style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 700 }}>PENDING DISPATCHES</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#b45309", marginTop: "0.25rem" }}>
              {analytics?.pendingOrders || 0}
            </div>
          </div>
          <div
            onClick={() => setActiveTab("services")}
            style={{
              background: "#ffffff",
              border: services.filter((s) => s.status === "BOOKED" || !s.assignedTechnicianId).length > 0 ? "1px solid #fde68a" : "1px solid #e2e8f0",
              borderRadius: "16px",
              padding: "1rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 700 }}>FIELD SERVICES</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#d97706", marginTop: "0.25rem", display: "flex", alignItems: "baseline", gap: "0.4rem" }}>
              <span>{services.length}</span>
              {services.filter((s) => s.status === "BOOKED" || !s.assignedTechnicianId).length > 0 && (
                <span style={{ fontSize: "0.6875rem", background: "#fef3c7", color: "#92400e", padding: "0.1rem 0.4rem", borderRadius: "4px", fontWeight: 800 }}>
                  {services.filter((s) => s.status === "BOOKED" || !s.assignedTechnicianId).length} unassigned
                </span>
              )}
            </div>
          </div>
          <div
            onClick={() => setActiveTab("technicians")}
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              padding: "1rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 700 }}>ACTIVE TECHS</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#4338ca", marginTop: "0.25rem", display: "flex", alignItems: "baseline", gap: "0.4rem" }}>
              <span>{technicians.filter((t) => t.status === "ACTIVE" || t.status === "ON_DUTY").length}</span>
              <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>/ {technicians.length} fleet</span>
            </div>
          </div>
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "1rem", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
            <div style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 700 }}>OUT FOR DELIVERY</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#1d4ed8", marginTop: "0.25rem" }}>
              {analytics?.outForDeliveryOrders || 0}
            </div>
          </div>
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "1rem", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
            <div style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 700 }}>TOTAL PRODUCTS</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#166534", marginTop: "0.25rem" }}>
              {products.length}
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid #e2e8f0", marginBottom: "1.5rem", overflowX: "auto" }}>
          {[
            { id: "orders", label: `Live Orders (${orders.length})`, icon: <OrderBoxIcon size={16} color="currentColor" /> },
            {
              id: "services",
              label: `Field Services (${services.length})`,
              icon: <WrenchIcon size={16} color="currentColor" />,
              alert: services.filter((s) => s.status === "BOOKED" || !s.assignedTechnicianId).length > 0,
              badge: services.filter((s) => s.status === "BOOKED" || !s.assignedTechnicianId).length > 0
                ? `${services.filter((s) => s.status === "BOOKED" || !s.assignedTechnicianId).length} Unassigned`
                : undefined,
            },
            { id: "technicians", label: `Technicians (${technicians.length})`, icon: <TechnicianIcon size={16} color="currentColor" /> },
            { id: "products", label: `Products (${products.length})`, icon: <ProductTagIcon size={16} color="currentColor" /> },
            { id: "coupons", label: `Coupons (${coupons.length})`, icon: <CouponIcon size={16} color="currentColor" /> },
            { id: "customers", label: `Customers & Carts (${customers.length})`, icon: <UsersIcon size={16} color="currentColor" /> },
            { id: "search", label: `Search Engine & Synonyms`, icon: <SearchIcon size={16} color="currentColor" /> },
            { id: "security", label: `Google Authenticator`, icon: <KeyLockIcon size={16} color="currentColor" /> },
          ].map((tab: any) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                style={{
                  padding: "0.75rem 1.25rem",
                  background: "none",
                  border: "none",
                  borderBottom: isActive ? "3px solid #0f172a" : "3px solid transparent",
                  color: isActive ? "#0f172a" : tab.alert ? "#b45309" : "#475569",
                  fontWeight: isActive ? 800 : 700,
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    style={{
                      background: "#fef3c7",
                      color: "#92400e",
                      fontSize: "0.6875rem",
                      fontWeight: 800,
                      padding: "0.15rem 0.45rem",
                      borderRadius: "9999px",
                      border: "1px solid #fde68a",
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab 1: Orders */}
        {activeTab === "orders" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                {["all", "confirmed", "packed", "out_for_delivery", "delivered"].map((st) => {
                  const isSel = orderFilter === st;
                  return (
                    <button
                      key={st}
                      onClick={() => setOrderFilter(st)}
                      style={{
                        padding: "0.375rem 0.75rem",
                        borderRadius: "8px",
                        border: `1px solid ${isSel ? "#0f172a" : "#cbd5e1"}`,
                        background: isSel ? "#0f172a" : "#ffffff",
                        color: isSel ? "#ffffff" : "#334155",
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        cursor: "pointer",
                      }}
                    >
                      {st.replace(/_/g, " ")}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Order #, Mobile..."
                style={{ padding: "0.5rem 1rem", borderRadius: "10px", border: "1px solid #cbd5e1", background: "#ffffff", color: "#0f172a", fontSize: "0.8125rem", fontWeight: 600 }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {filteredOrders.map((ord) => {
                const addr = ord.shippingAddress;
                const rawAccMob = String(ord.customerMobile || (ord as any).customer?.mobile || "").replace(/\D/g, "");
                const accountMobile = rawAccMob.length >= 10 ? rawAccMob.slice(-10) : (rawAccMob || addr?.mobile || "");
                const accountName = ord.customerName || (ord as any).customer?.name || addr?.name || "Customer";
                const rawRecMob = String(addr?.mobile || "").replace(/\D/g, "");
                const recipientMobile = rawRecMob.length >= 10 ? rawRecMob.slice(-10) : (rawRecMob || "");
                const isDifferentRecipient = Boolean(addr?.name && addr.name.trim().toLowerCase() !== accountName.trim().toLowerCase());

                const statusStyles: Record<string, { bg: string; color: string; border: string }> = {
                  confirmed: { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
                  packed: { bg: "#fefce8", color: "#854d0e", border: "#fef08a" },
                  out_for_delivery: { bg: "#faf5ff", color: "#6b21a8", border: "#e9d5ff" },
                  delivered: { bg: "#f0fdf4", color: "#166534", border: "#bbf7d0" },
                };
                const currentStatusStyle = statusStyles[ord.status] || { bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" };

                return (
                  <div key={ord.orderNumber} style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.875rem", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <span style={{ fontWeight: 900, fontSize: "1.125rem", color: "#0f172a" }}>#{ord.orderNumber}</span>
                        <span style={{ padding: "0.2rem 0.5rem", borderRadius: "6px", fontSize: "0.6875rem", fontWeight: 800, background: currentStatusStyle.bg, color: currentStatusStyle.color, border: `1px solid ${currentStatusStyle.border}` }}>
                          {ord.status.toUpperCase()}
                        </span>
                        {ord.createdAt && (
                          <span style={{ fontSize: "0.6875rem", color: "#64748b", fontWeight: 600 }}>
                            {new Date(ord.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}{" "}
                            {new Date(ord.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                        <div style={{ textAlign: "right", marginRight: "0.25rem" }}>
                          <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#0f172a" }}>{formatPrice(ord.total)}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPreviewInvoiceOrder(ord)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            background: "#ffffff",
                            color: "#0f172a",
                            border: "1px solid #cbd5e1",
                            borderRadius: "8px",
                            padding: "0.5rem 0.75rem",
                            fontSize: "0.75rem",
                            fontWeight: 800,
                            cursor: "pointer",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                          }}
                          title="View Official GST Tax Invoice"
                        >
                          <InvoiceIcon size={14} color="#0f172a" />
                          <span>Invoice</span>
                        </button>
                        <a
                          href={`/invoice/${ord.orderNumber}?download=1`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            background: "#f0fdf4",
                            color: "#166534",
                            border: "1px solid #bbf7d0",
                            borderRadius: "8px",
                            padding: "0.5rem 0.75rem",
                            fontSize: "0.75rem",
                            fontWeight: 800,
                            textDecoration: "none",
                            cursor: "pointer",
                          }}
                          title="Download / Print Official GST Invoice PDF"
                        >
                          <DownloadIcon size={14} color="#166534" />
                          <span>PDF</span>
                        </a>
                        <button onClick={() => openOrderModal(ord)} style={{ background: "#0f172a", color: "#ffffff", border: "none", borderRadius: "8px", padding: "0.5rem 0.875rem", fontSize: "0.75rem", fontWeight: 800, cursor: "pointer" }}>
                          Dispatch / Assign →
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0.875rem" }}>
                      <div>
                        {/* Account Owner */}
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.35rem" }}>
                          <span style={{ fontSize: "0.6875rem", color: "#0f172a", background: "#e2e8f0", border: "1px solid #cbd5e1", padding: "0.15rem 0.45rem", borderRadius: "4px", fontWeight: 800 }}>
                            ACCOUNT
                          </span>
                          <span style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.9375rem" }}>
                            {accountName} (+91 {accountMobile})
                          </span>
                        </div>

                        {/* Recipient / Delivery Info */}
                        {isDifferentRecipient ? (
                          <div style={{ margin: "0.35rem 0", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "0.5rem 0.625rem" }}>
                            <div style={{ fontSize: "0.6875rem", color: "#92400e", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                              DELIVER TO (RECIPIENT):
                            </div>
                            <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.8125rem", marginTop: "0.15rem" }}>
                              {addr?.name} {recipientMobile ? `(+91 ${recipientMobile})` : ""}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#0f172a", fontWeight: 600, marginTop: "0.25rem", display: "flex", alignItems: "flex-start", gap: "0.35rem" }}>
                              <PinIcon size={15} color="#0f172a" style={{ flexShrink: 0, marginTop: "2px" }} />
                              <span>{addr?.line1}{addr?.line2 ? `, ${addr.line2}` : ""}, {addr?.city} — {addr?.pincode}</span>
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: "0.75rem", color: "#0f172a", fontWeight: 600, marginTop: "0.25rem", display: "flex", alignItems: "flex-start", gap: "0.35rem" }}>
                            <PinIcon size={15} color="#0f172a" style={{ flexShrink: 0, marginTop: "2px" }} />
                            <span>{addr?.line1}{addr?.line2 ? `, ${addr.line2}` : ""}, {addr?.city} — {addr?.pincode}</span>
                          </div>
                        )}

                        {addr?.latitude && addr?.longitude && (
                          <div style={{ marginTop: "0.375rem" }}>
                            <a href={addr.mapUrl || `https://www.google.com/maps?q=${addr.latitude},${addr.longitude}`} target="_blank" rel="noreferrer" style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", padding: "0.25rem 0.55rem", borderRadius: "6px", fontSize: "0.6875rem", fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                              <PinIcon size={12} color="#166534" />
                              Live GPS Pinpoint ({addr.latitude.toFixed(4)}°, {addr.longitude.toFixed(4)}°) ↗
                            </a>
                          </div>
                        )}
                      </div>

                      <div>
                        <div style={{ fontSize: "0.75rem", color: "#334155", fontWeight: 700, marginBottom: "0.25rem" }}>ITEMS:</div>
                        {ord.items?.map((it, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#0f172a", padding: "0.15rem 0" }}>
                            <span>{it.name} (×{it.quantity})</span>
                            <span style={{ fontWeight: 800 }}>{formatPrice(it.lineTotal)}</span>
                          </div>
                        ))}
                        <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                          {accountMobile && (
                            <a
                              href={`https://wa.me/91${accountMobile}?text=${encodeURIComponent(`Hello ${accountName}, update on your ROParts.in Order #${ord.orderNumber}: Status is now ${ord.status.toUpperCase()}.`)}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ background: "#166534", color: "#ffffff", padding: "0.25rem 0.5rem", borderRadius: "6px", fontSize: "0.6875rem", fontWeight: 800, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                            >
                              <WhatsAppIcon size={13} color="#ffffff" />
                              WhatsApp {isDifferentRecipient ? `Account (${accountName})` : "Customer"}
                            </a>
                          )}
                          {isDifferentRecipient && recipientMobile && recipientMobile !== accountMobile && (
                            <a
                              href={`https://wa.me/91${recipientMobile}?text=${encodeURIComponent(`Hello ${addr?.name}, your package for ROParts.in Order #${ord.orderNumber} is now ${ord.status.toUpperCase()}. Delivery to ${addr?.city || "your address"}.`)}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ background: "#0284c7", color: "#ffffff", padding: "0.25rem 0.5rem", borderRadius: "6px", fontSize: "0.6875rem", fontWeight: 800, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                            >
                              <WhatsAppIcon size={13} color="#ffffff" />
                              WhatsApp Recipient ({addr?.name})
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab: Field Services */}
        {activeTab === "services" && (
          <ServicesTab
            services={services}
            technicians={technicians}
            products={products}
            onRefresh={loadDashboardData}
            onAssignTechnician={handleAssignTechnician}
            onUpdateServiceStatus={handleUpdateServiceStatus}
            initialTechnicianFilter={techFilterForServices}
          />
        )}

        {/* Tab: Field Technicians */}
        {activeTab === "technicians" && (
          <TechniciansTab
            technicians={technicians}
            services={services}
            onRefresh={loadDashboardData}
            onAddTechnician={handleAddTechnician}
            onUpdateStatus={handleUpdateTechnicianStatus}
            onDeleteTechnician={handleDeleteTechnician}
            onViewServicesForTech={handleViewServicesForTech}
          />
        )}

        {/* Tab 2: Products */}
        {activeTab === "products" && (() => {
          const countAll = products.length;
          const countActive = products.filter((p) => (p.status || "active") === "active").length;
          const countDraft = products.filter((p) => p.status === "draft").length;
          const countArchived = products.filter((p) => p.status === "archived").length;

          const filteredProducts = products.filter((p) => {
            const currentStatus = p.status || "active";
            if (productStatusFilter !== "all" && currentStatus !== productStatusFilter) {
              return false;
            }
            if (productCategoryFilter !== "all" && p.categoryId !== productCategoryFilter && p.mainCategory !== productCategoryFilter) {
              return false;
            }
            if (productSearchQuery.trim()) {
              const q = productSearchQuery.toLowerCase().trim();
              const matchName = p.name.toLowerCase().includes(q);
              const matchSku = p.sku.toLowerCase().includes(q);
              const matchBrand = (p.brand || "").toLowerCase().includes(q);
              if (!matchName && !matchSku && !matchBrand) return false;
            }
            return true;
          });

          return (
            <div>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.125rem", fontWeight: 800, margin: 0 }}>Product Inventory &amp; Prices</h2>
                  <p style={{ fontSize: "0.75rem", color: "#334155", margin: "0.25rem 0 0" }}>
                    Filter by status (Active, Draft, Archived), search, or quick-edit pricing and stock.
                  </p>
                </div>
                <button onClick={() => setShowNewProductModal(true)} style={{ background: "#0f172a", color: "#ffffff", border: "none", borderRadius: "8px", padding: "0.5rem 1rem", fontWeight: 800, fontSize: "0.8125rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                  <PlusIcon size={14} color="#ffffff" />
                  <span>Add Product</span>
                </button>
              </div>

              {/* Status Tabs / Pills */}
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
                <button
                  onClick={() => setProductStatusFilter("all")}
                  style={{
                    background: productStatusFilter === "all" ? "#0f172a" : "#ffffff",
                    color: productStatusFilter === "all" ? "#ffffff" : "#334155",
                    border: `1px solid ${productStatusFilter === "all" ? "#0f172a" : "#cbd5e1"}`,
                    borderRadius: "20px",
                    padding: "0.4rem 0.875rem",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  All ({countAll})
                </button>

                <button
                  onClick={() => setProductStatusFilter("active")}
                  style={{
                    background: productStatusFilter === "active" ? "#f0fdf4" : "#ffffff",
                    color: productStatusFilter === "active" ? "#166534" : "#334155",
                    border: `1px solid ${productStatusFilter === "active" ? "#86efac" : "#cbd5e1"}`,
                    borderRadius: "20px",
                    padding: "0.4rem 0.875rem",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#166534" }}></span>
                  Active ({countActive})
                </button>

                <button
                  onClick={() => setProductStatusFilter("draft")}
                  style={{
                    background: productStatusFilter === "draft" ? "#fefce8" : "#ffffff",
                    color: productStatusFilter === "draft" ? "#854d0e" : "#334155",
                    border: `1px solid ${productStatusFilter === "draft" ? "#fde68a" : "#cbd5e1"}`,
                    borderRadius: "20px",
                    padding: "0.4rem 0.875rem",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#eab308" }}></span>
                  Draft ({countDraft})
                </button>

                <button
                  onClick={() => setProductStatusFilter("archived")}
                  style={{
                    background: productStatusFilter === "archived" ? "#f1f5f9" : "#ffffff",
                    color: productStatusFilter === "archived" ? "#475569" : "#334155",
                    border: `1px solid ${productStatusFilter === "archived" ? "#cbd5e1" : "#cbd5e1"}`,
                    borderRadius: "20px",
                    padding: "0.4rem 0.875rem",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#64748b" }}></span>
                  Archived ({countArchived})
                </button>
              </div>

              {/* Search & Category Filter Controls */}
              <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 240px", position: "relative" }}>
                  <input
                    type="text"
                    value={productSearchQuery}
                    onChange={(e) => setProductSearchQuery(e.target.value)}
                    placeholder="Search product name, SKU, brand..."
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.875rem",
                      borderRadius: "8px",
                      background: "#ffffff",
                      border: "1px solid #cbd5e1",
                      color: "#0f172a",
                      fontWeight: 600,
                      fontSize: "0.8125rem",
                      boxSizing: "border-box",
                    }}
                  />
                  {productSearchQuery && (
                    <button
                      onClick={() => setProductSearchQuery("")}
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "transparent",
                        border: "none",
                        color: "#334155",
                        cursor: "pointer",
                        fontSize: "0.75rem",
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                <select
                  value={productCategoryFilter}
                  onChange={(e) => setProductCategoryFilter(e.target.value)}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    color: "#0f172a",
                    fontWeight: 600,
                    borderRadius: "8px",
                    padding: "0.55rem 0.875rem",
                    fontSize: "0.8125rem",
                    cursor: "pointer",
                  }}
                >
                  <option value="all">All Categories</option>
                  <option value="domestic">Domestic RO</option>
                  <option value="commercial">Commercial RO</option>
                  <option value="industrial">Industrial RO</option>
                  <option value="cat-membrane">RO Membranes</option>
                  <option value="cat-filters">Filter Cartridges</option>
                  <option value="cat-pumps">Booster Pumps</option>
                  <option value="cat-smps">SMPS Power Adapters</option>
                  <option value="cat-valves">Valves & Switches</option>
                  <option value="cat-housings">Filter Housings</option>
                  <option value="cat-fittings">Fittings & Connectors</option>
                  <option value="cat-tanks">Pressure Tanks</option>
                  <option value="cat-instruments">Flow Meters & Gauges</option>
                </select>

                <button
                  onClick={handleClearLiveCache}
                  disabled={clearingCache}
                  style={{
                    background: "#0284c7",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "0.55rem 0.875rem",
                    fontSize: "0.8125rem",
                    fontWeight: 700,
                    cursor: clearingCache ? "wait" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    whiteSpace: "nowrap",
                  }}
                  title="Purge CDN and live website cache immediately"
                >
                  {clearingCache ? "Purging..." : "Clear Live Cache"}
                </button>
              </div>

              {productActionMsg && (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", padding: "0.625rem 1rem", borderRadius: "10px", fontSize: "0.8125rem", fontWeight: 700, marginBottom: "1rem" }}>
                  {productActionMsg}
                </div>
              )}

              {/* Table */}
              <div style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", overflowX: "auto", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.8125rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e2e8f0", color: "#0f172a", background: "#f8fafc", fontWeight: 800 }}>
                      <th style={{ padding: "0.875rem" }}>Product</th>
                      <th style={{ padding: "0.875rem" }}>Status</th>
                      <th style={{ padding: "0.875rem" }}>Selling Price (₹)</th>
                      <th style={{ padding: "0.875rem" }}>Stock</th>
                      <th style={{ padding: "0.875rem" }}>Added</th>
                      <th style={{ padding: "0.875rem", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: "2.5rem", textAlign: "center", color: "#334155" }}>
                          <div>No products found matching the selected filter.</div>
                          {(productStatusFilter !== "all" || productSearchQuery || productCategoryFilter !== "all") && (
                            <button
                              onClick={() => { setProductStatusFilter("all"); setProductSearchQuery(""); setProductCategoryFilter("all"); }}
                              style={{ marginTop: "0.75rem", background: "#0f172a", color: "#ffffff", border: "none", borderRadius: "6px", padding: "0.35rem 0.875rem", fontWeight: 700, cursor: "pointer", fontSize: "0.75rem" }}
                            >
                              Reset Filters
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredProducts
                        .filter((p, index, self) => index === self.findIndex((t) => t.id === p.id))
                        .map((p) => {
                        const isEditing = editingProductId === p.id;
                        const currentStatus = (p.status as "active" | "draft" | "archived") || "active";
                        const statusConfig = {
                          active: { bg: "#f0fdf4", color: "#166534", border: "#bbf7d0", label: "Active" },
                          draft: { bg: "#fefce8", color: "#854d0e", border: "#fef08a", label: "Draft" },
                          archived: { bg: "#f1f5f9", color: "#475569", border: "#cbd5e1", label: "Archived" },
                        }[currentStatus];

                        return (
                          <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            {/* Product Info */}
                            <td style={{ padding: "0.875rem" }}>
                              <div style={{ fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                {p.name}
                              </div>
                              <div style={{ fontSize: "0.6875rem", color: "#475569", marginTop: "0.2rem" }}>
                                SKU: {p.sku} | MRP: {formatPrice(p.mrp)}
                              </div>
                            </td>

                            {/* Status Selector Badge */}
                            <td style={{ padding: "0.875rem" }}>
                              <select
                                value={currentStatus}
                                onChange={(e) => handleQuickStatusChange(p.id, e.target.value as "active" | "draft" | "archived")}
                                disabled={savingProduct}
                                style={{
                                  background: statusConfig.bg,
                                  color: statusConfig.color,
                                  border: `1px solid ${statusConfig.border}`,
                                  borderRadius: "12px",
                                  padding: "0.25rem 0.5rem",
                                  fontSize: "0.6875rem",
                                  fontWeight: 800,
                                  cursor: "pointer",
                                }}
                              >
                                <option value="active" style={{ background: "#ffffff", color: "#166534" }}>Active</option>
                                <option value="draft" style={{ background: "#ffffff", color: "#854d0e" }}>Draft</option>
                                <option value="archived" style={{ background: "#ffffff", color: "#475569" }}>Archived</option>
                              </select>
                            </td>

                            {/* Selling Price */}
                            <td style={{ padding: "0.875rem" }}>
                              {isEditing ? (
                                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                  <span style={{ color: "#334155", fontWeight: 700 }}>₹</span>
                                  <input
                                    type="number"
                                    autoFocus
                                    value={editPrice}
                                    onChange={(e) => setEditPrice(Number(e.target.value))}
                                    onKeyDown={(e) => { if (e.key === "Enter") handleSaveProductInline(p.id); }}
                                    style={{ width: "90px", padding: "0.35rem 0.5rem", borderRadius: "6px", background: "#ffffff", border: "2px solid #0f172a", color: "#0f172a", fontWeight: 800, fontSize: "0.875rem" }}
                                  />
                                </div>
                              ) : (
                                <span style={{ fontWeight: 900, color: "#0f172a", fontSize: "0.9375rem" }}>{formatPrice(p.sellingPrice)}</span>
                              )}
                            </td>

                            {/* Stock */}
                            <td style={{ padding: "0.875rem" }}>
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={editStock}
                                  onChange={(e) => setEditStock(Number(e.target.value))}
                                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveProductInline(p.id); }}
                                  style={{ width: "70px", padding: "0.35rem 0.5rem", borderRadius: "6px", background: "#ffffff", border: "2px solid #0f172a", color: "#0f172a", fontWeight: 800, fontSize: "0.875rem" }}
                                />
                              ) : (
                                p.stock <= 0 ? (
                                  <span style={{ background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", padding: "0.2rem 0.55rem", borderRadius: "6px", fontSize: "0.6875rem", fontWeight: 800, whiteSpace: "nowrap" }}>
                                    0 units (Out of Stock)
                                  </span>
                                ) : (
                                  <span style={{ background: p.stock > 10 ? "#f0fdf4" : "#fffbeb", color: p.stock > 10 ? "#166534" : "#b45309", border: `1px solid ${p.stock > 10 ? "#bbf7d0" : "#fde68a"}`, padding: "0.2rem 0.5rem", borderRadius: "6px", fontSize: "0.6875rem", fontWeight: 800 }}>
                                    {p.stock} units{p.stock <= 5 ? " (Low Stock)" : ""}
                                  </span>
                                )
                              )}
                            </td>

                            {/* Added Date */}
                            <td style={{ padding: "0.875rem" }}>
                              {p.createdAt ? (
                                <span style={{ fontSize: "0.6875rem", color: "#64748b", fontWeight: 600 }}>
                                  {new Date(p.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                </span>
                              ) : (
                                <span style={{ fontSize: "0.6875rem", color: "#94a3b8" }}>—</span>
                              )}
                            </td>

                            {/* Actions */}
                            <td style={{ padding: "0.875rem", textAlign: "right" }}>
                              {isEditing ? (
                                <div style={{ display: "flex", gap: "0.375rem", justifyContent: "flex-end" }}>
                                  <button onClick={() => handleSaveProductInline(p.id)} disabled={savingProduct} style={{ background: "#166534", color: "#ffffff", border: "none", borderRadius: "6px", padding: "0.35rem 0.75rem", cursor: "pointer", fontWeight: 800 }}>
                                    {savingProduct ? "..." : "✓ Save"}
                                  </button>
                                  <button onClick={() => setEditingProductId(null)} style={{ background: "#475569", color: "#ffffff", border: "none", borderRadius: "6px", padding: "0.35rem 0.5rem", cursor: "pointer" }}>✕</button>
                                </div>
                              ) : (
                                <div style={{ display: "flex", gap: "0.375rem", justifyContent: "flex-end", alignItems: "center" }}>
                                  <a
                                    href={`http://localhost:3000/product/${p.slug || p.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      background: "#f0f9ff",
                                      color: "#0284c7",
                                      border: "1px solid #bae6fd",
                                      borderRadius: "6px",
                                      padding: "0.35rem 0.625rem",
                                      textDecoration: "none",
                                      fontSize: "0.75rem",
                                      fontWeight: 700,
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "0.25rem",
                                    }}
                                    title={`Open ${p.name} on live storefront`}
                                  >
                                    <ExternalLinkIcon size={12} color="#0284c7" />
                                    <span>View ↗</span>
                                  </a>
                                  <button onClick={() => { setEditingProductId(p.id); setEditPrice(Math.round(p.sellingPrice / 100)); setEditStock(p.stock); }} style={{ background: "#ffffff", color: "#0f172a", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "0.35rem 0.625rem", cursor: "pointer", fontWeight: 700 }}>
                                    Quick Edit
                                  </button>
                                  <button onClick={() => openFullEditModal(p)} style={{ background: "#ffffff", color: "#0f172a", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "0.35rem 0.625rem", cursor: "pointer", fontWeight: 700 }}>
                                    Edit Details
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* Tab 3: Coupons */}
        {activeTab === "coupons" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "1.125rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>Discount Coupons</h2>
              <button onClick={() => setShowNewCouponModal(true)} style={{ background: "#0f172a", color: "#ffffff", border: "none", borderRadius: "8px", padding: "0.5rem 1rem", fontWeight: 800, fontSize: "0.8125rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                <PlusIcon size={14} color="#ffffff" />
                <span>Create Coupon</span>
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem" }}>
              {coupons.length === 0 ? (
                <div style={{ gridColumn: "1 / -1", padding: "3rem 1.5rem", textAlign: "center", background: "#f8fafc", borderRadius: "16px", border: "1px dashed #cbd5e1", color: "#64748b" }}>
                  <CouponIcon size={32} color="#94a3b8" style={{ margin: "0 auto 0.75rem" }} />
                  <p style={{ fontWeight: 700, margin: 0, color: "#0f172a" }}>No coupons created yet</p>
                  <p style={{ fontSize: "0.8125rem", margin: "0.25rem 0 1rem" }}>Create promotional coupons with minimum order rules to boost cart conversion.</p>
                  <button onClick={() => setShowNewCouponModal(true)} style={{ background: "#0f172a", color: "#ffffff", border: "none", borderRadius: "8px", padding: "0.5rem 1rem", fontWeight: 700, fontSize: "0.8125rem", cursor: "pointer" }}>
                    + Create First Coupon
                  </button>
                </div>
              ) : (
                coupons.map((c) => {
                  const isFixed = c.type === "fixed" || c.discountType === "fixed";
                  const discVal = c.value || c.discountValue || 0;
                  const rawMin = c.minOrder ?? c.minOrderAmount ?? 0;
                  const minRs = rawMin > 0 ? (rawMin >= 1000 ? Math.round(rawMin / 100) : rawMin) : 0;

                  return (
                    <div
                      key={c.code}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "16px",
                        padding: "1.25rem",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        position: "relative",
                      }}
                    >
                      <div>
                        {/* Top Bar: Code Badge + Delete */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.35rem",
                              background: "#f8fafc",
                              border: "1px dashed #0284c7",
                              color: "#0369a1",
                              padding: "0.3rem 0.65rem",
                              borderRadius: "8px",
                              fontFamily: "monospace, monospace",
                              fontSize: "1rem",
                              fontWeight: 900,
                              letterSpacing: "0.05em",
                            }}
                          >
                            🎟️ {c.code}
                          </span>
                          <button
                            onClick={() => handleDeleteCoupon(c.code)}
                            title={`Delete coupon ${c.code}`}
                            style={{
                              background: "#fef2f2",
                              border: "1px solid #fecaca",
                              color: "#dc2626",
                              cursor: "pointer",
                              width: "28px",
                              height: "28px",
                              borderRadius: "8px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.875rem",
                              fontWeight: 700,
                            }}
                          >
                            ✕
                          </button>
                        </div>

                        {/* Discount Value */}
                        <div style={{ fontSize: "1.625rem", fontWeight: 900, color: "#0f172a", marginTop: "0.75rem", letterSpacing: "-0.02em" }}>
                          {isFixed ? `₹${discVal.toLocaleString("en-IN")} FLAT OFF` : `${discVal}% OFF`}
                        </div>

                        {/* Min Order Badge */}
                        <div style={{ marginTop: "0.5rem" }}>
                          <span
                            style={{
                              display: "inline-block",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              padding: "0.2rem 0.55rem",
                              borderRadius: "6px",
                              background: minRs > 0 ? "#f0fdf4" : "#f1f5f9",
                              color: minRs > 0 ? "#166534" : "#475569",
                              border: `1px solid ${minRs > 0 ? "#bbf7d0" : "#cbd5e1"}`,
                            }}
                          >
                            {minRs > 0 ? `Min. Cart: ₹${minRs.toLocaleString("en-IN")}` : "No Minimum Order"}
                          </span>
                        </div>

                        {/* Coupon Description */}
                        {c.description ? (
                          <p style={{ margin: "0.6rem 0 0", fontSize: "0.8125rem", color: "#475569", lineHeight: 1.45 }}>
                            {c.description}
                          </p>
                        ) : (
                          <p style={{ margin: "0.6rem 0 0", fontSize: "0.75rem", color: "#94a3b8", fontStyle: "italic" }}>
                            No customer description set.
                          </p>
                        )}

                        {/* Storefront Visibility in Cart Suggestions */}
                        <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.45rem 0.65rem", background: c.showInCart !== false ? "#f0fdf4" : "#f8fafc", border: `1px solid ${c.showInCart !== false ? "#bbf7d0" : "#e2e8f0"}`, borderRadius: "8px" }}>
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: c.showInCart !== false ? "#166534" : "#64748b", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                            {c.showInCart !== false ? "👁️ Shown in Cart Suggestions" : "🔒 Hidden (Manual Code Only)"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleCouponVisibility(c.code, c.showInCart !== false)}
                            disabled={togglingCoupon === c.code}
                            style={{
                              background: c.showInCart !== false ? "#ffffff" : "#0f172a",
                              color: c.showInCart !== false ? "#dc2626" : "#ffffff",
                              border: c.showInCart !== false ? "1px solid #fecaca" : "none",
                              borderRadius: "6px",
                              padding: "0.2rem 0.55rem",
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              cursor: togglingCoupon === c.code ? "not-allowed" : "pointer",
                              opacity: togglingCoupon === c.code ? 0.6 : 1,
                            }}
                          >
                            {togglingCoupon === c.code ? "..." : (c.showInCart !== false ? "Hide" : "Show in Cart")}
                          </button>
                        </div>
                      </div>

                      {/* Footer Info */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid #f1f5f9", fontSize: "0.75rem", color: "#64748b" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }}></span>
                          Active • {c.usedCount || 0} redeemed
                        </span>
                        {c.createdAt && (
                          <span>{new Date(c.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Customers & Active Carts */}
        {activeTab === "customers" && (() => {
          const filteredCustomers = customers;
          const totalCustCount = customerStats?.totalCustomers ?? customerTotal ?? customers.length;
          const totalRev = customerStats?.totalRevenue ?? customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
          const activeCartsTotal = customerStats?.activeCartsCount ?? (customers.filter((c) => c.activeCart && c.activeCart.items?.length > 0).length + guestCarts.length);
          const repeatCustCount = customerStats?.repeatCustomers ?? customers.filter((c) => c.totalOrders > 1).length;
          const effectiveTotal = customerTotal || customers.length;
          const effectiveTotalPages = customerTotalPages || Math.ceil(effectiveTotal / customerPageSize) || 1;

          return (
            <div>
              {/* Top Stats Ribbon */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                  <div style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 700, textTransform: "uppercase" }}>Total Customers</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", marginTop: "0.375rem" }}>{totalCustCount.toLocaleString("en-IN")}</div>
                  <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: "0.25rem" }}>Registered Customer Profiles</div>
                </div>
                <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                  <div style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 700, textTransform: "uppercase" }}>Customer Lifetime Value</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#0284c7", marginTop: "0.375rem" }}>{formatPrice(totalRev)}</div>
                  <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: "0.25rem" }}>Total Fulfilled Revenue</div>
                </div>
                <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                  <div style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 700, textTransform: "uppercase" }}>Active Shopping Carts</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#b45309", marginTop: "0.375rem" }}>{activeCartsTotal}</div>
                  <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: "0.25rem" }}>{customerStats?.activeCartsCount ?? 0} Identified + {guestCarts.length} Guests</div>
                </div>
                <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                  <div style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 700, textTransform: "uppercase" }}>Repeat Buyers</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#166534", marginTop: "0.375rem" }}>{repeatCustCount}</div>
                  <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: "0.25rem" }}>Multiple Completed Orders</div>
                </div>
              </div>

              {/* Search, Filter & Controls Console */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem", background: "#ffffff", padding: "1.25rem", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                {/* Row 1: Search Everything + View Mode + Sorting + CSV Export */}
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                  {/* Search Everything Bar */}
                  <div style={{ flex: "1", minWidth: "280px", position: "relative" }}>
                    <input
                      type="text"
                      value={customerSearchQuery}
                      onChange={(e) => {
                        setCustomerSearchQuery(e.target.value);
                        setCustomerPage(1);
                      }}
                      placeholder="Search everything: Name, Mobile, City, Pincode, Order #, or Product..."
                      style={{
                        width: "100%",
                        padding: "0.625rem 1rem 0.625rem 2.25rem",
                        borderRadius: "10px",
                        background: "#f8fafc",
                        border: "1px solid #cbd5e1",
                        color: "#0f172a",
                        fontWeight: 600,
                        fontSize: "0.875rem",
                      }}
                    />
                    <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "0.875rem", color: "#475569" }}>
                      <SearchIcon size={14} color="#475569" />
                    </span>
                    {customerSearchQuery && (
                      <button
                        onClick={() => {
                          setCustomerSearchQuery("");
                          setCustomerPage(1);
                        }}
                        style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: "0.875rem" }}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Dual View Mode Toggle */}
                  <div style={{ display: "inline-flex", background: "#f1f5f9", borderRadius: "10px", padding: "0.25rem", border: "1px solid #e2e8f0" }}>
                    <button
                      onClick={() => setCustomerViewMode("table")}
                      style={{
                        padding: "0.45rem 0.75rem",
                        borderRadius: "8px",
                        border: "none",
                        background: customerViewMode === "table" ? "#0f172a" : "transparent",
                        color: customerViewMode === "table" ? "#ffffff" : "#475569",
                        fontWeight: 700,
                        fontSize: "0.8125rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        transition: "all 0.15s ease",
                      }}
                      title="Compact scannable list view"
                    >
                      <span>☰</span> Short List Table
                    </button>
                    <button
                      onClick={() => setCustomerViewMode("cards")}
                      style={{
                        padding: "0.45rem 0.75rem",
                        borderRadius: "8px",
                        border: "none",
                        background: customerViewMode === "cards" ? "#0f172a" : "transparent",
                        color: customerViewMode === "cards" ? "#ffffff" : "#475569",
                        fontWeight: 700,
                        fontSize: "0.8125rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        transition: "all 0.15s ease",
                      }}
                      title="Rich card grid view"
                    >
                      <span>⊞</span> Visual Cards
                    </button>
                  </div>

                  {/* Dynamic Sorting Select */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <select
                      value={customerSort}
                      onChange={(e) => {
                        setCustomerSort(e.target.value as any);
                        setCustomerPage(1);
                      }}
                      style={{
                        padding: "0.55rem 0.75rem",
                        borderRadius: "10px",
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        color: "#0f172a",
                        fontWeight: 700,
                        fontSize: "0.8125rem",
                        cursor: "pointer",
                      }}
                    >
                      <option value="recent">Sort: Most Recent Activity</option>
                      <option value="ltv_desc">Sort: Highest LTV (VIPs)</option>
                      <option value="ltv_asc">Sort: Lowest LTV</option>
                      <option value="orders_desc">Sort: Most Orders</option>
                      <option value="cart_desc">Sort: Highest Cart Value</option>
                      <option value="name_asc">Sort: Name (A–Z)</option>
                    </select>
                  </div>

                  {/* CSV Export Button */}
                  <button
                    onClick={handleExportCustomersCsv}
                    disabled={exportingCsv}
                    style={{
                      padding: "0.55rem 0.875rem",
                      borderRadius: "10px",
                      border: "none",
                      background: "#166534",
                      color: "#ffffff",
                      fontWeight: 700,
                      fontSize: "0.8125rem",
                      cursor: exportingCsv ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.375rem",
                      transition: "opacity 0.15s ease",
                      opacity: exportingCsv ? 0.7 : 1,
                    }}
                    title="Export customer list to Excel / CSV"
                  >
                    <DownloadIcon size={14} color="#ffffff" />
                    <span>{exportingCsv ? "Exporting..." : "Export CSV"}</span>
                  </button>
                </div>

                {/* Row 2: Filter Pills */}
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center", borderTop: "1px solid #e2e8f0", paddingTop: "0.875rem" }}>
                  {[
                    { id: "all", label: `All Profiles (${customerStats?.totalCustomers ?? effectiveTotal})` },
                    { id: "active_cart", label: `In Cart (${customerStats?.activeCartsCount ?? 0})` },
                    { id: "wishlist", label: `Wishlist (${customerStats?.wishlistedCount ?? 0})` },
                    { id: "repeat", label: `Rating: Repeat (${customerStats?.repeatCustomers ?? 0})` },
                    { id: "high_value", label: `VIP >₹5k (${customerStats?.highValueCount ?? 0})` },
                    { id: "guest_cart", label: `Guest Carts (${guestCarts.length})` },
                  ].map((f) => {
                    const isSel = customerFilter === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => {
                          setCustomerFilter(f.id as typeof customerFilter);
                          setCustomerPage(1);
                        }}
                        style={{
                          padding: "0.45rem 0.85rem",
                          borderRadius: "8px",
                          border: `1px solid ${isSel ? "#0f172a" : "#cbd5e1"}`,
                          fontSize: "0.8125rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          background: isSel ? "#0f172a" : "#ffffff",
                          color: isSel ? "#ffffff" : "#334155",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                  {loadingCustomers && (
                    <span style={{ fontSize: "0.75rem", color: "#0284c7", marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.35rem", fontWeight: 700 }}>
                      Loading...
                    </span>
                  )}
                </div>
              </div>

              {/* View: Guest Carts Only */}
              {customerFilter === "guest_cart" ? (
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a", marginBottom: "1rem" }}>
                    Live Guest / Abandoned Carts ({guestCarts.length})
                  </h3>
                  {guestCarts.length === 0 ? (
                    <div style={{ padding: "3rem", textAlign: "center", background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", color: "#475569" }}>
                      No unplaced guest carts currently active.
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "1rem" }}>
                      {guestCarts.map((cart, idx) => (
                        <div
                          key={cart.sessionId || idx}
                          style={{
                            background: "#ffffff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "16px",
                            padding: "1.25rem",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                              <div>
                                <span style={{ background: "#fefce8", color: "#854d0e", border: "1px solid #fef08a", padding: "0.25rem 0.5rem", borderRadius: "6px", fontSize: "0.6875rem", fontWeight: 700 }}>
                                  Guest Cart
                                </span>
                                <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: "0.375rem", fontFamily: "monospace" }}>
                                  ID: {cart.sessionId.slice(0, 20)}...
                                </div>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: "1.125rem", fontWeight: 900, color: "#0f172a" }}>{formatPrice(cart.subtotal)}</div>
                                <div style={{ fontSize: "0.6875rem", color: "#475569" }}>{cart.itemCount} items</div>
                              </div>
                            </div>

                            <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                              {cart.items.map((it) => (
                                <div key={it.productId} style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "0.5rem", borderRadius: "8px" }}>
                                  {it.image ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={it.image} alt={it.name} style={{ width: "36px", height: "36px", borderRadius: "6px", objectFit: "cover" }} />
                                  ) : (
                                    <div style={{ width: "36px", height: "36px", borderRadius: "6px", background: "#e2e8f0" }} />
                                  )}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                      {it.name}
                                    </div>
                                    <div style={{ fontSize: "0.6875rem", color: "#475569" }}>
                                      Qty: {it.quantity} × {formatPrice(it.sellingPrice)}
                                    </div>
                                  </div>
                                  <div style={{ fontSize: "0.8125rem", fontWeight: 800, color: "#0f172a" }}>
                                    {formatPrice(it.lineTotal)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ fontSize: "0.6875rem", color: "#475569" }}>
                              Last Active: {new Date(cart.updatedAt || Date.now()).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                            <button
                              onClick={() => setSelectedGuestCart(cart)}
                              style={{
                                background: "#0f172a",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "8px",
                                padding: "0.375rem 0.75rem",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              Inspect Cart ↗
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : customerViewMode === "table" ? (
                /* High-Density Short List Table View */
                <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                  {filteredCustomers.length === 0 ? (
                    <div style={{ padding: "3rem", textAlign: "center", color: "#475569" }}>
                      No customer profiles found matching &quot;{customerSearchQuery}&quot;.
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.8125rem" }}>
                        <thead>
                          <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#0f172a", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 800 }}>
                            <th style={{ padding: "0.875rem 1rem", width: "40px" }}>
                              <input
                                type="checkbox"
                                checked={selectedCustomerIds.size > 0 && selectedCustomerIds.size === filteredCustomers.length}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedCustomerIds(new Set(filteredCustomers.map((c) => c.id)));
                                  else setSelectedCustomerIds(new Set());
                                }}
                                style={{ cursor: "pointer" }}
                              />
                            </th>
                            <th style={{ padding: "0.875rem 1rem" }}>Customer</th>
                            <th style={{ padding: "0.875rem 1rem" }}>Location</th>
                            <th style={{ padding: "0.875rem 1rem" }}>Orders</th>
                            <th style={{ padding: "0.875rem 1rem" }}>Lifetime Value</th>
                            <th style={{ padding: "0.875rem 1rem" }}>Active Cart</th>
                            <th style={{ padding: "0.875rem 1rem" }}>Wishlist</th>
                            <th style={{ padding: "0.875rem 1rem" }}>Last Active</th>
                            <th style={{ padding: "0.875rem 1rem", textAlign: "right" }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCustomers.map((cust) => {
                            const primaryAddr = cust.addresses[0];
                            const hasActiveCart = Boolean(cust.activeCart && cust.activeCart.items?.length > 0);
                            const initials = (cust.name || "Customer")
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2);
                            const isSelected = selectedCustomerIds.has(cust.id);

                            return (
                              <tr
                                key={cust.id}
                                style={{
                                  borderBottom: "1px solid #f1f5f9",
                                  background: isSelected ? "#eff6ff" : hasActiveCart ? "#fffbeb" : "transparent",
                                  transition: "background-color 0.1s ease",
                                }}
                              >
                                <td style={{ padding: "0.875rem 1rem" }}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      const next = new Set(selectedCustomerIds);
                                      if (e.target.checked) next.add(cust.id);
                                      else next.delete(cust.id);
                                      setSelectedCustomerIds(next);
                                    }}
                                    style={{ cursor: "pointer" }}
                                  />
                                </td>
                                <td style={{ padding: "0.875rem 1rem" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                    <div
                                      style={{
                                        width: "36px",
                                        height: "36px",
                                        borderRadius: "10px",
                                        background: hasActiveCart ? "#b45309" : cust.totalOrders > 1 ? "#0284c7" : "#475569",
                                        color: "#ffffff",
                                        fontWeight: 800,
                                        fontSize: "0.875rem",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                      }}
                                    >
                                      {initials}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                      <div style={{ fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                                        <span>{cust.name}</span>
                                        {cust.totalOrders > 1 && (
                                          <span style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", padding: "0.1rem 0.35rem", borderRadius: "4px", fontSize: "0.625rem", fontWeight: 700 }}>
                                            Repeat
                                          </span>
                                        )}
                                      </div>
                                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.2rem", flexWrap: "wrap" }}>
                                        <a
                                          href={`https://wa.me/91${cust.mobile}?text=${encodeURIComponent(`Hello ${cust.name}, greetings from ROParts!`)}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          style={{
                                            color: "#166534",
                                            fontWeight: 700,
                                            fontSize: "0.75rem",
                                            textDecoration: "none",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "0.25rem",
                                            background: "#f0fdf4",
                                            border: "1px solid #bbf7d0",
                                            padding: "0.15rem 0.35rem",
                                            borderRadius: "4px",
                                          }}
                                        >
                                          +91 {cust.mobile}
                                        </a>
                                        {cust.email && (
                                          <span style={{ fontSize: "0.6875rem", color: "#475569" }}>{cust.email}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td style={{ padding: "0.875rem 1rem", color: "#0f172a" }}>
                                  {primaryAddr ? (
                                    <div>
                                      <div style={{ fontWeight: 600, color: "#0f172a" }}>
                                        {primaryAddr.city || "Direct"}{primaryAddr.state ? `, ${primaryAddr.state}` : ""}
                                      </div>
                                      {primaryAddr.pincode && (
                                        <span style={{ background: "#f1f5f9", color: "#0f172a", border: "1px solid #cbd5e1", padding: "0.1rem 0.35rem", borderRadius: "4px", fontSize: "0.6875rem", fontWeight: 700, display: "inline-block", marginTop: "0.2rem" }}>
                                          PIN: {primaryAddr.pincode}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span style={{ color: "#475569" }}>—</span>
                                  )}
                                </td>
                                <td style={{ padding: "0.875rem 1rem" }}>
                                  <div style={{ fontWeight: 800, color: "#0f172a" }}>
                                    {cust.totalOrders} {cust.totalOrders === 1 ? "order" : "orders"}
                                  </div>
                                </td>
                                <td style={{ padding: "0.875rem 1rem" }}>
                                  <div style={{ fontWeight: 900, color: "#0284c7", fontSize: "0.9375rem" }}>
                                    {formatPrice(cust.totalSpent)}
                                  </div>
                                </td>
                                <td style={{ padding: "0.875rem 1rem" }}>
                                  {hasActiveCart && cust.activeCart ? (
                                    <span style={{ background: "#fef3c7", border: "1px solid #fde68a", color: "#92400e", padding: "0.25rem 0.5rem", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                                      🛒 {cust.activeCart.itemCount} items ({formatPrice(cust.activeCart.subtotal)})
                                    </span>
                                  ) : (
                                    <span style={{ color: "#475569" }}>—</span>
                                  )}
                                </td>
                                <td style={{ padding: "0.875rem 1rem" }}>
                                  {cust.wishlist && cust.wishlist.length > 0 ? (
                                    <span style={{ background: "#fce7f3", border: "1px solid #fbcfe8", color: "#9d174d", padding: "0.25rem 0.5rem", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                                      ❤️ {cust.wishlist.length}
                                    </span>
                                  ) : (
                                    <span style={{ color: "#475569" }}>—</span>
                                  )}
                                </td>
                                <td style={{ padding: "0.875rem 1rem", color: "#475569", fontSize: "0.75rem" }}>
                                  {cust.lastOrderDate ? new Date(cust.lastOrderDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Registered"}
                                </td>
                                <td style={{ padding: "0.875rem 1rem", textAlign: "right" }}>
                                  <div style={{ display: "inline-flex", gap: "0.35rem", alignItems: "center" }}>
                                    <button
                                      onClick={() => setSelectedCustomer(cust)}
                                      style={{
                                        background: "#0f172a",
                                        color: "#ffffff",
                                        border: "none",
                                        borderRadius: "6px",
                                        padding: "0.35rem 0.6rem",
                                        fontSize: "0.75rem",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                      }}
                                      title="View full customer profile and orders"
                                    >
                                      Inspect ↗
                                    </button>
                                    <button
                                      onClick={async () => {
                                        if (!confirm(`Are you sure you want to delete customer "${cust.name}" (+91 ${cust.mobile})?`)) return;
                                        try {
                                          const res = await fetch(`/api/customers?id=${encodeURIComponent(cust.id)}&mobile=${encodeURIComponent(cust.mobile)}`, {
                                            method: "DELETE",
                                          });
                                          const data = await res.json();
                                          if (data.success) {
                                            setCustomers((prev) => prev.filter((c) => c.id !== cust.id && c.mobile !== cust.mobile));
                                            if (selectedCustomer?.id === cust.id) setSelectedCustomer(null);
                                          } else {
                                            alert(data.error || "Failed to delete customer");
                                          }
                                        } catch {
                                          alert("Network error while deleting customer");
                                        }
                                      }}
                                      style={{
                                        background: "#fee2e2",
                                        color: "#991b1b",
                                        border: "1px solid #fecaca",
                                        borderRadius: "6px",
                                        padding: "0.35rem 0.5rem",
                                        fontSize: "0.75rem",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                      }}
                                      title="Delete customer account"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                /* Visual Cards Grid View */
                <div>
                  {filteredCustomers.length === 0 ? (
                    <div style={{ padding: "3rem", textAlign: "center", background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", color: "#475569" }}>
                      No customer profiles found matching &quot;{customerSearchQuery}&quot;.
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "1rem" }}>
                      {filteredCustomers.map((cust) => {
                        const primaryAddr = cust.addresses[0];
                        const hasActiveCart = Boolean(cust.activeCart && cust.activeCart.items?.length > 0);
                        const initials = (cust.name || "Customer")
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2);

                        return (
                          <div
                            key={cust.id}
                            style={{
                              background: "#ffffff",
                              border: hasActiveCart ? "2px solid #f59e0b" : "1px solid #e2e8f0",
                              borderRadius: "16px",
                              padding: "1.25rem",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between",
                              position: "relative",
                              boxShadow: hasActiveCart ? "0 0 12px rgba(245, 158, 11, 0.12)" : "0 1px 3px rgba(0,0,0,0.02)",
                            }}
                          >
                            <div>
                              {/* Header: Avatar, Name, Badges */}
                              <div style={{ display: "flex", gap: "0.875rem", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                                <div
                                  style={{
                                    width: "44px",
                                    height: "44px",
                                    borderRadius: "12px",
                                    background: hasActiveCart ? "#b45309" : cust.totalOrders > 1 ? "#0284c7" : "#475569",
                                    color: "#ffffff",
                                    fontWeight: 800,
                                    fontSize: "1rem",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                  }}
                                >
                                  {initials}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                                    <span style={{ fontWeight: 800, fontSize: "1rem", color: "#0f172a" }}>{cust.name}</span>
                                    {cust.totalOrders > 1 && (
                                      <span style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", padding: "0.15rem 0.4rem", borderRadius: "4px", fontSize: "0.6875rem", fontWeight: 700 }}>
                                        Rating: Repeat ({cust.totalOrders})
                                      </span>
                                    )}
                                    {hasActiveCart && (
                                      <span style={{ background: "#fefce8", color: "#854d0e", border: "1px solid #fef08a", padding: "0.15rem 0.4rem", borderRadius: "4px", fontSize: "0.6875rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                        In Cart ({cust.activeCart!.itemCount})
                                      </span>
                                    )}
                                    {cust.wishlist && cust.wishlist.length > 0 && (
                                      <span style={{ background: "#fce7f3", color: "#9d174d", border: "1px solid #fbcfe8", padding: "0.15rem 0.4rem", borderRadius: "4px", fontSize: "0.6875rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                        Wishlisted ({cust.wishlist.length})
                                      </span>
                                    )}
                                  </div>

                                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.25rem", flexWrap: "wrap" }}>
                                    <a
                                      href={`https://wa.me/91${cust.mobile}?text=${encodeURIComponent(`Hello ${cust.name}, greetings from ROParts!`)}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{
                                        color: "#166534",
                                        fontWeight: 700,
                                        fontSize: "0.8125rem",
                                        textDecoration: "none",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "0.25rem",
                                        background: "#f0fdf4",
                                        border: "1px solid #bbf7d0",
                                        padding: "0.2rem 0.45rem",
                                        borderRadius: "6px",
                                      }}
                                    >
                                      +91 {cust.mobile}
                                    </a>
                                    {cust.email && (
                                      <span style={{ fontSize: "0.75rem", color: "#475569" }}>{cust.email}</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Customer Stats Cards */}
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.75rem" }}>
                                <div style={{ background: "#f8fafc", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                                  <div style={{ fontSize: "0.6875rem", color: "#475569", fontWeight: 700 }}>TOTAL ORDERS</div>
                                  <div style={{ fontSize: "1rem", fontWeight: 900, color: "#0f172a", marginTop: "0.15rem" }}>
                                    {cust.totalOrders} {cust.totalOrders === 1 ? "order" : "orders"}
                                  </div>
                                </div>
                                <div style={{ background: "#f8fafc", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                                  <div style={{ fontSize: "0.6875rem", color: "#475569", fontWeight: 700 }}>LIFETIME VALUE</div>
                                  <div style={{ fontSize: "1rem", fontWeight: 900, color: "#0284c7", marginTop: "0.15rem" }}>
                                    {formatPrice(cust.totalSpent)}
                                  </div>
                                </div>
                              </div>

                              {/* Active Cart Snapshot */}
                              {hasActiveCart && cust.activeCart && (
                                <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "12px", padding: "0.875rem", marginBottom: "0.75rem" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.625rem" }}>
                                    <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#92400e", display: "flex", alignItems: "center", gap: "0.375rem" }}>
                                      ACTIVE CART ITEMS ({cust.activeCart.items.length})
                                    </span>
                                    <span style={{ fontSize: "0.875rem", fontWeight: 900, color: "#92400e" }}>
                                      {formatPrice(cust.activeCart.subtotal)}
                                    </span>
                                  </div>
                                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    {cust.activeCart.items.map((item) => (
                                      <div key={item.productId} style={{ display: "flex", alignItems: "center", gap: "0.625rem", background: "#ffffff", padding: "0.5rem 0.625rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                                        {item.image ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img src={item.image} alt={item.name} style={{ width: "32px", height: "32px", borderRadius: "6px", objectFit: "cover", flexShrink: 0 }} />
                                        ) : (
                                          <div style={{ width: "32px", height: "32px", borderRadius: "6px", background: "#e2e8f0", flexShrink: 0 }} />
                                        )}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {item.name}
                                          </div>
                                          <div style={{ fontSize: "0.6875rem", color: "#475569", marginTop: "0.1rem" }}>
                                            Qty: <strong style={{ color: "#0f172a" }}>{item.quantity}</strong> × {formatPrice(item.sellingPrice)}
                                          </div>
                                        </div>
                                        <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#0f172a", textAlign: "right" }}>
                                          {formatPrice(item.lineTotal)}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Wishlist Snapshot */}
                              {cust.wishlist && cust.wishlist.length > 0 && (
                                <div style={{ background: "#fdf2f8", border: "1px solid #fbcfe8", borderRadius: "12px", padding: "0.75rem 0.875rem", marginBottom: "0.75rem" }}>
                                  <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#9d174d", marginBottom: "0.35rem", display: "flex", alignItems: "center", gap: "0.375rem" }}>
                                    WISHLIST ITEMS ({cust.wishlist.length})
                                  </div>
                                  <div style={{ fontSize: "0.75rem", color: "#0f172a", lineHeight: 1.4, fontWeight: 500 }}>
                                    {cust.wishlist.map((pid) => {
                                      const prod = products.find((p) => p.id === pid);
                                      return prod ? prod.name : pid;
                                    }).join(" • ")}
                                  </div>
                                </div>
                              )}

                              {/* Primary Address & GPS */}
                              {primaryAddr && (
                                <div style={{ fontSize: "0.75rem", color: "#0f172a", background: "#f8fafc", padding: "0.625rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                                  <div style={{ fontWeight: 700, color: "#475569", marginBottom: "0.15rem", display: "flex", justifyContent: "space-between" }}>
                                    <span>Delivery Address {primaryAddr.name && primaryAddr.name !== cust.name ? `(${primaryAddr.name})` : ""}</span>
                                    {primaryAddr.pincode && <span style={{ color: "#0284c7" }}>PIN: {primaryAddr.pincode}</span>}
                                  </div>
                                  <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 600, color: "#0f172a" }}>
                                    {primaryAddr.line1}{primaryAddr.city ? `, ${primaryAddr.city}` : ""}{primaryAddr.state ? `, ${primaryAddr.state}` : ""}
                                  </div>
                                  {cust.addresses.length > 1 && (
                                    <div style={{ marginTop: "0.35rem", fontSize: "0.6875rem", color: "#0284c7", fontWeight: 700 }}>
                                      +{cust.addresses.length - 1} more address in account
                                    </div>
                                  )}
                                  {primaryAddr.latitude && primaryAddr.longitude && (
                                    <div style={{ marginTop: "0.35rem" }}>
                                      <a
                                        href={primaryAddr.mapUrl || `https://www.google.com/maps?q=${primaryAddr.latitude},${primaryAddr.longitude}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", padding: "0.2rem 0.5rem", borderRadius: "6px", fontSize: "0.6875rem", textDecoration: "none", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                                      >
                                        <PinIcon size={12} color="#166534" />
                                        Open Google Maps GPS Navigation ↗
                                      </a>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Card Footer: Action Buttons */}
                            <div style={{ marginTop: "0.875rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                              <button
                                onClick={() => setSelectedCustomer(cust)}
                                style={{
                                  flex: 1,
                                  minWidth: "160px",
                                  background: "#0f172a",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "8px",
                                  padding: "0.5rem 0.75rem",
                                  fontSize: "0.8125rem",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: "0.375rem",
                                }}
                              >
                                View Profile &amp; Orders ↗
                              </button>
                              <button
                                onClick={async () => {
                                  if (!confirm(`Are you sure you want to delete customer "${cust.name}" (+91 ${cust.mobile})? They will be permanently removed and logged out immediately.`)) return;
                                  try {
                                    const res = await fetch(`/api/customers?id=${encodeURIComponent(cust.id)}&mobile=${encodeURIComponent(cust.mobile)}`, {
                                      method: "DELETE",
                                    });
                                    const data = await res.json();
                                    if (data.success) {
                                      setCustomers((prev) => prev.filter((c) => c.id !== cust.id && c.mobile !== cust.mobile));
                                      if (selectedCustomer?.id === cust.id) setSelectedCustomer(null);
                                    } else {
                                      alert(data.error || "Failed to delete customer");
                                    }
                                  } catch {
                                    alert("Network error while deleting customer");
                                  }
                                }}
                                style={{
                                  background: "#fee2e2",
                                  color: "#991b1b",
                                  border: "1px solid #fecaca",
                                  borderRadius: "8px",
                                  padding: "0.5rem 0.65rem",
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                                title="Delete customer account"
                              >
                                Delete
                              </button>
                              {hasActiveCart && cust.mobile && !cust.mobile.startsWith("Guest") && (
                                <a
                                  href={`https://wa.me/91${cust.mobile}?text=${encodeURIComponent(
                                    `Hello ${cust.name}, we noticed you have ${cust.activeCart?.itemCount} item(s) in your ROParts cart worth ${formatPrice(cust.activeCart?.subtotal || 0)}. Need any assistance? https://roparts.in/cart`
                                  )}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    background: "#166534",
                                    color: "#ffffff",
                                    padding: "0.5rem 0.75rem",
                                    borderRadius: "8px",
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    textDecoration: "none",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.3rem",
                                  }}
                                >
                                  <WhatsAppIcon size={13} color="#ffffff" />
                                  <span>WhatsApp Cart</span>
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* High-Scale Pagination & Range Control Bar */}
              {customerFilter !== "guest_cart" && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.25rem", padding: "0.875rem 1.25rem", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", flexWrap: "wrap", gap: "0.75rem", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                  <div style={{ fontSize: "0.8125rem", color: "#475569" }}>
                    Showing <strong style={{ color: "#0f172a" }}>{filteredCustomers.length > 0 ? (customerPage - 1) * customerPageSize + 1 : 0}</strong> – <strong style={{ color: "#0f172a" }}>{Math.min(customerPage * customerPageSize, effectiveTotal)}</strong> of <strong style={{ color: "#0284c7" }}>{effectiveTotal.toLocaleString("en-IN")}</strong> customer profiles
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginRight: "0.5rem", fontSize: "0.75rem", color: "#475569" }}>
                      <span>Per page:</span>
                      <select
                        value={customerPageSize}
                        onChange={(e) => {
                          setCustomerPageSize(Number(e.target.value));
                          setCustomerPage(1);
                        }}
                        style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a", padding: "0.3rem 0.5rem", borderRadius: "6px", fontSize: "0.75rem", cursor: "pointer", fontWeight: 700 }}
                      >
                        <option value={15}>15</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>

                    <button
                      onClick={() => setCustomerPage(1)}
                      disabled={customerPage <= 1}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        color: customerPage <= 1 ? "#94a3b8" : "#0f172a",
                        padding: "0.35rem 0.65rem",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        cursor: customerPage <= 1 ? "not-allowed" : "pointer",
                      }}
                    >
                      « First
                    </button>
                    <button
                      onClick={() => setCustomerPage((p) => Math.max(1, p - 1))}
                      disabled={customerPage <= 1}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        color: customerPage <= 1 ? "#94a3b8" : "#0f172a",
                        padding: "0.35rem 0.65rem",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        cursor: customerPage <= 1 ? "not-allowed" : "pointer",
                      }}
                    >
                      ‹ Prev
                    </button>

                    <span style={{ fontSize: "0.8125rem", color: "#0f172a", padding: "0 0.5rem", fontWeight: 600 }}>
                      Page <strong style={{ color: "#0284c7" }}>{customerPage}</strong> of <strong style={{ color: "#0f172a" }}>{effectiveTotalPages}</strong>
                    </span>

                    <button
                      onClick={() => setCustomerPage((p) => Math.min(effectiveTotalPages, p + 1))}
                      disabled={customerPage >= effectiveTotalPages}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        color: customerPage >= effectiveTotalPages ? "#94a3b8" : "#0f172a",
                        padding: "0.35rem 0.65rem",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        cursor: customerPage >= effectiveTotalPages ? "not-allowed" : "pointer",
                      }}
                    >
                      Next ›
                    </button>
                    <button
                      onClick={() => setCustomerPage(effectiveTotalPages)}
                      disabled={customerPage >= effectiveTotalPages}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        color: customerPage >= effectiveTotalPages ? "#94a3b8" : "#0f172a",
                        padding: "0.35rem 0.65rem",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        cursor: customerPage >= effectiveTotalPages ? "not-allowed" : "pointer",
                      }}
                    >
                      Last »
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Tab 5: Security */}
        {activeTab === "security" && (
          <div style={{ maxWidth: "600px" }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 800, margin: "0 0 1rem", color: "#0f172a" }}>Google Authenticator MFA</h2>
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "1.5rem" }}>
              <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", flexWrap: "wrap" }}>
                {sessionInfo?.qrDataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sessionInfo.qrDataUrl} alt="QR Code" style={{ width: "140px", height: "140px", borderRadius: "12px", border: "1px solid #e2e8f0" }} />
                )}
                <div>
                  <div style={{ fontWeight: 800, color: "#0f172a", marginBottom: "0.25rem" }}>Permanent Secret Key</div>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.5rem" }}>
                    <code style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "0.375rem 0.75rem", borderRadius: "6px", color: "#0f172a", fontWeight: 700 }}>
                      {sessionInfo?.fixedSecret}
                    </code>
                    <button onClick={copyFixedKey} style={{ background: "#0f172a", color: "#ffffff", border: "none", borderRadius: "6px", padding: "0.375rem 0.75rem", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}>
                      {copiedKey ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: SEARCH ENGINE & SYNONYMS */}
        {activeTab === "search" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Header banner */}
            <div
              style={{
                background: "#ffffff", border: "1px solid #e2e8f0",
                borderRadius: "16px",
                padding: "1.5rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <SearchIcon size={20} color="#0f172a" />
                  <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                    Search Engine & Suggestion Index
                  </h2>
                  <span
                    style={{
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      color: "#166534",
                      fontSize: "0.6875rem",
                      fontWeight: 800,
                      padding: "0.15rem 0.5rem",
                      borderRadius: "999px",
                    }}
                  >
                    Sub-30ms Inverted Index
                  </span>
                </div>
                <p style={{ fontSize: "0.8125rem", color: "#475569", margin: "0.35rem 0 0" }}>
                  Multi-token ranking, typo tolerance (Damerau-Levenshtein), voice normalization, and synonym expansion.
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <button
                  onClick={handleRebuildIndex}
                  disabled={rebuildingIndex}
                  style={{
                    background: rebuildingIndex ? "#94a3b8" : "#0f172a",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "10px",
                    padding: "0.65rem 1.25rem",
                    fontSize: "0.875rem",
                    fontWeight: 800,
                    cursor: rebuildingIndex ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <RefreshIcon size={16} color="#ffffff" className={rebuildingIndex ? "animate-spin" : ""} />
                  <span>{rebuildingIndex ? "Rebuilding Index..." : "Rebuild Inverted Search Index"}</span>
                </button>
              </div>
            </div>

            {rebuildResult && (
              <div
                style={{
                  background: rebuildResult.includes("✅") ? "#f0fdf4" : "#fef2f2",
                  border: `1px solid ${rebuildResult.includes("✅") ? "#bbf7d0" : "#fecaca"}`,
                  color: rebuildResult.includes("✅") ? "#166534" : "#991b1b",
                  padding: "0.75rem 1rem",
                  borderRadius: "10px",
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                }}
              >
                {rebuildResult}
              </div>
            )}

            {/* Grid with 2 columns: Left = Synonyms, Right = Live Search Tester */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              {/* Left Column: Synonyms & Aliases */}
              <div
                style={{
                  background: "#ffffff", border: "1px solid #e2e8f0",
                  borderRadius: "16px",
                  padding: "1.25rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <BookIcon size={18} color="#0f172a" />
                  <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                    Synonyms & Alias Mappings
                  </h3>
                </div>
                <p style={{ fontSize: "0.75rem", color: "#475569", margin: "0 0 1rem" }}>
                  Map terms so searching for a synonym automatically expands to matching catalog parts.
                </p>

                {/* Add Synonym Form */}
                <form
                  onSubmit={handleAddSynonym}
                  style={{
                    background: "#f8fafc", border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "0.875rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div style={{ marginBottom: "0.5rem" }}>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "#0f172a", fontWeight: 700, marginBottom: "0.25rem" }}>
                      Search Keyword / Trigger
                    </label>
                    <input
                      required
                      placeholder="e.g. smps or motor or pipe"
                      value={newSynKey}
                      onChange={(e) => setNewSynKey(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        borderRadius: "8px",
                        background: "#ffffff", border: "1px solid #cbd5e1",
                        color: "#0f172a",
                        fontSize: "0.8125rem",
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: "0.75rem" }}>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "#0f172a", fontWeight: 700, marginBottom: "0.25rem" }}>
                      Target Expansions (comma separated)
                    </label>
                    <input
                      required
                      placeholder="e.g. adapter, power supply, 24v"
                      value={newSynExpansions}
                      onChange={(e) => setNewSynExpansions(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        borderRadius: "8px",
                        background: "#ffffff", border: "1px solid #cbd5e1",
                        color: "#0f172a",
                        fontSize: "0.8125rem",
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={addingSyn}
                    style={{
                      width: "100%",
                      padding: "0.55rem",
                      borderRadius: "8px",
                      border: "none",
                      background: "#0f172a",
                      color: "#ffffff",
                      fontWeight: 800,
                      fontSize: "0.8125rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.35rem",
                    }}
                  >
                    <PlusIcon size={14} color="#ffffff" />
                    <span>{addingSyn ? "Adding..." : "Add Synonym Rule"}</span>
                  </button>
                </form>

                {/* Synonyms List */}
                <div style={{ maxHeight: "360px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {searchDictItems.filter((i) => i.type === "synonym").length === 0 ? (
                    <div style={{ fontSize: "0.8125rem", color: "#475569", textAlign: "center", padding: "1.5rem" }}>
                      No custom synonyms added yet. Default RO domain synonyms are active in search engine.
                    </div>
                  ) : (
                    searchDictItems
                      .filter((i) => i.type === "synonym")
                      .map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            background: "#f8fafc", border: "1px solid #e2e8f0",
                            borderRadius: "10px",
                            padding: "0.625rem 0.875rem",
                          }}
                        >
                          <div>
                            <span
                              style={{
                                background: "#f1f5f9",
                                border: "1px solid #cbd5e1",
                                color: "#0f172a",
                                padding: "0.15rem 0.45rem",
                                borderRadius: "6px",
                                fontWeight: 800,
                                fontSize: "0.75rem",
                              }}
                            >
                              {item.key}
                            </span>
                            <span style={{ margin: "0 0.5rem", color: "#475569", fontSize: "0.75rem" }}>→</span>
                            <span style={{ fontSize: "0.75rem", color: "#0f172a", fontWeight: 600 }}>
                              {(item.expansions || []).join(", ")}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteSynonym(item.key)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#dc2626",
                              cursor: "pointer",
                              fontSize: "0.75rem",
                              padding: "0.2rem 0.5rem",
                            }}
                            title="Delete synonym"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* Right Column: Live Search Engine Debugger */}
              <div
                style={{
                  background: "#ffffff", border: "1px solid #e2e8f0",
                  borderRadius: "16px",
                  padding: "1.25rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <FlaskIcon size={18} color="#0f172a" />
                  <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                    Live Relevance Search Tester
                  </h3>
                </div>
                <p style={{ fontSize: "0.75rem", color: "#475569", margin: "0 0 1rem" }}>
                  Simulate search queries directly against the live AWS inverted index to inspect tokens & scores.
                </p>

                <form onSubmit={handleTestSearch} style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                  <input
                    value={searchTestQuery}
                    onChange={(e) => setSearchTestQuery(e.target.value)}
                    placeholder="Try '1000 gpd membrane' or 'sedimant' or 'pump'..."
                    style={{
                      flex: 1,
                      padding: "0.6rem 0.875rem",
                      borderRadius: "10px",
                      background: "#ffffff", border: "1px solid #cbd5e1",
                      color: "#0f172a",
                      fontSize: "0.875rem",
                    }}
                  />
                  <button
                    type="submit"
                    disabled={testingSearch}
                    style={{
                      background: "#0f172a",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "10px",
                      padding: "0.6rem 1rem",
                      fontWeight: 800,
                      fontSize: "0.875rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                    }}
                  >
                    <SearchIcon size={16} color="#ffffff" />
                    <span>{testingSearch ? "Testing..." : "Test"}</span>
                  </button>
                </form>

                {searchTestResult && (
                  <div
                    style={{
                      background: "#f8fafc", border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      padding: "1rem",
                      maxHeight: "360px",
                      overflowY: "auto",
                    }}
                  >
                    {searchTestResult.keywords && (
                      <div style={{ marginBottom: "0.75rem" }}>
                        <div style={{ fontSize: "0.6875rem", color: "#475569", textTransform: "uppercase", fontWeight: 700 }}>
                          Parsed Search Tokens
                        </div>
                        <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                          {searchTestResult.keywords.map((kw: string, i: number) => (
                            <span
                              key={i}
                              style={{
                                background: "#f1f5f9",
                                border: "1px solid #cbd5e1",
                                color: "#0f172a",
                                padding: "0.15rem 0.45rem",
                                borderRadius: "4px",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                              }}
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ fontSize: "0.6875rem", color: "#475569", textTransform: "uppercase", fontWeight: 700, marginBottom: "0.5rem" }}>
                      Top Ranked Results ({searchTestResult.total || 0})
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {(searchTestResult.results || []).slice(0, 5).map((prod: any, i: number) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            background: "#ffffff",
                            padding: "0.5rem 0.75rem",
                            borderRadius: "8px",
                            border: "1px solid #e2e8f0",
                          }}
                        >
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: "0.8125rem", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {prod.name}
                            </div>
                            <div style={{ fontSize: "0.6875rem", color: "#475569" }}>
                              {prod.sku} • {prod.brand || "Drop Purity"}
                            </div>
                          </div>
                          <div style={{ textAlign: "right", marginLeft: "0.75rem" }}>
                            <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#166534" }}>
                              Score: {prod.relevanceScore}
                            </div>
                            <div style={{ fontSize: "0.6875rem", color: "#0f172a", fontWeight: 700 }}>
                              {formatPrice(prod.sellingPrice)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal: Update Dispatch */}
      {selectedOrder && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", zIndex: 100 }}>
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "20px", maxWidth: "500px", width: "100%", padding: "1.5rem", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <LightningIcon size={18} color="#0f172a" />
                <h3 style={{ fontSize: "1.125rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>Update Order #{selectedOrder.orderNumber}</h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", color: "#0f172a", width: "30px", height: "30px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <CloseIcon size={14} color="#0f172a" />
              </button>
            </div>

            {orderActionMsg && (
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", padding: "0.5rem", borderRadius: "8px", fontSize: "0.75rem", marginBottom: "1rem", fontWeight: 700 }}>
                {orderActionMsg}
              </div>
            )}

            {(() => {
              const selAddr = selectedOrder.shippingAddress;
              const rawAccMob = String(selectedOrder.customerMobile || (selectedOrder as any).customer?.mobile || "").replace(/\D/g, "");
              const accMob = rawAccMob.length >= 10 ? rawAccMob.slice(-10) : (rawAccMob || selAddr?.mobile || "");
              const accName = selectedOrder.customerName || (selectedOrder as any).customer?.name || selAddr?.name || "Customer";
              const isDiff = Boolean(selAddr?.name && selAddr.name.trim().toLowerCase() !== accName.trim().toLowerCase());
              return (
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0.75rem", marginBottom: "1rem", fontSize: "0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isDiff ? "0.35rem" : "0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <UserIcon size={14} color="#0f172a" />
                      <span style={{ color: "#475569", fontWeight: 700 }}>Account Owner:</span>
                    </div>
                    <span style={{ color: "#0f172a", fontWeight: 800 }}>{accName} (+91 {accMob})</span>
                  </div>
                  {isDiff && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e2e8f0", paddingTop: "0.35rem", marginBottom: "0.35rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <PinIcon size={14} color="#b45309" />
                        <span style={{ color: "#b45309", fontWeight: 700 }}>Deliver To (Recipient):</span>
                      </div>
                      <span style={{ color: "#0f172a", fontWeight: 800 }}>{selAddr?.name} (+91 {selAddr?.mobile})</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e2e8f0", paddingTop: "0.35rem", color: "#475569" }}>
                    <span>Destination:</span>
                    <span style={{ color: "#0f172a", fontWeight: 600 }}>{selAddr?.city} — {selAddr?.pincode}</span>
                  </div>
                </div>
              );
            })()}

            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
              <button
                type="button"
                onClick={() => {
                  setPreviewInvoiceOrder(selectedOrder);
                }}
                style={{
                  flex: 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem",
                  background: "#f1f5f9",
                  color: "#0f172a",
                  border: "1px solid #cbd5e1",
                  borderRadius: "10px",
                  padding: "0.55rem 0.75rem",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                <InvoiceIcon size={14} color="#0f172a" />
                <span>View Tax Invoice</span>
              </button>
              <a
                href={`/invoice/${selectedOrder.orderNumber}?download=1`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem",
                  background: "#f0fdf4",
                  color: "#166534",
                  border: "1px solid #bbf7d0",
                  borderRadius: "10px",
                  padding: "0.55rem 0.75rem",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  textDecoration: "none",
                  cursor: "pointer",
                }}
                title="Download / Print Official GST Invoice PDF"
              >
                <DownloadIcon size={14} color="#166534" />
                <span>Download PDF ⤓</span>
              </a>
            </div>

            <form onSubmit={handleSaveOrderUpdate}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.375rem" }}>Status *</label>
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as OrderStatus)} style={{ width: "100%", padding: "0.625rem", borderRadius: "10px", background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a", fontWeight: 600 }}>
                  <option value="confirmed">Confirmed</option>
                  <option value="packed">Packed</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.25rem" }}>Courier Boy Name</label>
                <input value={editBoyName} onChange={(e) => setEditBoyName(e.target.value)} style={{ width: "100%", padding: "0.5rem", borderRadius: "8px", background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a" }} />
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.25rem" }}>Courier Boy Mobile</label>
                <input value={editBoyPhone} onChange={(e) => setEditBoyPhone(e.target.value)} style={{ width: "100%", padding: "0.5rem", borderRadius: "8px", background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a" }} />
              </div>

              <button type="submit" disabled={savingOrder} style={{ width: "100%", padding: "0.75rem", borderRadius: "12px", border: "none", background: "#0f172a", color: "#ffffff", fontWeight: 800, cursor: "pointer" }}>
                {savingOrder ? "Saving..." : "Save Order →"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Full GST Invoice Document Preview & Download */}
      {previewInvoiceOrder && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", zIndex: 110 }}>
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "20px", maxWidth: "880px", width: "100%", maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <div style={{ background: "#0f172a", color: "#ffffff", padding: "0.4rem", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <InvoiceIcon size={18} color="#ffffff" />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.125rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                    Tax Invoice — #{previewInvoiceOrder.orderNumber}
                  </h3>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    Official GST Tax Invoice • Drop Technologies PVT LTD (GSTIN: 29AAMCD6292Q1ZK)
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <a
                  href={`/invoice/${previewInvoiceOrder.orderNumber}?download=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: "#0f172a",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "0.5rem 0.85rem",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    cursor: "pointer",
                  }}
                  title="Print / Save as PDF via Browser"
                >
                  <PrinterIcon size={14} color="#ffffff" />
                  <span>Print / Download PDF</span>
                </a>
                <a
                  href={`/invoice/${previewInvoiceOrder.orderNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: "#ffffff",
                    color: "#334155",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    padding: "0.5rem 0.75rem",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    cursor: "pointer",
                  }}
                  title="Open Standalone Page in New Tab"
                >
                  <ExternalLinkIcon size={13} color="#334155" />
                  <span>Open Full Page</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewInvoiceOrder(null)}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    color: "#0f172a",
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  title="Close Invoice Preview"
                >
                  <CloseIcon size={16} color="#0f172a" />
                </button>
              </div>
            </div>

            {/* Document Content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", background: "#f1f5f9" }}>
              <InvoiceDocument
                invoice={createTaxInvoiceFromOrder(previewInvoiceOrder)}
                showPrintButton={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Product */}
      {showNewProductModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", zIndex: 100 }}>
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "24px", maxWidth: "760px", width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)" }}>
            {/* Header */}
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <PlusIcon size={20} color="#0f172a" />
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                    Add New Product
                  </h3>
                </div>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: "#475569" }}>
                  Create and publish a new RO spare part to the storefront catalog.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewProductModal(false)}
                style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", color: "#0f172a", width: "32px", height: "32px", borderRadius: "8px", fontSize: "1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <CloseIcon size={16} color="#0f172a" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleCreateProduct} style={{ padding: "1.5rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Category Segment Selection */}
              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.5rem" }}>
                  1. RO Category Segment *
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
                  {[
                    { id: "domestic", label: "Domestic RO", desc: "Home purifiers (75-100 GPD)", Icon: HomeIcon },
                    { id: "commercial", label: "Commercial RO", desc: "Offices & Cafes (25-100 LPH)", Icon: BuildingIcon },
                    { id: "industrial", label: "Industrial RO", desc: "Plants (250-5000+ LPH)", Icon: FactoryIcon },
                  ].map((seg) => {
                    const isSel = newProdMainCategory === seg.id;
                    const SvgIcon = seg.Icon;
                    return (
                      <button
                        key={seg.id}
                        type="button"
                        onClick={() => setNewProdMainCategory(seg.id as any)}
                        style={{
                          padding: "0.75rem",
                          borderRadius: "12px",
                          border: isSel ? "2px solid #0f172a" : "1px solid #cbd5e1",
                          background: isSel ? "#f1f5f9" : "#ffffff",
                          color: "#0f172a",
                          textAlign: "left",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontWeight: 800, fontSize: "0.875rem", color: "#0f172a" }}>
                          <SvgIcon size={16} color="#0f172a" />
                          <span>{seg.label}</span>
                        </div>
                        <div style={{ fontSize: "0.6875rem", marginTop: "0.2rem", color: "#475569" }}>
                          {seg.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Product Identity */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.35rem" }}>
                    Product Name *
                  </label>
                  <input
                    required
                    placeholder="e.g. 100 GPD RO Membrane High TDS"
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.875rem",
                      borderRadius: "10px",
                      background: "#ffffff",
                      border: `1px solid ${newProdName.trim() && products.some((p) => p.name.trim().toLowerCase() === newProdName.trim().toLowerCase()) ? "#dc2626" : "#cbd5e1"}`,
                      color: "#0f172a",
                      fontSize: "0.875rem",
                    }}
                  />
                  {newProdName.trim() && (
                    <div style={{ marginTop: "0.35rem", fontSize: "0.75rem", color: "#0f172a", display: "flex", alignItems: "center", gap: "0.35rem", background: "#f8fafc", padding: "0.3rem 0.5rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                      <LinkIcon size={14} color="#0f172a" />
                      <span>Live Endpoint:</span>
                      <code style={{ color: "#0369a1", fontWeight: 700 }}>
                        /product/{newProdName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}
                      </code>
                    </div>
                  )}
                  {newProdName.trim() && products.some((p) => p.name.trim().toLowerCase() === newProdName.trim().toLowerCase()) && (
                    <div style={{ color: "#dc2626", fontSize: "0.75rem", fontWeight: 700, marginTop: "0.35rem" }}>
                      A product with this name already exists in your catalog!
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.35rem" }}>
                    Component Type
                  </label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    style={{ width: "100%", padding: "0.65rem 0.875rem", borderRadius: "10px", background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a", fontSize: "0.875rem" }}
                  >
                    <option value="cat-membrane">RO Membrane</option>
                    <option value="cat-filters">Filter Cartridges (PP, CTO, Pre-Carbon)</option>
                    <option value="cat-pumps">Booster Pumps</option>
                    <option value="cat-smps">SMPS Power Adapters</option>
                    <option value="cat-valves">Valves & Switches</option>
                    <option value="cat-housings">Filter Housings</option>
                    <option value="cat-fittings">Fittings & Connectors</option>
                    <option value="cat-tanks">Pressure Tanks</option>
                    <option value="cat-instruments">Flow Meters & Gauges</option>
                  </select>
                </div>
              </div>

              {/* Pricing, Stock & Brand */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.75rem", background: "#f8fafc", padding: "1rem", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.35rem" }}>
                    Selling Price (₹) *
                  </label>
                  <input
                    required
                    type="number"
                    step="any"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a", fontWeight: 800, fontSize: "0.9375rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.35rem" }}>
                    MRP (₹) *
                  </label>
                  <input
                    required
                    type="number"
                    step="any"
                    value={newProdMrp}
                    onChange={(e) => setNewProdMrp(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a", fontSize: "0.9375rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.35rem" }}>
                    Live Stock *
                  </label>
                  <input
                    required
                    type="number"
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a", fontWeight: 700, fontSize: "0.9375rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.35rem" }}>
                    Brand Name
                  </label>
                  <input
                    placeholder="e.g. Drop Purity"
                    value={newProdBrand}
                    onChange={(e) => setNewProdBrand(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a", fontSize: "0.875rem" }}
                  />
                </div>
              </div>

              {/* Product Descriptions */}
              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.35rem" }}>
                  Short Summary Description
                </label>
                <input
                  placeholder="Brief 1-line overview for catalog cards (e.g. High rejection 100 GPD membrane for TDS up to 2500 ppm)"
                  value={newProdShortDesc}
                  onChange={(e) => setNewProdShortDesc(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem 0.875rem", borderRadius: "10px", background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a", fontSize: "0.8125rem", marginBottom: "0.75rem" }}
                />

                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.35rem" }}>
                  Detailed Product Description & Features
                </label>
                <textarea
                  rows={3}
                  placeholder="Detailed specifications, installation guidelines, compatibility and performance details..."
                  value={newProdLongDesc}
                  onChange={(e) => setNewProdLongDesc(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem 0.875rem", borderRadius: "10px", background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a", fontSize: "0.8125rem", resize: "vertical" }}
                />
              </div>

              {/* Specifications: Weight, Dimensions & Keywords */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.35rem" }}>
                    Weight (grams)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 500"
                    value={newProdWeight}
                    onChange={(e) => setNewProdWeight(e.target.value)}
                    style={{ width: "100%", padding: "0.6rem 0.875rem", borderRadius: "10px", background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a", fontSize: "0.8125rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.35rem" }}>
                    Dimensions (L×W×H)
                  </label>
                  <input
                    placeholder="e.g. 30 x 5 x 5 cm"
                    value={newProdDimensions}
                    onChange={(e) => setNewProdDimensions(e.target.value)}
                    style={{ width: "100%", padding: "0.6rem 0.875rem", borderRadius: "10px", background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a", fontSize: "0.8125rem" }}
                  />
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                    <label style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#0f172a" }}>
                      Search Keywords / Tags ({newProdKeywords.length})
                    </label>
                    <span style={{ fontSize: "0.6875rem", color: "#475569" }}>Press Enter ↵ to add</span>
                  </div>

                  <div
                    style={{
                      background: "#ffffff", border: "1px solid #cbd5e1",
                      borderRadius: "10px",
                      padding: "0.35rem 0.5rem",
                      minHeight: "42px",
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: "0.35rem",
                    }}
                  >
                    {newProdKeywords.map((kw, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: "#f1f5f9",
                          border: "1px solid #cbd5e1",
                          color: "#0f172a",
                          borderRadius: "6px",
                          padding: "0.2rem 0.5rem",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                        }}
                      >
                        <span>{kw}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyword(idx, newProdKeywords, setNewProdKeywords)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#475569",
                            cursor: "pointer",
                            padding: "0 0.1rem",
                            fontSize: "0.75rem",
                            lineHeight: 1,
                          }}
                          title="Remove keyword"
                        >
                          ✕
                        </button>
                      </span>
                    ))}

                    <input
                      placeholder={newProdKeywords.length === 0 ? "Type keyword & press Enter..." : "Add more..."}
                      value={newProdKeywordInput}
                      onChange={(e) => setNewProdKeywordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          handleAddKeyword(newProdKeywordInput, newProdKeywords, setNewProdKeywords, setNewProdKeywordInput);
                        } else if (e.key === "Backspace" && !newProdKeywordInput && newProdKeywords.length > 0) {
                          handleRemoveKeyword(newProdKeywords.length - 1, newProdKeywords, setNewProdKeywords);
                        }
                      }}
                      style={{
                        flex: 1,
                        minWidth: "130px",
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        color: "#0f172a",
                        fontSize: "0.8125rem",
                        padding: "0.25rem 0.35rem",
                      }}
                    />

                    {newProdKeywordInput.trim() && (
                      <button
                        type="button"
                        onClick={() => handleAddKeyword(newProdKeywordInput, newProdKeywords, setNewProdKeywords, setNewProdKeywordInput)}
                        style={{
                          background: "#0f172a",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "6px",
                          padding: "0.2rem 0.5rem",
                          fontSize: "0.6875rem",
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        + Add
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Photo Uploads: Max 1MB each, up to 4 photos max */}
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <CameraIcon size={16} color="#0f172a" />
                    <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#0f172a" }}>
                      Product Photos ({newProdImages.length}/4)
                    </span>
                    <span style={{ fontSize: "0.6875rem", color: "#475569", marginLeft: "0.5rem" }}>
                      (Max 1MB per photo • Up to 4 photos)
                    </span>
                  </div>
                  {newProdImages.length < 4 && (
                    <label style={{ background: "#0f172a", color: "#ffffff", padding: "0.35rem 0.75rem", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                      <span>Upload Files</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        style={{ display: "none" }}
                        onChange={(e) => handleImageUpload(e.target.files, newProdImages, setNewProdImages, setNewProdImageError)}
                      />
                    </label>
                  )}
                </div>

                {newProdImageError && (
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "0.5rem", borderRadius: "8px", fontSize: "0.75rem", marginBottom: "0.75rem" }}>
                    {newProdImageError}
                  </div>
                )}

                {/* Uploaded Images Preview Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" }}>
                  {newProdImages.map((imgUrl, idx) => (
                    <div key={idx} style={{ position: "relative", aspectRatio: "1/1", borderRadius: "10px", overflow: "hidden", border: "1px solid #cbd5e1", background: "#f1f5f9" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imgUrl} alt={`Product ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <button
                        type="button"
                        onClick={() => setNewProdImages(newProdImages.filter((_, i) => i !== idx))}
                        style={{ position: "absolute", top: "4px", right: "4px", background: "rgba(0,0,0,0.75)", color: "#fff", border: "none", width: "22px", height: "22px", borderRadius: "50%", cursor: "pointer", fontSize: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center" }}
                        title="Remove photo"
                      >
                        ✕
                      </button>
                      {idx === 0 && (
                        <span style={{ position: "absolute", bottom: "4px", left: "4px", background: "#166534", color: "#fff", fontSize: "0.625rem", padding: "0.1rem 0.35rem", borderRadius: "4px", fontWeight: 700 }}>
                          Main
                        </span>
                      )}
                    </div>
                  ))}

                  {/* Empty Slots */}
                  {Array.from({ length: Math.max(0, 4 - newProdImages.length) }).map((_, i) => (
                    <label
                      key={`empty-${i}`}
                      style={{
                        aspectRatio: "1/1",
                        borderRadius: "10px",
                        border: "2px dashed #cbd5e1",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#475569",
                        fontSize: "0.6875rem",
                        cursor: "pointer",
                        background: "#ffffff",
                      }}
                    >
                      <CameraIcon size={20} color="#94a3b8" />
                      <span style={{ marginTop: "0.25rem" }}>Photo {newProdImages.length + i + 1}</span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={(e) => handleImageUpload(e.target.files, newProdImages, setNewProdImages, setNewProdImageError)}
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Submit & Cancel Buttons */}
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setShowNewProductModal(false)}
                  style={{ flex: 1, padding: "0.875rem", borderRadius: "12px", border: "1px solid #cbd5e1", background: "transparent", color: "#0f172a", fontWeight: 700, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  style={{ flex: 2, padding: "0.875rem", borderRadius: "12px", border: "none", background: "#0f172a", color: "#ffffff", fontWeight: 800, fontSize: "1rem", cursor: "pointer" }}
                >
                  {savingProduct ? "Saving Product..." : "✓ Save & Publish Product →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Coupon */}
      {showNewCouponModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", zIndex: 100 }}>
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "22px", maxWidth: "500px", width: "100%", maxHeight: "92vh", overflowY: "auto", padding: "1.5rem 1.75rem", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", flexShrink: 0 }}>
                  <CouponIcon size={20} color="#ffffff" />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.125rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>Create Promo Coupon</h3>
                  <p style={{ margin: "0.15rem 0 0", fontSize: "0.75rem", color: "#64748b" }}>Configure promotional discount, minimum spend & rules.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewCouponModal(false)}
                style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", color: "#0f172a", width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <CloseIcon size={14} color="#0f172a" />
              </button>
            </div>

            <form onSubmit={handleCreateCoupon}>
              {/* Field 1: Coupon Code */}
              <div style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                  <label style={{ fontSize: "0.75rem", color: "#0f172a", fontWeight: 700 }}>COUPON CODE *</label>
                  <button
                    type="button"
                    onClick={generateRandomCouponCode}
                    style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "0.15rem 0.5rem", fontSize: "0.7rem", fontWeight: 700, color: "#0284c7", cursor: "pointer" }}
                  >
                    ⚡ Auto Generate
                  </button>
                </div>
                <input
                  required
                  value={newCouponCode}
                  onChange={(e) => setNewCouponCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
                  placeholder="e.g. ROFEST20"
                  style={{
                    width: "100%",
                    padding: "0.625rem 0.75rem",
                    borderRadius: "8px",
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    color: "#0f172a",
                    fontWeight: 800,
                    fontFamily: "monospace, monospace",
                    letterSpacing: "0.05em",
                    fontSize: "0.9375rem",
                    textTransform: "uppercase",
                  }}
                />
                <span style={{ display: "block", fontSize: "0.7rem", color: "#64748b", marginTop: "0.25rem" }}>
                  Customers will enter this code at cart & checkout. Letters, numbers, hyphens only.
                </span>
              </div>

              {/* Field 2: Discount Type & Value */}
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#0f172a", fontWeight: 700, marginBottom: "0.35rem" }}>DISCOUNT VALUE *</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => setNewCouponType("percentage")}
                    style={{
                      padding: "0.5rem",
                      borderRadius: "8px",
                      border: newCouponType === "percentage" ? "1px solid #0f172a" : "1px solid #cbd5e1",
                      background: newCouponType === "percentage" ? "#0f172a" : "#f8fafc",
                      color: newCouponType === "percentage" ? "#ffffff" : "#475569",
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.35rem",
                    }}
                  >
                    <span>%</span> Percentage Off
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCouponType("fixed")}
                    style={{
                      padding: "0.5rem",
                      borderRadius: "8px",
                      border: newCouponType === "fixed" ? "1px solid #0f172a" : "1px solid #cbd5e1",
                      background: newCouponType === "fixed" ? "#0f172a" : "#f8fafc",
                      color: newCouponType === "fixed" ? "#ffffff" : "#475569",
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.35rem",
                    }}
                  >
                    <span>₹</span> Flat Cash Off
                  </button>
                </div>

                <div style={{ position: "relative" }}>
                  <input
                    required
                    type="number"
                    min="1"
                    max={newCouponType === "percentage" ? "90" : "50000"}
                    value={newCouponDiscount}
                    onChange={(e) => setNewCouponDiscount(e.target.value)}
                    placeholder={newCouponType === "percentage" ? "e.g. 10" : "e.g. 100"}
                    style={{
                      width: "100%",
                      padding: "0.625rem 0.75rem",
                      paddingRight: newCouponType === "percentage" ? "2.25rem" : "0.75rem",
                      paddingLeft: newCouponType === "fixed" ? "2rem" : "0.75rem",
                      borderRadius: "8px",
                      background: "#ffffff",
                      border: "1px solid #cbd5e1",
                      color: "#0f172a",
                      fontWeight: 700,
                      fontSize: "0.9375rem",
                    }}
                  />
                  {newCouponType === "percentage" ? (
                    <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", fontWeight: 800, color: "#64748b", fontSize: "0.875rem" }}>
                      %
                    </span>
                  ) : (
                    <span style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", fontWeight: 800, color: "#64748b", fontSize: "0.875rem" }}>
                      ₹
                    </span>
                  )}
                </div>
              </div>

              {/* Field 3: Minimum Order Amount */}
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#0f172a", fontWeight: 700, marginBottom: "0.25rem" }}>
                  MINIMUM ORDER AMOUNT (₹)
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", fontWeight: 800, color: "#64748b", fontSize: "0.875rem" }}>
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={newCouponMinOrder}
                    onChange={(e) => setNewCouponMinOrder(e.target.value)}
                    placeholder="0 (No minimum order required)"
                    style={{
                      width: "100%",
                      padding: "0.625rem 0.75rem 0.625rem 2rem",
                      borderRadius: "8px",
                      background: "#ffffff",
                      border: "1px solid #cbd5e1",
                      color: "#0f172a",
                      fontWeight: 700,
                      fontSize: "0.9375rem",
                    }}
                  />
                </div>
                <span style={{ display: "block", fontSize: "0.7rem", color: "#64748b", marginTop: "0.25rem" }}>
                  Coupon only unlocks if customer cart subtotal equals or exceeds this amount.
                </span>

                {/* Quick Presets */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.4rem" }}>
                  {[
                    { label: "No Min", val: "0" },
                    { label: "₹499", val: "499" },
                    { label: "₹999", val: "999" },
                    { label: "₹1,499", val: "1499" },
                    { label: "₹2,499", val: "2499" },
                  ].map((preset) => {
                    const isSelected = newCouponMinOrder === preset.val || (preset.val === "0" && (!newCouponMinOrder || newCouponMinOrder === "0"));
                    return (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => setNewCouponMinOrder(preset.val === "0" ? "" : preset.val)}
                        style={{
                          background: isSelected ? "#0f172a" : "#f1f5f9",
                          color: isSelected ? "#ffffff" : "#475569",
                          border: isSelected ? "1px solid #0f172a" : "1px solid #e2e8f0",
                          borderRadius: "6px",
                          padding: "0.2rem 0.5rem",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Field 4: Coupon Description */}
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#0f172a", fontWeight: 700, marginBottom: "0.25rem" }}>
                  COUPON DESCRIPTION (CUSTOMER-FACING)
                </label>
                <textarea
                  rows={2}
                  value={newCouponDescription}
                  onChange={(e) => setNewCouponDescription(e.target.value)}
                  placeholder="e.g. 10% off on all domestic RO membranes and filters above ₹499"
                  style={{
                    width: "100%",
                    padding: "0.625rem 0.75rem",
                    borderRadius: "8px",
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    color: "#0f172a",
                    fontSize: "0.8125rem",
                    lineHeight: 1.4,
                    resize: "none",
                  }}
                />
                <span style={{ display: "block", fontSize: "0.7rem", color: "#64748b", marginTop: "0.25rem" }}>
                  Displayed in customer cart suggestions and checkout summary.
                </span>
              </div>

              {/* Field 5: Show in Customer Suggestions */}
              <div style={{ marginBottom: "1.25rem", padding: "0.75rem 1rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
                <div>
                  <div style={{ fontSize: "0.8125rem", fontWeight: 800, color: "#0f172a" }}>Show in Customer Apply Suggestions</div>
                  <div style={{ fontSize: "0.7rem", color: "#64748b" }}>Show 1-click apply chip to customers in cart & checkout</div>
                </div>
                <label style={{ position: "relative", display: "inline-block", width: "42px", height: "24px", cursor: "pointer", flexShrink: 0 }}>
                  <input
                    type="checkbox"
                    checked={newCouponShowInCart}
                    onChange={(e) => setNewCouponShowInCart(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundColor: newCouponShowInCart ? "#0f172a" : "#cbd5e1",
                      borderRadius: "24px",
                      transition: "0.2s",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        left: newCouponShowInCart ? "20px" : "3px",
                        top: "3px",
                        width: "18px",
                        height: "18px",
                        backgroundColor: "#ffffff",
                        borderRadius: "50%",
                        transition: "0.2s",
                      }}
                    />
                  </span>
                </label>
              </div>

              {/* Live Preview Card */}
              <div style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: "12px", padding: "0.875rem 1rem", marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Live Customer Preview
                  </span>
                  <span style={{ fontSize: "0.65rem", fontWeight: 700, color: newCouponShowInCart ? "#166534" : "#475569", background: newCouponShowInCart ? "#dcfce7" : "#f1f5f9", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>
                    {newCouponShowInCart ? "👁️ Shown in Cart" : "🔒 Hidden from Cart"}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0.4rem 0.6rem", textAlign: "center", minWidth: "80px" }}>
                    <div style={{ fontSize: "1.125rem", fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>
                      {newCouponType === "fixed" ? `₹${newCouponDiscount || "0"}` : `${newCouponDiscount || "10"}%`}
                    </div>
                    <div style={{ fontSize: "0.625rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginTop: "0.15rem" }}>
                      OFF
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span style={{ fontFamily: "monospace, monospace", fontWeight: 900, fontSize: "0.875rem", color: "#0284c7" }}>
                        {newCouponCode.trim() || "COUPONCODE"}
                      </span>
                      <span style={{ fontSize: "0.6875rem", color: "#475569", background: "#ffffff", border: "1px solid #e2e8f0", padding: "0.1rem 0.35rem", borderRadius: "4px" }}>
                        {Number(newCouponMinOrder) > 0 ? `Min. ₹${Number(newCouponMinOrder).toLocaleString("en-IN")}` : "No Min."}
                      </span>
                    </div>
                    <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {newCouponDescription.trim() || "Promotional discount applied at checkout."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => setShowNewCouponModal(false)}
                  style={{ flex: 1, padding: "0.75rem", borderRadius: "10px", border: "1px solid #cbd5e1", background: "#ffffff", color: "#0f172a", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCoupon || !newCouponCode.trim()}
                  style={{
                    flex: 2,
                    padding: "0.75rem",
                    borderRadius: "10px",
                    border: "none",
                    background: savingCoupon || !newCouponCode.trim() ? "#94a3b8" : "#0f172a",
                    color: "#ffffff",
                    fontWeight: 800,
                    fontSize: "0.875rem",
                    cursor: savingCoupon || !newCouponCode.trim() ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.35rem",
                  }}
                >
                  {savingCoupon ? "Creating Coupon..." : "Save & Activate Coupon →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Full Product Edit */}
      {editingProductFull && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", zIndex: 100 }}>
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "24px", maxWidth: "760px", width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)" }}>
            {/* Header */}
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <EditIcon size={20} color="#0f172a" />
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                    Edit Product: {editingProductFull.sku}
                  </h3>
                </div>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: "#475569" }}>
                  Update full specifications, category segment, pricing, and photos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProductFull(null)}
                style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", color: "#0f172a", width: "32px", height: "32px", borderRadius: "8px", fontSize: "1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <CloseIcon size={16} color="#0f172a" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveProductFull} style={{ padding: "1.5rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Category Segment Selection */}
              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.5rem" }}>
                  1. RO Category Segment *
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
                  {[
                    { id: "domestic", label: "Domestic RO", desc: "Home purifiers (75-100 GPD)", Icon: HomeIcon },
                    { id: "commercial", label: "Commercial RO", desc: "Offices & Cafes (25-100 LPH)", Icon: BuildingIcon },
                    { id: "industrial", label: "Industrial RO", desc: "Plants (250-5000+ LPH)", Icon: FactoryIcon },
                  ].map((seg) => {
                    const isSel = fullEditMainCategory === seg.id;
                    const SvgIcon = seg.Icon;
                    return (
                      <button
                        key={seg.id}
                        type="button"
                        onClick={() => setFullEditMainCategory(seg.id as any)}
                        style={{
                          padding: "0.75rem",
                          borderRadius: "12px",
                          border: isSel ? "2px solid #0f172a" : "1px solid #cbd5e1",
                          background: isSel ? "#f1f5f9" : "#ffffff",
                          color: "#0f172a",
                          textAlign: "left",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontWeight: 800, fontSize: "0.875rem", color: "#0f172a" }}>
                          <SvgIcon size={16} color="#0f172a" />
                          <span>{seg.label}</span>
                        </div>
                        <div style={{ fontSize: "0.6875rem", marginTop: "0.2rem", color: "#475569" }}>
                          {seg.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Product Identity */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.35rem" }}>
                    Product Name *
                  </label>
                  <input
                    required
                    value={fullEditName}
                    onChange={(e) => setFullEditName(e.target.value)}
                    style={{ width: "100%", padding: "0.65rem 0.875rem", borderRadius: "10px", background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a", fontSize: "0.875rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.35rem" }}>
                    Component Type
                  </label>
                  <select
                    value={fullEditCategory}
                    onChange={(e) => setFullEditCategory(e.target.value)}
                    style={{ width: "100%", padding: "0.65rem 0.875rem", borderRadius: "10px", background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a", fontSize: "0.875rem" }}
                  >
                    <option value="cat-membrane">RO Membrane</option>
                    <option value="cat-filters">Filter Cartridges (PP, CTO, Pre-Carbon)</option>
                    <option value="cat-pumps">Booster Pumps</option>
                    <option value="cat-smps">SMPS Power Adapters</option>
                    <option value="cat-valves">Valves & Switches</option>
                    <option value="cat-housings">Filter Housings</option>
                    <option value="cat-fittings">Fittings & Connectors</option>
                    <option value="cat-tanks">Pressure Tanks</option>
                    <option value="cat-instruments">Flow Meters & Gauges</option>
                  </select>
                </div>
              </div>

              {/* Pricing, Stock & Status */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: "0.75rem", background: "#f8fafc", padding: "1rem", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.35rem" }}>
                    Selling Price (₹) *
                  </label>
                  <input
                    required
                    type="number"
                    step="any"
                    value={fullEditPrice}
                    onChange={(e) => setFullEditPrice(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a", fontWeight: 800, fontSize: "0.9375rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.35rem" }}>
                    MRP (₹) *
                  </label>
                  <input
                    required
                    type="number"
                    step="any"
                    value={fullEditMrp}
                    onChange={(e) => setFullEditMrp(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a", fontSize: "0.9375rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.35rem" }}>
                    Live Stock *
                  </label>
                  <input
                    required
                    type="number"
                    value={fullEditStock}
                    onChange={(e) => setFullEditStock(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a", fontWeight: 700, fontSize: "0.9375rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.35rem" }}>
                    Brand Name
                  </label>
                  <input
                    value={fullEditBrand}
                    onChange={(e) => setFullEditBrand(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a", fontSize: "0.875rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.35rem" }}>
                    Status
                  </label>
                  <select
                    value={fullEditStatus}
                    onChange={(e) => setFullEditStatus(e.target.value as any)}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a", fontSize: "0.875rem" }}
                  >
                    <option value="active">Active (Live)</option>
                    <option value="draft">Draft (Hidden)</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Product Descriptions */}
              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.35rem" }}>
                  Short Summary Description
                </label>
                <input
                  value={fullEditShortDesc}
                  onChange={(e) => setFullEditShortDesc(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem 0.875rem", borderRadius: "10px", background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a", fontSize: "0.8125rem", marginBottom: "0.75rem" }}
                />

                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.35rem" }}>
                  Detailed Product Description & Features
                </label>
                <textarea
                  rows={3}
                  value={fullEditLongDesc}
                  onChange={(e) => setFullEditLongDesc(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem 0.875rem", borderRadius: "10px", background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a", fontSize: "0.8125rem", resize: "vertical" }}
                />
              </div>

              {/* Specifications: Weight, Dimensions & Keywords */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.35rem" }}>
                    Weight (grams)
                  </label>
                  <input
                    type="number"
                    value={fullEditWeight}
                    onChange={(e) => setFullEditWeight(e.target.value)}
                    style={{ width: "100%", padding: "0.6rem 0.875rem", borderRadius: "10px", background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a", fontSize: "0.8125rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.35rem" }}>
                    Dimensions (L×W×H)
                  </label>
                  <input
                    value={fullEditDimensions}
                    onChange={(e) => setFullEditDimensions(e.target.value)}
                    style={{ width: "100%", padding: "0.6rem 0.875rem", borderRadius: "10px", background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a", fontSize: "0.8125rem" }}
                  />
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                    <label style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#0f172a" }}>
                      Search Keywords / Tags ({fullEditKeywords.length})
                    </label>
                    <span style={{ fontSize: "0.6875rem", color: "#475569" }}>Press Enter ↵ to add</span>
                  </div>

                  <div
                    style={{
                      background: "#ffffff", border: "1px solid #cbd5e1",
                      borderRadius: "10px",
                      padding: "0.35rem 0.5rem",
                      minHeight: "42px",
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: "0.35rem",
                    }}
                  >
                    {fullEditKeywords.map((kw, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: "#f1f5f9",
                          border: "1px solid #cbd5e1",
                          color: "#0f172a",
                          borderRadius: "6px",
                          padding: "0.2rem 0.5rem",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                        }}
                      >
                        <span>{kw}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyword(idx, fullEditKeywords, setFullEditKeywords)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#475569",
                            cursor: "pointer",
                            padding: "0 0.1rem",
                            fontSize: "0.75rem",
                            lineHeight: 1,
                          }}
                          title="Remove keyword"
                        >
                          ✕
                        </button>
                      </span>
                    ))}

                    <input
                      placeholder={fullEditKeywords.length === 0 ? "Type keyword & press Enter..." : "Add more..."}
                      value={fullEditKeywordInput}
                      onChange={(e) => setFullEditKeywordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          handleAddKeyword(fullEditKeywordInput, fullEditKeywords, setFullEditKeywords, setFullEditKeywordInput);
                        } else if (e.key === "Backspace" && !fullEditKeywordInput && fullEditKeywords.length > 0) {
                          handleRemoveKeyword(fullEditKeywords.length - 1, fullEditKeywords, setFullEditKeywords);
                        }
                      }}
                      style={{
                        flex: 1,
                        minWidth: "130px",
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        color: "#0f172a",
                        fontSize: "0.8125rem",
                        padding: "0.25rem 0.35rem",
                      }}
                    />

                    {fullEditKeywordInput.trim() && (
                      <button
                        type="button"
                        onClick={() => handleAddKeyword(fullEditKeywordInput, fullEditKeywords, setFullEditKeywords, setFullEditKeywordInput)}
                        style={{
                          background: "#0f172a",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "6px",
                          padding: "0.2rem 0.5rem",
                          fontSize: "0.6875rem",
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        + Add
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Photo Uploads: Max 1MB each, up to 4 photos max */}
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <CameraIcon size={16} color="#0f172a" />
                    <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#0f172a" }}>
                      Product Photos ({fullEditImages.length}/4)
                    </span>
                    <span style={{ fontSize: "0.6875rem", color: "#475569", marginLeft: "0.5rem" }}>
                      (Max 1MB per photo • Up to 4 photos)
                    </span>
                  </div>
                  {fullEditImages.length < 4 && (
                    <label style={{ background: "#0f172a", color: "#ffffff", padding: "0.35rem 0.75rem", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                      <span>Upload Files</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        style={{ display: "none" }}
                        onChange={(e) => handleImageUpload(e.target.files, fullEditImages, setFullEditImages, setFullEditImageError)}
                      />
                    </label>
                  )}
                </div>

                {fullEditImageError && (
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "0.5rem", borderRadius: "8px", fontSize: "0.75rem", marginBottom: "0.75rem" }}>
                    {fullEditImageError}
                  </div>
                )}

                {/* Uploaded Images Preview Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" }}>
                  {fullEditImages.map((imgUrl, idx) => (
                    <div key={idx} style={{ position: "relative", aspectRatio: "1/1", borderRadius: "10px", overflow: "hidden", border: "1px solid #cbd5e1", background: "#f1f5f9" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imgUrl} alt={`Product ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <button
                        type="button"
                        onClick={() => setFullEditImages(fullEditImages.filter((_, i) => i !== idx))}
                        style={{ position: "absolute", top: "4px", right: "4px", background: "rgba(0,0,0,0.75)", color: "#fff", border: "none", width: "22px", height: "22px", borderRadius: "50%", cursor: "pointer", fontSize: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center" }}
                        title="Remove photo"
                      >
                        ✕
                      </button>
                      {idx === 0 && (
                        <span style={{ position: "absolute", bottom: "4px", left: "4px", background: "#166534", color: "#fff", fontSize: "0.625rem", padding: "0.1rem 0.35rem", borderRadius: "4px", fontWeight: 700 }}>
                          Main
                        </span>
                      )}
                    </div>
                  ))}

                  {/* Empty Slots */}
                  {Array.from({ length: Math.max(0, 4 - fullEditImages.length) }).map((_, i) => (
                    <label
                      key={`empty-${i}`}
                      style={{
                        aspectRatio: "1/1",
                        borderRadius: "10px",
                        border: "2px dashed #cbd5e1",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#475569",
                        fontSize: "0.6875rem",
                        cursor: "pointer",
                        background: "#ffffff",
                      }}
                    >
                      <CameraIcon size={20} color="#94a3b8" />
                      <span style={{ marginTop: "0.25rem" }}>Photo {fullEditImages.length + i + 1}</span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={(e) => handleImageUpload(e.target.files, fullEditImages, setFullEditImages, setFullEditImageError)}
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Submit & Cancel Buttons */}
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setEditingProductFull(null)}
                  style={{ flex: 1, padding: "0.875rem", borderRadius: "12px", border: "1px solid #cbd5e1", background: "transparent", color: "#0f172a", fontWeight: 700, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  style={{ flex: 2, padding: "0.875rem", borderRadius: "12px", border: "none", background: "#0f172a", color: "#ffffff", fontWeight: 800, fontSize: "1rem", cursor: "pointer" }}
                >
                  {savingProduct ? "Saving Changes..." : "✓ Save Product Changes →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Customer Profile & Order History & Active Cart Details */}
      {selectedCustomer && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", zIndex: 110 }}>
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "24px", maxWidth: "860px", width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)" }}>
            {/* Modal Header */}
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "#0f172a", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem", fontWeight: 800 }}>
                  {(selectedCustomer.name || "C").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <h3 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>{selectedCustomer.name}</h3>
                    {selectedCustomer.totalOrders > 1 && (
                      <span style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", padding: "0.2rem 0.5rem", borderRadius: "6px", fontSize: "0.6875rem", fontWeight: 700 }}>
                        Repeat Buyer ({selectedCustomer.totalOrders} orders)
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.25rem", fontSize: "0.8125rem", color: "#475569" }}>
                    <span>+91 {selectedCustomer.mobile}</span>
                    {selectedCustomer.email && <span>• {selectedCustomer.email}</span>}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <a
                  href={`https://wa.me/91${selectedCustomer.mobile}?text=${encodeURIComponent(`Hello ${selectedCustomer.name}, this is ROParts support!`)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: "#22c55e",
                    color: "#ffffff",
                    padding: "0.5rem 0.875rem",
                    borderRadius: "10px",
                    fontWeight: 700,
                    fontSize: "0.8125rem",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.375rem",
                  }}
                >
                  <WhatsAppIcon size={16} color="#ffffff" />
                  <span>WhatsApp</span>
                </a>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", color: "#0f172a", width: "36px", height: "36px", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <CloseIcon size={18} color="#0f172a" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "1.5rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {/* Lifetime Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem" }}>
                <div style={{ background: "#f8fafc", padding: "0.75rem 1rem", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "0.6875rem", color: "#475569", fontWeight: 700 }}>TOTAL ORDERS</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginTop: "0.25rem" }}>{selectedCustomer.totalOrders}</div>
                </div>
                <div style={{ background: "#f8fafc", padding: "0.75rem 1rem", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "0.6875rem", color: "#475569", fontWeight: 700 }}>LIFETIME REVENUE</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginTop: "0.25rem" }}>{formatPrice(selectedCustomer.totalSpent)}</div>
                </div>
                <div style={{ background: "#f8fafc", padding: "0.75rem 1rem", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "0.6875rem", color: "#475569", fontWeight: 700 }}>LAST ORDER</div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "#0f172a", marginTop: "0.375rem" }}>
                    {selectedCustomer.lastOrderDate ? new Date(selectedCustomer.lastOrderDate).toLocaleDateString("en-IN") : "None"}
                  </div>
                </div>
                <div style={{ background: "#f8fafc", padding: "0.75rem 1rem", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "0.6875rem", color: "#475569", fontWeight: 700 }}>ACTIVE CART STATUS</div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 800, color: selectedCustomer.activeCart ? "#b45309" : "#475569", marginTop: "0.375rem" }}>
                    {selectedCustomer.activeCart ? `${selectedCustomer.activeCart.itemCount} items (${formatPrice(selectedCustomer.activeCart.subtotal)})` : "Empty Cart"}
                  </div>
                </div>
                <div style={{ background: "#f8fafc", padding: "0.75rem 1rem", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "0.6875rem", color: "#475569", fontWeight: 700 }}>WISHLIST STATUS</div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 800, color: selectedCustomer.wishlist && selectedCustomer.wishlist.length > 0 ? "#0f172a" : "#475569", marginTop: "0.375rem" }}>
                    {selectedCustomer.wishlist && selectedCustomer.wishlist.length > 0 ? `${selectedCustomer.wishlist.length} item(s)` : "Empty Wishlist"}
                  </div>
                </div>
              </div>

              {/* SECTION: Active Cart Details */}
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <CartIcon size={18} color="#0f172a" />
                    <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>
                      Current Active Cart {selectedCustomer.activeCart ? `(${selectedCustomer.activeCart.items.length} items)` : "(Empty)"}
                    </h4>
                  </div>
                  {selectedCustomer.activeCart && selectedCustomer.activeCart.items.length > 0 && (
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                      <span style={{ fontSize: "1.125rem", fontWeight: 800, color: "#0f172a" }}>
                        Subtotal: {formatPrice(selectedCustomer.activeCart.subtotal)}
                      </span>
                      <a
                        href={`https://wa.me/91${selectedCustomer.mobile}?text=${encodeURIComponent(
                          `Hello ${selectedCustomer.name}, we noticed you have ${selectedCustomer.activeCart.itemCount} item(s) in your cart (${selectedCustomer.activeCart.items.map(i => i.name).join(", ")}) worth ${formatPrice(selectedCustomer.activeCart.subtotal)}. Would you like us to help complete your order? https://roparts.in/cart`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          background: "#0f172a",
                          color: "#ffffff",
                          padding: "0.35rem 0.75rem",
                          borderRadius: "8px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                        }}
                      >
                        <WhatsAppIcon size={14} color="#ffffff" />
                        <span>Send Cart Reminder on WhatsApp</span>
                      </a>
                    </div>
                  )}
                </div>

                {!selectedCustomer.activeCart || selectedCustomer.activeCart.items.length === 0 ? (
                  <div style={{ padding: "1.5rem", textAlign: "center", color: "#475569", fontSize: "0.875rem" }}>
                    Customer currently does not have any items sitting in their cart.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {selectedCustomer.activeCart.items.map((item) => (
                      <div key={item.productId} style={{ display: "flex", alignItems: "center", gap: "1rem", background: "#ffffff", padding: "0.75rem 1rem", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                        {item.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.image} alt={item.name} style={{ width: "48px", height: "48px", borderRadius: "8px", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: "48px", height: "48px", borderRadius: "8px", background: "#f1f5f9" }} />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.9375rem" }}>{item.name}</div>
                          <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: "0.15rem" }}>
                            SKU: {item.sku || "N/A"} • Stock: {item.stock ?? "In stock"}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "0.8125rem", color: "#475569" }}>
                            {item.quantity} × {formatPrice(item.sellingPrice)}
                          </div>
                          <div style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>
                            {formatPrice(item.lineTotal)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION: Customer Wishlist Details */}
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <HeartIcon size={18} color="#0f172a" />
                    <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>
                      Customer Wishlist {selectedCustomer.wishlist ? `(${selectedCustomer.wishlist.length} items)` : "(0 items)"}
                    </h4>
                  </div>
                  {selectedCustomer.wishlist && selectedCustomer.wishlist.length > 0 && selectedCustomer.mobile && !selectedCustomer.mobile.startsWith("Guest") && (
                    <a
                      href={`https://wa.me/91${selectedCustomer.mobile}?text=${encodeURIComponent(
                        `Hello ${selectedCustomer.name}, we noticed you saved ${selectedCustomer.wishlist.length} item(s) to your ROParts wishlist! Are you looking for any specific discounts or fast dispatch? https://roparts.in/wishlist`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        background: "#0f172a",
                        color: "#ffffff",
                        padding: "0.4rem 0.75rem",
                        borderRadius: "8px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.375rem",
                      }}
                    >
                      <WhatsAppIcon size={14} color="#ffffff" />
                      <span>WhatsApp Special Offer</span>
                    </a>
                  )}
                </div>

                {!selectedCustomer.wishlist || selectedCustomer.wishlist.length === 0 ? (
                  <div style={{ padding: "1.5rem", textAlign: "center", color: "#475569", fontSize: "0.875rem" }}>
                    Customer currently has no items saved in their wishlist.
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.75rem" }}>
                    {selectedCustomer.wishlist.map((pid) => {
                      const prod = products.find((p) => p.id === pid);
                      return (
                        <div
                          key={pid}
                          style={{
                            background: "#ffffff", border: "1px solid #e2e8f0",
                            borderRadius: "12px",
                            padding: "0.75rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                          }}
                        >
                          {prod?.images?.[0] ? (
                            <img
                              src={prod.images[0]}
                              alt={prod.name}
                              style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                            />
                          ) : (
                            <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <WrenchIcon size={16} color="#0f172a" />
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.8125rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {prod ? prod.name : pid}
                            </div>
                            {prod && (
                              <div style={{ fontSize: "0.75rem", color: "#0f172a", fontWeight: 800, marginTop: "0.15rem" }}>
                                {formatPrice(prod.sellingPrice)}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SECTION: Complete Past Orders */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                  <OrderBoxIcon size={18} color="#0f172a" />
                  <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>
                    Past Orders History ({selectedCustomer.orders.length})
                  </h4>
                </div>
                {selectedCustomer.orders.length === 0 ? (
                  <div style={{ padding: "1.5rem", textAlign: "center", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", color: "#475569" }}>
                    No completed orders found for this customer.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {selectedCustomer.orders.map((ord) => (
                      <div key={ord.id || ord.orderNumber} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "1.25rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem" }}>
                          <div>
                            <span style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.9375rem" }}>#{ord.orderNumber}</span>
                            <span style={{ fontSize: "0.75rem", color: "#475569", marginLeft: "0.75rem" }}>
                              {new Date(ord.createdAt).toLocaleString("en-IN")}
                            </span>
                          </div>
                          <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
                            <button
                              type="button"
                              onClick={() => setPreviewInvoiceOrder(ord as any)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.25rem",
                                background: "#ffffff",
                                color: "#0f172a",
                                border: "1px solid #cbd5e1",
                                borderRadius: "6px",
                                padding: "0.25rem 0.5rem",
                                fontSize: "0.6875rem",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                              title="View GST Invoice"
                            >
                              <InvoiceIcon size={12} color="#0f172a" />
                              <span>Invoice</span>
                            </button>
                            <a
                              href={`/invoice/${ord.orderNumber}?download=1`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.25rem",
                                background: "#f0fdf4",
                                color: "#166534",
                                border: "1px solid #bbf7d0",
                                borderRadius: "6px",
                                padding: "0.25rem 0.5rem",
                                fontSize: "0.6875rem",
                                fontWeight: 700,
                                textDecoration: "none",
                              }}
                              title="Download / Print PDF"
                            >
                              <DownloadIcon size={12} color="#166534" />
                              <span>PDF</span>
                            </a>
                            <span
                              style={{
                                padding: "0.25rem 0.5rem",
                                borderRadius: "6px",
                                fontSize: "0.75rem",
                                fontWeight: 800,
                                background:
                                  ord.status === "delivered" ? "#f0fdf4" : ord.status === "cancelled" ? "#fef2f2" : "#eff6ff",
                                border: `1px solid ${ord.status === "delivered" ? "#bbf7d0" : ord.status === "cancelled" ? "#fecaca" : "#bfdbfe"}`,
                                color: ord.status === "delivered" ? "#166534" : ord.status === "cancelled" ? "#991b1b" : "#1d4ed8",
                              }}
                            >
                              {ord.status.toUpperCase()}
                            </span>
                            <span style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>
                              {formatPrice(ord.total)}
                            </span>
                          </div>
                        </div>

                        {/* If order recipient differs from customer account owner */}
                        {(() => {
                          const recName = ord.recipientName || ord.shippingAddress?.name;
                          const recMob = ord.recipientMobile || ord.shippingAddress?.mobile;
                          const isDiff = Boolean(recName && recName.trim().toLowerCase() !== selectedCustomer.name.trim().toLowerCase());
                          if (!isDiff) return null;
                          return (
                            <div style={{ margin: "0.25rem 0 0.625rem", background: "#fffbeb", border: "1px solid #fef3c7", borderRadius: "8px", padding: "0.35rem 0.6rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                              <div style={{ fontSize: "0.75rem", color: "#b45309", fontWeight: 700 }}>
                                Delivered to recipient address: <strong style={{ color: "#0f172a" }}>{recName}</strong> {recMob ? `(+91 ${recMob})` : ""}
                              </div>
                              {recMob && (
                                <a
                                  href={`https://wa.me/91${String(recMob).replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(`Hello ${recName}, update on package for ROParts.in Order #${ord.orderNumber}: Status is ${ord.status.toUpperCase()}.`)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ background: "#22c55e", color: "#ffffff", padding: "0.15rem 0.4rem", borderRadius: "4px", fontSize: "0.6875rem", fontWeight: 700, textDecoration: "none" }}
                                >
                                  WhatsApp Recipient
                                </a>
                              )}
                            </div>
                          );
                        })()}

                        {/* Order Items */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          {ord.items.map((it, idx) => (
                            <div key={idx} style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.8125rem" }}>
                              {it.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={it.image} alt={it.name} style={{ width: "32px", height: "32px", borderRadius: "6px", objectFit: "cover" }} />
                              ) : (
                                <div style={{ width: "32px", height: "32px", borderRadius: "6px", background: "#f1f5f9" }} />
                              )}
                              <div style={{ flex: 1, color: "#0f172a", fontWeight: 600 }}>
                                {it.name} <span style={{ color: "#475569", fontWeight: 400 }}>× {it.quantity}</span>
                              </div>
                              <div style={{ fontWeight: 800, color: "#0f172a" }}>{formatPrice(it.lineTotal || (it.unitPrice || 0) * it.quantity)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION: Shipping Addresses & GPS Registry */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                  <PinIcon size={18} color="#0f172a" />
                  <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>
                    Delivery Addresses &amp; GPS Registry ({selectedCustomer.addresses.length})
                  </h4>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
                  {selectedCustomer.addresses.map((addr, idx) => (
                    <div key={idx} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1rem" }}>
                      <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.875rem" }}>{addr.name || selectedCustomer.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: "0.15rem" }}>+91 {addr.mobile || selectedCustomer.mobile}</div>
                      <div style={{ fontSize: "0.75rem", color: "#0f172a", fontWeight: 600, marginTop: "0.375rem", lineHeight: 1.4 }}>
                        {addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}, {addr.city} — {addr.pincode}
                      </div>
                      {addr.latitude && addr.longitude && (
                        <div style={{ marginTop: "0.5rem" }}>
                          <a
                            href={addr.mapUrl || `https://www.google.com/maps?q=${addr.latitude},${addr.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              background: "#f0fdf4",
                              border: "1px solid #bbf7d0",
                              color: "#166534",
                              padding: "0.25rem 0.5rem",
                              borderRadius: "6px",
                              fontSize: "0.75rem",
                              textDecoration: "none",
                              fontWeight: 700,
                              display: "inline-block",
                            }}
                          >
                            Open Google Maps Navigation ↗
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setSelectedCustomer(null)}
                style={{ background: "#0f172a", color: "#ffffff", border: "none", padding: "0.625rem 1.25rem", borderRadius: "10px", fontWeight: 700, cursor: "pointer" }}
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Guest Cart Inspection */}
      {selectedGuestCart && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", zIndex: 110 }}>
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "24px", maxWidth: "600px", width: "100%", maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)" }}>
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <CartIcon size={18} color="#0f172a" />
                  <h3 style={{ fontSize: "1.125rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>Guest Cart Inspection</h3>
                </div>
                <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: "0.25rem", fontFamily: "monospace" }}>Session: {selectedGuestCart.sessionId}</div>
              </div>
              <button
                onClick={() => setSelectedGuestCart(null)}
                style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", color: "#0f172a", width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <CloseIcon size={16} color="#0f172a" />
              </button>
            </div>
            <div style={{ padding: "1.25rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {selectedGuestCart.items.map((item) => (
                <div key={item.productId} style={{ display: "flex", alignItems: "center", gap: "0.875rem", background: "#f8fafc", padding: "0.75rem", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt={item.name} style={{ width: "42px", height: "42px", borderRadius: "6px", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "42px", height: "42px", borderRadius: "6px", background: "#f1f5f9" }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.875rem", fontWeight: 800, color: "#0f172a" }}>{item.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "#475569" }}>Qty: {item.quantity} × {formatPrice(item.sellingPrice)}</div>
                  </div>
                  <div style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>{formatPrice(item.lineTotal)}</div>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem", padding: "0.75rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px" }}>
                <span style={{ fontWeight: 800, color: "#0f172a" }}>Total Cart Value</span>
                <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>{formatPrice(selectedGuestCart.subtotal)}</span>
              </div>
            </div>
            <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setSelectedGuestCart(null)}
                style={{ background: "#0f172a", color: "#ffffff", border: "none", padding: "0.5rem 1rem", borderRadius: "8px", fontWeight: 700, cursor: "pointer" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
