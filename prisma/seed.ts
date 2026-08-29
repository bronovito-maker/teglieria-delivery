import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Categorie
  const intere = await prisma.category.create({ data: { name: "Teglie intere", sortOrder: 0 } });
  const mezze = await prisma.category.create({ data: { name: "Mezze teglie", sortOrder: 1 } });
  const tranci = await prisma.category.create({ data: { name: "Tranci", sortOrder: 2 } });
  const dolci = await prisma.category.create({ data: { name: "La dolce", sortOrder: 3 } });

  const pizzas = [
    ["La Regina", "Pomodoro San Marzano DOP, fiordilatte e basilico fresco.", 29, 24, 16, 14, 3, null],
    ["La Partenopea", "Pomodoro San Marzano DOP, fiordilatte, acciughe e capperi.", 34, 29, 19, 17, 3.5, "pizza_teglia_la_partenopea.jpg"],
    ["La Contadina", "Pomodoro San Marzano DOP, fiordilatte, prosciutto cotto e funghi.", 36, 30, 20, 18, 3.5, null],
    ["La Diavola", "Pomodoro San Marzano DOP, fiordilatte e salamino piccante.", 34, 29, 19, 17, 3.5, "pizza_teglia_la_diavola.jpg"],
    ["L'Ortolana", "Pomodoro San Marzano DOP, fiordilatte e verdure di stagione.", 34, 28, 19, 16, 3.5, "pizza_teglia_ortolana.jpg"],
    ["La Pistacchio", "Fiordilatte, scamorza affumicata, prosciutto cotto arrosto, crema di burrata, pesto e granella di pistacchio.", 45, 42, 25, 25, 4.5, "pizza_teglia_la_pistacchio.jpg"],
    ["La Nordica", "Fiordilatte, salmone affumicato, burrata pugliese, rucola e pomodorino giallo.", 49, 45, 27, 27, 5, null],
    ["La Parma", "Fiordilatte, prosciutto crudo stagionato, rucola fresca, scaglie di Grana Padano DOP e olio extravergine d'oliva.", 44, 39, 24, 23, 4.5, "pizza_teglia_la_parma_closeup.jpg"],
    ["La Burrata", "Pomodoro San Marzano DOP, burrata pugliese, pomodorini confit, basilico fresco e olio extravergine d'oliva.", 42, 39, 23, 23, 4.5, null],
    ["La Carbonara", "Fiordilatte, crema di pecorino romano, guanciale croccante e pepe nero.", 42, 36, 23, 21, 4.5, null],
  ] as const;

  for (const [name, description, standard, club, halfStandard, halfClub, slice, image] of pizzas) {
    const imageUrl = image ? `/menu/${image}` : null;
    await prisma.product.create({ data: { name, description, price: standard, clubPrice: club, categoryId: intere.id, imageUrl } });
    await prisma.product.create({ data: { name, description, price: halfStandard, clubPrice: halfClub, categoryId: mezze.id, imageUrl } });
    await prisma.product.create({ data: { name, description, price: slice, categoryId: tranci.id, imageUrl } });
  }

  await prisma.product.create({ data: { name: "La Golosa", description: "Crema di nocciole, granella di nocciole e zucchero a velo.", price: 6, categoryId: dolci.id, imageUrl: "/menu/5e5_closeup.jpg" } });

  // Orari — tutti i giorni aperti a cena (default operativo)
  const schedule = [
    { dayOfWeek: 0, label: "Domenica" },
    { dayOfWeek: 1, label: "Lunedì" },
    { dayOfWeek: 2, label: "Martedì" },
    { dayOfWeek: 3, label: "Mercoledì" },
    { dayOfWeek: 4, label: "Giovedì" },
    { dayOfWeek: 5, label: "Venerdì" },
    { dayOfWeek: 6, label: "Sabato" },
  ];
  await Promise.all(
    schedule.map((day) =>
      prisma.daySchedule.upsert({
        where: { dayOfWeek: day.dayOfWeek },
        create: {
          dayOfWeek: day.dayOfWeek,
          isOpen: true,
          lunchActive: false,
          lunchStart: "12:00",
          lunchEnd: "14:30",
          dinnerActive: true,
          dinnerStart: "16:00",
          dinnerEnd: "22:00",
        },
        update: {},  // non sovrascrive se già configurato
      })
    )
  );

  // Delivery zones
  await prisma.deliveryZone.createMany({
    data: [
      { name: "Centro", deliveryCost: 2.0 },
      { name: "Zona Nord", deliveryCost: 3.0 },
      { name: "Zona Sud", deliveryCost: 3.5 },
      { name: "Periferia", deliveryCost: 5.0 },
    ],
  });

  // Rider
  await prisma.rider.create({
    data: { name: "Marco", phone: "333 1234567" },
  });

  console.log("Seed completato!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
