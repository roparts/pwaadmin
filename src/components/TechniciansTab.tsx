"use client";

import React, { useState } from "react";
import type { Technician, ServiceBooking } from "@/lib/types";
import {
  TechnicianIcon,
  PlusIcon,
  SearchIcon,
  PhoneIcon,
  WhatsAppIcon,
  PinIcon,
  TrashIcon,
  ExternalLinkIcon,
  CloseIcon,
  CheckIcon,
  RefreshIcon,
  WrenchIcon,
  AlertCircleIcon,
} from "@/components/AdminIcons";

interface TechniciansTabProps {
  technicians: Technician[];
  services: ServiceBooking[];
  onRefresh: () => Promise<void>;
  onAddTechnician: (data: {
    name: string;
    phone: string;
    assignedCity: string;
    alternatePhone?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  onUpdateStatus: (id: string, status: "ACTIVE" | "INACTIVE" | "ON_DUTY" | "SUSPENDED") => Promise<boolean>;
  onDeleteTechnician: (id: string) => Promise<boolean>;
  onViewServicesForTech: (technicianId: string) => void;
}

export function TechniciansTab({
  technicians,
  services,
  onRefresh,
  onAddTechnician,
  onUpdateStatus,
  onDeleteTechnician,
  onViewServicesForTech,
}: TechniciansTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "ON_DUTY" | "INACTIVE">("ALL");

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("Patna");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Filter logic
  const filteredTechs = technicians.filter((tech) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      tech.name.toLowerCase().includes(q) ||
      tech.phone.includes(q) ||
      (tech.assignedCity && tech.assignedCity.toLowerCase().includes(q)) ||
      tech.id.toLowerCase().includes(q);

    const matchesStatus = statusFilter === "ALL" || tech.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeCount = technicians.filter((t) => t.status === "ACTIVE" || t.status === "ON_DUTY").length;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    if (!name.trim() || cleanPhone.length !== 10) {
      setErrorMsg("Please enter technician name and a valid 10-digit mobile number.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onAddTechnician({
        name: name.trim(),
        phone: cleanPhone,
        assignedCity: city.trim() || "Patna",
        alternatePhone: alternatePhone.replace(/\D/g, "").slice(-10),
      });

      if (res.success) {
        setSuccessMsg(`Technician ${name.trim()} successfully whitelisted!`);
        setName("");
        setPhone("");
        setAlternatePhone("");
        setTimeout(() => {
          setShowAddModal(false);
          setSuccessMsg("");
        }, 1500);
      } else {
        setErrorMsg(res.error || "Failed to register technician.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Top Banner: Overview & Action */}
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
            <TechnicianIcon size={22} color="#0f172a" />
            <span>Field Technicians Fleet</span>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                background: "#f1f5f9",
                color: "#475569",
                padding: "0.2rem 0.6rem",
                borderRadius: "9999px",
                border: "1px solid #e2e8f0",
              }}
            >
              {technicians.length} Whitelisted
            </span>
          </h2>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.8125rem", color: "#64748b" }}>
            Pre-register and whitelist field technicians. Only whitelisted mobile numbers can receive WhatsApp OTP to log into the Technician App.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <a
            href="http://localhost:3002"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              color: "#0f172a",
              borderRadius: "10px",
              padding: "0.5rem 1rem",
              fontWeight: 700,
              fontSize: "0.8125rem",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              textDecoration: "none",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            }}
            title="Open Field Technician Web App on port 3002"
          >
            <ExternalLinkIcon size={14} color="#0f172a" />
            <span>Launch Technician Portal (Port 3002)</span>
          </a>

          <button
            onClick={() => setShowAddModal(true)}
            style={{
              background: "#0f172a",
              color: "#ffffff",
              border: "none",
              borderRadius: "10px",
              padding: "0.5rem 1rem",
              fontWeight: 800,
              fontSize: "0.8125rem",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            <PlusIcon size={15} color="#ffffff" />
            <span>Add / Whitelist Technician</span>
          </button>
        </div>
      </div>

      {/* Technician Login & Whitelist Guide Card */}
      <div
        style={{
          background: "linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)",
          border: "1px solid #bfdbfe",
          borderRadius: "14px",
          padding: "1rem 1.25rem",
          marginBottom: "1.5rem",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "#2563eb",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <TechnicianIcon size={20} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: "0.875rem", color: "#1e3a8a" }}>
              How Technician Login Works (Security & Whitelist Policy)
            </div>
            <div style={{ fontSize: "0.8125rem", color: "#3b82f6", marginTop: "0.2rem", lineHeight: 1.4 }}>
              <strong>1. Admin Whitelist:</strong> You add the technician's 10-digit mobile number here. &bull;{" "}
              <strong>2. Technician Portal:</strong> The technician visits <code>http://localhost:3002</code> or mobile app and enters their phone. &bull;{" "}
              <strong>3. WhatsApp OTP:</strong> AWS Lambda verifies the whitelist and sends a 6-digit WhatsApp OTP to log them in securely.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <span
            style={{
              background: "#dcfce7",
              color: "#166534",
              border: "1px solid #bbf7d0",
              fontSize: "0.75rem",
              fontWeight: 800,
              padding: "0.3rem 0.75rem",
              borderRadius: "8px",
            }}
          >
            {activeCount} Active on Fleet
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
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
        <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
          {(["ALL", "ACTIVE", "ON_DUTY", "INACTIVE"] as const).map((st) => {
            const count = st === "ALL" ? technicians.length : technicians.filter((t) => t.status === st).length;
            const isSel = statusFilter === st;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: "0.4rem 0.8rem",
                  borderRadius: "8px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  border: isSel ? "1px solid #0f172a" : "1px solid #e2e8f0",
                  background: isSel ? "#0f172a" : "#ffffff",
                  color: isSel ? "#ffffff" : "#475569",
                  transition: "all 0.15s ease",
                }}
              >
                {st === "ALL" ? "All Technicians" : st.replace("_", " ")} ({count})
              </button>
            );
          })}
        </div>

