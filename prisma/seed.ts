import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Categorie
  const pizze = await prisma.category.create({
    data: { name: "Pizze", sortOrder: 0 },
  });
  const teglie = await prisma.category.create({
    data: { name: "Teglie", sortOrder: 1 },
  });
  const bibite = await prisma.category.create({
    data: { name: "Bibite", sortOrder: 2 },
  });
  const dolci = await prisma.category.create({
    data: { name: "Dolci", sortOrder: 3 },
  });

  // Pizze
  await prisma.product.create({
    data: {
      name: "Margherita",
      description: "Pomodoro, mozzarella, basilico",
      price: 7.0,
      categoryId: pizze.id,
      variants: {
        createMany: {
          data: [
            { name: "Piccola", priceDelta: -1.5 },
            { name: "Grande", priceDelta: 2.0 },
          ],
        },
      },
      additions: {
        createMany: {
          data: [
            { name: "Mozzarella extra", price: 1.5 },
            { name: "Prosciutto", price: 2.0 },
          ],
        },
      },
      removals: {
        createMany: {
          data: [{ name: "Senza basilico" }],
        },
      },
    },
  });

  await prisma.product.create({
    data: {
      name: "Diavola",
      description: "Pomodoro, mozzarella, salame piccante",
      price: 8.5,
      categoryId: pizze.id,
      variants: {
        createMany: {
          data: [
            { name: "Piccola", priceDelta: -1.5 },
            { name: "Grande", priceDelta: 2.0 },
          ],
        },
      },
    },
  });

  await prisma.product.create({
    data: {
      name: "Capricciosa",
      description: "Pomodoro, mozzarella, prosciutto, funghi, carciofi, olive",
      price: 9.0,
      categoryId: pizze.id,
    },
  });

  // Teglie
  await prisma.product.create({
    data: {
      name: "Teglia Margherita",
      description: "Teglia classica con pomodoro e mozzarella",
      price: 12.0,
      categoryId: teglie.id,
    },
  });

  await prisma.product.create({
    data: {
      name: "Teglia Patate e Rosmarino",
      price: 10.0,
      categoryId: teglie.id,
    },
  });

  // Bibite
  await prisma.product.create({
    data: { name: "Coca Cola 33cl", price: 2.5, categoryId: bibite.id },
  });
  await prisma.product.create({
    data: { name: "Acqua naturale 50cl", price: 1.0, categoryId: bibite.id },
  });
  await prisma.product.create({
    data: { name: "Birra Moretti 33cl", price: 3.0, categoryId: bibite.id },
  });

  // Dolci
  await prisma.product.create({
    data: { name: "Tiramisù", price: 4.0, categoryId: dolci.id },
  });

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
          dinnerStart: "18:30",
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
