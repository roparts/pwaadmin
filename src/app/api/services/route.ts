import { NextRequest, NextResponse } from "next/server";
import { loadDbStore, saveDbStore } from "@/lib/db";
import type { ServiceBooking } from "@/lib/types";

export const dynamic = "force-dynamic";

const LAMBDA_URL = "https://tjxxh7fyczzv7hluogo5f5seka0tmrqv.lambda-url.ap-south-1.on.aws";

export async function GET(request: NextRequest) {
  try {
    // 1. Try fetching from live Lambda Function URL
    const res = await fetch(`${LAMBDA_URL}/services`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      if (data.services) {
        return NextResponse.json({ success: true, data: { services: data.services } });
      }
    }
  } catch (err) {
    console.warn("Lambda /services fetch failed, using local store:", (err as Error).message);
  }

  // 2. Local store fallback
  const store = loadDbStore() as any;
  const services: ServiceBooking[] = store.services || [];
  return NextResponse.json({ success: true, data: { services } });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || !body.serviceId) {
    return NextResponse.json({ success: false, error: "serviceId is required" }, { status: 400 });
  }

  const { serviceId, assignedTechnicianId, assignedTechnicianName, assignedTechnicianPhone, status } = body;

  try {
    // 1. Try calling live Lambda
    const res = await fetch(`${LAMBDA_URL}/services/${serviceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignedTechnicianId,
        assignedTechnicianName,
        assignedTechnicianPhone,
        status,
        actorType: "ADMIN",
        actorId: "ADMIN",
      }),
    });
    if (res.ok) {
      const data = await res.json();
      try {
        const store = loadDbStore() as any;
        const services: ServiceBooking[] = store.services || [];
        const idx = services.findIndex((s) => s.id === serviceId);
        if (idx > -1) {
          services[idx] = { ...services[idx], ...data.service };
        } else if (data.service) {
          services.unshift(data.service);
        }
        saveDbStore({ services } as any);
      } catch {}
      return NextResponse.json({ success: true, data: data.service });
    }
  } catch (err) {
    console.warn("Lambda /services PATCH failed, using local store:", (err as Error).message);
  }

  // 2. Local store fallback
  const store = loadDbStore() as any;
  const services: ServiceBooking[] = store.services || [];
  const idx = services.findIndex((s) => s.id === serviceId);

  if (idx > -1) {
    if (assignedTechnicianId) {
      services[idx].assignedTechnicianId = assignedTechnicianId;
      services[idx].assignedTechnicianName = assignedTechnicianName || services[idx].assignedTechnicianName;
      services[idx].assignedTechnicianPhone = assignedTechnicianPhone || services[idx].assignedTechnicianPhone;
      services[idx].assignedAt = new Date().toISOString();
      if (services[idx].status === "BOOKED") {
        services[idx].status = "ASSIGNED";
      }
    }
    if (status) {
      services[idx].status = status;
    }
    services[idx].updatedAt = new Date().toISOString();
    saveDbStore({ services } as any);
    return NextResponse.json({ success: true, data: services[idx] });
  }

  return NextResponse.json({ success: false, error: "Service not found" }, { status: 404 });
}
