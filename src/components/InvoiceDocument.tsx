"use client";

import React, { useEffect } from "react";
import type { TaxInvoice } from "@/lib/types";

interface InvoiceDocumentProps {
  invoice: TaxInvoice;
  onPrint?: () => void;
  showPrintButton?: boolean;
}

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export default function InvoiceDocument({
  invoice,
  onPrint,
  showPrintButton = true,
}: InvoiceDocumentProps) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (
        sp.get("print") === "1" ||
        sp.get("print") === "true" ||
        sp.get("download") === "1" ||
        sp.get("download") === "true"
      ) {
        const timer = setTimeout(() => {
          if (onPrint) {
            onPrint();
          } else {
            window.print();
          }
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [onPrint]);

  const isKarnataka =
    String(invoice.buyerDetails?.pincode || "").startsWith("56") ||
    String(invoice.buyerDetails?.state || "").toLowerCase().includes("karnataka");

  const formattedDate = new Date(invoice.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const sellerLegalName =
    !invoice.sellerDetails?.legalName ||
    invoice.sellerDetails?.legalName === "Drop Purity Parts Private Limited"
      ? "Drop Technologies PVT LTD"
      : invoice.sellerDetails.legalName;

  const sellerGstin =
    !invoice.sellerDetails?.gstin ||
    invoice.sellerDetails?.gstin === "27AAAAA0000A1Z5"
      ? "29AAMCD6292Q1ZK"
      : invoice.sellerDetails.gstin;

  return (
    <div className="invoice-root" style={{ padding: "1rem 0.75rem 6rem", minHeight: "100vh", background: "#f8fafc" }}>
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 10mm 12mm;
        }

        @media print {
          header, footer, nav, .site-header, .site-footer, .mobile-bottom-nav, .mobile-nav, [data-agentation], .no-print {
            display: none !important;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .invoice-card {
            box-shadow: none !important;
            border: 1px solid #000000 !important;
            margin: 0 !important;
            padding: 16px !important;
            max-width: 100% !important;
            border-radius: 0 !important;
          }
          .invoice-root {
            padding: 0 !important;
            background: #ffffff !important;
            min-height: auto !important;
          }
        }

        .invoice-grid-2col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
        }

        .invoice-calc-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 1.5rem;
          align-items: flex-start;
        }

        @media (max-width: 640px) {
          .invoice-grid-2col {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
          }
          .invoice-calc-grid {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
          }
          .invoice-col-border {
            border-left: none !important;
            border-top: 1px dashed #cbd5e1 !important;
            padding-left: 0 !important;
            padding-top: 1rem !important;
          }
          .invoice-card {
            padding: 1rem !important;
            border-radius: 12px !important;
          }
        }
      `}</style>

      {/* Top Floating / Action Toolbar */}
      {showPrintButton && (
        <div
          className="no-print"
          style={{
            maxWidth: "800px",
            margin: "0 auto 1.25rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#ffffff",
            padding: "0.75rem 1rem",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 800,
                background: "#f1f5f9",
                color: "#0f172a",
                padding: "0.2rem 0.5rem",
                borderRadius: "6px",
                fontFamily: "monospace",
              }}
            >
              {invoice.invoiceNumber}
            </span>
            <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
              Official GST Tax Invoice
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <a
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                background: "#f1f5f9",
                color: "#334155",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                padding: "0.5rem 0.85rem",
                fontSize: "0.8125rem",
                fontWeight: 700,
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              ← Admin Dashboard
            </a>
            <button
              type="button"
              onClick={() => {
                if (onPrint) {
                  onPrint();
                } else if (typeof window !== "undefined") {
                  window.print();
                }
              }}
              style={{
                background: "#0f172a",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "0.5rem 1rem",
                fontSize: "0.8125rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              <span>Print / Download PDF</span>
            </button>
          </div>
        </div>
      )}

      {/* Main A4 Document */}
      <div
        className="invoice-card"
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "16px",
          padding: "2rem",
          boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
          color: "#0f172a",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Header Ribbon */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            borderBottom: "2px solid #0f172a",
            paddingBottom: "1.25rem",
            marginBottom: "1.25rem",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.03em" }}>
                RO<span style={{ color: "#ed8936" }}>Parts</span>.in
              </span>
            </div>
            <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#334155", marginTop: "0.2rem" }}>
              {sellerLegalName}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", lineHeight: 1.4, marginTop: "0.15rem" }}>
              {invoice.sellerDetails.address}<br />
              {invoice.sellerDetails.city}, {invoice.sellerDetails.state} — {invoice.sellerDetails.pincode}<br />
              State Code: <strong>{invoice.sellerDetails.stateCode}</strong> | Support: {invoice.sellerDetails.phone}
            </div>
            <div style={{ fontSize: "0.8125rem", fontWeight: 800, color: "#0f172a", marginTop: "0.35rem" }}>
              GSTIN: <span style={{ fontFamily: "monospace", letterSpacing: "0.05em" }}>{sellerGstin}</span>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div
              style={{
                display: "inline-block",
                background: "#0f172a",
                color: "#ffffff",
                padding: "0.35rem 0.75rem",
                borderRadius: "6px",
                fontSize: "0.8125rem",
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              TAX INVOICE
            </div>
            <div style={{ fontSize: "0.6875rem", color: "#64748b", marginTop: "0.25rem", fontWeight: 600 }}>
              Original for Recipient
            </div>

            <div style={{ marginTop: "0.65rem", fontSize: "0.8125rem" }}>
              <div style={{ color: "#64748b", fontSize: "0.6875rem", textTransform: "uppercase", fontWeight: 700 }}>Invoice Number</div>
              <div style={{ fontWeight: 800, fontFamily: "monospace", color: "#0f172a" }}>{invoice.invoiceNumber}</div>
            </div>

            <div style={{ marginTop: "0.35rem", fontSize: "0.8125rem" }}>
              <div style={{ color: "#64748b", fontSize: "0.6875rem", textTransform: "uppercase", fontWeight: 700 }}>Invoice Date</div>
              <div style={{ fontWeight: 700 }}>{formattedDate}</div>
            </div>

            <div style={{ marginTop: "0.35rem", fontSize: "0.8125rem" }}>
              <div style={{ color: "#64748b", fontSize: "0.6875rem", textTransform: "uppercase", fontWeight: 700 }}>Order ID</div>
              <div style={{ fontWeight: 700, fontFamily: "monospace" }}>{invoice.orderNumber}</div>
            </div>
          </div>
        </div>

        {/* 2-Column Info: Billed To / Shipped To & Transport Details */}
        <div
          className="invoice-grid-2col"
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "1rem",
            marginBottom: "1.25rem",
            fontSize: "0.8125rem",
          }}
        >
          <div>
            <span style={{ fontSize: "0.6875rem", fontWeight: 800, textTransform: "uppercase", color: "#64748b", letterSpacing: "0.05em", display: "block", marginBottom: "0.35rem" }}>
              BILLED &amp; SHIPPED TO:
            </span>
            <div style={{ fontWeight: 800, fontSize: "0.9375rem", color: "#0f172a" }}>
              {invoice.buyerDetails.name}
            </div>
            <div style={{ color: "#475569", lineHeight: 1.4, marginTop: "0.2rem" }}>
              {invoice.buyerDetails.line1}
              {invoice.buyerDetails.line2 ? `, ${invoice.buyerDetails.line2}` : ""}<br />
              {invoice.buyerDetails.city}, {invoice.buyerDetails.state} — <strong>{invoice.buyerDetails.pincode}</strong>
            </div>
            <div style={{ marginTop: "0.35rem", color: "#334155" }}>
              Mobile: <strong>+91 {invoice.buyerDetails.mobile}</strong>
              {invoice.buyerDetails.email && ` | Email: ${invoice.buyerDetails.email}`}
            </div>
            {invoice.buyerDetails.gstin && (
              <div style={{ marginTop: "0.25rem", fontWeight: 700, color: "#0f172a" }}>
                Buyer GSTIN: {invoice.buyerDetails.gstin}
              </div>
            )}
          </div>

          <div className="invoice-col-border" style={{ borderLeft: "1px dashed #cbd5e1", paddingLeft: "1.25rem" }}>
            <span style={{ fontSize: "0.6875rem", fontWeight: 800, textTransform: "uppercase", color: "#64748b", letterSpacing: "0.05em", display: "block", marginBottom: "0.35rem" }}>
              ORDER &amp; SUPPLY DETAILS:
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: "0.25rem", color: "#475569" }}>
              <span>Place of Supply:</span>
              <strong style={{ color: "#0f172a" }}>{invoice.placeOfSupply}</strong>

              <span>Payment Mode:</span>
              <strong style={{ color: "#0f172a", textTransform: "uppercase" }}>
                {invoice.paymentMethod === "cod"
                  ? `CASH ON DELIVERY (${(invoice.paymentStatus || "").toUpperCase()})`
                  : invoice.paymentMethod === "upi"
                  ? `UPI ${invoice.paymentDetails?.upiApp ? `(${invoice.paymentDetails.upiApp.toUpperCase()})` : ""} - ${(invoice.paymentStatus || "").toUpperCase()}`
                  : invoice.paymentMethod === "card"
                  ? `CARD ${invoice.paymentDetails?.cardBrand || ""} ${invoice.paymentDetails?.cardLast4 ? `•••• ${invoice.paymentDetails.cardLast4}` : ""} - ${(invoice.paymentStatus || "").toUpperCase()}`
                  : invoice.paymentMethod === "netbanking"
                  ? `NET BANKING ${invoice.paymentDetails?.bankName ? `(${invoice.paymentDetails.bankName})` : ""} - ${(invoice.paymentStatus || "").toUpperCase()}`
                  : `${(invoice.paymentMethod || "").toUpperCase()} (${(invoice.paymentStatus || "").toUpperCase()})`}
              </strong>

              <span>Tax Type:</span>
              <strong style={{ color: "#0f172a" }}>{isKarnataka ? "CGST (9%) + SGST (9%)" : "IGST (18%)"}</strong>

              <span>Reverse Charge:</span>
              <strong style={{ color: "#0f172a" }}>No</strong>
            </div>
          </div>
        </div>

        {/* Itemized Goods Table */}
        <div style={{ overflowX: "auto", marginBottom: "1.25rem" }}>
          <table
            style={{
              width: "100%",
              minWidth: "520px",
              borderCollapse: "collapse",
              fontSize: "0.8125rem",
              textAlign: "left",
            }}
          >
            <thead>
              <tr style={{ background: "#0f172a", color: "#ffffff" }}>
                <th style={{ padding: "0.6rem 0.5rem", width: "35px", textAlign: "center" }}>#</th>
                <th style={{ padding: "0.6rem 0.75rem" }}>Item Description</th>
                <th style={{ padding: "0.6rem 0.5rem", textAlign: "center", width: "80px" }}>HSN/SAC</th>
                <th style={{ padding: "0.6rem 0.5rem", textAlign: "center", width: "45px" }}>Qty</th>
                <th style={{ padding: "0.6rem 0.5rem", textAlign: "right", width: "75px" }}>Rate</th>
                <th style={{ padding: "0.6rem 0.5rem", textAlign: "right", width: "80px" }}>Taxable</th>
                <th style={{ padding: "0.6rem 0.5rem", textAlign: "right", width: "80px" }}>GST (18%)</th>
                <th style={{ padding: "0.6rem 0.75rem", textAlign: "right", width: "85px" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => {
                const itemGst = (item.cgst || 0) + (item.sgst || 0) + (item.igst || 0);
                return (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: "1px solid #e2e8f0",
                      background: idx % 2 === 1 ? "#f8fafc" : "#ffffff",
                    }}
                  >
                    <td style={{ padding: "0.65rem 0.5rem", textAlign: "center", color: "#64748b" }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: "0.65rem 0.75rem", fontWeight: 700, color: "#0f172a" }}>
                      {item.name}
                    </td>
                    <td style={{ padding: "0.65rem 0.5rem", textAlign: "center", fontFamily: "monospace", color: "#475569" }}>
                      {item.hsn || "84212190"}
                    </td>
                    <td style={{ padding: "0.65rem 0.5rem", textAlign: "center", fontWeight: 700 }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: "0.65rem 0.5rem", textAlign: "right", color: "#475569" }}>
                      {formatPrice(item.unitPrice)}
                    </td>
                    <td style={{ padding: "0.65rem 0.5rem", textAlign: "right", color: "#475569" }}>
                      {formatPrice(item.taxableAmount)}
                    </td>
                    <td style={{ padding: "0.65rem 0.5rem", textAlign: "right", color: "#475569" }}>
                      {formatPrice(itemGst)}
                    </td>
                    <td style={{ padding: "0.65rem 0.75rem", textAlign: "right", fontWeight: 800, color: "#0f172a" }}>
                      {formatPrice(item.totalAmount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Calculation & Tax Summary Section */}
        <div
          className="invoice-calc-grid"
          style={{
            marginBottom: "1.25rem",
          }}
        >
          {/* Amount in words & Bank/Warranty info */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "0.85rem 1rem",
              fontSize: "0.75rem",
              lineHeight: 1.5,
            }}
          >
            <div style={{ color: "#64748b", textTransform: "uppercase", fontSize: "0.6875rem", fontWeight: 800, marginBottom: "0.2rem" }}>
              Total Amount in Words:
            </div>
            <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.8125rem", marginBottom: "0.6rem" }}>
              {invoice.financialSummary.amountInWords}
            </div>

            <div style={{ borderTop: "1px dashed #cbd5e1", paddingTop: "0.5rem", color: "#64748b" }}>
              <div>• <strong>HSN 8421:</strong> Water Filtering / Purification Machinery, Apparatus &amp; RO Replacement Spares.</div>
              <div>• <strong>Warranty:</strong> 100% Genuine Factory-Direct RO Parts with 7-day hassle-free replacement guarantee.</div>
            </div>
          </div>

          {/* Subtotals & Final Bill Box */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "0.85rem 1rem",
              fontSize: "0.8125rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
              <span style={{ color: "#64748b" }}>Item Subtotal:</span>
              <span style={{ fontWeight: 700 }}>{formatPrice(invoice.financialSummary.subtotal)}</span>
            </div>

            {invoice.financialSummary.couponDiscount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem", color: "#16a34a" }}>
                <span>Coupon Discount:</span>
                <span style={{ fontWeight: 700 }}>−{formatPrice(invoice.financialSummary.couponDiscount)}</span>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
              <span style={{ color: "#64748b" }}>Shipping &amp; Handling:</span>
              <span style={{ fontWeight: 700 }}>
                {invoice.financialSummary.shippingCharges === 0 ? "FREE" : formatPrice(invoice.financialSummary.shippingCharges)}
              </span>
            </div>

            <div style={{ borderTop: "1px dashed #cbd5e1", margin: "0.4rem 0", paddingTop: "0.4rem" }}>
              {isKarnataka ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem", fontSize: "0.75rem", color: "#475569" }}>
                    <span>CGST (9%):</span>
                    <span>{formatPrice(invoice.financialSummary.cgstTotal)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem", fontSize: "0.75rem", color: "#475569" }}>
                    <span>SGST (9%):</span>
                    <span>{formatPrice(invoice.financialSummary.sgstTotal)}</span>
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem", fontSize: "0.75rem", color: "#475569" }}>
                  <span>IGST (18%):</span>
                  <span>{formatPrice(invoice.financialSummary.igstTotal)}</span>
                </div>
              )}
            </div>

            <div
              style={{
                borderTop: "2px solid #0f172a",
                paddingTop: "0.5rem",
                marginTop: "0.4rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <span style={{ fontWeight: 900, fontSize: "0.9375rem", color: "#0f172a" }}>Total Invoiced:</span>
              <span style={{ fontWeight: 900, fontSize: "1.125rem", color: "#0f172a" }}>
                {formatPrice(invoice.financialSummary.grandTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Legal Footer & Signature Block */}
        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "1rem", marginTop: "1rem", fontSize: "0.71875rem", color: "#64748b" }}>
          <div style={{ marginBottom: "0.75rem" }}>
            <div style={{ fontWeight: 700, color: "#334155", textTransform: "uppercase", fontSize: "0.6875rem", marginBottom: "0.2rem" }}>
              Terms &amp; Conditions:
            </div>
            <div>1. Goods once sold are covered under manufacturer warranty for technical defects.</div>
            <div>2. All disputes are subject to the exclusive jurisdiction of the Courts in Bengaluru, Karnataka.</div>
            <div>3. This is a system-generated electronic tax invoice authorized under the Indian GST Rules.</div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", textAlign: "right", marginTop: "1.25rem" }}>
            <div>
              <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.75rem" }}>
                For {sellerLegalName}
              </div>
              <div style={{ height: "45px", display: "flex", alignItems: "center", justifyContent: "flex-end", color: "#2563eb", fontFamily: "monospace", fontSize: "0.8125rem", fontWeight: 700 }}>
                [AUTHORIZED SIGNATORY]
              </div>
              <div style={{ fontSize: "0.65625rem", color: "#94a3b8" }}>
                Digitally Generated Electronic Document
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
