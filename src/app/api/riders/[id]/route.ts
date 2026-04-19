import { NextResponse } from "next/server";
import { OrderStatus, RiderVehicle } from "@prisma/client";

const VALID_VEHICLES: RiderVehicle[] = ["BIKE", "SCOOTER", "CAR"];
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { isAdminRbacStrictEnabled, isOperatorUser } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";

const ACTIVE_ORDER_STATUSES: OrderStatus[] = ["CONFIRMED", "READY", "OUT"];

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }
    if (isAdminRbacStrictEnabled() && !isOperatorUser(user)) {
      return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
    }

    const body = await request.json();

    const rider = await prisma.rider.findUnique({
      where: { id: params.id },
      select: { id: true },
    });

    if (!rider) {
      return NextResponse.json({ error: "Rider non trovato" }, { status: 404 });
    }

    const updated = await prisma.rider.update({
      where: { id: params.id },
      data: {
        name: typeof body.name === "string" ? body.name.trim() : undefined,
        phone: typeof body.phone === "string" ? body.phone.trim() || null : undefined,
        email: typeof body.email === "string" ? body.email.trim() || null : undefined,
        active: typeof body.active === "boolean" ? body.active : undefined,
        vehicle: VALID_VEHICLES.includes(body.vehicle) ? body.vehicle : undefined,
        zone: typeof body.zone === "string" ? body.zone.trim() || null : undefined,
      },
    });

    writeAuditLog({
      action: "rider.update",
      entity: "rider",
      entityId: updated.id,
      actorEmail: user.email,
      actorId: user.id,
      metadata: {
        active: updated.active,
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Impossibile aggiornare il rider (email già in uso o dati non validi)" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  if (isAdminRbacStrictEnabled() && !isOperatorUser(user)) {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  }

  const rider = await prisma.rider.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, authUserId: true },
  });

  if (!rider) {
    return NextResponse.json({ error: "Rider non trovato" }, { status: 404 });
  }

  // Sgancia tutti gli ordini (attivi e storici) prima di eliminare il rider
  const unassigned = await prisma.order.updateMany({
    where: { riderId: params.id },
    data: { riderId: null },
  });

  await prisma.rider.delete({ where: { id: params.id } });

  // Revoca account Supabase se il rider aveva completato la registrazione
  if (rider.authUserId) {
    const { createClient: createAdminClient } = await import("@supabase/supabase-js");
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await adminClient.auth.admin.deleteUser(rider.authUserId).catch((err) =>
      console.error("[RIDER DELETE] Supabase user deletion failed:", err)
    );
  }

  writeAuditLog({
    action: "rider.delete",
    entity: "rider",
    entityId: params.id,
    actorEmail: user.email,
    actorId: user.id,
    metadata: {
      riderName: rider.name,
      hadAuthAccount: Boolean(rider.authUserId),
      unassignedOrdersCount: unassigned.count,
    },
  });

  return NextResponse.json({ success: true, unassignedCount: unassigned.count });
}
