import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { isAdminRbacStrictEnabled, isOperatorUser } from "@/lib/rbac";
import { adminConfigSchema } from "@/lib/validation/catalog";
import { enforceSameOrigin } from "@/lib/request-security";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  if (isAdminRbacStrictEnabled() && !isOperatorUser(user)) return NextResponse.json({ error: "Accesso negato" }, { status: 403 });

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
    if (isAdminRbacStrictEnabled() && !isOperatorUser(user)) return NextResponse.json({ error: "Accesso negato" }, { status: 403 });

    const parsed = adminConfigSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Payload non valido", issues: parsed.error.flatten() }, { status: 400 });
    }

    const { maxOrdersPerSlot } = parsed.data;
    
    let config = await prisma.globalConfig.findFirst();
    if (config) {
      config = await prisma.globalConfig.update({
        where: { id: config.id },
        data: { maxOrdersPerSlot },
      });
    } else {
      config = await prisma.globalConfig.create({
        data: { maxOrdersPerSlot },
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error("Errore salvataggio config:", error);
    return NextResponse.json({ error: "Errore salvataggio config" }, { status: 500 });
  }
}
