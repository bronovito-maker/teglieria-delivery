import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readRegistry } from "@/lib/allergens/server";
import { productResult, snapshot } from "@/lib/allergens/core";
export async function GET() {
  try {
    const registry = await readRegistry();
    const products = await prisma.product.findMany({ where: { active: true, category: { active: true } }, select: { id: true, name: true, configuration: true, updatedAt: true, category: { select: { name: true, updatedAt: true } } }, orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }] });
    return NextResponse.json({ ...registry, generatedAt: new Date().toISOString(), catalogVersion: createHash("sha256").update(JSON.stringify(products)).digest("hex").slice(0, 12), products: products.map(p => ({ id: p.id, name: p.name, category: p.category.name, configurable: Boolean(p.configuration), allergenInfo: snapshot(registry, productResult(registry.graph, p.id)) })) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[ALLERGENS] Registro non disponibile", error);
    return NextResponse.json({ error: "Informazioni allergeni temporaneamente non disponibili. Contatta il personale prima di ordinare." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
