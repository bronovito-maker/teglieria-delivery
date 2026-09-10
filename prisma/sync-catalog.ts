import { PrismaClient } from "@prisma/client";
import { CATALOG_EXPECTED_COUNTS } from "../src/lib/catalog";
import { syncCatalog } from "./catalog-sync";

const prisma = new PrismaClient();

function readExpectedValue(name: string): number | undefined {
  const prefix = `--${name}=`;
  const argument = process.argv.find((value) => value.startsWith(prefix));
  if (!argument) return undefined;
  const value = Number(argument.slice(prefix.length));
  if (!Number.isInteger(value) || value <= 0) throw new Error(`INVALID_${name.toUpperCase().replaceAll("-", "_")}`);
  return value;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const dryRun = process.argv.includes("--dry-run") || !apply;
  if (apply && process.argv.includes("--dry-run")) throw new Error("CHOOSE_DRY_RUN_OR_APPLY");

  const expectedCategories = readExpectedValue("expect-categories");
  const expectedProducts = readExpectedValue("expect-products");
  if (apply && (expectedCategories === undefined || expectedProducts === undefined)) {
    throw new Error(
      `APPLY_REQUIRES_EXPECTED_COUNTS:--expect-categories=${CATALOG_EXPECTED_COUNTS.categories}:--expect-products=${CATALOG_EXPECTED_COUNTS.products}`,
    );
  }

  const result = await syncCatalog(prisma, {
    apply: !dryRun,
    expectedCategories,
    expectedProducts,
  });
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
