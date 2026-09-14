import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { isOperatorUser } from "@/lib/rbac";
import { adminConfigSchema } from "@/lib/validation/catalog";
import { enforceSameOrigin } from "@/lib/request-security";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  if (!isOperatorUser(user)) return NextResponse.json({ error: "Accesso negato" }, { status: 403 });

  let config = await prisma.globalConfig.findFirst();
  if (!config) {
    config = await prisma.globalConfig.create({ data: { maxOrdersPerSlot: 5 } });
  }
  return NextResponse.json(config);
}

export async function POST(request: Request) {
  try {
    const sameOriginError = enforceSameOrigin(request);
    if (sameOriginError) return sameOriginError;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    if (!isOperatorUser(user)) return NextResponse.json({ error: "Accesso negato" }, { status: 403 });

    const parsed = adminConfigSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Payload non valido", issues: parsed.error.flatten() }, { status: 400 });
    }

    const data = {
      ...parsed.data,
      deliveryDisabledUntil: parsed.data.deliveryDisabledUntil ? new Date(parsed.data.deliveryDisabledUntil) : parsed.data.deliveryDisabledUntil,
      pickupDisabledUntil: parsed.data.pickupDisabledUntil ? new Date(parsed.data.pickupDisabledUntil) : parsed.data.pickupDisabledUntil,
      serviceUpdatedBy: user.email ?? user.id,
    };
    
    let config = await prisma.globalConfig.findFirst();
    if (config) {
      config = await prisma.globalConfig.update({
        where: { id: config.id },
        data,
      });
    } else {
      config = await prisma.globalConfig.create({
        data: { maxOrdersPerSlot: 5, ...data },
      });
    }

    await writeAuditLog({
      action: "service_availability_updated",
      entity: "global_config",
      entityId: config.id,
      actorEmail: user.email,
      actorId: user.id,
      metadata: parsed.data,
    });
    return NextResponse.json(config);
  } catch (error) {
    console.error("Errore salvataggio config:", error);
    return NextResponse.json({ error: "Errore salvataggio config" }, { status: 500 });
  }
}