        <div style={{ position: "relative", minWidth: "260px" }}>
          <input
            type="text"
            placeholder="Search by name, phone, city..."
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
      </div>

      {/* Technicians List Grid */}
      {filteredTechs.length === 0 ? (
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
            <TechnicianIcon size={36} color="currentColor" />
          </div>
          <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#0f172a" }}>
            {technicians.length === 0 ? "No technicians whitelisted yet" : "No technicians match your search"}
          </div>
          <p style={{ fontSize: "0.8125rem", marginTop: "0.25rem", marginBottom: "1rem" }}>
            {technicians.length === 0
              ? "Click 'Add / Whitelist Technician' above to register your first certified technician."
              : "Try adjusting your search terms or status filters."}
          </p>
          {technicians.length === 0 && (
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                background: "#0f172a",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "0.5rem 1rem",
                fontWeight: 700,
                fontSize: "0.8125rem",
                cursor: "pointer",
              }}
            >
              + Add First Technician
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem" }}>
          {filteredTechs.map((tech) => {
            const assignedServices = services.filter((s) => s.assignedTechnicianId === tech.id);
            const activeJobs = assignedServices.filter((s) => s.status !== "COMPLETED" && s.status !== "CANCELLED");

            return (
              <div
                key={tech.id}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "16px",
                  padding: "1.25rem",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  {/* Card Header: Initial, Name, Status */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div
                        style={{
                          width: "42px",
                          height: "42px",
                          borderRadius: "12px",
                          background: "#0f172a",
                          color: "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 900,
                          fontSize: "1.125rem",
                          flexShrink: 0,
                        }}
                      >
                        {tech.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: "0.9375rem", color: "#0f172a" }}>
                          {tech.name}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b", fontFamily: "monospace" }}>
                          {tech.id}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}>
                      <span
                        style={{
                          fontSize: "0.6875rem",
                          fontWeight: 800,
                          padding: "0.2rem 0.5rem",
                          borderRadius: "6px",
                          textTransform: "uppercase",
                          background:
                            tech.status === "ACTIVE"
                              ? "#f0fdf4"
                              : tech.status === "ON_DUTY"
                              ? "#eff6ff"
                              : "#f1f5f9",
                          color:
                            tech.status === "ACTIVE"
                              ? "#15803d"
                              : tech.status === "ON_DUTY"
                              ? "#1d4ed8"
                              : "#64748b",
                          border: `1px solid ${
                            tech.status === "ACTIVE"
                              ? "#bbf7d0"
                              : tech.status === "ON_DUTY"
                              ? "#bfdbfe"
                              : "#e2e8f0"
                          }`,
                        }}
                      >
                        {tech.status.replace("_", " ")}
                      </span>
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#eab308" }}>
                        ★ {tech.rating ? Number(tech.rating).toFixed(1) : "5.0"}
                      </span>
                    </div>
                  </div>

                  {/* Phone & Contact Details */}
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      padding: "0.625rem 0.75rem",
                      fontSize: "0.8125rem",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#475569" }}>
                        <PhoneIcon size={13} color="currentColor" />
                        <span>Mobile (Whitelist):</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontWeight: 800, color: "#0f172a" }}>+91 {tech.phone}</span>
                        <a
                          href={`https://wa.me/91${tech.phone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "#16a34a",
                            display: "inline-flex",
                            alignItems: "center",
                            background: "#dcfce7",
                            padding: "0.2rem",
                            borderRadius: "4px",
                          }}
                          title="Open WhatsApp Chat"
                        >
                          <WhatsAppIcon size={14} color="#16a34a" />
                        </a>
                        <a
                          href={`tel:+91${tech.phone}`}
                          style={{
                            color: "#2563eb",
                            display: "inline-flex",
                            alignItems: "center",
                            background: "#eff6ff",
                            padding: "0.2rem",
                            borderRadius: "4px",
                          }}
                          title="Call Technician"
                        >
                          <PhoneIcon size={14} color="#2563eb" />
                        </a>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#475569" }}>
                        <PinIcon size={13} color="currentColor" />
                        <span>Assigned City:</span>
                      </div>
                      <span style={{ fontWeight: 700, color: "#0f172a" }}>{tech.assignedCity || "Patna"}</span>
                    </div>

                    {tech.alternatePhone && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.35rem", borderTop: "1px dashed #cbd5e1", paddingTop: "0.35rem" }}>
                        <span style={{ color: "#64748b", fontSize: "0.75rem" }}>Alt Phone:</span>
                        <span style={{ color: "#334155", fontSize: "0.75rem", fontWeight: 600 }}>+91 {tech.alternatePhone}</span>
                      </div>
                    )}
                  </div>

                  {/* Jobs & Assignment Stats */}
                  <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
                    <div
                      style={{
                        flex: 1,
                        background: activeJobs.length > 0 ? "#eff6ff" : "#f8fafc",
                        border: `1px solid ${activeJobs.length > 0 ? "#bfdbfe" : "#e2e8f0"}`,
                        borderRadius: "8px",
                        padding: "0.4rem 0.5rem",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: "0.6875rem", color: "#64748b", fontWeight: 700 }}>ACTIVE JOBS</div>
                      <div style={{ fontSize: "1rem", fontWeight: 900, color: activeJobs.length > 0 ? "#1d4ed8" : "#0f172a" }}>
                        {activeJobs.length}
                      </div>
                    </div>

                    <div
                      style={{
                        flex: 1,
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        padding: "0.4rem 0.5rem",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: "0.6875rem", color: "#64748b", fontWeight: 700 }}>TOTAL ASSIGNED</div>
                      <div style={{ fontSize: "1rem", fontWeight: 900, color: "#0f172a" }}>
                        {assignedServices.length}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action Controls */}
                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <label style={{ fontSize: "0.6875rem", color: "#64748b", fontWeight: 700 }}>Status:</label>
                    <select
                      value={tech.status}
                      onChange={(e) => onUpdateStatus(tech.id, e.target.value as any)}
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
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="ON_DUTY">ON DUTY</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>

                  <div style={{ display: "flex", gap: "0.35rem" }}>
                    <button
                      onClick={() => onViewServicesForTech(tech.id)}
                      style={{
                        background: "#f1f5f9",
                        border: "1px solid #cbd5e1",
                        color: "#0f172a",
                        borderRadius: "6px",
                        padding: "0.25rem 0.5rem",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                      }}
                      title="View all service jobs assigned to this technician"
                    >
                      <WrenchIcon size={12} color="#0f172a" />
                      <span>Jobs</span>
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Remove technician ${tech.name} (+91 ${tech.phone}) from whitelist?`)) {
                          onDeleteTechnician(tech.id);
                        }
                      }}
                      style={{
                        background: "#fef2f2",
                        border: "1px solid #fecaca",
                        color: "#dc2626",
                        borderRadius: "6px",
                        padding: "0.25rem 0.5rem",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                      }}
                      title="De-whitelist technician"
                    >
                      <TrashIcon size={12} color="#dc2626" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add / Whitelist Technician */}
      {showAddModal && (
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
              maxWidth: "460px",
              width: "100%",
              padding: "1.5rem",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <TechnicianIcon size={20} color="#0f172a" />
                <h3 style={{ fontSize: "1.125rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                  Whitelist New Technician
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
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

            {errorMsg && (
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
                {errorMsg}
              </div>
            )}

            {successMsg && (
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
                {successMsg}
              </div>
            )}

            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.35rem" }}>
                  Technician Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "0.625rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.875rem",
                    color: "#0f172a",
                  }}
                />
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.35rem" }}>
                  10-Digit Mobile Number (WhatsApp Login) *
                </label>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span
                    style={{
                      background: "#f1f5f9",
                      border: "1px solid #cbd5e1",
                      borderRight: "none",
                      padding: "0.625rem 0.75rem",
                      borderRadius: "8px 0 0 8px",
                      fontSize: "0.875rem",
                      fontWeight: 700,
                      color: "#475569",
                    }}
                  >
                    +91
                  </span>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    required
                    style={{
                      width: "100%",
                      padding: "0.625rem",
                      borderRadius: "0 8px 8px 0",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.875rem",
                      color: "#0f172a",
                      fontWeight: 700,
                    }}
                  />
                </div>
                <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
                  Crucial: WhatsApp OTP will be dispatched to this number for Technician App login.
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.35rem" }}>
                    Assigned City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Patna"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.625rem",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.875rem",
                      color: "#0f172a",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.35rem" }}>
                    Alternate Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="Optional"
                    maxLength={10}
                    value={alternatePhone}
                    onChange={(e) => setAlternatePhone(e.target.value.replace(/\D/g, ""))}
                    style={{
                      width: "100%",
                      padding: "0.625rem",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.875rem",
                      color: "#0f172a",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
                  disabled={isSubmitting}
                  style={{
                    background: "#0f172a",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "0.625rem 1.25rem",
                    fontSize: "0.8125rem",
                    fontWeight: 800,
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    opacity: isSubmitting ? 0.7 : 1,
                  }}
                >
                  {isSubmitting ? "Whitelisting..." : "Save & Whitelist"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
