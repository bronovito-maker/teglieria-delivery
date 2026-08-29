import { prisma } from "../src/lib/prisma";
import { syncStripeCatalogProduct } from "../src/lib/stripe-catalog";

async function main() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY non configurata");
  const products = await prisma.product.findMany({
    select: { id: true, name: true, description: true, price: true, active: true, stripeProductId: true, stripePriceId: true },
    orderBy: { sortOrder: "asc" },
  });
  for (const product of products) {
    const synced = await syncStripeCatalogProduct(product);
    console.log(`${product.active ? "SYNC" : "ARCHIVE"} ${product.name} → ${synced.stripeProductId} / ${synced.stripePriceId ?? "nessun prezzo"}`);
  }
}

main().catch((error) => {
  console.error("[STRIPE CATALOG SYNC] Fallita", error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
