import { NextRequest, NextResponse } from "next/server";
import { loadDbStore, saveDbStore } from "@/lib/db";
import type { Technician } from "@/lib/types";

export const dynamic = "force-dynamic";

const LAMBDA_URL = "https://tjxxh7fyczzv7hluogo5f5seka0tmrqv.lambda-url.ap-south-1.on.aws";

export async function GET(request: NextRequest) {
  try {
    const res = await fetch(`${LAMBDA_URL}/technicians`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data.technicians) {
        return NextResponse.json({ success: true, data: { technicians: data.technicians } });
      }
    }
  } catch (err) {
    console.warn("Lambda /technicians fetch failed, using local store:", (err as Error).message);
  }

  const store = loadDbStore() as any;
  const technicians: Technician[] = store.technicians || [];
  return NextResponse.json({ success: true, data: { technicians } });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || !body.name || !body.phone) {
    return NextResponse.json(
      { success: false, error: "Technician name and 10-digit mobile number are required." },
      { status: 400 }
    );
  }

  const cleanPhone = body.phone.replace(/\D/g, "").slice(-10);
  if (cleanPhone.length !== 10) {
    return NextResponse.json(
      { success: false, error: "Please enter a valid 10-digit mobile number." },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(`${LAMBDA_URL}/technicians`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: body.name.trim(),
        phone: cleanPhone,
        alternatePhone: (body.alternatePhone || "").replace(/\D/g, "").slice(-10),
        assignedCity: body.assignedCity || "Patna",
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({ success: true, data: data.technician });
    }
  } catch (err) {
    console.warn("Lambda /technicians POST failed, using local store:", (err as Error).message);
  }

  // Fallback to local store
  const store = loadDbStore() as any;
  const technicians: Technician[] = store.technicians || [];
  const duplicate = technicians.find((t) => t.phone.replace(/\D/g, "").slice(-10) === cleanPhone);
  if (duplicate) {
    return NextResponse.json(
      { success: false, error: `Phone ${cleanPhone} is already registered (${duplicate.name}).` },
      { status: 400 }
    );
  }

  const newTech: Technician = {
    id: `TECH-${Date.now().toString().slice(-4)}${Math.random().toString(36).substring(2, 4).toUpperCase()}`,
    name: body.name.trim(),
    phone: cleanPhone,
    alternatePhone: (body.alternatePhone || "").replace(/\D/g, "").slice(-10),
    status: "ACTIVE",
    assignedCity: body.assignedCity || "Patna",
    dailyJobsCount: 0,
    rating: 5.0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  technicians.push(newTech);
  saveDbStore({ technicians } as any);

  return NextResponse.json({ success: true, data: newTech });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || !body.id || !body.status) {
    return NextResponse.json({ success: false, error: "Technician id and status required" }, { status: 400 });
  }

  // 1. Try AWS Lambda first
  try {
    const res = await fetch(`${LAMBDA_URL}/technicians`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: body.id, status: body.status }),
    });
    if (res.ok) {
      const data = await res.json();
      // Keep local store in sync
      const store = loadDbStore() as any;
      const technicians: Technician[] = store.technicians || [];
      const idx = technicians.findIndex((t) => t.id === body.id);
      if (idx >= 0) {
        technicians[idx].status = body.status;
        technicians[idx].updatedAt = new Date().toISOString();
        saveDbStore({ technicians } as any);
      } else if (data.technician) {
        technicians.push(data.technician);
        saveDbStore({ technicians } as any);
      }
      return NextResponse.json({ success: true, data: data.technician || { id: body.id, status: body.status } });
    }
  } catch (err) {
    console.warn("Lambda /technicians PATCH failed, falling back to local store:", (err as Error).message);
  }

  // 2. Fallback to local store
  const store = loadDbStore() as any;
  const technicians: Technician[] = store.technicians || [];
  const tech = technicians.find((t) => t.id === body.id);
  if (tech) {
    tech.status = body.status;
    tech.updatedAt = new Date().toISOString();
    saveDbStore({ technicians } as any);
    return NextResponse.json({ success: true, data: tech });
  }

  return NextResponse.json({ success: false, error: "Technician not found" }, { status: 404 });
}

export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const id = body?.id || request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ success: false, error: "Technician id is required" }, { status: 400 });
  }

  // 1. Try AWS Lambda first
  try {
    const res = await fetch(`${LAMBDA_URL}/technicians`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      // Keep local store in sync
      const store = loadDbStore() as any;
      const technicians: Technician[] = store.technicians || [];
      const filtered = technicians.filter((t) => t.id !== id);
      saveDbStore({ technicians: filtered } as any);
      return NextResponse.json({ success: true, message: `Technician ${id} deleted` });
    }
  } catch (err) {
    console.warn("Lambda /technicians DELETE failed, falling back to local store:", (err as Error).message);
  }

  // 2. Fallback to local store
  const store = loadDbStore() as any;
  const technicians: Technician[] = store.technicians || [];
  const filtered = technicians.filter((t) => t.id !== id);
  saveDbStore({ technicians: filtered } as any);

  return NextResponse.json({ success: true, message: `Technician ${id} deleted from local store` });
}
