import { NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { isAdminRbacStrictEnabled, isOperatorUser } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { captureError } from "@/lib/monitoring";
import { riderPatchSchema } from "@/lib/validation/catalog";
import { enforceSameOrigin } from "@/lib/request-security";

const ACTIVE_ORDER_STATUSES: OrderStatus[] = ["CONFIRMED", "READY", "OUT"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sameOriginError = enforceSameOrigin(request);
    if (sameOriginError) return sameOriginError;

    const { id } = await params;
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

    const parsed = riderPatchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Payload non valido", issues: parsed.error.flatten() }, { status: 400 });
    }

    const body = parsed.data;

    const rider = await prisma.rider.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!rider) {
      return NextResponse.json({ error: "Rider non trovato" }, { status: 404 });
    }

    const updated = await prisma.rider.update({
      where: { id },
      data: {
        name: body.name?.trim(),
        phone: body.phone?.trim() || null,
        email: body.email?.trim() || null,
        active: body.active,
        vehicle: body.vehicle,
        zone: body.zone?.trim() || null,
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
  } catch (err) {
    captureError(err, { area: "api", route: "/api/riders/[id]", method: "PATCH" });
    return NextResponse.json(
      { error: "Impossibile aggiornare il rider (email già in uso o dati non validi)" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sameOriginError = enforceSameOrigin(request);
  if (sameOriginError) return sameOriginError;

  const { id } = await params;
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
    where: { id },
    select: { id: true, name: true, authUserId: true },
  });

  if (!rider) {
    return NextResponse.json({ error: "Rider non trovato" }, { status: 404 });
  }

  // Sgancia tutti gli ordini (attivi e storici) prima di eliminare il rider
  const unassigned = await prisma.order.updateMany({
    where: { riderId: id },
    data: { riderId: null },
  });

  await prisma.rider.delete({ where: { id } });

  // Revoca account Supabase se il rider aveva completato la registrazione
  if (rider.authUserId) {
    const { createClient: createAdminClient } = await import("@supabase/supabase-js");
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await adminClient.auth.admin.deleteUser(rider.authUserId).catch((err) =>
      captureError(err, { area: "supabase", action: "rider.deleteUser", riderId: id })
    );
  }

  writeAuditLog({
    action: "rider.delete",
    entity: "rider",
    entityId: id,
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
