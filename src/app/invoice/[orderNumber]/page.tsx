import React from "react";
import Link from "next/link";
import fs from "fs";
import path from "path";
import { Metadata } from "next";
import { loadDbStore, loadOrdersStore } from "@/lib/db";
import { createTaxInvoiceFromOrder } from "@/lib/invoice-helper";
import InvoiceDocument from "@/components/InvoiceDocument";
import type { Order } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}): Promise<Metadata> {
  const { orderNumber } = await params;
  return {
    title: `Tax Invoice - ${orderNumber} | ROParts Admin`,
    description: `Official GST Tax Invoice for order ${orderNumber}`,
  };
}

export default async function AdminInvoicePage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const store = loadDbStore();
  const norm = (orderNumber || "").trim().toUpperCase();

  let order = (store.orders || []).find(
    (o: Order) =>
      o.orderNumber?.toUpperCase() === norm ||
      o.id?.toUpperCase() === norm ||
      o.invoiceNumber?.toUpperCase() === norm
  );

  if (!order) {
    const ordersList = loadOrdersStore();
    order = (ordersList || []).find(
      (o: Order) =>
        o.orderNumber?.toUpperCase() === norm ||
        o.id?.toUpperCase() === norm ||
        o.invoiceNumber?.toUpperCase() === norm
    );
  }

  if (!order) {
    try {
      const mainPath = path.join(process.cwd(), "..", "main-app", "src", "data", "db-store.json");
      if (fs.existsSync(mainPath)) {
        const raw = fs.readFileSync(mainPath, "utf-8");
        const mainData = JSON.parse(raw);
        if (mainData.orders && Array.isArray(mainData.orders)) {
          order = mainData.orders.find(
            (o: Order) =>
              o.orderNumber?.toUpperCase() === norm ||
              o.id?.toUpperCase() === norm ||
              o.invoiceNumber?.toUpperCase() === norm
          );
        }
      }
    } catch {}
  }

  if (!order) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f172a", padding: "3rem 1rem", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "16px", padding: "2.5rem 1.5rem", maxWidth: "480px", width: "100%", color: "#f8fafc" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🧾</div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, margin: "0 0 0.5rem" }}>
            Invoice Not Found
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#94a3b8", margin: "0 0 1.5rem", lineHeight: 1.5 }}>
            Could not locate an order matching reference <strong>{orderNumber}</strong> in the admin database.
          </p>
          <Link
            href="/"
            style={{
              display: "inline-block",
              background: "#3b82f6",
              color: "#ffffff",
              textDecoration: "none",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: "0.8125rem",
              padding: "0.6rem 1.25rem",
            }}
          >
            ← Back to Admin Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const invoice = createTaxInvoiceFromOrder(order);

  return <InvoiceDocument invoice={invoice} />;
}
