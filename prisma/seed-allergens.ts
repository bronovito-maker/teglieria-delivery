import { isDeepStrictEqual } from "node:util";
import { Prisma, PrismaClient } from "@prisma/client";
import { initialGraph, mergeInitial } from "../src/lib/allergens/initial-data";
import { graphSchema } from "../src/lib/allergens/validation";
const prisma = new PrismaClient();
async function main() {
  await prisma.$transaction(async tx => {
    const products = await tx.product.findMany({ include: { category: true } });
    const current = await tx.allergenRegistry.findUnique({ where: { id: "current" } });
    const initial = initialGraph(products);
    const graph = graphSchema.parse(current ? mergeInitial(graphSchema.parse(current.data), initial) : initial);
    if (current && isDeepStrictEqual(graph, current.data)) { console.log("Registro già aggiornato"); return; }
    const data = graph as unknown as Prisma.InputJsonValue;
    const version = (current?.version ?? 0) + 1;
    if (current) {
      const changed = await tx.allergenRegistry.updateMany({ where: { id: "current", version: current.version }, data: { version, data } });
      if (!changed.count) throw new Error("Registro modificato: ripetere importazione");
    } else await tx.allergenRegistry.create({ data: { id: "current", version, data } });
    await tx.allergenAudit.create({ data: { version, actorId: "bootstrap", reason: "Importazione specifica 08/09/2026; verifica etichette pendente", before: current?.data ?? {}, after: data } });
    console.log(`Registro v${version}: ${products.length} prodotti, ${Object.keys(graph.nodes).length} componenti`);
  }, { timeout: 30000 });
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
