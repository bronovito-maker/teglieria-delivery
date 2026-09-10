import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { graphSchema } from "./validation";
import { publicGraph, type PublicRegistry } from "./core";
export async function readRegistry(db: Pick<Prisma.TransactionClient, "allergenRegistry"> = prisma, internal = false): Promise<PublicRegistry> {
  const row = await db.allergenRegistry.findUnique({ where: { id: "current" } });
  if (!row) throw new Error("Registro allergeni non inizializzato: eseguire allergens:seed");
  const graph = graphSchema.parse(row.data);
  return { version: row.version, updatedAt: row.updatedAt.toISOString(), graph: internal ? graph : publicGraph(graph) };
}
