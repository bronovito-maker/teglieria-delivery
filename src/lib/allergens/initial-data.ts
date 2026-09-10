// Bootstrap only: after import the database is the operational source of truth.
import { PIZZA_BUILDER_CONFIG, PIZZA_MENU_FLAVORS, SCHIACCIATINA_CATALOG } from "../catalog";
import type { AllergenGraph, AllergenNode, Verification } from "./core";
const reference = "La_Teglieria_Specifiche_Sito_Allergeni_v1.0_08-09-2026.pdf";
const schiacciatineReference = "La_Teglieria_Schiacciatine_Ingredienti_Aggiornato.pdf";
export function initialGraph(products: Array<{ id: string; name: string; category: { name: string } }>): AllergenGraph {
  const names = ["Cereali contenenti glutine", "Crostacei", "Uova", "Pesce", "Arachidi", "Soia", "Latte", "Frutta a guscio", "Sedano", "Senape", "Sesamo", "Solfiti", "Lupini", "Molluschi"];
  const descriptions = ["Grano, segale, orzo, avena, farro, kamut e derivati", "E prodotti a base di crostacei", "E prodotti a base di uova", "E prodotti a base di pesce", "E prodotti a base di arachidi", "E prodotti a base di soia", "Latte e derivati, incluso lattosio", "Mandorle, nocciole, noci, anacardi, pecan, noci del Brasile, pistacchi, macadamia", "E prodotti a base di sedano", "E prodotti a base di senape", "Semi di sesamo e derivati", "Anidride solforosa e solfiti oltre le soglie di legge", "E prodotti a base di lupini", "E prodotti a base di molluschi"];
  const graph: AllergenGraph = { master: names.map((name,i) => ({ id: i+1, name, description: descriptions[i] })), nodes: {}, ingredients: {}, products: {}, flavors: {}, bases: { ROSSA: "base-rossa", BIANCA: "base-bianca", mozzarella: "Fiordilatte" } };
  function add(id: string, allergens: number[] = [], status: Verification = "TO_VERIFY", components: string[] = [], name = id) {
    graph.nodes[id] = { name, allergens, status, components, sourceType: "RECIPE", sourceRef: reference };
  }
  for (const row of PIZZA_BUILDER_CONFIG.ingredients) add(row[0]);
  for (const name of ["Prosciutto crudo nazionale", "Tonno", "'Nduja", "Formaggi / mix 4 formaggi", "Olio/friggitrice", "Patatine Fritte", "Nuggets di Pollo", "Anelli di Cipolla"]) add(name);
  for (const name of ["Pomodoro", "Pomodoro extra", "Funghi", "Capperi", "Cipolla", "Rucola", "Pomodorini", "Basilico", "Olio extravergine"]) add(name, [], "NONE_CONFIRMED");
  for (const name of ["Fiordilatte", "Mozzarella extra", "Scamorza affumicata", "Stracciatella", "Burrata", "Mozzarella di bufala", "Pecorino", "Grana Padano", "Gorgonzola", "Mascarpone"]) add(name, [7], "CONFIRMED");
  for (const name of ["Acciughe", "Tonno"]) add(name, [4], "CONFIRMED");
  add("Salmone affumicato", [4]);
  add("Pesto di pistacchio", [8]);
  add("Granella di pistacchio", [8], "CONFIRMED");
  add("Formaggi / mix 4 formaggi", [7]);
  add("Impasto", [1], "CONFIRMED");
  add("Uova/tuorli", [3], "CONFIRMED");
  add("Olio di arachidi", [5], "CONFIRMED");
  add("Nutella", [6,7,8], "CONFIRMED");
  add("base-rossa", [], "CONFIRMED", ["Impasto", "Pomodoro"], "Base rossa");
  add("base-bianca", [], "CONFIRMED", ["Impasto", "Fiordilatte"], "Base bianca");
  add("Torta di Ceci", [], "CONFIRMED", ["Olio di arachidi"]);
  add("Pane Fritto della Teglieria", [], "CONFIRMED", ["Impasto", "Olio/friggitrice"]);
  add("Fritto Teglieria", [], "CONFIRMED", ["Patatine Fritte", "Nuggets di Pollo", "Anelli di Cipolla", "Pane Fritto della Teglieria"]);
  for (const flavor of PIZZA_MENU_FLAVORS) {
    const id = `pizza:${flavor.name}`;
    // Explicit components keep ingredient labels and removals tied to the recipe.
    const components = ["Impasto", ...(flavor.base === "ROSSA" ? ["Pomodoro"] : ["Fiordilatte"]), ...(flavor.mozzarellaStandard ? ["Fiordilatte"] : []), ...flavor.ingredients];
    if (flavor.name === "La Carbonara") components.push("Uova/tuorli");
    add(id, [], flavor.name === "La Carbonara" ? "TO_VERIFY" : "CONFIRMED", components, flavor.name);
    graph.flavors[flavor.name] = id;
  }
  const ingredientAliases: Record<string, string | null> = {
    "Base schiacciatina 400 g": "Impasto",
    "olio EVO": "Olio extravergine",
    sale: null,
    "Nutella / crema di nocciole": "Nutella",
  };
  const schiacciatine = Object.fromEntries(
    SCHIACCIATINA_CATALOG
      .filter((product) => product.active !== false && product.ingredients)
      .map((product) => [
        product.name,
        product.ingredients!
          .map((ingredient) => {
            if (ingredientAliases[ingredient] !== undefined) return ingredientAliases[ingredient];
            return Object.keys(graph.nodes).find(
              (nodeId) => nodeId.toLocaleLowerCase("it") === ingredient.toLocaleLowerCase("it"),
            ) ?? ingredient;
          })
          .filter((ingredient): ingredient is string => ingredient !== null),
      ]),
  );
  for (const [name,components] of Object.entries(schiacciatine)) {
    const id = `schiacciatina:${name}`;
    add(id, [], "CONFIRMED", components, name);
    graph.nodes[id].sourceRef = schiacciatineReference;
  }
  // The recipe is official; individual supplier allergen sheets still require verification.
  for (const name of Object.keys(schiacciatine).filter(n => !["La Semplice", "La Golosa"].includes(n))) graph.nodes[`schiacciatina:${name}`].status = "TO_VERIFY";
  for (const product of products) {
    let id: string;
    if (["Teglie", "Mezze teglie", "Tranci"].includes(product.category.name) && graph.flavors[product.name]) id = graph.flavors[product.name];
    else if (product.category.name === "Schiacciatine" && schiacciatine[product.name]) id = `schiacciatina:${product.name}`;
    else if (product.name.toLowerCase().includes("5e5")) {
      id = `recipe:${product.name}`;
      add(id, [], "CONFIRMED", ["Impasto", "Torta di Ceci", ...(product.name.toLowerCase().includes("melanzane") ? ["Melanzane sotto pesto"] : [])], product.name);
    } else if (["Torta di Ceci", "Pane Fritto della Teglieria", "Patatine Fritte", "Nuggets di Pollo", "Anelli di Cipolla", "Fritto Teglieria"].includes(product.name)) id = product.name;
    else {
      id = `product:${product.id}`;
      add(id, product.category.name === "Birre" ? [1] : [], "TO_VERIFY", [], product.name);
      graph.nodes[id].sourceType = "LABEL";
      graph.nodes[id].sourceRef = "Etichetta specifica da acquisire";
    }
    graph.products[product.id] = id;
  }
  for (const [id,node] of Object.entries(graph.nodes)) if (!id.includes(":")) graph.ingredients[node.name] = id;
  Object.assign(graph.ingredients, { "Mozzarella standard": "Fiordilatte", "Mozzarella": "Fiordilatte", "Fiordilatte extra": "Fiordilatte", "Ventricina piccante": "Salamino piccante", "Pecorino Romano": "Pecorino", "Parma DOP": "Prosciutto di Parma DOP", "Patatine": "Patatine Fritte" });
  return graph;
}
export function mergeInitial(existing: AllergenGraph, incoming: AllergenGraph): AllergenGraph {
  return { ...existing, nodes: { ...incoming.nodes, ...existing.nodes }, products: { ...incoming.products, ...existing.products }, ingredients: { ...incoming.ingredients, ...existing.ingredients }, flavors: { ...incoming.flavors, ...existing.flavors } };
}
