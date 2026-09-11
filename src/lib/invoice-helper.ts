import type { Order, TaxInvoice } from "./types";

export function numberToIndianWords(amount: number, isPaise = true): string {
  if (amount <= 0) return "Zero Rupees Only";
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertTwoDigits(n: number): string {
    if (n < 20) return a[n];
    return b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : "");
  }

  function convertThreeDigits(n: number): string {
    if (n === 0) return "";
    let str = "";
    if (Math.floor(n / 100) > 0) {
      str += a[Math.floor(n / 100)] + " Hundred ";
    }
    const rem = n % 100;
    if (rem > 0) {
      str += convertTwoDigits(rem);
    }
    return str.trim();
  }

  function convertToWords(n: number): string {
    if (n === 0) return "Zero";
    let words = "";
    const crores = Math.floor(n / 10000000);
    n %= 10000000;
    const lakhs = Math.floor(n / 100000);
    n %= 100000;
    const thousands = Math.floor(n / 1000);
    n %= 1000;
    const remaining = n;

    if (crores > 0) words += convertThreeDigits(crores) + " Crore ";
    if (lakhs > 0) words += convertThreeDigits(lakhs) + " Lakh ";
    if (thousands > 0) words += convertThreeDigits(thousands) + " Thousand ";
    if (remaining > 0) words += convertThreeDigits(remaining);
    return words.trim();
  }

  const totalRupees = isPaise ? Math.floor(amount / 100) : Math.floor(amount);
  const paise = isPaise ? Math.round(amount % 100) : 0;

  const rupeeWords = convertToWords(totalRupees);
  let result = rupeeWords + (totalRupees === 1 ? " Rupee" : " Rupees");

  if (paise > 0) {
    const paiseWords = convertToWords(paise);
    result += " and " + paiseWords + (paise === 1 ? " Paisa" : " Paise");
  }

  return result + " Only";
}

export function createTaxInvoiceFromOrder(order: Order): TaxInvoice {
  const isKarnataka =
    String(order.shippingAddress?.pincode || "").startsWith("56") ||
    String(order.shippingAddress?.state || "").toLowerCase().includes("karnataka");

  const subtotal = order.subtotal || 0;
  const discount = order.discount || order.couponDiscount || 0;
  const shipping = order.shipping === 0 ? 0 : (order.shipping || 7900);
  const taxableAmount = Math.max(0, subtotal - discount);
  const totalGst = order.gst || Math.round(taxableAmount * 0.18);
  const grandTotal = order.total || (taxableAmount + totalGst + shipping);

  const cgstTotal = isKarnataka ? Math.round(totalGst / 2) : 0;
  const sgstTotal = isKarnataka ? totalGst - cgstTotal : 0;
  const igstTotal = isKarnataka ? 0 : totalGst;

  const invoiceNumber = order.invoiceNumber || `INV-${order.orderNumber}`;
  const invoiceDate = order.invoiceDate || order.createdAt || new Date().toISOString();

  const items = (order.items || []).map((it) => {
    const qty = it.quantity || 1;
    const unitPrice = it.unitPrice || (it.lineTotal ? Math.round(it.lineTotal / qty) : 0);
    const gstRate = it.gstRate || 18;
    const itemTaxable = it.lineTotal || (unitPrice * qty);
    const itemGst = Math.round((itemTaxable * gstRate) / 100);
    const cgst = isKarnataka ? Math.round(itemGst / 2) : 0;
    const sgst = isKarnataka ? itemGst - cgst : 0;
    const igst = isKarnataka ? 0 : itemGst;

    return {
      name: it.name,
      hsn: "84212190",
      quantity: qty,
      unitPrice,
      taxableAmount: itemTaxable,
      gstRate,
      cgst,
      sgst,
      igst,
      totalAmount: itemTaxable + itemGst,
    };
  });

  return {
    id: `inv-${order.orderNumber}`,
    invoiceNumber,
    orderNumber: order.orderNumber,
    orderId: order.id,
    customerId: order.customerId || "",
    customerName: order.customerName || order.shippingAddress?.name || "Valued Customer",
    customerMobile: order.customerMobile || order.shippingAddress?.mobile || "",
    customerEmail: order.customerEmail || order.shippingAddress?.email,
    sellerDetails: {
      legalName: "Drop Technologies PVT LTD",
      tradeName: "ROParts.in",
      gstin: "29AAMCD6292Q1ZK",
      address: "#42, 4th Cross, Peenya Industrial Area, Phase 1",
      city: "Bengaluru",
      state: "Karnataka",
      stateCode: "29",
      pincode: "560058",
      phone: "+91 7979784087",
      email: "support@sparesroprts.in",
    },
    buyerDetails: {
      name: order.shippingAddress?.name || order.customerName || "Customer",
      mobile: order.shippingAddress?.mobile || order.customerMobile || "",
      email: order.customerEmail || order.shippingAddress?.email,
      line1: order.shippingAddress?.line1 || "",
      line2: order.shippingAddress?.line2,
      landmark: order.shippingAddress?.landmark,
      city: order.shippingAddress?.city || "",
      state: order.shippingAddress?.state || "Karnataka",
      pincode: order.shippingAddress?.pincode || "",
      gstin: order.shippingAddress?.gstin,
    },
    placeOfSupply: order.shippingAddress?.state || "Karnataka",
    items,
    financialSummary: {
      subtotal,
      couponDiscount: discount,
      shippingCharges: shipping,
      totalTaxableAmount: taxableAmount,
      cgstTotal,
      sgstTotal,
      igstTotal,
      totalGst,
      grandTotal,
      amountInWords: numberToIndianWords(grandTotal),
    },
    paymentMethod: order.paymentMethod || "online",
    paymentDetails: order.paymentDetails,
    paymentStatus: order.paymentStatus || "paid",
    status: "issued",
    createdAt: invoiceDate,
    updatedAt: order.updatedAt,
  };
}
