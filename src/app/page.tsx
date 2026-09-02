"use client";

import { useState, useEffect, useCallback } from "react";
import type { Order, OrderStatus, FulfillmentType, Product, Coupon } from "@/lib/types";

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

  const [activeTab, setActiveTab] = useState<"orders" | "products" | "coupons" | "customers" | "security">("orders");
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [orderFilter, setOrderFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
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
      const [anaRes, ordRes, prodRes, cpnRes] = await Promise.all([
        fetch("/api/analytics").then((r) => r.json()).catch(() => ({ data: null })),
        fetch("/api/orders").then((r) => r.json()).catch(() => ({ data: { orders: [] } })),
        fetch("/api/products").then((r) => r.json()).catch(() => ({ data: { products: [] } })),
        fetch("/api/coupons").then((r) => r.json()).catch(() => ({ data: { coupons: [] } })),
      ]);

      if (anaRes.data) setAnalytics(anaRes.data);
      if (ordRes.data?.orders) setOrders(ordRes.data.orders);
      if (prodRes.data?.products) setProducts(prodRes.data.products);
      if (cpnRes.data?.coupons) setCoupons(cpnRes.data.coupons);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (sessionInfo?.authenticated) {
      loadDashboardData();
    }
  }, [sessionInfo, loadDashboardData]);

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
      setProductActionMsg(`🔍 Verifying live database & storefront state...`);

      // Verify from database API
      await new Promise((r) => setTimeout(r, 500));
      const verifyRes = await fetch(`/api/products?t=${Date.now()}`, { cache: "no-store" });
      const verifyJson = await verifyRes.json();
      const freshProducts: Product[] = verifyJson.data?.products || [];
      const verifiedItem = freshProducts.find((p) => p.id === id);

      if (verifiedItem && verifiedItem.sellingPrice === priceInPaise) {
        setProducts(freshProducts);
        setProductActionMsg(`✅ VERIFIED IN DATABASE: "${targetName}" is live at ₹${editPrice} (Stock: ${stockCount})`);
      } else {
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, sellingPrice: priceInPaise, stock: stockCount } : p))
        );
        setProductActionMsg(`✓ Saved! Price: ₹${editPrice} | Stock: ${stockCount} (Sync active)`);
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
      setProductActionMsg(`🔍 Verifying updates directly from database...`);

      await new Promise((r) => setTimeout(r, 500));
      const verifyRes = await fetch(`/api/products?t=${Date.now()}`, { cache: "no-store" });
      const verifyJson = await verifyRes.json();
      const freshProducts: Product[] = verifyJson.data?.products || [];
      const verifiedItem = freshProducts.find((p) => p.id === targetId);

      if (verifiedItem && verifiedItem.sellingPrice === priceInPaise) {
        setProducts(freshProducts);
        setProductActionMsg(`✅ VERIFIED IN DATABASE: "${targetName}" updated & live at ₹${fullEditPrice} (Stock: ${stockCount})`);
      } else {
        setProductActionMsg(`✓ Product "${targetName}" updated successfully!`);
      }

      setTimeout(() => setProductActionMsg(""), 6000);
      await loadDashboardData();
    } catch (err: any) {
      setProductActionMsg(`❌ Network error updating product: ${err?.message || err}`);
    } finally {
      setSavingProduct(false);
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

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
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
          images: newProdImages.length > 0 ? newProdImages : ["https://placehold.co/600x600/1a365d/ffffff?text=RO+Part"],
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

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCouponCode.trim().toUpperCase(),
          value: Number(newCouponDiscount),
        }),
      });
      setShowNewCouponModal(false);
      setNewCouponCode("");
      await loadDashboardData();
    } catch {
      alert("Failed to create coupon");
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
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a", color: "#fff" }}>
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
            background: "#1e293b",
            border: "1px solid #334155",
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

          <h1 style={{ fontSize: "1.375rem", fontWeight: 800, margin: "0 0 0.375rem", color: "#fff" }}>
            ROParts Master Admin
          </h1>

          {/* STEP 1 */}
          {authStep === "credentials" && (
            <form onSubmit={handlePasswordStep} style={{ textAlign: "left", marginTop: "1.25rem" }}>
              <div style={{ fontSize: "0.8125rem", color: "#94a3b8", textAlign: "center", marginBottom: "1.25rem" }}>
                Step 1 of 2: Enter Master Admin Credentials
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "0.375rem" }}>
                  Admin User ID / Mobile / Email
                </label>
                <input
                  type="text"
                  required
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="admin or 7979784087"
                  style={{ width: "100%", padding: "0.6875rem 0.875rem", borderRadius: "10px", background: "#0f172a", border: "1px solid #475569", color: "#fff", fontSize: "0.875rem" }}
                />
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.375rem" }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#cbd5e1" }}>Password</label>
                  <button type="button" onClick={() => setAuthStep("forgot_password")} style={{ background: "none", border: "none", color: "#38bdf8", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}>
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
                    style={{ width: "100%", padding: "0.6875rem 0.875rem", borderRadius: "10px", background: "#0f172a", border: "1px solid #475569", color: "#fff", fontSize: "0.875rem" }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#94a3b8", fontSize: "0.8125rem", cursor: "pointer" }}>
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
              <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: "0 0 1.25rem" }}>
                Step 2: Enter 6-digit dynamic code from <strong>Google Authenticator</strong>.
              </p>

              {/* MFA Lock Badge (QR Code Hidden for Security) */}
              <div
                style={{
                  background: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: "16px",
                  padding: "1.25rem 1rem",
                  marginBottom: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <div style={{ fontSize: "2.25rem", marginBottom: "0.375rem" }}>📱</div>
                <div style={{ fontSize: "0.875rem", fontWeight: 800, color: "#fff" }}>
                  Google Authenticator MFA
                </div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.25rem" }}>
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
                        color: "#38bdf8",
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
                  <button type="button" onClick={() => setAuthStep("credentials")} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "0.75rem", cursor: "pointer" }}>
                    ← Back to Step 1
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* FORGOT PASSWORD */}
          {authStep === "forgot_password" && (
            <div style={{ marginTop: "1.25rem", textAlign: "left" }}>
              <div style={{ fontSize: "0.8125rem", color: "#38bdf8", fontWeight: 700, marginBottom: "0.5rem", textAlign: "center" }}>
                🔑 Password Reset via WhatsApp OTP
              </div>
              <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "1rem", textAlign: "center" }}>
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
                <div style={{ background: "#14532d", color: "#86efac", padding: "0.5rem", borderRadius: "8px", fontSize: "0.75rem", marginBottom: "1rem", fontWeight: 700 }}>
                  {resetMsg}
                </div>
              )}

              <form onSubmit={handleVerifyResetPassword}>
                <div style={{ marginBottom: "0.75rem" }}>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "0.25rem" }}>
                    6-Digit WhatsApp OTP *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter 6-digit OTP"
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "8px", background: "#0f172a", border: "1px solid #475569", color: "#fff", fontSize: "0.875rem" }}
                  />
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "0.25rem" }}>
                    New Password * (min 8 chars)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "8px", background: "#0f172a", border: "1px solid #475569", color: "#fff", fontSize: "0.875rem" }}
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
                  <button type="button" onClick={() => setAuthStep("credentials")} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "0.75rem", cursor: "pointer" }}>
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
  });

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#f8fafc", paddingBottom: "4rem" }}>
      {/* Header */}
      <header style={{ background: "#1e293b", borderBottom: "1px solid #334155", padding: "0.875rem 1.5rem", position: "sticky", top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.125rem" }}>
              🛡️
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "1rem", color: "#fff", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span>ROParts Master Admin</span>
                <span style={{ background: "#166534", color: "#86efac", fontSize: "0.625rem", fontWeight: 800, padding: "0.125rem 0.375rem", borderRadius: "999px" }}>
                  MFA Active
                </span>
              </div>
              <div style={{ fontSize: "0.6875rem", color: "#94a3b8" }}>Admin: {sessionInfo?.admin?.email} | Mobile: +91 7979784087</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button onClick={loadDashboardData} disabled={refreshing} style={{ background: "#334155", color: "#f8fafc", border: "none", borderRadius: "8px", padding: "0.375rem 0.75rem", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}>
              {refreshing ? "Refreshing..." : "🔄 Refresh"}
            </button>
            <button onClick={handleLogout} style={{ background: "#7f1d1d", color: "#fecaca", border: "none", borderRadius: "8px", padding: "0.375rem 0.75rem", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}>
              Logout ✕
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: 1400, margin: "0 auto", padding: "1.5rem" }}>
        {/* KPI Tiles */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "16px", padding: "1rem" }}>
            <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 700 }}>TOTAL REVENUE</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#38bdf8", marginTop: "0.25rem" }}>
              {formatPrice(analytics?.totalSales || 0)}
            </div>
          </div>
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "16px", padding: "1rem" }}>
            <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 700 }}>PENDING DISPATCHES</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fbbf24", marginTop: "0.25rem" }}>
              {analytics?.pendingOrders || 0}
            </div>
          </div>
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "16px", padding: "1rem" }}>
            <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 700 }}>OUT FOR DELIVERY</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#818cf8", marginTop: "0.25rem" }}>
              {analytics?.outForDeliveryOrders || 0}
            </div>
          </div>
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "16px", padding: "1rem" }}>
            <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 700 }}>TOTAL PRODUCTS</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#4ade80", marginTop: "0.25rem" }}>
              {products.length}
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid #334155", marginBottom: "1.5rem", overflowX: "auto" }}>
          {[
            { id: "orders", label: `📦 Live Orders (${orders.length})` },
            { id: "products", label: `🏷️ Products (${products.length})` },
            { id: "coupons", label: `🎟️ Coupons (${coupons.length})` },
            { id: "customers", label: `👥 Technicians & GPS` },
            { id: "security", label: `🛡️ Google Authenticator` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              style={{
                padding: "0.75rem 1.25rem",
                background: "none",
                border: "none",
                borderBottom: activeTab === tab.id ? "3px solid #38bdf8" : "3px solid transparent",
                color: activeTab === tab.id ? "#38bdf8" : "#94a3b8",
                fontWeight: 800,
                fontSize: "0.875rem",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Orders */}
        {activeTab === "orders" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                {["all", "confirmed", "packed", "out_for_delivery", "delivered"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setOrderFilter(st)}
                    style={{
                      padding: "0.375rem 0.75rem",
                      borderRadius: "8px",
                      border: "1px solid #334155",
                      background: orderFilter === st ? "#38bdf8" : "#1e293b",
                      color: orderFilter === st ? "#0f172a" : "#cbd5e1",
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      cursor: "pointer",
                    }}
                  >
                    {st.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 Search Order #, Mobile..."
                style={{ padding: "0.5rem 1rem", borderRadius: "10px", border: "1px solid #334155", background: "#1e293b", color: "#fff", fontSize: "0.8125rem" }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {filteredOrders.map((ord) => {
                const addr = ord.shippingAddress;
                return (
                  <div key={ord.orderNumber} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "16px", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <span style={{ fontWeight: 800, fontSize: "1.125rem", color: "#38bdf8" }}>{ord.orderNumber}</span>
                        <span style={{ padding: "0.2rem 0.5rem", borderRadius: "6px", fontSize: "0.6875rem", fontWeight: 800, background: "#064e3b", color: "#6ee7b7" }}>
                          {ord.status.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "1.125rem", fontWeight: 800, color: "#fff" }}>{formatPrice(ord.total)}</div>
                        </div>
                        <button onClick={() => openOrderModal(ord)} style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: "8px", padding: "0.5rem 0.875rem", fontSize: "0.75rem", fontWeight: 800, cursor: "pointer" }}>
                          ⚡ Dispatch / Assign →
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", background: "#0f172a", borderRadius: "12px", padding: "0.875rem" }}>
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 700 }}>👤 CUSTOMER &amp; GPS LOCATION:</div>
                        <div style={{ fontWeight: 800, color: "#fff" }}>{addr?.name} (📱 +91 {addr?.mobile})</div>
                        <div style={{ fontSize: "0.75rem", color: "#cbd5e1", marginTop: "0.25rem" }}>
                          {addr?.line1}, {addr?.city} — {addr?.pincode}
                        </div>
                        {addr?.latitude && addr?.longitude && (
                          <div style={{ marginTop: "0.375rem" }}>
                            <a href={addr.mapUrl || `https://www.google.com/maps?q=${addr.latitude},${addr.longitude}`} target="_blank" rel="noreferrer" style={{ background: "#064e3b", color: "#6ee7b7", padding: "0.2rem 0.5rem", borderRadius: "6px", fontSize: "0.6875rem", fontWeight: 700, textDecoration: "none" }}>
                              📍 Live GPS Pinpoint ({addr.latitude.toFixed(4)}°, {addr.longitude.toFixed(4)}°) ↗
                            </a>
                          </div>
                        )}
                      </div>

                      <div>
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 700 }}>📦 ITEMS:</div>
                        {ord.items?.map((it, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                            <span>{it.name} (×{it.quantity})</span>
                            <span style={{ fontWeight: 700 }}>{formatPrice(it.lineTotal)}</span>
                          </div>
                        ))}
                        {addr?.mobile && (
                          <div style={{ marginTop: "0.5rem" }}>
                            <a href={`https://wa.me/91${addr.mobile.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(`Hello ${addr.name}, update on your ROParts.in Order #${ord.orderNumber}: Status is now ${ord.status.toUpperCase()}.`)}`} target="_blank" rel="noreferrer" style={{ background: "#25D366", color: "#fff", padding: "0.25rem 0.5rem", borderRadius: "6px", fontSize: "0.6875rem", fontWeight: 800, textDecoration: "none" }}>
                              💬 WhatsApp Customer
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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
                  <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: "0.25rem 0 0" }}>
                    Filter by status (Active, Draft, Archived), search, or quick-edit pricing and stock.
                  </p>
                </div>
                <button onClick={() => setShowNewProductModal(true)} style={{ background: "#22c55e", color: "#fff", border: "none", borderRadius: "8px", padding: "0.5rem 1rem", fontWeight: 800, fontSize: "0.8125rem", cursor: "pointer" }}>
                  ➕ Add Product
                </button>
              </div>

              {/* Status Tabs / Pills */}
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
                <button
                  onClick={() => setProductStatusFilter("all")}
                  style={{
                    background: productStatusFilter === "all" ? "#38bdf8" : "#1e293b",
                    color: productStatusFilter === "all" ? "#0f172a" : "#cbd5e1",
                    border: `1px solid ${productStatusFilter === "all" ? "#38bdf8" : "#334155"}`,
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
                    background: productStatusFilter === "active" ? "#10b981" : "#1e293b",
                    color: productStatusFilter === "active" ? "#064e3b" : "#86efac",
                    border: `1px solid ${productStatusFilter === "active" ? "#10b981" : "#166534"}`,
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
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e" }}></span>
                  Active ({countActive})
                </button>

                <button
                  onClick={() => setProductStatusFilter("draft")}
                  style={{
                    background: productStatusFilter === "draft" ? "#f59e0b" : "#1e293b",
                    color: productStatusFilter === "draft" ? "#451a03" : "#fde68a",
                    border: `1px solid ${productStatusFilter === "draft" ? "#f59e0b" : "#854d0e"}`,
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
                    background: productStatusFilter === "archived" ? "#94a3b8" : "#1e293b",
                    color: productStatusFilter === "archived" ? "#0f172a" : "#94a3b8",
                    border: `1px solid ${productStatusFilter === "archived" ? "#94a3b8" : "#475569"}`,
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
                    placeholder="🔍 Search product name, SKU, brand..."
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.875rem",
                      borderRadius: "8px",
                      background: "#0f172a",
                      border: "1px solid #334155",
                      color: "#fff",
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
                        color: "#94a3b8",
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
                    background: "#0f172a",
                    border: "1px solid #334155",
                    color: "#fff",
                    borderRadius: "8px",
                    padding: "0.55rem 0.875rem",
                    fontSize: "0.8125rem",
                    cursor: "pointer",
                  }}
                >
                  <option value="all">All Categories</option>
                  <option value="domestic">🏠 Domestic RO</option>
                  <option value="commercial">🏢 Commercial RO</option>
                  <option value="industrial">🏭 Industrial RO</option>
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
              </div>

              {productActionMsg && (
                <div style={{ background: "#14532d", border: "1px solid #22c55e", color: "#86efac", padding: "0.625rem 1rem", borderRadius: "10px", fontSize: "0.8125rem", fontWeight: 700, marginBottom: "1rem" }}>
                  {productActionMsg}
                </div>
              )}

              {/* Table */}
              <div style={{ background: "#1e293b", borderRadius: "16px", border: "1px solid #334155", overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.8125rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #334155", color: "#94a3b8" }}>
                      <th style={{ padding: "0.875rem" }}>Product</th>
                      <th style={{ padding: "0.875rem" }}>Status</th>
                      <th style={{ padding: "0.875rem" }}>Selling Price (₹)</th>
                      <th style={{ padding: "0.875rem" }}>Stock</th>
                      <th style={{ padding: "0.875rem", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: "2.5rem", textAlign: "center", color: "#94a3b8" }}>
                          <div>No products found matching the selected filter.</div>
                          {(productStatusFilter !== "all" || productSearchQuery || productCategoryFilter !== "all") && (
                            <button
                              onClick={() => { setProductStatusFilter("all"); setProductSearchQuery(""); setProductCategoryFilter("all"); }}
                              style={{ marginTop: "0.75rem", background: "#38bdf8", color: "#0f172a", border: "none", borderRadius: "6px", padding: "0.35rem 0.875rem", fontWeight: 700, cursor: "pointer", fontSize: "0.75rem" }}
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
                        return (
                          <tr key={p.id} style={{ borderBottom: "1px solid #334155" }}>
                            {/* Product Info */}
                            <td style={{ padding: "0.875rem" }}>
                              <div style={{ fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                {p.name}
                              </div>
                              <div style={{ fontSize: "0.6875rem", color: "#64748b", marginTop: "0.2rem" }}>
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
                                  background:
                                    currentStatus === "active"
                                      ? "#064e3b"
                                      : currentStatus === "draft"
                                      ? "#78350f"
                                      : "#334155",
                                  color:
                                    currentStatus === "active"
                                      ? "#86efac"
                                      : currentStatus === "draft"
                                      ? "#fde68a"
                                      : "#cbd5e1",
                                  border: `1px solid ${
                                    currentStatus === "active"
                                      ? "#22c55e"
                                      : currentStatus === "draft"
                                      ? "#eab308"
                                      : "#64748b"
                                  }`,
                                  borderRadius: "12px",
                                  padding: "0.25rem 0.5rem",
                                  fontSize: "0.6875rem",
                                  fontWeight: 800,
                                  cursor: "pointer",
                                }}
                              >
                                <option value="active" style={{ background: "#0f172a", color: "#86efac" }}>🟢 Active</option>
                                <option value="draft" style={{ background: "#0f172a", color: "#fde68a" }}>🟡 Draft</option>
                                <option value="archived" style={{ background: "#0f172a", color: "#cbd5e1" }}>⚪ Archived</option>
                              </select>
                            </td>

                            {/* Selling Price */}
                            <td style={{ padding: "0.875rem" }}>
                              {isEditing ? (
                                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                  <span style={{ color: "#94a3b8", fontWeight: 700 }}>₹</span>
                                  <input
                                    type="number"
                                    autoFocus
                                    value={editPrice}
                                    onChange={(e) => setEditPrice(Number(e.target.value))}
                                    onKeyDown={(e) => { if (e.key === "Enter") handleSaveProductInline(p.id); }}
                                    style={{ width: "90px", padding: "0.35rem 0.5rem", borderRadius: "6px", background: "#0f172a", border: "2px solid #38bdf8", color: "#fff", fontWeight: 800, fontSize: "0.875rem" }}
                                  />
                                </div>
                              ) : (
                                <span style={{ fontWeight: 800, color: "#38bdf8", fontSize: "0.9375rem" }}>{formatPrice(p.sellingPrice)}</span>
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
                                  style={{ width: "70px", padding: "0.35rem 0.5rem", borderRadius: "6px", background: "#0f172a", border: "2px solid #38bdf8", color: "#fff", fontWeight: 800, fontSize: "0.875rem" }}
                                />
                              ) : (
                                <span style={{ background: p.stock > 10 ? "#14532d" : "#7f1d1d", color: p.stock > 10 ? "#86efac" : "#fca5a5", padding: "0.2rem 0.5rem", borderRadius: "6px", fontSize: "0.6875rem", fontWeight: 800 }}>
                                  {p.stock} units
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td style={{ padding: "0.875rem", textAlign: "right" }}>
                              {isEditing ? (
                                <div style={{ display: "flex", gap: "0.375rem", justifyContent: "flex-end" }}>
                                  <button onClick={() => handleSaveProductInline(p.id)} disabled={savingProduct} style={{ background: "#22c55e", color: "#fff", border: "none", borderRadius: "6px", padding: "0.35rem 0.75rem", cursor: "pointer", fontWeight: 800 }}>
                                    {savingProduct ? "..." : "✓ Save"}
                                  </button>
                                  <button onClick={() => setEditingProductId(null)} style={{ background: "#475569", color: "#fff", border: "none", borderRadius: "6px", padding: "0.35rem 0.5rem", cursor: "pointer" }}>✕</button>
                                </div>
                              ) : (
                                <div style={{ display: "flex", gap: "0.375rem", justifyContent: "flex-end" }}>
                                  <button onClick={() => { setEditingProductId(p.id); setEditPrice(Math.round(p.sellingPrice / 100)); setEditStock(p.stock); }} style={{ background: "#334155", color: "#38bdf8", border: "none", borderRadius: "6px", padding: "0.35rem 0.625rem", cursor: "pointer", fontWeight: 700 }}>
                                    ✏️ Quick Edit
                                  </button>
                                  <button onClick={() => openFullEditModal(p)} style={{ background: "#1e293b", color: "#cbd5e1", border: "1px solid #475569", borderRadius: "6px", padding: "0.35rem 0.625rem", cursor: "pointer", fontWeight: 700 }}>
                                    ⚙️ Edit Details
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
              <h2 style={{ fontSize: "1.125rem", fontWeight: 800, margin: 0 }}>Discount Coupons</h2>
              <button onClick={() => setShowNewCouponModal(true)} style={{ background: "#22c55e", color: "#fff", border: "none", borderRadius: "8px", padding: "0.5rem 1rem", fontWeight: 800, fontSize: "0.8125rem", cursor: "pointer" }}>
                ➕ Create Coupon
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
              {coupons.map((c) => (
                <div key={c.code} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "16px", padding: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "1.125rem", fontWeight: 800, color: "#38bdf8" }}>{c.code}</span>
                    <button onClick={() => handleDeleteCoupon(c.code)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}>✕</button>
                  </div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#fff", marginTop: "0.5rem" }}>{c.value}% OFF</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Customers */}
        {activeTab === "customers" && (
          <div>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 800, margin: "0 0 1rem" }}>Technicians &amp; GPS Registry</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem" }}>
              {orders.map((ord) => {
                const addr = ord.shippingAddress;
                return (
                  <div key={ord.orderNumber} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "16px", padding: "1.25rem" }}>
                    <div style={{ fontWeight: 800, color: "#fff" }}>{addr?.name}</div>
                    <div style={{ color: "#38bdf8", fontSize: "0.8125rem" }}>📱 +91 {addr?.mobile}</div>
                    <div style={{ fontSize: "0.75rem", color: "#cbd5e1", marginTop: "0.25rem" }}>
                      {addr?.line1}, {addr?.city} — {addr?.pincode}
                    </div>
                    {addr?.latitude && addr?.longitude && (
                      <div style={{ marginTop: "0.5rem" }}>
                        <a href={addr.mapUrl || `https://www.google.com/maps?q=${addr.latitude},${addr.longitude}`} target="_blank" rel="noreferrer" style={{ background: "#064e3b", color: "#6ee7b7", padding: "0.25rem 0.5rem", borderRadius: "6px", fontSize: "0.75rem", textDecoration: "none", fontWeight: 700 }}>
                          📍 Open Google Maps Navigation ↗
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 5: Security */}
        {activeTab === "security" && (
          <div style={{ maxWidth: "600px" }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 800, margin: "0 0 1rem" }}>Google Authenticator MFA</h2>
            <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "16px", padding: "1.5rem" }}>
              <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", flexWrap: "wrap" }}>
                {sessionInfo?.qrDataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sessionInfo.qrDataUrl} alt="QR Code" style={{ width: "140px", height: "140px", borderRadius: "12px", border: "3px solid #fff" }} />
                )}
                <div>
                  <div style={{ fontWeight: 800, color: "#fff", marginBottom: "0.25rem" }}>Permanent Secret Key</div>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.5rem" }}>
                    <code style={{ background: "#0f172a", padding: "0.375rem 0.75rem", borderRadius: "6px", color: "#38bdf8", fontWeight: 700 }}>
                      {sessionInfo?.fixedSecret}
                    </code>
                    <button onClick={copyFixedKey} style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: "6px", padding: "0.375rem 0.75rem", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}>
                      {copiedKey ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal: Update Dispatch */}
      {selectedOrder && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", zIndex: 100 }}>
          <div style={{ background: "#1e293b", border: "1px solid #475569", borderRadius: "20px", maxWidth: "500px", width: "100%", padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 800, margin: 0, color: "#fff" }}>⚡ Update Order #{selectedOrder.orderNumber}</h3>
              <button onClick={() => setSelectedOrder(null)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "1.25rem", cursor: "pointer" }}>✕</button>
            </div>

            {orderActionMsg && (
              <div style={{ background: "#14532d", color: "#86efac", padding: "0.5rem", borderRadius: "8px", fontSize: "0.75rem", marginBottom: "1rem", fontWeight: 700 }}>
                {orderActionMsg}
              </div>
            )}

            <form onSubmit={handleSaveOrderUpdate}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "0.375rem" }}>Status *</label>
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as OrderStatus)} style={{ width: "100%", padding: "0.625rem", borderRadius: "10px", background: "#0f172a", border: "1px solid #334155", color: "#fff" }}>
                  <option value="confirmed">Confirmed</option>
                  <option value="packed">Packed</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", marginBottom: "0.25rem" }}>Courier Boy Name</label>
                <input value={editBoyName} onChange={(e) => setEditBoyName(e.target.value)} style={{ width: "100%", padding: "0.5rem", borderRadius: "8px", background: "#0f172a", border: "1px solid #334155", color: "#fff" }} />
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", marginBottom: "0.25rem" }}>Courier Boy Mobile</label>
                <input value={editBoyPhone} onChange={(e) => setEditBoyPhone(e.target.value)} style={{ width: "100%", padding: "0.5rem", borderRadius: "8px", background: "#0f172a", border: "1px solid #334155", color: "#fff" }} />
              </div>

              <button type="submit" disabled={savingOrder} style={{ width: "100%", padding: "0.75rem", borderRadius: "12px", border: "none", background: "#22c55e", color: "#fff", fontWeight: 800, cursor: "pointer" }}>
                {savingOrder ? "Saving..." : "Save Order →"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Product */}
      {showNewProductModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", zIndex: 100 }}>
          <div style={{ background: "#1e293b", border: "1px solid #475569", borderRadius: "24px", maxWidth: "760px", width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)" }}>
            {/* Header */}
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #334155", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span>➕</span> Add New Product
                </h3>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: "#94a3b8" }}>
                  Create and publish a new RO spare part to the storefront catalog.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewProductModal(false)}
                style={{ background: "#334155", border: "none", color: "#cbd5e1", width: "32px", height: "32px", borderRadius: "8px", fontSize: "1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleCreateProduct} style={{ padding: "1.5rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Category Segment Selection */}
              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "0.5rem" }}>
                  1. RO Category Segment *
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
                  {[
                    { id: "domestic", label: "🏠 Domestic RO", desc: "Home purifiers (75-100 GPD)" },
                    { id: "commercial", label: "🏢 Commercial RO", desc: "Offices & Cafes (25-100 LPH)" },
                    { id: "industrial", label: "🏭 Industrial RO", desc: "Plants (250-5000+ LPH)" },
                  ].map((seg) => (
                    <button
                      key={seg.id}
                      type="button"
                      onClick={() => setNewProdMainCategory(seg.id as any)}
                      style={{
                        padding: "0.75rem",
                        borderRadius: "12px",
                        border: `2px solid ${newProdMainCategory === seg.id ? "#38bdf8" : "#334155"}`,
                        background: newProdMainCategory === seg.id ? "rgba(56, 189, 248, 0.12)" : "#0f172a",
                        color: newProdMainCategory === seg.id ? "#38bdf8" : "#94a3b8",
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: "0.875rem", color: newProdMainCategory === seg.id ? "#fff" : "#cbd5e1" }}>
                        {seg.label}
                      </div>
                      <div style={{ fontSize: "0.6875rem", marginTop: "0.2rem", opacity: 0.8 }}>
                        {seg.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Identity */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "0.35rem" }}>
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
                      background: "#0f172a",
                      border: `1px solid ${newProdName.trim() && products.some((p) => p.name.trim().toLowerCase() === newProdName.trim().toLowerCase()) ? "#ef4444" : "#334155"}`,
                      color: "#fff",
                      fontSize: "0.875rem",
                    }}
                  />
                  {newProdName.trim() && products.some((p) => p.name.trim().toLowerCase() === newProdName.trim().toLowerCase()) && (
                    <div style={{ color: "#f87171", fontSize: "0.75rem", fontWeight: 700, marginTop: "0.35rem" }}>
                      ⚠️ A product with this name already exists in your catalog!
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "0.35rem" }}>
                    Component Type
                  </label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    style={{ width: "100%", padding: "0.65rem 0.875rem", borderRadius: "10px", background: "#0f172a", border: "1px solid #334155", color: "#fff", fontSize: "0.875rem" }}
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.75rem", background: "#0f172a", padding: "1rem", borderRadius: "14px", border: "1px solid #334155" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#38bdf8", marginBottom: "0.35rem" }}>
                    Selling Price (₹) *
                  </label>
                  <input
                    required
                    type="number"
                    step="any"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", background: "#1e293b", border: "1px solid #38bdf8", color: "#38bdf8", fontWeight: 800, fontSize: "0.9375rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", marginBottom: "0.35rem" }}>
                    MRP (₹) *
                  </label>
                  <input
                    required
                    type="number"
                    step="any"
                    value={newProdMrp}
                    onChange={(e) => setNewProdMrp(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: "0.9375rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", marginBottom: "0.35rem" }}>
                    Live Stock *
                  </label>
                  <input
                    required
                    type="number"
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", background: "#1e293b", border: "1px solid #334155", color: "#fff", fontWeight: 700, fontSize: "0.9375rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", marginBottom: "0.35rem" }}>
                    Brand Name
                  </label>
                  <input
                    placeholder="e.g. Drop Purity"
                    value={newProdBrand}
                    onChange={(e) => setNewProdBrand(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: "0.875rem" }}
                  />
                </div>
              </div>

              {/* Product Descriptions */}
              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "0.35rem" }}>
                  Short Summary Description
                </label>
                <input
                  placeholder="Brief 1-line overview for catalog cards (e.g. High rejection 100 GPD membrane for TDS up to 2500 ppm)"
                  value={newProdShortDesc}
                  onChange={(e) => setNewProdShortDesc(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem 0.875rem", borderRadius: "10px", background: "#0f172a", border: "1px solid #334155", color: "#fff", fontSize: "0.8125rem", marginBottom: "0.75rem" }}
                />

                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "0.35rem" }}>
                  Detailed Product Description & Features
                </label>
                <textarea
                  rows={3}
                  placeholder="Detailed specifications, installation guidelines, compatibility and performance details..."
                  value={newProdLongDesc}
                  onChange={(e) => setNewProdLongDesc(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem 0.875rem", borderRadius: "10px", background: "#0f172a", border: "1px solid #334155", color: "#fff", fontSize: "0.8125rem", resize: "vertical" }}
                />
              </div>

              {/* Specifications: Weight, Dimensions & Keywords */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "0.35rem" }}>
                    Weight (grams)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 500"
                    value={newProdWeight}
                    onChange={(e) => setNewProdWeight(e.target.value)}
                    style={{ width: "100%", padding: "0.6rem 0.875rem", borderRadius: "10px", background: "#0f172a", border: "1px solid #334155", color: "#fff", fontSize: "0.8125rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "0.35rem" }}>
                    Dimensions (L×W×H)
                  </label>
                  <input
                    placeholder="e.g. 30 x 5 x 5 cm"
                    value={newProdDimensions}
                    onChange={(e) => setNewProdDimensions(e.target.value)}
                    style={{ width: "100%", padding: "0.6rem 0.875rem", borderRadius: "10px", background: "#0f172a", border: "1px solid #334155", color: "#fff", fontSize: "0.8125rem" }}
                  />
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                    <label style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#cbd5e1" }}>
                      Search Keywords / Tags ({newProdKeywords.length})
                    </label>
                    <span style={{ fontSize: "0.6875rem", color: "#94a3b8" }}>Press Enter ↵ to add</span>
                  </div>

                  <div
                    style={{
                      background: "#0f172a",
                      border: "1px solid #334155",
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
                          background: "rgba(56, 189, 248, 0.15)",
                          border: "1px solid #38bdf8",
                          color: "#38bdf8",
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
                            color: "#94a3b8",
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
                        color: "#fff",
                        fontSize: "0.8125rem",
                        padding: "0.25rem 0.35rem",
                      }}
                    />

                    {newProdKeywordInput.trim() && (
                      <button
                        type="button"
                        onClick={() => handleAddKeyword(newProdKeywordInput, newProdKeywords, setNewProdKeywords, setNewProdKeywordInput)}
                        style={{
                          background: "#38bdf8",
                          color: "#0f172a",
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
              <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "14px", padding: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <div>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#cbd5e1" }}>
                      📸 Product Photos ({newProdImages.length}/4)
                    </span>
                    <span style={{ fontSize: "0.6875rem", color: "#94a3b8", marginLeft: "0.5rem" }}>
                      (Max 1MB per photo • Up to 4 photos)
                    </span>
                  </div>
                  {newProdImages.length < 4 && (
                    <label style={{ background: "#3b82f6", color: "#fff", padding: "0.35rem 0.75rem", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
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
                  <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid #ef4444", color: "#fca5a5", padding: "0.5rem", borderRadius: "8px", fontSize: "0.75rem", marginBottom: "0.75rem" }}>
                    ⚠️ {newProdImageError}
                  </div>
                )}

                {/* Uploaded Images Preview Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" }}>
                  {newProdImages.map((imgUrl, idx) => (
                    <div key={idx} style={{ position: "relative", aspectRatio: "1/1", borderRadius: "10px", overflow: "hidden", border: "2px solid #334155", background: "#1e293b" }}>
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
                        <span style={{ position: "absolute", bottom: "4px", left: "4px", background: "#22c55e", color: "#fff", fontSize: "0.625rem", padding: "0.1rem 0.35rem", borderRadius: "4px", fontWeight: 700 }}>
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
                        border: "2px dashed #334155",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#64748b",
                        fontSize: "0.6875rem",
                        cursor: "pointer",
                        background: "rgba(255,255,255,0.02)",
                      }}
                    >
                      <span style={{ fontSize: "1.25rem", marginBottom: "0.25rem" }}>📷</span>
                      <span>Photo {newProdImages.length + i + 1}</span>
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
                  style={{ flex: 1, padding: "0.875rem", borderRadius: "12px", border: "1px solid #334155", background: "transparent", color: "#cbd5e1", fontWeight: 700, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  style={{ flex: 2, padding: "0.875rem", borderRadius: "12px", border: "none", background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)", color: "#fff", fontWeight: 800, fontSize: "1rem", cursor: "pointer", boxShadow: "0 4px 14px rgba(34, 197, 94, 0.4)" }}
                >
                  {savingProduct ? "⏳ Saving Product..." : "✓ Save & Publish Product →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Coupon */}
      {showNewCouponModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", zIndex: 100 }}>
          <div style={{ background: "#1e293b", border: "1px solid #475569", borderRadius: "20px", maxWidth: "420px", width: "100%", padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 800, margin: 0, color: "#fff" }}>🎟️ Create Coupon</h3>
              <button onClick={() => setShowNewCouponModal(false)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "1.25rem", cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={handleCreateCoupon}>
              <div style={{ marginBottom: "0.75rem" }}>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.25rem" }}>Coupon Code *</label>
                <input required value={newCouponCode} onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())} placeholder="e.g. FLASH20" style={{ width: "100%", padding: "0.5rem", borderRadius: "8px", background: "#0f172a", border: "1px solid #334155", color: "#38bdf8", fontWeight: 800 }} />
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.25rem" }}>Discount Percentage (%) *</label>
                <input required type="number" value={newCouponDiscount} onChange={(e) => setNewCouponDiscount(e.target.value)} style={{ width: "100%", padding: "0.5rem", borderRadius: "8px", background: "#0f172a", border: "1px solid #334155", color: "#fff" }} />
              </div>
              <button type="submit" style={{ width: "100%", padding: "0.75rem", borderRadius: "10px", border: "none", background: "#38bdf8", color: "#0f172a", fontWeight: 800, cursor: "pointer" }}>
                Save Coupon →
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Full Product Edit */}
      {editingProductFull && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", zIndex: 100 }}>
          <div style={{ background: "#1e293b", border: "1px solid #475569", borderRadius: "24px", maxWidth: "760px", width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)" }}>
            {/* Header */}
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #334155", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span>⚙️</span> Edit Product: {editingProductFull.sku}
                </h3>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: "#94a3b8" }}>
                  Update full specifications, category segment, pricing, and photos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProductFull(null)}
                style={{ background: "#334155", border: "none", color: "#cbd5e1", width: "32px", height: "32px", borderRadius: "8px", fontSize: "1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveProductFull} style={{ padding: "1.5rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Category Segment Selection */}
              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "0.5rem" }}>
                  1. RO Category Segment *
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
                  {[
                    { id: "domestic", label: "🏠 Domestic RO", desc: "Home purifiers (75-100 GPD)" },
                    { id: "commercial", label: "🏢 Commercial RO", desc: "Offices & Cafes (25-100 LPH)" },
                    { id: "industrial", label: "🏭 Industrial RO", desc: "Plants (250-5000+ LPH)" },
                  ].map((seg) => (
                    <button
                      key={seg.id}
                      type="button"
                      onClick={() => setFullEditMainCategory(seg.id as any)}
                      style={{
                        padding: "0.75rem",
                        borderRadius: "12px",
                        border: `2px solid ${fullEditMainCategory === seg.id ? "#38bdf8" : "#334155"}`,
                        background: fullEditMainCategory === seg.id ? "rgba(56, 189, 248, 0.12)" : "#0f172a",
                        color: fullEditMainCategory === seg.id ? "#38bdf8" : "#94a3b8",
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: "0.875rem", color: fullEditMainCategory === seg.id ? "#fff" : "#cbd5e1" }}>
                        {seg.label}
                      </div>
                      <div style={{ fontSize: "0.6875rem", marginTop: "0.2rem", opacity: 0.8 }}>
                        {seg.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Identity */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "0.35rem" }}>
                    Product Name *
                  </label>
                  <input
                    required
                    value={fullEditName}
                    onChange={(e) => setFullEditName(e.target.value)}
                    style={{ width: "100%", padding: "0.65rem 0.875rem", borderRadius: "10px", background: "#0f172a", border: "1px solid #334155", color: "#fff", fontSize: "0.875rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "0.35rem" }}>
                    Component Type
                  </label>
                  <select
                    value={fullEditCategory}
                    onChange={(e) => setFullEditCategory(e.target.value)}
                    style={{ width: "100%", padding: "0.65rem 0.875rem", borderRadius: "10px", background: "#0f172a", border: "1px solid #334155", color: "#fff", fontSize: "0.875rem" }}
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: "0.75rem", background: "#0f172a", padding: "1rem", borderRadius: "14px", border: "1px solid #334155" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#38bdf8", marginBottom: "0.35rem" }}>
                    Selling Price (₹) *
                  </label>
                  <input
                    required
                    type="number"
                    step="any"
                    value={fullEditPrice}
                    onChange={(e) => setFullEditPrice(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", background: "#1e293b", border: "1px solid #38bdf8", color: "#38bdf8", fontWeight: 800, fontSize: "0.9375rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", marginBottom: "0.35rem" }}>
                    MRP (₹) *
                  </label>
                  <input
                    required
                    type="number"
                    step="any"
                    value={fullEditMrp}
                    onChange={(e) => setFullEditMrp(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: "0.9375rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", marginBottom: "0.35rem" }}>
                    Live Stock *
                  </label>
                  <input
                    required
                    type="number"
                    value={fullEditStock}
                    onChange={(e) => setFullEditStock(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", background: "#1e293b", border: "1px solid #334155", color: "#fff", fontWeight: 700, fontSize: "0.9375rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", marginBottom: "0.35rem" }}>
                    Brand Name
                  </label>
                  <input
                    value={fullEditBrand}
                    onChange={(e) => setFullEditBrand(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: "0.875rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", marginBottom: "0.35rem" }}>
                    Status
                  </label>
                  <select
                    value={fullEditStatus}
                    onChange={(e) => setFullEditStatus(e.target.value as any)}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: "0.875rem" }}
                  >
                    <option value="active">Active (Live)</option>
                    <option value="draft">Draft (Hidden)</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Product Descriptions */}
              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "0.35rem" }}>
                  Short Summary Description
                </label>
                <input
                  value={fullEditShortDesc}
                  onChange={(e) => setFullEditShortDesc(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem 0.875rem", borderRadius: "10px", background: "#0f172a", border: "1px solid #334155", color: "#fff", fontSize: "0.8125rem", marginBottom: "0.75rem" }}
                />

                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "0.35rem" }}>
                  Detailed Product Description & Features
                </label>
                <textarea
                  rows={3}
                  value={fullEditLongDesc}
                  onChange={(e) => setFullEditLongDesc(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem 0.875rem", borderRadius: "10px", background: "#0f172a", border: "1px solid #334155", color: "#fff", fontSize: "0.8125rem", resize: "vertical" }}
                />
              </div>

              {/* Specifications: Weight, Dimensions & Keywords */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "0.35rem" }}>
                    Weight (grams)
                  </label>
                  <input
                    type="number"
                    value={fullEditWeight}
                    onChange={(e) => setFullEditWeight(e.target.value)}
                    style={{ width: "100%", padding: "0.6rem 0.875rem", borderRadius: "10px", background: "#0f172a", border: "1px solid #334155", color: "#fff", fontSize: "0.8125rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "0.35rem" }}>
                    Dimensions (L×W×H)
                  </label>
                  <input
                    value={fullEditDimensions}
                    onChange={(e) => setFullEditDimensions(e.target.value)}
                    style={{ width: "100%", padding: "0.6rem 0.875rem", borderRadius: "10px", background: "#0f172a", border: "1px solid #334155", color: "#fff", fontSize: "0.8125rem" }}
                  />
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                    <label style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#cbd5e1" }}>
                      Search Keywords / Tags ({fullEditKeywords.length})
                    </label>
                    <span style={{ fontSize: "0.6875rem", color: "#94a3b8" }}>Press Enter ↵ to add</span>
                  </div>

                  <div
                    style={{
                      background: "#0f172a",
                      border: "1px solid #334155",
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
                          background: "rgba(56, 189, 248, 0.15)",
                          border: "1px solid #38bdf8",
                          color: "#38bdf8",
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
                            color: "#94a3b8",
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
                        color: "#fff",
                        fontSize: "0.8125rem",
                        padding: "0.25rem 0.35rem",
                      }}
                    />

                    {fullEditKeywordInput.trim() && (
                      <button
                        type="button"
                        onClick={() => handleAddKeyword(fullEditKeywordInput, fullEditKeywords, setFullEditKeywords, setFullEditKeywordInput)}
                        style={{
                          background: "#38bdf8",
                          color: "#0f172a",
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
              <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "14px", padding: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <div>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#cbd5e1" }}>
                      📸 Product Photos ({fullEditImages.length}/4)
                    </span>
                    <span style={{ fontSize: "0.6875rem", color: "#94a3b8", marginLeft: "0.5rem" }}>
                      (Max 1MB per photo • Up to 4 photos)
                    </span>
                  </div>
                  {fullEditImages.length < 4 && (
                    <label style={{ background: "#3b82f6", color: "#fff", padding: "0.35rem 0.75rem", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
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
                  <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid #ef4444", color: "#fca5a5", padding: "0.5rem", borderRadius: "8px", fontSize: "0.75rem", marginBottom: "0.75rem" }}>
                    ⚠️ {fullEditImageError}
                  </div>
                )}

                {/* Uploaded Images Preview Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" }}>
                  {fullEditImages.map((imgUrl, idx) => (
                    <div key={idx} style={{ position: "relative", aspectRatio: "1/1", borderRadius: "10px", overflow: "hidden", border: "2px solid #334155", background: "#1e293b" }}>
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
                        <span style={{ position: "absolute", bottom: "4px", left: "4px", background: "#22c55e", color: "#fff", fontSize: "0.625rem", padding: "0.1rem 0.35rem", borderRadius: "4px", fontWeight: 700 }}>
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
                        border: "2px dashed #334155",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#64748b",
                        fontSize: "0.6875rem",
                        cursor: "pointer",
                        background: "rgba(255,255,255,0.02)",
                      }}
                    >
                      <span style={{ fontSize: "1.25rem", marginBottom: "0.25rem" }}>📷</span>
                      <span>Photo {fullEditImages.length + i + 1}</span>
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
                  style={{ flex: 1, padding: "0.875rem", borderRadius: "12px", border: "1px solid #334155", background: "transparent", color: "#cbd5e1", fontWeight: 700, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  style={{ flex: 2, padding: "0.875rem", borderRadius: "12px", border: "none", background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)", color: "#fff", fontWeight: 800, fontSize: "1rem", cursor: "pointer", boxShadow: "0 4px 14px rgba(34, 197, 94, 0.4)" }}
                >
                  {savingProduct ? "⏳ Saving Changes..." : "✓ Save Product Changes →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
