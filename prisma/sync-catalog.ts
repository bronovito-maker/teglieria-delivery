import { Prisma, PrismaClient } from "@prisma/client";
import { PIZZA_BUILDER_CONFIG } from "../src/lib/pizza-builder";

const prisma = new PrismaClient();
type ProductData = { categoryId: string; name: string; description: string; price: number; clubPrice?: number; promoPrice?: number; imageUrl?: string | null; sortOrder: number; configuration?: unknown };

const pizzas = [
  ["La Regina", "Pomodoro San Marzano DOP, fiordilatte e basilico fresco.", 29, 24, 19, 16, 14, 12, 3, "pizza_laregina.jpg"],
  ["La Partenopea", "Pomodoro San Marzano DOP, fiordilatte, acciughe e capperi.", 34, 29, 24, 19, 17, 15, 3.5, "pizza_lapartenopea.jpg"],
  ["La Contadina", "Pomodoro San Marzano DOP, fiordilatte, prosciutto cotto e funghi.", 36, 30, 25, 20, 18, 16, 3.5, "pizza_lacontadina.jpg"],
  ["La Diavola", "Pomodoro San Marzano DOP, fiordilatte e salamino piccante.", 34, 29, 24, 19, 17, 15, 3.5, "pizza_ladiavola.jpg"],
  ["L'Ortolana", "Pomodoro San Marzano DOP, fiordilatte e verdure di stagione.", 34, 28, 23, 19, 16, 15, 3.5, "pizza_lortolana.jpg"],
  ["La Pistacchio", "Fiordilatte, scamorza affumicata, prosciutto cotto arrosto, crema di burrata, pesto e granella di pistacchio.", 45, 42, 37, 25, 25, 23, 4.5, "pizza_lapistacchio.jpg"],
  ["La Nordica", "Fiordilatte, salmone affumicato, burrata pugliese, rucola e pomodorino giallo.", 49, 45, 40, 27, 27, 25, 5, "pizza_lanordica.jpg"],
  ["La Parma", "Fiordilatte, prosciutto crudo stagionato, rucola fresca, scaglie di Grana Padano DOP e olio extravergine d'oliva.", 44, 39, 34, 24, 23, 21, 4.5, "pizza_laparma.jpg"],
  ["La Burrata", "Pomodoro San Marzano DOP, burrata pugliese, pomodorini confit, basilico fresco e olio extravergine d'oliva.", 42, 39, 33, 23, 23, 21, 4.5, "pizza_teglia_la_burrata.jpg"],
  ["La Carbonara", "Fiordilatte, crema di pecorino romano, guanciale croccante e pepe nero.", 42, 36, 31, 23, 21, 19, 4.5, "pizza_lacarbonara.jpg"],
] as const;
const schiacciatine = [["La Semplice", "Base intera da 400 g", 2.5, null], ["La Classica", "Base intera da 400 g", 8, null], ["La Rustica", "Base intera da 400 g", 10, null], ["La Cruda", "Base intera da 400 g", 10.5, null], ["La Pistacchio", "Base intera da 400 g", 12, "pizza_teglia_la_pistacchio.jpg"], ["La Parma", "Base intera da 400 g", 12.5, "pizza_teglia_la_parma_closeup.jpg"], ["La Golosa", "Base intera da 400 g", 7, null]] as const;
const ceci = [["Torta di Ceci", "Vendita a peso - € 1,90 / 100 g", 1.9, "torta_di_ceci_dettaglio.jpg"], ["Giga 5e5", "Base intera da 400 g", 4, "5e5_closeup.jpg"], ["Giga 5e5 con Melanzane", "Base intera da 400 g", 5.5, "5e5_melanzane.jpg"], ["5e5 Piccolo", "Mezza base", 2.5, "5e5_closeup.jpg"], ["5e5 Piccolo con Melanzane", "Mezza base", 3.5, "5e5_melanzane.jpg"]] as const;
const fritti = [["Pane Fritto della Teglieria", "8 pezzi", 4], ["Patatine Fritte", "220 g", 4], ["Nuggets di Pollo", "4 pezzi", 4], ["Anelli di Cipolla", "5 pezzi", 4], ["Fritto Teglieria", "Patatine, 4 anelli, 3 nuggets e 4 pezzi di pane fritto", 5]] as const;
const analcoliche = [["Acqua naturale S. Antonio", "50 cl", 1, "bevanda_acqua_naturale.jpg"], ["Acqua gassata S. Antonio", "50 cl", 1, "bevanda_acqua_frizzante.jpg"], ["Acqua Valmora naturale", "1,5 L", 1.5, "bevanda_acqua_naturale.jpg"], ["Estathé pesca o limone - brick", "20 cl", 1.2, "bevanda_estate_pesca_brick.jpg"], ["Coca-Cola, Coca-Cola Zero o Fanta - lattina", "33 cl", 2.3, "bevanda_coca_cola_lattina.jpg"], ["Coca-Cola, Coca-Cola Zero o Fanta Lemon - PET", "45 cl", 3.5, "bevanda_coca_cola_bottiglia.jpg"], ["Estathé pesca o limone - PET", "40 cl", 3, "bevanda_estate_pesca_bottiglia.jpg"], ["Spuma bionda Queen", "33 cl", 4.5, "bevanda_spuma_bionda.jpg"]] as const;
const birre = [["Bitburger Drive analcolica", "33 cl", 3, "bevanda_birra_analcolica_bitburger.jpg"], ["Bitburger Pils", "50 cl", 3.5, "bevanda_birra_bitburger.jpg"], ["Corona Extra", "33 cl", 4, "bevanda_birra_corona_extra.jpg"], ["Theresianer Lager", "33 cl", 4, "bevanda_birra_theresianer.jpg"], ["Theresianer Vienna Rossa", "33 cl", 4.5, "bevanda_birra_theresianer.jpg"], ["Ichnusa Non Filtrata", "50 cl", 5, "bevanda_birra_ichnusa_non_filtrata.jpg"], ["Lauterbacher Weizen", "50 cl", 4.5, "bevanda_birra_lauterbacher.jpg"], ["BrewDog Punk IPA", "33 cl", 5.5, "bevanda_birra_brewdog_punk_ipa.jpg"]] as const;
const trancioImages: Record<string, string> = {
  "La Regina": "/menu/tranci/regina.webp",
  "La Partenopea": "/menu/tranci/partenopea.webp",
  "La Contadina": "/menu/tranci/contadina.webp",
  "La Diavola": "/menu/tranci/diavola.webp",
  "L'Ortolana": "/menu/tranci/ortolana.webp",
  "La Pistacchio": "/menu/tranci/pistacchio.webp",
  "La Nordica": "/menu/tranci/nordica.webp",
  "La Parma": "/menu/tranci/parma.webp",
  "La Burrata": "/menu/tranci/burrata.webp",
  "La Carbonara": "/menu/tranci/carbonara.webp",
};

