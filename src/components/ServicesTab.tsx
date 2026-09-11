"use client";

import React, { useState, useEffect } from "react";
import type { ServiceBooking, Technician, ServiceStatus, Product, ProposedPartItem } from "@/lib/types";
import {
  WrenchIcon,
  TechnicianIcon,
  SearchIcon,
  PhoneIcon,
  WhatsAppIcon,
  PinIcon,
  CalendarIcon,
  ExternalLinkIcon,
  CloseIcon,
  CheckIcon,
  RefreshIcon,
  AlertCircleIcon,
  EyeIcon,
  ClockIcon,
  OrderBoxIcon,
} from "@/components/AdminIcons";

function getProductImageUrl(img?: string): string {
  if (!img) return "";
  if (img.startsWith("http://") || img.startsWith("https://") || img.startsWith("data:")) {
    return img;
  }
  const isLocal =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  const host = isLocal ? "http://localhost:3000" : "https://roparts.in";
  return `${host}${img.startsWith("/") ? "" : "/"}${img}`;
}

function ProposedItemImage({
  src,
  alt,
  fallbackLetter,
}: {
  src?: string;
  alt: string;
  fallbackLetter?: string;
}) {
  const [loadError, setLoadError] = useState(false);
  const resolvedUrl = getProductImageUrl(src);

  if (loadError || !src || !resolvedUrl) {
    return (
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "8px",
          background: "#f1f5f9",
          border: "1px solid #cbd5e1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#475569",
          fontWeight: 800,
          fontSize: "0.875rem",
          flexShrink: 0,
        }}
        title={alt}
      >
        {fallbackLetter || (alt ? alt.charAt(0).toUpperCase() : "P")}
      </div>
    );
  }

  return (
    <img
      src={resolvedUrl}
      alt={alt}
      onError={() => setLoadError(true)}
      style={{
        width: "48px",
        height: "48px",
        borderRadius: "8px",
        objectFit: "contain",
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        flexShrink: 0,
        padding: "2px",
      }}
    />
  );
}

interface ServicesTabProps {
  services: ServiceBooking[];
  technicians: Technician[];
  products?: Product[];
  onRefresh: () => Promise<void>;
  onAssignTechnician: (
    serviceId: string,
    technician: Technician
  ) => Promise<{ success: boolean; error?: string }>;
  onUpdateServiceStatus: (serviceId: string, status: ServiceStatus) => Promise<boolean>;
  initialTechnicianFilter?: string | null;
}

