import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { readRegistry } from "@/lib/allergens/server";
import { graphSchema, nodeSchema } from "@/lib/allergens/validation";
import { createClient } from "@/lib/supabase/server";
import { isOperatorUser } from "@/lib/rbac";
import { enforceSameOrigin } from "@/lib/request-security";
async function actor() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  return user && isOperatorUser(user) ? user : null;
}
export async function GET() {
  if (!await actor()) return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  try {
    const [registry, products, audit] = await Promise.all([
      readRegistry(prisma, true),
      prisma.product.findMany({ select: { id: true, name: true, active: true, category: { select: { name: true, active: true } } } }),
      prisma.allergenAudit.findMany({ orderBy: { version: "desc" }, take: 30, select: { id: true, version: true, actorId: true, reason: true, createdAt: true } }),
    ]);
    return NextResponse.json({ ...registry, products, audit }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Registro non inizializzato: applicare migrazione ed eseguire npm run allergens:seed" }, { status: 503 });
  }
}
const patchSchema = z.object({ version: z.number().int().positive(), id: z.string().min(1).max(200), node: nodeSchema, reason: z.string().trim().min(5).max(1000), productIds: z.array(z.string()).max(1000).optional() });
export async function PATCH(request: Request) {
  const originError = enforceSameOrigin(request);
  if (originError) return originError;
  const user = await actor();
  if (!user) return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dati non validi: controllare fonte, stato e motivazione", issues: parsed.error.flatten() }, { status: 400 });
  try {
    const result = await prisma.$transaction(async tx => {
      const row = await tx.allergenRegistry.findUniqueOrThrow({ where: { id: "current" } });
      if (row.version !== parsed.data.version) throw new Error("CONFLICT");
      const graph = graphSchema.parse(row.data);
      const { id, node, productIds, reason } = parsed.data;
      graph.nodes[id] = { ...node, allergens: [...new Set(node.allergens)].sort((a,b) => a-b), verifiedBy: node.status === "TO_VERIFY" ? undefined : user.id, verifiedAt: node.status === "TO_VERIFY" ? undefined : new Date().toISOString() };
      if (!graph.ingredients[node.name]) graph.ingredients[node.name] = id;
      if (productIds) {
        const count = await tx.product.count({ where: { id: { in: productIds } } });
        if (count !== new Set(productIds).size) throw new Error("INVALID");
        for (const productId of productIds) graph.products[productId] = id;
      }
      const valid = graphSchema.parse(graph);
      const data = valid as unknown as Prisma.InputJsonValue;
      const version = row.version + 1;
      const update = await tx.allergenRegistry.updateMany({ where: { id: "current", version: row.version }, data: { data, version } });
      if (!update.count) throw new Error("CONFLICT");
      await tx.allergenAudit.create({ data: { version, actorId: user.id, reason, before: row.data as Prisma.InputJsonValue, after: data } });
      return { version };
    });
    return NextResponse.json(result);
  } catch (error) {
    const conflict = error instanceof Error && error.message === "CONFLICT";
    return NextResponse.json({ error: conflict ? "Il registro è cambiato. Ricarica prima di salvare." : "Salvataggio annullato: controllare riferimenti e cicli nelle ricette." }, { status: conflict ? 409 : 400 });
  }
}
