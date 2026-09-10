import { z } from "zod";
import { resolveNode } from "./core";
export const nodeSchema = z.object({
  name: z.string().trim().min(1).max(160),
  allergens: z.array(z.number().int().min(1).max(14)).max(14),
  status: z.enum(["CONFIRMED", "NONE_CONFIRMED", "TO_VERIFY"]),
  components: z.array(z.string().min(1)).max(100),
  sourceType: z.enum(["RECIPE", "LABEL", "TECH_SHEET"]).optional(),
  sourceRef: z.string().max(1000).optional(),
  verifiedAt: z.string().optional(), verifiedBy: z.string().optional(),
}).superRefine((node, ctx) => {
  if (node.status !== "TO_VERIFY" && (!node.sourceType || !node.sourceRef?.trim())) ctx.addIssue({ code: "custom", message: "Serve una fonte documentale per confermare" });
  if (node.status === "NONE_CONFIRMED" && (node.allergens.length || node.components.length)) ctx.addIssue({ code: "custom", message: "Nessuno confermato consentito solo per ingredienti senza allergeni" });
  if (node.status === "CONFIRMED" && !node.allergens.length && !node.components.length) ctx.addIssue({ code: "custom", message: "Indicare allergeni o componenti, oppure Nessuno confermato" });
});
export const graphSchema = z.object({
  master: z.array(z.object({ id: z.number().int().min(1).max(14), name: z.string().min(1), description: z.string() })).length(14),
  nodes: z.record(z.string(), nodeSchema), products: z.record(z.string(), z.string()),
  ingredients: z.record(z.string(), z.string()), flavors: z.record(z.string(), z.string()),
  bases: z.object({ ROSSA: z.string(), BIANCA: z.string(), mozzarella: z.string() }),
}).superRefine((graph, ctx) => {
  if (new Set(graph.master.map(a => a.id)).size !== 14) ctx.addIssue({ code: "custom", message: "Master incompleto" });
  const refs = [...Object.values(graph.products), ...Object.values(graph.ingredients), ...Object.values(graph.flavors), ...Object.values(graph.bases), ...Object.values(graph.nodes).flatMap(n => n.components)];
  if (refs.some(id => !Object.hasOwn(graph.nodes, id))) ctx.addIssue({ code: "custom", message: "Riferimento ingrediente/ricetta inesistente" });
  try { for (const id of Object.keys(graph.nodes)) resolveNode(graph, id); }
  catch { ctx.addIssue({ code: "custom", message: "Le ricette contengono un ciclo" }); }
});
