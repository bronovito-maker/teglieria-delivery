import type { PizzaBuilderSelection } from "../pizza-builder";

export type Verification = "CONFIRMED" | "NONE_CONFIRMED" | "TO_VERIFY";
export type AllergenNode = {
  name: string;
  allergens: number[];
  status: Verification;
  components: string[];
  sourceType?: "RECIPE" | "LABEL" | "TECH_SHEET";
  sourceRef?: string;
  verifiedAt?: string;
  verifiedBy?: string;
};
export type AllergenGraph = {
  master: Array<{ id: number; name: string; description: string }>;
  nodes: Record<string, AllergenNode>;
  products: Record<string, string>;
  ingredients: Record<string, string>;
  flavors: Record<string, string>;
  bases: { ROSSA: string; BIANCA: string; mozzarella: string };
};
export type AllergenResult = { ids: number[]; pending: string[] };
export type AllergenSnapshot = AllergenResult & {
  version: number;
  updatedAt: string;
  allergens: Array<{ id: number; name: string }>;
  containers?: AllergenResult[];
};
export type PublicRegistry = { version: number; updatedAt: string; graph: AllergenGraph };
export const union = (values: number[][]) => [...new Set(values.flat())].sort((a, b) => a - b);
export function mergeResults(results: AllergenResult[]): AllergenResult {
  return { ids: union(results.map(r => r.ids)), pending: [...new Set(results.flatMap(r => r.pending))] };
}
export function resolveNode(graph: AllergenGraph, id: string, path: string[] = []): AllergenResult {
  const node = graph.nodes[id];
  if (!node) return { ids: [], pending: [id || "Ricetta non verificata"] };
  if (path.includes(id)) throw new Error("Ciclo nella ricetta: " + [...path, id].join(" → "));
  return mergeResults([
    { ids: node.allergens, pending: node.status === "TO_VERIFY" ? [node.name] : [] },
    ...node.components.map(child => resolveNode(graph, child, [...path, id])),
  ]);
}
export function resolveIngredient(graph: AllergenGraph, name: string) {
  return resolveNode(graph, graph.ingredients[name] ?? name);
}
export function productResult(graph: AllergenGraph, productId: string, additions: string[] = [], removals: string[] = [], variant?: string | null): AllergenResult {
  const id = graph.products[productId];
  // Only exact, explicitly mapped ingredient removals are applied. Unknown removals
  // keep known allergens and mark the recipe uncertain rather than claiming absence.
  const removedIds = removals.map(name => graph.ingredients[name.replace(/^Senza /i, "")] ?? "");
  const node = graph.nodes[id];
  const modified = node ? { ...graph, nodes: { ...graph.nodes, [id]: { ...node, components: node.components.filter(child => !removedIds.includes(child)) } } } : graph;
  return mergeResults([
    resolveNode(modified, id),
    ...additions.map(name => resolveIngredient(graph, name)),
    ...(removedIds.some(id => !id || !node?.components.includes(id)) ? [{ ids: [], pending: ["Rimozione da verificare con il personale"] }] : []),
    ...(variant ? [{ ids: [], pending: [`Variante ${variant}: verificare composizione`] }] : []),
  ]);
}
export function pizzaAllergens(graph: AllergenGraph, selection: PizzaBuilderSelection) {
  const containers = selection.slots.map(slot => mergeResults([
    resolveNode(graph, slot.flavor ? graph.flavors[slot.flavor] : graph.bases[slot.base]),
    ...(!slot.flavor && slot.base === "ROSSA" && slot.mozzarellaStandard ? [resolveNode(graph, graph.bases.mozzarella)] : []),
    ...slot.ingredients.map(name => resolveIngredient(graph, name)),
  ]));
  return { ...mergeResults(containers), containers };
}
export function snapshot(registry: PublicRegistry, result: AllergenResult & { containers?: AllergenResult[] }): AllergenSnapshot {
  return { ...result, version: registry.version, updatedAt: registry.updatedAt, allergens: result.ids.map(id => ({ id, name: registry.graph.master.find(a => a.id === id)?.name ?? `Allergene ${id}` })) };
}
export function dependsOn(graph: AllergenGraph, root: string, target: string, seen = new Set<string>()): boolean {
  if (root === target) return true;
  if (seen.has(root)) return false;
  seen.add(root);
  return graph.nodes[root]?.components.some(child => dependsOn(graph, child, target, seen)) ?? false;
}
export function publicGraph(graph: AllergenGraph): AllergenGraph {
  return { ...graph, nodes: Object.fromEntries(Object.entries(graph.nodes).map(([id, node]) => [id, { name: node.name, allergens: node.allergens, status: node.status, components: node.components }])) };
}
