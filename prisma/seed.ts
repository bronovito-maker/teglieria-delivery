import { PrismaClient } from "@prisma/client";
import { CATALOG_EXPECTED_COUNTS } from "../src/lib/catalog";
import { ORDER_TIME_SLOT_CONFIG } from "../src/lib/order-time-slots";
import { syncCatalog } from "./catalog-sync";

const prisma = new PrismaClient();

const defaultSchedule = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  isOpen: true,
  lunchActive: false,
  lunchStart: "12:00",
  lunchEnd: "14:30",
  dinnerActive: true,
  dinnerStart: ORDER_TIME_SLOT_CONFIG.ASPORTO.start,
  dinnerEnd: ORDER_TIME_SLOT_CONFIG.ASPORTO.end,
}));

const defaultDeliveryZones = [
  { name: "Centro", deliveryCost: 2 },
  { name: "Zona Nord", deliveryCost: 3 },
  { name: "Zona Sud", deliveryCost: 3.5 },
  { name: "Periferia", deliveryCost: 5 },
];

async function assertSeedTargetIsEmpty() {
  const [categories, products, orders, schedules, zones, riders] = await prisma.$transaction([
    prisma.category.count(),
    prisma.product.count(),
    prisma.order.count(),
    prisma.daySchedule.count(),
    prisma.deliveryZone.count(),
    prisma.rider.count(),
  ]);
  const counts = { categories, products, orders, schedules, zones, riders };
  if (Object.values(counts).some((count) => count > 0)) {
    throw new Error(`SEED_REFUSED_ON_NON_EMPTY_DATABASE:${JSON.stringify(counts)}`);
  }
}

async function ensureOperationalDefaults() {
  await prisma.globalConfig.upsert({
    where: { id: "default" },
    create: { id: "default", maxOrdersPerSlot: 5, deliveryFee: 2 },
    update: {},
  });

  for (const schedule of defaultSchedule) {
    await prisma.daySchedule.upsert({
      where: { dayOfWeek: schedule.dayOfWeek },
      create: schedule,
      update: {},
    });
  }

  for (const zone of defaultDeliveryZones) {
    const existing = await prisma.deliveryZone.findFirst({ where: { name: zone.name } });
    if (!existing) await prisma.deliveryZone.create({ data: zone });
  }

  const existingRider = await prisma.rider.findFirst({ where: { phone: "333 1234567" } });
  if (!existingRider) {
    await prisma.rider.create({ data: { name: "Marco", phone: "333 1234567" } });
  }
}

async function main() {
  const allowExisting = process.argv.includes("--allow-existing");
  if (!allowExisting) await assertSeedTargetIsEmpty();

  await syncCatalog(prisma, {
    apply: true,
    expectedCategories: CATALOG_EXPECTED_COUNTS.categories,
    expectedProducts: CATALOG_EXPECTED_COUNTS.products,
  });
  await ensureOperationalDefaults();
  console.log(`Seed completato: ${CATALOG_EXPECTED_COUNTS.categories} categorie e ${CATALOG_EXPECTED_COUNTS.products} prodotti canonici.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