export function ServicesTab({
  services,
  technicians,
  products,
  onRefresh,
  onAssignTechnician,
  onUpdateServiceStatus,
  initialTechnicianFilter,
}: ServicesTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [technicianFilter, setTechnicianFilter] = useState<string>(initialTechnicianFilter || "ALL");
  const [viewMode, setViewMode] = useState<"list" | "table" | "cards">("list");

  // Assignment Modal
  const [serviceToAssign, setServiceToAssign] = useState<ServiceBooking | null>(null);
  const [selectedTechId, setSelectedTechId] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [assignSuccess, setAssignSuccess] = useState("");

  // Details Modal
  const [detailsService, setDetailsService] = useState<ServiceBooking | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [serviceEvents, setServiceEvents] = useState<any[]>([]);

  useEffect(() => {
    if (initialTechnicianFilter) {
      setTechnicianFilter(initialTechnicianFilter);
    }
  }, [initialTechnicianFilter]);

  // Load audit trail events when detail modal opens
  useEffect(() => {
    if (detailsService) {
      setLoadingEvents(true);
      fetch(`https://tjxxh7fyczzv7hluogo5f5seka0tmrqv.lambda-url.ap-south-1.on.aws/services/${detailsService.id}/events`)
        .then((r) => r.json())
        .then((data) => {
          if (data.events) {
            setServiceEvents(data.events);
          } else {
            setServiceEvents([]);
          }
        })
        .catch(() => setServiceEvents([]))
        .finally(() => setLoadingEvents(false));
    } else {
      setServiceEvents([]);
    }
  }, [detailsService]);

  const activeTechnicians = technicians.filter((t) => t.status === "ACTIVE" || t.status === "ON_DUTY");

  // Counts for status tabs
  const unassignedCount = services.filter((s) => s.status === "BOOKED" || !s.assignedTechnicianId).length;
  const assignedCount = services.filter((s) => s.status === "ASSIGNED").length;
  const inProgressCount = services.filter((s) => s.status === "IN_PROGRESS" || s.status === "IN_TRANSIT").length;
  const waitingApprovalCount = services.filter((s) => s.status === "WAITING_APPROVAL").length;
  const completedCount = services.filter((s) => s.status === "COMPLETED").length;
  const cancelledCount = services.filter((s) => s.status === "CANCELLED").length;

  // Filter services
  const filteredServices = services.filter((srv) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      srv.id.toLowerCase().includes(q) ||
      srv.customerName.toLowerCase().includes(q) ||
      srv.customerPhone.includes(q) ||
      srv.address.city.toLowerCase().includes(q) ||
      srv.address.pincode.includes(q) ||
      (srv.problemDescription && srv.problemDescription.toLowerCase().includes(q));

    let matchesStatus = true;
    if (statusFilter === "UNASSIGNED") {
      matchesStatus = srv.status === "BOOKED" || !srv.assignedTechnicianId;
    } else if (statusFilter !== "ALL") {
      matchesStatus = srv.status === statusFilter;
    }

    const matchesTech = technicianFilter === "ALL" || srv.assignedTechnicianId === technicianFilter;

    return matchesSearch && matchesStatus && matchesTech;
  });

  const handleOpenAssignModal = (srv: ServiceBooking) => {
    setServiceToAssign(srv);
    setSelectedTechId(srv.assignedTechnicianId || activeTechnicians[0]?.id || "");
    setAssignError("");
    setAssignSuccess("");
  };

  const handleConfirmAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceToAssign || !selectedTechId) {
      setAssignError("Please select a technician to assign.");
      return;
    }

    const targetTech = technicians.find((t) => t.id === selectedTechId);
    if (!targetTech) {
      setAssignError("Technician not found.");
      return;
    }

    setIsAssigning(true);
    setAssignError("");
    try {
      const res = await onAssignTechnician(serviceToAssign.id, targetTech);
      if (res.success) {
        setAssignSuccess(`Assigned to ${targetTech.name} successfully!`);
        setTimeout(() => {
          setServiceToAssign(null);
          setAssignSuccess("");
        }, 1200);
      } else {
        setAssignError(res.error || "Assignment failed.");
      }
    } catch (err: any) {
      setAssignError(err.message || "Failed to assign technician.");
    } finally {
      setIsAssigning(false);
    }
  };

  const formatServiceType = (type: string) => {
    switch (type) {
      case "STANDARD_RO_SERVICE":
        return "₹49 Standard RO Service";
      case "MEMBRANE_REPLACEMENT":
        return "Membrane Replacement";
      case "FILTER_CHANGE":
        return "Sediment / Carbon Filter Change";
      case "FULL_INSTALLATION":
        return "Full RO Purifier Installation";
      case "LEAKAGE_REPAIR":
        return "Leakage & Pressure Repair";
      default:
        return type.replace(/_/g, " ");
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "BOOKED":
        return { bg: "#fef3c7", text: "#92400e", border: "#fde68a", label: "NEEDS ASSIGNMENT" };
      case "ASSIGNED":
        return { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe", label: "ASSIGNED" };
      case "IN_TRANSIT":
        return { bg: "#f5f3ff", text: "#7c3aed", border: "#ddd6fe", label: "IN TRANSIT" };
      case "IN_PROGRESS":
        return { bg: "#e0e7ff", text: "#4338ca", border: "#c7d2fe", label: "IN PROGRESS" };
      case "WAITING_APPROVAL":
        return { bg: "#ffedd5", text: "#c2410c", border: "#fed7aa", label: "QUOTE PENDING APPROVAL" };
      case "COMPLETED":
        return { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0", label: "COMPLETED" };
      case "CANCELLED":
        return { bg: "#fef2f2", text: "#b91c1c", border: "#fecaca", label: "CANCELLED" };
      default:
        return { bg: "#f1f5f9", text: "#475569", border: "#e2e8f0", label: status };
    }
  };

  return (
    <div>
      {/* Top Banner */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "1.25rem",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: 800,
              margin: 0,
              color: "#0f172a",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <WrenchIcon size={22} color="#0f172a" />
            <span>Customer Field Service Bookings</span>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                background: unassignedCount > 0 ? "#fef3c7" : "#f1f5f9",
                color: unassignedCount > 0 ? "#b45309" : "#475569",
                padding: "0.2rem 0.6rem",
                borderRadius: "9999px",
                border: `1px solid ${unassignedCount > 0 ? "#fde68a" : "#e2e8f0"}`,
              }}
            >
              {unassignedCount > 0 ? `${unassignedCount} Unassigned` : `${services.length} Total`}
            </span>
          </h2>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.8125rem", color: "#64748b" }}>
            Customer doorstep RO service requests (₹49 booking fee). Assign certified technicians, track job status, and review spare parts approvals.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => onRefresh()}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              color: "#0f172a",
              borderRadius: "10px",
              padding: "0.5rem 0.875rem",
              fontWeight: 700,
              fontSize: "0.8125rem",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            }}
          >
            <RefreshIcon size={14} color="#0f172a" />
            <span>Refresh Services</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.35rem",
          overflowX: "auto",
          marginBottom: "1rem",
          paddingBottom: "0.25rem",
        }}
      >
        {[
          { id: "ALL", label: `All Requests (${services.length})` },
          { id: "UNASSIGNED", label: `⚠️ Unassigned (${unassignedCount})`, alert: unassignedCount > 0 },
          { id: "ASSIGNED", label: `Assigned (${assignedCount})` },
          { id: "IN_PROGRESS", label: `In Progress (${inProgressCount})` },
          { id: "WAITING_APPROVAL", label: `Waiting Approval (${waitingApprovalCount})` },
          { id: "COMPLETED", label: `Completed (${completedCount})` },
          { id: "CANCELLED", label: `Cancelled (${cancelledCount})` },
        ].map((tab) => {
          const isSel = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              style={{
                padding: "0.45rem 0.85rem",
                borderRadius: "8px",
                fontSize: "0.75rem",
                fontWeight: 800,
                cursor: "pointer",
                whiteSpace: "nowrap",
                border: isSel
                  ? "1px solid #0f172a"
                  : tab.alert
                  ? "1px solid #fde68a"
                  : "1px solid #e2e8f0",
                background: isSel
                  ? "#0f172a"
                  : tab.alert
                  ? "#fef3c7"
                  : "#ffffff",
                color: isSel
                  ? "#ffffff"
                  : tab.alert
                  ? "#92400e"
                  : "#475569",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search and Technician Selector Bar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          marginBottom: "1.25rem",
        }}
      >
        <div style={{ position: "relative", flex: "1 1 280px" }}>
          <input
            type="text"
            placeholder="Search by customer name, phone, address, or service ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "0.45rem 0.75rem 0.45rem 2.2rem",
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              fontSize: "0.8125rem",
              color: "#0f172a",
              background: "#ffffff",
            }}
          />
          <div style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>
            <SearchIcon size={14} color="currentColor" />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          {/* Dual/Triple View Mode Toggle */}
          <div style={{ display: "inline-flex", background: "#f1f5f9", borderRadius: "10px", padding: "0.2rem", border: "1px solid #e2e8f0" }}>
            <button
              onClick={() => setViewMode("list")}
              style={{
                padding: "0.35rem 0.65rem",
                borderRadius: "7px",
                border: "none",
                background: viewMode === "list" ? "#0f172a" : "transparent",
                color: viewMode === "list" ? "#ffffff" : "#475569",
                fontWeight: 700,
                fontSize: "0.75rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                transition: "all 0.15s ease",
              }}
              title="List View (Row by Row)"
            >
              <span>☰</span> List by List
            </button>
            <button
              onClick={() => setViewMode("table")}
              style={{
                padding: "0.35rem 0.65rem",
                borderRadius: "7px",
                border: "none",
                background: viewMode === "table" ? "#0f172a" : "transparent",
                color: viewMode === "table" ? "#ffffff" : "#475569",
                fontWeight: 700,
                fontSize: "0.75rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                transition: "all 0.15s ease",
              }}
              title="Compact Data Table View"
            >
              <span>☷</span> Table
            </button>
            <button
              onClick={() => setViewMode("cards")}
              style={{
                padding: "0.35rem 0.65rem",
                borderRadius: "7px",
                border: "none",
                background: viewMode === "cards" ? "#0f172a" : "transparent",
                color: viewMode === "cards" ? "#ffffff" : "#475569",
                fontWeight: 700,
                fontSize: "0.75rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                transition: "all 0.15s ease",
              }}
              title="Grid Cards View"
            >
              <span>⊞</span> Cards
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>Technician:</label>
            <select
              value={technicianFilter}
              onChange={(e) => setTechnicianFilter(e.target.value)}
              style={{
                padding: "0.45rem 0.75rem",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "#0f172a",
                background: "#ffffff",
              }}
            >
              <option value="ALL">All Technicians</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.assignedCity || "Patna"})
                </option>
              ))}
            </select>
            {technicianFilter !== "ALL" && (
              <button
                onClick={() => setTechnicianFilter("ALL")}
                style={{
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  padding: "0.35rem 0.6rem",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  color: "#475569",
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Services List Grid */}
      {filteredServices.length === 0 ? (
        <div
          style={{
            background: "#ffffff",
            border: "1px dashed #cbd5e1",
            borderRadius: "16px",
            padding: "3rem 1.5rem",
            textAlign: "center",
            color: "#64748b",
          }}
        >
          <div style={{ marginBottom: "0.75rem", color: "#94a3b8" }}>
            <WrenchIcon size={36} color="currentColor" />
          </div>
          <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#0f172a" }}>
            {services.length === 0 ? "No service bookings found" : "No bookings match the selected filter"}
          </div>
          <p style={{ fontSize: "0.8125rem", marginTop: "0.25rem" }}>
            When customers book a doorstep RO service at sparesroparts.in/service, it appears here for technician dispatch.
          </p>
        </div>
      ) : (
        <>
          {/* 1. LIST VIEW (Default: Full-Width Row by Row) */}
          {viewMode === "list" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {filteredServices.map((srv) => {
                const st = getStatusBadgeStyle(srv.status);
                const isUnassigned = srv.status === "BOOKED" || !srv.assignedTechnicianId;
                const createdFormatted = new Date(srv.createdAt).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                });

                return (
                  <div
                    key={srv.id}
                    style={{
                      background: "#ffffff",
                      border: isUnassigned ? "1px solid #fde68a" : "1px solid #e2e8f0",
                      borderLeft: isUnassigned ? "4px solid #d97706" : "4px solid #2563eb",
                      borderRadius: "14px",
                      padding: "1rem 1.25rem",
                      boxShadow: isUnassigned ? "0 2px 6px rgba(245, 158, 11, 0.08)" : "0 1px 3px rgba(0,0,0,0.02)",
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "1rem",
                    }}
                  >
                    {/* Col 1: ID, Fee, Date & Status */}
                    <div style={{ minWidth: "190px", flex: "1 1 190px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.2rem" }}>
                        <span style={{ fontWeight: 900, fontSize: "0.9375rem", color: "#0f172a", fontFamily: "monospace" }}>
                          {srv.id}
                        </span>
                        <span
                          style={{
                            fontSize: "0.6875rem",
                            fontWeight: 800,
                            background: "#dcfce7",
                            color: "#166534",
                            padding: "0.15rem 0.45rem",
                            borderRadius: "4px",
                          }}
                        >
                          ₹49 PAID
                        </span>
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.35rem" }}>
                        {createdFormatted}
                      </div>
                      <span
                        style={{
                          display: "inline-block",
                          fontSize: "0.6875rem",
                          fontWeight: 800,
                          padding: "0.2rem 0.5rem",
                          borderRadius: "6px",
                          background: st.bg,
                          color: st.text,
                          border: `1px solid ${st.border}`,
                          textTransform: "uppercase",
                        }}
                      >
                        {st.label}
                      </span>
                    </div>

                    {/* Col 2: Customer Contact */}
                    <div style={{ minWidth: "170px", flex: "1 1 170px" }}>
                      <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "0.2rem" }}>
                        Customer
                      </div>
                      <div style={{ fontWeight: 800, fontSize: "0.9375rem", color: "#0f172a" }}>
                        {srv.customerName}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.25rem" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.8125rem", color: "#334155" }}>
                          +91 {srv.customerPhone}
                        </span>
                        <a
                          href={`https://wa.me/91${srv.customerPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "#16a34a",
                            background: "#dcfce7",
                            padding: "0.25rem",
                            borderRadius: "5px",
                            display: "inline-flex",
                          }}
                          title="WhatsApp Customer"
                        >
                          <WhatsAppIcon size={14} color="#16a34a" />
                        </a>
                        <a
                          href={`tel:+91${srv.customerPhone}`}
                          style={{
                            color: "#2563eb",
                            background: "#eff6ff",
                            padding: "0.25rem",
                            borderRadius: "5px",
                            display: "inline-flex",
                          }}
                          title="Call Customer"
                        >
                          <PhoneIcon size={14} color="#2563eb" />
                        </a>
                      </div>
                    </div>

                    {/* Col 3: Address & Location */}
                    <div style={{ minWidth: "220px", flex: "1.4 1 220px" }}>
                      <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "0.2rem" }}>
                        Address & City
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.35rem", fontSize: "0.8125rem", color: "#334155" }}>
                        <PinIcon size={14} color="#64748b" style={{ flexShrink: 0, marginTop: "0.15rem" }} />
                        <div>
                          <span>{srv.address.line1}</span>
                          {srv.address.line2 && <span>, {srv.address.line2}</span>}
                          <div style={{ fontWeight: 600, color: "#0f172a", marginTop: "0.1rem" }}>
                            {srv.address.city} — {srv.address.pincode}
                            {srv.address.landmark && <span style={{ color: "#64748b", fontWeight: 400 }}> ({srv.address.landmark})</span>}
                          </div>
                          {srv.address.latitude && srv.address.longitude && (
                            <a
                              href={`https://www.google.com/maps?q=${srv.address.latitude},${srv.address.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: "#2563eb",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                textDecoration: "underline",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.2rem",
                                marginTop: "0.15rem",
                              }}
                            >
                              <span>Open in Maps</span>
                              <ExternalLinkIcon size={10} color="currentColor" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Col 4: Service Type & Problem */}
                    <div style={{ minWidth: "200px", flex: "1.2 1 200px" }}>
                      <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "0.2rem" }}>
                        Service & Complaint
                      </div>
                      <div style={{ fontWeight: 800, fontSize: "0.8125rem", color: "#0f172a" }}>
                        {formatServiceType(srv.serviceType)}
                      </div>
                      {srv.problemDescription ? (
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "#475569",
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: "6px",
                            padding: "0.25rem 0.5rem",
                            marginTop: "0.25rem",
                            maxWidth: "260px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={srv.problemDescription}
                        >
                          "{srv.problemDescription}"
                        </div>
                      ) : (
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.25rem" }}>
                          Standard doorstep checkup
                        </div>
                      )}

                      {srv.latestProposal && srv.latestProposal.parts && srv.latestProposal.parts.length > 0 && (
                        <div
                          onClick={() => setDetailsService(srv)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            fontSize: "0.6875rem",
                            marginTop: "0.35rem",
                            padding: "0.2rem 0.5rem",
                            borderRadius: "6px",
                            cursor: "pointer",
                            background:
                              srv.latestProposal.status === "APPROVED"
                                ? "#ecfdf5"
                                : srv.latestProposal.status === "REJECTED"
                                ? "#fef2f2"
                                : "#fffbeb",
                            color:
                              srv.latestProposal.status === "APPROVED"
                                ? "#15803d"
                                : srv.latestProposal.status === "REJECTED"
                                ? "#b91c1c"
                                : "#b45309",
                            border: `1px solid ${
                              srv.latestProposal.status === "APPROVED"
                                ? "#bbf7d0"
                                : srv.latestProposal.status === "REJECTED"
                                ? "#fecaca"
                                : "#fde68a"
                            }`,
                            fontWeight: 700,
                          }}
                          title="Click to view proposed parts & images"
                        >
                          <OrderBoxIcon size={12} color="currentColor" />
                          <span>
                            {srv.latestProposal.parts.length} Proposed {srv.latestProposal.parts.length === 1 ? "Part" : "Parts"} (₹{Math.round((srv.latestProposal.totalAmount || 0) / 100)}) &bull; {srv.latestProposal.status}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Col 5: Assigned Technician */}
                    <div style={{ minWidth: "180px", flex: "1 1 180px" }}>
                      <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "0.2rem" }}>
                        Assigned Technician
                      </div>
                      {isUnassigned ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", alignItems: "flex-start" }}>
                          <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#b45309", background: "#fef3c7", padding: "0.15rem 0.45rem", borderRadius: "4px" }}>
                            ⚠️ No Tech Assigned
                          </span>
                          <button
                            onClick={() => handleOpenAssignModal(srv)}
                            style={{
                              background: "#d97706",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "6px",
                              padding: "0.35rem 0.75rem",
                              fontSize: "0.75rem",
                              fontWeight: 800,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.3rem",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                            }}
                          >
                            <TechnicianIcon size={13} color="#ffffff" />
                            <span>Assign Now</span>
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", alignItems: "flex-start" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                            <TechnicianIcon size={14} color="#0284c7" />
                            <span style={{ fontWeight: 800, fontSize: "0.8125rem", color: "#0369a1" }}>
                              {srv.assignedTechnicianName}
                            </span>
                          </div>
                          {srv.assignedTechnicianPhone && (
                            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                              +91 {srv.assignedTechnicianPhone}
                            </span>
                          )}
                          <button
                            onClick={() => handleOpenAssignModal(srv)}
                            style={{
                              background: "#f0f9ff",
                              color: "#0284c7",
                              border: "1px solid #bae6fd",
                              borderRadius: "6px",
                              padding: "0.2rem 0.5rem",
                              fontSize: "0.6875rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              marginTop: "0.15rem",
                            }}
                          >
                            Reassign
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Col 6: Quick Status & Log Action */}
                    <div style={{ minWidth: "150px", display: "flex", flexDirection: "column", gap: "0.4rem", alignItems: "flex-end", flex: "0.8 1 150px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <select
                          value={srv.status}
                          onChange={(e) => onUpdateServiceStatus(srv.id, e.target.value as ServiceStatus)}
                          style={{
                            padding: "0.3rem 0.5rem",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            color: "#0f172a",
                            background: "#ffffff",
                            cursor: "pointer",
                          }}
                        >
                          <option value="BOOKED">BOOKED</option>
                          <option value="ASSIGNED">ASSIGNED</option>
                          <option value="IN_TRANSIT">IN TRANSIT</option>
                          <option value="IN_PROGRESS">IN PROGRESS</option>
                          <option value="WAITING_APPROVAL">WAITING APPROVAL</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                      </div>

                      <button
                        onClick={() => setDetailsService(srv)}
                        style={{
                          background: "#f1f5f9",
                          border: "1px solid #cbd5e1",
                          color: "#0f172a",
                          borderRadius: "6px",
                          padding: "0.35rem 0.75rem",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <EyeIcon size={13} color="#0f172a" />
                        <span>Inspection & Log</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 2. TABLE VIEW */}
          {viewMode === "table" && (
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", overflowX: "auto", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.8125rem" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", fontSize: "0.75rem", textTransform: "uppercase" }}>
                    <th style={{ padding: "0.75rem 1rem" }}>Booking ID & Date</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Customer</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Address</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Service & Complaint</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Assigned Tech</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Status</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredServices.map((srv) => {
                    const st = getStatusBadgeStyle(srv.status);
                    const isUnassigned = srv.status === "BOOKED" || !srv.assignedTechnicianId;
                    const createdFormatted = new Date(srv.createdAt).toLocaleString("en-IN", {
                      dateStyle: "short",
                      timeStyle: "short",
                    });

                    return (
                      <tr key={srv.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                            <span style={{ fontWeight: 800, color: "#0f172a", fontFamily: "monospace" }}>{srv.id}</span>
                            <span style={{ fontSize: "0.625rem", fontWeight: 800, background: "#dcfce7", color: "#166534", padding: "0.1rem 0.35rem", borderRadius: "4px" }}>₹49</span>
                          </div>
                          <div style={{ fontSize: "0.6875rem", color: "#64748b", marginTop: "0.15rem" }}>{createdFormatted}</div>
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <div style={{ fontWeight: 700, color: "#0f172a" }}>{srv.customerName}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginTop: "0.15rem" }}>
                            <span style={{ color: "#475569", fontSize: "0.75rem" }}>+91 {srv.customerPhone}</span>
                            <a href={`https://wa.me/91${srv.customerPhone}`} target="_blank" rel="noopener noreferrer" style={{ color: "#16a34a" }} title="WhatsApp">
                              <WhatsAppIcon size={12} color="currentColor" />
                            </a>
                            <a href={`tel:+91${srv.customerPhone}`} style={{ color: "#2563eb" }} title="Call">
                              <PhoneIcon size={12} color="currentColor" />
                            </a>
                          </div>
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <div style={{ color: "#334155", maxWidth: "200px" }}>{srv.address.line1}</div>
                          <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.75rem" }}>{srv.address.city} — {srv.address.pincode}</div>
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <div style={{ fontWeight: 700, color: "#0f172a" }}>{formatServiceType(srv.serviceType)}</div>
                          {srv.problemDescription && (
                            <div style={{ fontSize: "0.6875rem", color: "#64748b", maxWidth: "180px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              "{srv.problemDescription}"
                            </div>
                          )}
                          {srv.latestProposal && srv.latestProposal.parts && srv.latestProposal.parts.length > 0 && (
                            <div
                              onClick={() => setDetailsService(srv)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.25rem",
                                fontSize: "0.6875rem",
                                marginTop: "0.25rem",
                                padding: "0.15rem 0.4rem",
                                borderRadius: "4px",
                                cursor: "pointer",
                                background:
                                  srv.latestProposal.status === "APPROVED"
                                    ? "#ecfdf5"
                                    : srv.latestProposal.status === "REJECTED"
                                    ? "#fef2f2"
                                    : "#fffbeb",
                                color:
                                  srv.latestProposal.status === "APPROVED"
                                    ? "#15803d"
                                    : srv.latestProposal.status === "REJECTED"
                                    ? "#b91c1c"
                                    : "#b45309",
                                border: `1px solid ${
                                  srv.latestProposal.status === "APPROVED"
                                    ? "#bbf7d0"
                                    : srv.latestProposal.status === "REJECTED"
                                    ? "#fecaca"
                                    : "#fde68a"
                                }`,
                                fontWeight: 700,
                              }}
                              title="Click to view proposed parts & images"
                            >
                              <OrderBoxIcon size={11} color="currentColor" />
                              <span>
                                {srv.latestProposal.parts.length} Parts (₹{Math.round((srv.latestProposal.totalAmount || 0) / 100)})
                              </span>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          {isUnassigned ? (
                            <button
                              onClick={() => handleOpenAssignModal(srv)}
                              style={{
                                background: "#d97706",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "6px",
                                padding: "0.25rem 0.5rem",
                                fontSize: "0.6875rem",
                                fontWeight: 800,
                                cursor: "pointer",
                              }}
                            >
                              Assign Tech
                            </button>
                          ) : (
                            <div>
                              <div style={{ fontWeight: 700, color: "#0369a1" }}>{srv.assignedTechnicianName}</div>
                              <button
                                onClick={() => handleOpenAssignModal(srv)}
                                style={{ background: "none", border: "none", color: "#2563eb", fontSize: "0.6875rem", padding: 0, cursor: "pointer", textDecoration: "underline" }}
                              >
                                Reassign
                              </button>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <span
                            style={{
                              fontSize: "0.6875rem",
                              fontWeight: 800,
                              padding: "0.15rem 0.45rem",
                              borderRadius: "6px",
                              background: st.bg,
                              color: st.text,
                              border: `1px solid ${st.border}`,
                              textTransform: "uppercase",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {st.label}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                            <select
                              value={srv.status}
                              onChange={(e) => onUpdateServiceStatus(srv.id, e.target.value as ServiceStatus)}
                              style={{
                                padding: "0.2rem 0.35rem",
                                borderRadius: "6px",
                                border: "1px solid #cbd5e1",
                                fontSize: "0.6875rem",
                                fontWeight: 700,
                                color: "#0f172a",
                                background: "#ffffff",
                              }}
                            >
                              <option value="BOOKED">BOOKED</option>
                              <option value="ASSIGNED">ASSIGNED</option>
                              <option value="IN_TRANSIT">IN TRANSIT</option>
                              <option value="IN_PROGRESS">IN PROGRESS</option>
                              <option value="WAITING_APPROVAL">WAITING APPROVAL</option>
                              <option value="COMPLETED">COMPLETED</option>
                              <option value="CANCELLED">CANCELLED</option>
                            </select>
                            <button
                              onClick={() => setDetailsService(srv)}
                              style={{
                                background: "#f1f5f9",
                                border: "1px solid #cbd5e1",
                                color: "#0f172a",
                                borderRadius: "6px",
                                padding: "0.25rem 0.45rem",
                                fontSize: "0.6875rem",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                              title="Inspection & Log"
                            >
                              Log
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

          {/* 3. CARDS GRID VIEW */}
          {viewMode === "cards" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "1rem" }}>
              {filteredServices.map((srv) => {
                const st = getStatusBadgeStyle(srv.status);
                const isUnassigned = srv.status === "BOOKED" || !srv.assignedTechnicianId;
                const createdFormatted = new Date(srv.createdAt).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                });

                return (
                  <div
                    key={srv.id}
                    style={{
                      background: "#ffffff",
                      border: isUnassigned ? "1px solid #fde68a" : "1px solid #e2e8f0",
                      borderRadius: "16px",
                      padding: "1.25rem",
                      boxShadow: isUnassigned ? "0 2px 6px rgba(245, 158, 11, 0.08)" : "0 1px 3px rgba(0,0,0,0.02)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      {/* Card Header: Service ID, Date, Status */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <span style={{ fontWeight: 900, fontSize: "0.9375rem", color: "#0f172a" }}>
                              {srv.id}
                            </span>
                            <span
                              style={{
                                fontSize: "0.6875rem",
                                fontWeight: 800,
                                background: "#dcfce7",
                                color: "#166534",
                                padding: "0.15rem 0.45rem",
                                borderRadius: "4px",
                              }}
                            >
                              ₹49 PAID
                            </span>
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.15rem" }}>
                            {createdFormatted}
                          </div>
                        </div>

                        <span
                          style={{
                            fontSize: "0.6875rem",
                            fontWeight: 800,
                            padding: "0.2rem 0.5rem",
                            borderRadius: "6px",
                            background: st.bg,
                            color: st.text,
                            border: `1px solid ${st.border}`,
                            textTransform: "uppercase",
                          }}
                        >
                          {st.label}
                        </span>
                      </div>

                      {/* Customer Info Box */}
                      <div
                        style={{
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: "10px",
                          padding: "0.75rem",
                          marginBottom: "0.75rem",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                          <span style={{ fontWeight: 800, fontSize: "0.875rem", color: "#0f172a" }}>
                            {srv.customerName}
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <span style={{ fontWeight: 700, fontSize: "0.8125rem", color: "#334155" }}>
                              +91 {srv.customerPhone}
                            </span>
                            <a
                              href={`https://wa.me/91${srv.customerPhone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: "#16a34a",
                                background: "#dcfce7",
                                padding: "0.2rem",
                                borderRadius: "4px",
                                display: "inline-flex",
                              }}
                              title="WhatsApp Customer"
                            >
                              <WhatsAppIcon size={14} color="#16a34a" />
                            </a>
                            <a
                              href={`tel:+91${srv.customerPhone}`}
                              style={{
                                color: "#2563eb",
                                background: "#eff6ff",
                                padding: "0.2rem",
                                borderRadius: "4px",
                                display: "inline-flex",
                              }}
                              title="Call Customer"
                            >
                              <PhoneIcon size={14} color="#2563eb" />
                            </a>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.35rem", fontSize: "0.75rem", color: "#475569" }}>
                          <PinIcon size={14} color="#64748b" style={{ flexShrink: 0, marginTop: "0.1rem" }} />
                          <div>
                            <span>{srv.address.line1}</span>
                            {srv.address.line2 && <span>, {srv.address.line2}</span>}
                            <div>
                              <strong>{srv.address.city}</strong> — {srv.address.pincode}
                              {srv.address.landmark && <span style={{ color: "#64748b" }}> ({srv.address.landmark})</span>}
                            </div>
                            {srv.address.latitude && srv.address.longitude && (
                              <a
                                href={`https://www.google.com/maps?q=${srv.address.latitude},${srv.address.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color: "#2563eb",
                                  fontWeight: 700,
                                  textDecoration: "underline",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.2rem",
                                  marginTop: "0.2rem",
                                }}
                              >
                                <span>Open in Maps</span>
                                <ExternalLinkIcon size={10} color="currentColor" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Problem / Complaint Description */}
                      <div style={{ marginBottom: "0.75rem" }}>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", marginBottom: "0.2rem" }}>
                          SERVICE TYPE & COMPLAINT:
                        </div>
                        <div style={{ fontWeight: 800, fontSize: "0.8125rem", color: "#0f172a" }}>
                          {formatServiceType(srv.serviceType)}
                        </div>
                        {srv.problemDescription && (
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "#334155",
                              background: "#fffbeb",
                              border: "1px solid #fef3c7",
                              borderRadius: "6px",
                              padding: "0.35rem 0.5rem",
                              marginTop: "0.3rem",
                            }}
                          >
                            "{srv.problemDescription}"
                          </div>
                        )}
                        {srv.latestProposal && srv.latestProposal.parts && srv.latestProposal.parts.length > 0 && (
                          <div
                            onClick={() => setDetailsService(srv)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.3rem",
                              fontSize: "0.6875rem",
                              marginTop: "0.35rem",
                              padding: "0.2rem 0.5rem",
                              borderRadius: "6px",
                              cursor: "pointer",
                              background:
                                srv.latestProposal.status === "APPROVED"
                                ? "#ecfdf5"
                                : srv.latestProposal.status === "REJECTED"
                                ? "#fef2f2"
                                : "#fffbeb",
                              color:
                                srv.latestProposal.status === "APPROVED"
                                ? "#15803d"
                                : srv.latestProposal.status === "REJECTED"
                                ? "#b91c1c"
                                : "#b45309",
                              border: `1px solid ${
                                srv.latestProposal.status === "APPROVED"
                                ? "#bbf7d0"
                                : srv.latestProposal.status === "REJECTED"
                                ? "#fecaca"
                                : "#fde68a"
                              }`,
                              fontWeight: 700,
                            }}
                            title="Click to view proposed parts & images"
                          >
                            <OrderBoxIcon size={12} color="currentColor" />
                            <span>
                              {srv.latestProposal.parts.length} Proposed Parts (₹{Math.round((srv.latestProposal.totalAmount || 0) / 100)}) &bull; {srv.latestProposal.status}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Assigned Technician Banner */}
                      <div
                        style={{
                          background: isUnassigned ? "#fffbeb" : "#f0f9ff",
                          border: `1px solid ${isUnassigned ? "#fde68a" : "#bae6fd"}`,
                          borderRadius: "8px",
                          padding: "0.5rem 0.75rem",
                          marginBottom: "0.75rem",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <TechnicianIcon size={15} color={isUnassigned ? "#d97706" : "#0284c7"} />
                          {isUnassigned ? (
                            <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#b45309" }}>
                              No Technician Assigned
                            </span>
                          ) : (
                            <div style={{ fontSize: "0.75rem" }}>
                              <span style={{ fontWeight: 800, color: "#0369a1" }}>
                                {srv.assignedTechnicianName}
                              </span>
                              {srv.assignedTechnicianPhone && (
                                <span style={{ color: "#64748b", marginLeft: "0.35rem" }}>
                                  (+91 {srv.assignedTechnicianPhone})
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleOpenAssignModal(srv)}
                          style={{
                            background: isUnassigned ? "#d97706" : "#ffffff",
                            color: isUnassigned ? "#ffffff" : "#0284c7",
                            border: isUnassigned ? "none" : "1px solid #bae6fd",
                            borderRadius: "6px",
                            padding: "0.25rem 0.6rem",
                            fontSize: "0.75rem",
                            fontWeight: 800,
                            cursor: "pointer",
                            boxShadow: isUnassigned ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
                          }}
                        >
                          {isUnassigned ? "Assign Now" : "Reassign"}
                        </button>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div
                      style={{
                        borderTop: "1px solid #f1f5f9",
                        paddingTop: "0.75rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <label style={{ fontSize: "0.6875rem", color: "#64748b", fontWeight: 700 }}>Status:</label>
                        <select
                          value={srv.status}
                          onChange={(e) => onUpdateServiceStatus(srv.id, e.target.value as ServiceStatus)}
                          style={{
                            padding: "0.25rem 0.45rem",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            color: "#0f172a",
                            background: "#ffffff",
                            cursor: "pointer",
                          }}
                        >
                          <option value="BOOKED">BOOKED</option>
                          <option value="ASSIGNED">ASSIGNED</option>
                          <option value="IN_TRANSIT">IN TRANSIT</option>
                          <option value="IN_PROGRESS">IN PROGRESS</option>
                          <option value="WAITING_APPROVAL">WAITING APPROVAL</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                      </div>

                      <button
                        onClick={() => setDetailsService(srv)}
                        style={{
                          background: "#f1f5f9",
                          border: "1px solid #cbd5e1",
                          color: "#0f172a",
                          borderRadius: "6px",
                          padding: "0.3rem 0.6rem",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                        }}
                      >
                        <EyeIcon size={13} color="#0f172a" />
                        <span>Inspection & Log</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modal: Assign Field Technician */}
      {serviceToAssign && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "20px",
              maxWidth: "480px",
              width: "100%",
              padding: "1.5rem",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <TechnicianIcon size={20} color="#0f172a" />
                <h3 style={{ fontSize: "1.125rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                  Assign Technician to Job
                </h3>
              </div>
              <button
                onClick={() => setServiceToAssign(null)}
                style={{
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  color: "#0f172a",
                  width: "30px",
                  height: "30px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CloseIcon size={14} color="#0f172a" />
              </button>
            </div>

            {/* Job Summary */}
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "0.75rem",
                marginBottom: "1rem",
                fontSize: "0.8125rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                <span style={{ color: "#64748b" }}>Booking ID:</span>
                <span style={{ fontWeight: 800, color: "#0f172a" }}>{serviceToAssign.id}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                <span style={{ color: "#64748b" }}>Customer:</span>
                <span style={{ fontWeight: 700, color: "#0f172a" }}>
                  {serviceToAssign.customerName} (+91 {serviceToAssign.customerPhone})
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Location:</span>
                <span style={{ color: "#334155", fontWeight: 600 }}>
                  {serviceToAssign.address.city} — {serviceToAssign.address.pincode}
                </span>
              </div>
            </div>

            {assignError && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#dc2626",
                  padding: "0.625rem",
                  borderRadius: "8px",
                  fontSize: "0.8125rem",
                  marginBottom: "1rem",
                  fontWeight: 700,
                }}
              >
                {assignError}
              </div>
            )}

            {assignSuccess && (
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  color: "#166534",
                  padding: "0.625rem",
                  borderRadius: "8px",
                  fontSize: "0.8125rem",
                  marginBottom: "1rem",
                  fontWeight: 700,
                }}
              >
                {assignSuccess}
              </div>
            )}

            <form onSubmit={handleConfirmAssignment}>
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.5rem" }}>
                  Select Certified Technician *
                </label>

                {activeTechnicians.length === 0 ? (
                  <div
                    style={{
                      background: "#fffbeb",
                      border: "1px solid #fef3c7",
                      borderRadius: "8px",
                      padding: "0.75rem",
                      fontSize: "0.8125rem",
                      color: "#b45309",
                    }}
                  >
                    No active technicians available. Please whitelist or activate a technician in the Technicians tab first.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "240px", overflowY: "auto" }}>
                    {activeTechnicians.map((tech) => {
                      const isSel = selectedTechId === tech.id;
                      const techActiveJobs = services.filter(
                        (s) => s.assignedTechnicianId === tech.id && s.status !== "COMPLETED" && s.status !== "CANCELLED"
                      ).length;

                      return (
                        <div
                          key={tech.id}
                          onClick={() => setSelectedTechId(tech.id)}
                          style={{
                            border: isSel ? "2px solid #0f172a" : "1px solid #cbd5e1",
                            background: isSel ? "#f8fafc" : "#ffffff",
                            borderRadius: "10px",
                            padding: "0.75rem",
                            cursor: "pointer",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            transition: "all 0.1s ease",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                            <div
                              style={{
                                width: "16px",
                                height: "16px",
                                borderRadius: "50%",
                                border: isSel ? "5px solid #0f172a" : "2px solid #cbd5e1",
                                background: "#ffffff",
                              }}
                            />
                            <div>
                              <div style={{ fontWeight: 800, fontSize: "0.875rem", color: "#0f172a" }}>
                                {tech.name}
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                +91 {tech.phone} &bull; {tech.assignedCity || "Patna"}
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: "right" }}>
                            <span
                              style={{
                                fontSize: "0.6875rem",
                                fontWeight: 700,
                                background: techActiveJobs > 2 ? "#fee2e2" : "#f1f5f9",
                                color: techActiveJobs > 2 ? "#b91c1c" : "#475569",
                                padding: "0.15rem 0.45rem",
                                borderRadius: "4px",
                              }}
                            >
                              {techActiveJobs} active jobs
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setServiceToAssign(null)}
                  style={{
                    background: "#f1f5f9",
                    border: "none",
                    borderRadius: "8px",
                    padding: "0.625rem 1rem",
                    fontSize: "0.8125rem",
                    fontWeight: 700,
                    color: "#475569",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigning || activeTechnicians.length === 0}
                  style={{
                    background: "#0f172a",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "0.625rem 1.25rem",
                    fontSize: "0.8125rem",
                    fontWeight: 800,
                    cursor: isAssigning || activeTechnicians.length === 0 ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    opacity: isAssigning || activeTechnicians.length === 0 ? 0.7 : 1,
                  }}
                >
                  {isAssigning ? "Assigning..." : "Confirm Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Service Details & Audit Log */}
      {detailsService && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "20px",
              maxWidth: "600px",
              width: "100%",
              padding: "1.5rem",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <WrenchIcon size={20} color="#0f172a" />
                <h3 style={{ fontSize: "1.125rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                  Service Inspection #{detailsService.id}
                </h3>
              </div>
              <button
                onClick={() => setDetailsService(null)}
                style={{
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  color: "#0f172a",
                  width: "30px",
                  height: "30px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CloseIcon size={14} color="#0f172a" />
              </button>
            </div>

            {/* Customer & Address Details */}
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0.875rem", marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#64748b", marginBottom: "0.4rem" }}>
                CUSTOMER CONTACT & LOCATION
              </div>
              <div style={{ fontWeight: 800, fontSize: "0.9375rem", color: "#0f172a" }}>
                {detailsService.customerName}
              </div>
              <div style={{ fontSize: "0.8125rem", color: "#334155", margin: "0.2rem 0" }}>
                Phone: <strong>+91 {detailsService.customerPhone}</strong>
              </div>
              <div style={{ fontSize: "0.8125rem", color: "#475569" }}>
                Address: {detailsService.address.line1}, {detailsService.address.city} — {detailsService.address.pincode}
              </div>
            </div>

            {/* Service & Assignment Info */}
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0.875rem", marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#64748b", marginBottom: "0.4rem" }}>
                SERVICE TYPE & COMPLAINT
              </div>
              <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "#0f172a" }}>
                {formatServiceType(detailsService.serviceType)}
              </div>
              {detailsService.problemDescription && (
                <div style={{ fontSize: "0.8125rem", color: "#475569", marginTop: "0.25rem", fontStyle: "italic" }}>
                  "{detailsService.problemDescription}"
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem", borderTop: "1px solid #e2e8f0", paddingTop: "0.5rem" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Assigned Tech:</span>
                <span style={{ fontWeight: 800, color: "#0f172a" }}>
                  {detailsService.assignedTechnicianName ? `${detailsService.assignedTechnicianName} (+91 ${detailsService.assignedTechnicianPhone})` : "Unassigned"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.35rem" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Spare Parts Proposals:</span>
                <span style={{ fontWeight: 700, color: detailsService.approvalAttemptsCount > 0 ? "#2563eb" : "#64748b" }}>
                  {detailsService.approvalAttemptsCount || 0} / 3 attempts
                </span>
              </div>
            </div>

            {/* Proposed Spare Parts & Quotation Section */}
            {(() => {
              const activeProposal =
                detailsService.latestProposal ||
                (detailsService.proposals && detailsService.proposals.length > 0
                  ? detailsService.proposals[detailsService.proposals.length - 1]
                  : undefined);
              const parts: ProposedPartItem[] = activeProposal?.parts || [];

              if (parts.length > 0 && activeProposal) {
                const totalPartsRs = Math.round((activeProposal.totalAmount || 0) / 100);
                const inspectionFeeRs = Math.round((detailsService.bookingFee || 4900) / 100);
                const grandTotalRs = totalPartsRs + inspectionFeeRs;

                return (
                  <div
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      padding: "1rem",
                      marginBottom: "1rem",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "0.75rem",
                        borderBottom: "1px solid #f1f5f9",
                        paddingBottom: "0.5rem",
                        flexWrap: "wrap",
                        gap: "0.5rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <OrderBoxIcon size={16} color="#2563eb" />
                        <span style={{ fontSize: "0.8125rem", fontWeight: 800, color: "#0f172a" }}>
                          Proposed Spare Parts & Quotation
                        </span>
                      </div>

                      <span
                        style={{
                          fontSize: "0.6875rem",
                          fontWeight: 800,
                          padding: "0.2rem 0.6rem",
                          borderRadius: "999px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.3rem",
                          background:
                            activeProposal.status === "APPROVED"
                              ? "#ecfdf5"
                              : activeProposal.status === "REJECTED"
                              ? "#fef2f2"
                              : "#fffbeb",
                          color:
                            activeProposal.status === "APPROVED"
                              ? "#15803d"
                              : activeProposal.status === "REJECTED"
                              ? "#b91c1c"
                              : "#b45309",
                          border: `1px solid ${
                            activeProposal.status === "APPROVED"
                              ? "#bbf7d0"
                              : activeProposal.status === "REJECTED"
                              ? "#fecaca"
                              : "#fde68a"
                          }`,
                        }}
                      >
                        {activeProposal.status === "APPROVED" && "✓ Approved by Customer"}
                        {activeProposal.status === "REJECTED" && "✕ Rejected by Customer"}
                        {activeProposal.status === "PENDING" && "⏳ Awaiting Customer Approval"}
                        {!["APPROVED", "REJECTED", "PENDING"].includes(activeProposal.status) &&
                          activeProposal.status}
                      </span>
                    </div>

                    {/* Metadata strip */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: "0.75rem",
                        color: "#64748b",
                        marginBottom: "0.75rem",
                        background: "#f8fafc",
                        padding: "0.4rem 0.65rem",
                        borderRadius: "6px",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <span>
                        Attempt <strong>{detailsService.approvalAttemptsCount || 1}</strong> of 3
                      </span>
                      {activeProposal.createdAt && (
                        <span>
                          Sent {new Date(activeProposal.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>

                    {/* Tech diagnosis note */}
                    {activeProposal.technicianNotes && (
                      <div
                        style={{
                          background: "#f0f9ff",
                          border: "1px solid #bae6fd",
                          borderRadius: "6px",
                          padding: "0.45rem 0.65rem",
                          fontSize: "0.75rem",
                          color: "#0369a1",
                          marginBottom: "0.75rem",
                        }}
                      >
                        <strong>Technician Diagnosis:</strong> "{activeProposal.technicianNotes}"
                      </div>
                    )}

                    {/* Customer feedback note */}
                    {activeProposal.customerNotes && (
                      <div
                        style={{
                          background: activeProposal.status === "REJECTED" ? "#fff1f2" : "#f0fdf4",
                          border: `1px solid ${
                            activeProposal.status === "REJECTED" ? "#fecdd3" : "#bbf7d0"
                          }`,
                          borderRadius: "6px",
                          padding: "0.45rem 0.65rem",
                          fontSize: "0.75rem",
                          color: activeProposal.status === "REJECTED" ? "#9f1239" : "#166534",
                          marginBottom: "0.75rem",
                        }}
                      >
                        <strong>Customer Feedback:</strong> "{activeProposal.customerNotes}"
                      </div>
                    )}

                    {/* Itemized Parts List with Product Image */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {parts.map((item, idx) => {
                        const matchedProduct = products?.find(
                          (p) => p.id === item.productId || (item.sku && p.sku === item.sku)
                        );
                        const resolvedImage = item.image || matchedProduct?.images?.[0];
                        const unitPriceRs = Math.round((item.unitPrice || 0) / 100);
                        const lineTotalRs = Math.round(
                          (item.totalPrice || (item.unitPrice || 0) * (item.quantity || 1)) / 100
                        );

                        return (
                          <div
                            key={item.productId || item.sku || idx}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.75rem",
                              background: "#ffffff",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                              padding: "0.5rem 0.65rem",
                            }}
                          >
                            <ProposedItemImage
                              src={resolvedImage}
                              alt={item.name}
                              fallbackLetter={item.name.charAt(0)}
                            />

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontWeight: 700,
                                  fontSize: "0.8125rem",
                                  color: "#0f172a",
                                  lineHeight: "1.25",
                                  marginBottom: "0.15rem",
                                }}
                              >
                                {item.name}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                                {item.sku && (
                                  <span
                                    style={{
                                      fontSize: "0.6875rem",
                                      color: "#64748b",
                                      background: "#f1f5f9",
                                      padding: "0.1rem 0.35rem",
                                      borderRadius: "4px",
                                      fontFamily: "monospace",
                                    }}
                                  >
                                    {item.sku}
                                  </span>
                                )}
                                <span style={{ fontSize: "0.75rem", color: "#475569" }}>
                                  Qty: <strong>{item.quantity || 1}</strong> &times; ₹{unitPriceRs}
                                </span>
                              </div>
                            </div>

                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                              <div style={{ fontWeight: 800, fontSize: "0.875rem", color: "#0f172a" }}>
                                ₹{lineTotalRs}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Quotation Total Summary */}
                    <div
                      style={{
                        marginTop: "0.75rem",
                        borderTop: "1px dashed #cbd5e1",
                        paddingTop: "0.65rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.25rem",
                        fontSize: "0.75rem",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
                        <span>Parts Quota ({parts.length} {parts.length === 1 ? "item" : "items"}):</span>
                        <span style={{ fontWeight: 700, color: "#0f172a" }}>₹{totalPartsRs}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
                        <span>Doorstep Inspection Fee:</span>
                        <span style={{ fontWeight: 700, color: "#0f172a" }}>₹{inspectionFeeRs}</span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          borderTop: "1px solid #e2e8f0",
                          paddingTop: "0.4rem",
                          marginTop: "0.15rem",
                          fontSize: "0.875rem",
                        }}
                      >
                        <span style={{ fontWeight: 800, color: "#0f172a" }}>Total Service & Parts Quote:</span>
                        <span style={{ fontWeight: 900, color: "#2563eb", fontSize: "1rem" }}>
                          ₹{grandTotalRs}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }

              if (detailsService.approvalAttemptsCount > 0) {
                return (
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      padding: "0.75rem 0.875rem",
                      marginBottom: "1rem",
                      fontSize: "0.75rem",
                      color: "#64748b",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                    }}
                  >
                    <OrderBoxIcon size={14} color="#64748b" />
                    <span>
                      Technician recorded {detailsService.approvalAttemptsCount} proposal{" "}
                      {detailsService.approvalAttemptsCount === 1 ? "attempt" : "attempts"} (parts details logged in audit trail).
                    </span>
                  </div>
                );
              }

              return null;
            })()}

            {/* Audit Log Timeline */}
            <div>
              <div style={{ fontSize: "0.8125rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <ClockIcon size={14} color="currentColor" />
                <span>Immutable Event Audit Trail</span>
              </div>

              {loadingEvents ? (
                <div style={{ fontSize: "0.75rem", color: "#64748b", padding: "0.5rem 0" }}>Loading audit ledger...</div>
              ) : serviceEvents.length === 0 ? (
                <div style={{ fontSize: "0.75rem", color: "#64748b", padding: "0.5rem 0" }}>No audit events recorded yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "200px", overflowY: "auto" }}>
                  {serviceEvents.map((evt) => (
                    <div
                      key={evt.id}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        padding: "0.5rem 0.75rem",
                        fontSize: "0.75rem",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 800, color: "#0f172a" }}>{evt.eventType}</span>
                        <span style={{ color: "#94a3b8", fontSize: "0.6875rem" }}>
                          {new Date(evt.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div style={{ color: "#64748b", marginTop: "0.15rem" }}>
                        Actor: <strong>{evt.actorType}</strong> ({evt.actorId}) &bull; Status: {evt.previousStatus || "START"} &rarr; {evt.newStatus || evt.previousStatus}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.25rem" }}>
              <button
                onClick={() => setDetailsService(null)}
                style={{
                  background: "#0f172a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.5rem 1.25rem",
                  fontWeight: 700,
                  fontSize: "0.8125rem",
                  cursor: "pointer",
                }}
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
