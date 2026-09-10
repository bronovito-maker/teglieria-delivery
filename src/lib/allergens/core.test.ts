import { describe, expect, it } from "vitest";
import { initialGraph, mergeInitial } from "./initial-data";
import { dependsOn, pizzaAllergens, productResult, publicGraph, resolveIngredient, resolveNode, snapshot } from "./core";
import { graphSchema } from "./validation";
const products = [
  ...["La Regina", "La Partenopea", "La Carbonara"].map(name => ({ id: name, name, category: { name: "Teglie" } })),
  { id: "golosa", name: "La Golosa", category: { name: "Schiacciatine" } },
  { id: "5e5", name: "Giga 5e5", category: { name: "Torta di ceci e 5e5" } },
  { id: "birra", name: "Bitburger Pils", category: { name: "Birre" } },
];
describe("Registro allergeni: collaudo della specifica", () => {
  it.each([["La Regina",[1,7]], ["La Partenopea",[1,4,7]], ["La Carbonara",[1,3,7]], ["golosa",[1,6,7,8]], ["5e5",[1,5]]])("T01-T05 %s eredita i componenti", (id, expected) => expect(productResult(initialGraph(products), id as string).ids).toEqual(expected));
  it("T01-T02 ingredienti hanno il proprio profilo", () => {
    const g = initialGraph(products); expect(resolveIngredient(g,"Fiordilatte").ids).toEqual([7]); expect(resolveIngredient(g,"Acciughe").ids).toEqual([4]);
  });
  it("T06-T08 unisce i gusti e rimuove solo allergeni non più presenti", () => {
    const g=initialGraph(products);
    const selection = { format: "INTERA" as const, gusti: 4, slots: [{ base: "ROSSA" as const, ingredients: ["Tonno"] }, { base: "BIANCA" as const, ingredients: ["Salmone affumicato", "Granella di pistacchio"] }, { base: "ROSSA" as const, ingredients: [] }, { base: "BIANCA" as const, ingredients: [] }] };
    const result = pizzaAllergens(g,selection);
    expect(result.containers.map(c => c.ids)).toEqual([[1,4],[1,4,7,8],[1],[1,7]]); expect(result.ids).toEqual([1,4,7,8]);
    selection.slots[0].ingredients=[]; expect(pizzaAllergens(g,selection).containers[0].ids).toEqual([1]); expect(pizzaAllergens(g,selection).ids).toContain(4);
  });
  it("T09 propaga un ingrediente e T14 congela lo snapshot", () => {
    const graph=initialGraph(products); const registry={ graph, version: 1, updatedAt: "2026-09-10" };
    const saved=snapshot(registry,productResult(graph,"La Regina"));
    graph.nodes.Fiordilatte.allergens.push(6);
    expect(productResult(graph,"La Regina").ids).toEqual([1,6,7]); expect(saved.ids).toEqual([1,7]);
    expect(dependsOn(graph,graph.products["La Partenopea"],"Fiordilatte")).toBe(true);
  });
  it("T10 propaga TO_VERIFY anche con allergeni noti e non certifica sconosciuti", () => {
    const graph=initialGraph(products);
    expect(resolveIngredient(graph,"Pesto di pistacchio")).toEqual({ ids:[8],pending:["Pesto di pistacchio"] });
    expect(resolveIngredient(graph,"Ingrediente nuovo").pending).not.toEqual([]);
    expect(productResult(graph,"La Carbonara").pending).toContain("La Carbonara");
  });
  it("T11 master completo; T15 birra confermabile solo con etichetta", () => {
    const graph=initialGraph(products); expect(graph.master.map(a=>a.id)).toEqual(Array.from({length:14},(_,i)=>i+1));
    expect(productResult(graph,"birra")).toEqual({ids:[1],pending:["Bitburger Pils"]});
    graph.nodes[graph.products.birra].status="CONFIRMED"; graph.nodes[graph.products.birra].sourceRef="Etichetta lotto 123";
    expect(productResult(graph,"birra")).toEqual({ids:[1],pending:[]});
  });
  it("valida fonti, cicli, riferimenti e assenza documentata", () => {
    const g=initialGraph(products); expect(graphSchema.safeParse(g).success).toBe(true);
    g.nodes.Fiordilatte.components=["pizza:La Regina"]; expect(graphSchema.safeParse(g).success).toBe(false);
    expect(()=>resolveNode(g,"Fiordilatte")).toThrow(/Ciclo/);
    g.nodes.Fiordilatte.components=[]; g.nodes.Fiordilatte.sourceRef=""; expect(graphSchema.safeParse(g).success).toBe(false);
    g.nodes.Fiordilatte.status="NONE_CONFIRMED"; expect(graphSchema.safeParse(g).success).toBe(false);
  });
  it("non espone documenti o verificatori al pubblico e non sovrascrive verifiche al reimport", () => {
    const g=initialGraph(products); g.nodes.Fiordilatte.sourceRef="Documento privato"; g.nodes.Fiordilatte.verifiedBy="operator";
    expect(publicGraph(g).nodes.Fiordilatte.sourceRef).toBeUndefined(); expect(publicGraph(g).nodes.Fiordilatte.verifiedBy).toBeUndefined();
    expect(mergeInitial(g,initialGraph(products)).nodes.Fiordilatte.sourceRef).toBe("Documento privato");
  });
});