async function getCategory(name: string, sortOrder: number) {
  const existing = await prisma.category.findFirst({ where: { name } });
  return existing ? prisma.category.update({ where: { id: existing.id }, data: { sortOrder, active: true } }) : prisma.category.create({ data: { name, sortOrder, active: true } });
}

async function upsertProduct(data: ProductData) {
  const existing = await prisma.product.findFirst({ where: { categoryId: data.categoryId, name: data.name } });
  const payload = { ...data, configuration: data.configuration === undefined ? undefined : data.configuration as Prisma.InputJsonValue, clubPrice: data.clubPrice ?? null, promoPrice: data.promoPrice ?? null, imageUrl: data.imageUrl ?? null, active: true };
  return existing ? prisma.product.update({ where: { id: existing.id }, data: payload }) : prisma.product.create({ data: payload });
}

async function main() {
  const categoryNames = ["Crea la tua pizza", "Teglie", "Mezze teglie", "Tranci", "Schiacciatine", "Torta di ceci e 5e5", "Fritti", "Bevande analcoliche", "Birre"];
  const categories = await Promise.all(categoryNames.map((name, index) => getCategory(name, index)));
  await prisma.category.updateMany({ where: { id: { notIn: categories.map((c) => c.id) } }, data: { active: false } });
  await prisma.product.updateMany({ where: { category: { active: false } }, data: { active: false } });

  for (const [index, [name, description, whole, wholeClub, wholePromo, half, halfClub, halfPromo, slice, image]] of pizzas.entries()) {
    const wholeCategoryId = categories[1].id;
    const halfCategoryId = categories[2].id;
    const sliceCategoryId = categories[3].id;
    const imageUrl = image ? `/menu/${image}` : null;
    await upsertProduct({ categoryId: wholeCategoryId, name, description, price: whole, clubPrice: wholeClub, promoPrice: wholePromo, imageUrl, sortOrder: index });
    await upsertProduct({ categoryId: halfCategoryId, name, description, price: half, clubPrice: halfClub, promoPrice: halfPromo, imageUrl, sortOrder: index });
    await upsertProduct({ categoryId: sliceCategoryId, name, description: `${description} Taglio trancio 1/12.`, price: slice, imageUrl: trancioImages[name] ?? imageUrl, sortOrder: index });
  }
  await upsertProduct({ categoryId: categories[0].id, name: "Crea la tua pizza", description: "Componi ogni gusto scegliendo base e ingredienti. Mezza teglia 30x40 o teglia intera 60x40.", price: 0, imageUrl: "/menu/pizza-componi.webp", sortOrder: 0, configuration: PIZZA_BUILDER_CONFIG });
  for (const [index, [name, description, price]] of schiacciatine.entries()) await upsertProduct({ categoryId: categories[4].id, name, description, price, imageUrl: "/menu/placeholder-food.svg", sortOrder: index });
  for (const [index, [name, description, price, image]] of ceci.entries()) await upsertProduct({ categoryId: categories[5].id, name, description, price, imageUrl: `/menu/${image}`, sortOrder: index });
  for (const [index, [name, description, price]] of fritti.entries()) await upsertProduct({ categoryId: categories[6].id, name, description, price, imageUrl: "/menu/placeholder-food.svg", sortOrder: index });
  for (const [index, [name, description, price, image]] of analcoliche.entries()) await upsertProduct({ categoryId: categories[7].id, name, description, price, imageUrl: `/menu/${image}`, sortOrder: index });
  for (const [index, [name, description, price, image]] of birre.entries()) await upsertProduct({ categoryId: categories[8].id, name, description, price, imageUrl: image ? `/menu/${image}` : null, sortOrder: index });
  console.log("Catalogo completo sincronizzato.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
