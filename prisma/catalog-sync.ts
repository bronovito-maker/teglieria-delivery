import { Prisma, PrismaClient } from "@prisma/client";
import {
  assertCanonicalCatalog,
  CATALOG_CATEGORIES,
  CATALOG_EXPECTED_COUNTS,
  CATALOG_PRODUCTS,
  type CatalogProductDefinition,
} from "../src/lib/catalog";

type PlannedChange = {
  category: string;
  product?: string;
  fields: string[];
};

export type CatalogSyncPlan = {
  expected: { categories: number; products: number };
  createCategories: PlannedChange[];
  updateCategories: PlannedChange[];
  deactivateCategories: PlannedChange[];
  createProducts: PlannedChange[];
  updateProducts: PlannedChange[];
  deactivateProducts: PlannedChange[];
  unchangedProducts: number;
  unmanagedProducts: Array<{ category: string; product: string; active: boolean }>;
};

export type CatalogSyncOptions = {
  apply: boolean;
  expectedCategories?: number;
  expectedProducts?: number;
};

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableJson(nested)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

function numberOrNull(value: Prisma.Decimal | number | null): number | null {
  return value == null ? null : Number(value);
}

function productFieldsToUpdate(
  existing: {
    description: string | null;
    price: Prisma.Decimal;
    clubPrice: Prisma.Decimal | null;
    promoPrice: Prisma.Decimal | null;
    imageUrl: string | null;
    sortOrder: number;
    active: boolean;
    configuration: Prisma.JsonValue | null;
  },
  canonical: CatalogProductDefinition,
): string[] {
  const fields: string[] = [];
  if (existing.description !== canonical.description) fields.push("description");
  if (numberOrNull(existing.price) !== canonical.price) fields.push("price");
  if (numberOrNull(existing.clubPrice) !== (canonical.clubPrice ?? null)) fields.push("clubPrice");
  if (numberOrNull(existing.promoPrice) !== (canonical.promoPrice ?? null)) fields.push("promoPrice");
  if (existing.imageUrl !== canonical.imageUrl) fields.push("imageUrl");
  if (existing.sortOrder !== canonical.sortOrder) fields.push("sortOrder");
  if (!existing.active) fields.push("active");
  if (stableJson(existing.configuration) !== stableJson(canonical.configuration ?? null)) fields.push("configuration");
  return fields;
}

function assertExpectedCounts(options: CatalogSyncOptions) {
  const expected = {
    categories: options.expectedCategories ?? CATALOG_EXPECTED_COUNTS.categories,
    products: options.expectedProducts ?? CATALOG_EXPECTED_COUNTS.products,
  };
  assertCanonicalCatalog(expected);
  return expected;
}

export async function buildCatalogSyncPlan(
  prisma: PrismaClient,
  expected: { categories: number; products: number } = CATALOG_EXPECTED_COUNTS,
): Promise<CatalogSyncPlan> {
  assertCanonicalCatalog(expected);
  const existingCategories = await prisma.category.findMany({
    include: { products: true },
  });

  const plan: CatalogSyncPlan = {
    expected,
    createCategories: [],
    updateCategories: [],
    deactivateCategories: [],
    createProducts: [],
    updateProducts: [],
    deactivateProducts: [],
    unchangedProducts: 0,
    unmanagedProducts: [],
  };

  for (const canonicalCategory of CATALOG_CATEGORIES) {
    const matches = existingCategories.filter((category) => category.name === canonicalCategory.name);
    if (matches.length > 1) throw new Error(`DUPLICATE_DATABASE_CATEGORY:${canonicalCategory.name}`);
    const existingCategory = matches[0];
    const canonicalProducts = CATALOG_PRODUCTS.filter(
      (product) => product.categoryKey === canonicalCategory.key,
    );

    if (!existingCategory) {
      plan.createCategories.push({ category: canonicalCategory.name, fields: ["name", "sortOrder", "active"] });
      plan.createProducts.push(
        ...canonicalProducts.map((product) => ({
          category: canonicalCategory.name,
          product: product.name,
          fields: ["all"],
        })),
      );
      continue;
    }

    const categoryFields: string[] = [];
    if (existingCategory.sortOrder !== canonicalCategory.sortOrder) categoryFields.push("sortOrder");
    if (!existingCategory.active) categoryFields.push("active");
    if (categoryFields.length) {
      plan.updateCategories.push({ category: canonicalCategory.name, fields: categoryFields });
    }

    for (const canonicalProduct of canonicalProducts) {
      const matchesProducts = existingCategory.products.filter(
        (product) => product.name === canonicalProduct.name,
      );
      if (matchesProducts.length > 1) {
        throw new Error(`DUPLICATE_DATABASE_PRODUCT:${canonicalCategory.name}:${canonicalProduct.name}`);
      }
      const existingProduct = matchesProducts[0];
      if (!existingProduct) {
        plan.createProducts.push({ category: canonicalCategory.name, product: canonicalProduct.name, fields: ["all"] });
        continue;
      }
      const fields = productFieldsToUpdate(existingProduct, canonicalProduct);
      if (fields.length) {
        plan.updateProducts.push({ category: canonicalCategory.name, product: canonicalProduct.name, fields });
      } else {
        plan.unchangedProducts += 1;
      }
    }

    const canonicalProductNames = new Set(canonicalProducts.map((product) => product.name));
    for (const product of existingCategory.products) {
      if (canonicalProductNames.has(product.name)) continue;
      if (canonicalCategory.key === "fried" && product.name === "Fritto Teglieria") {
        if (product.active) {
          plan.deactivateProducts.push({ category: canonicalCategory.name, product: product.name, fields: ["active"] });
        }
        continue;
      }
      plan.unmanagedProducts.push({ category: canonicalCategory.name, product: product.name, active: product.active });
    }
  }

  const canonicalCategoryNames = new Set(CATALOG_CATEGORIES.map((category) => category.name));
  for (const category of existingCategories) {
    if (canonicalCategoryNames.has(category.name)) continue;
    if (category.active) {
      plan.deactivateCategories.push({ category: category.name, fields: ["active"] });
    }
    for (const product of category.products) {
      if (product.active) {
        plan.deactivateProducts.push({ category: category.name, product: product.name, fields: ["active"] });
      }
    }
  }

  return plan;
}

function productPayload(product: CatalogProductDefinition) {
  return {
    name: product.name,
    description: product.description,
    price: product.price,
    clubPrice: product.clubPrice ?? null,
    promoPrice: product.promoPrice ?? null,
    imageUrl: product.imageUrl,
    sortOrder: product.sortOrder,
    configuration: product.configuration === undefined
      ? Prisma.DbNull
      : product.configuration as Prisma.InputJsonValue,
    active: true,
  };
}

async function applyCatalog(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const categoryIds = new Map<string, string>();

    for (const category of CATALOG_CATEGORIES) {
      const matches = await tx.category.findMany({ where: { name: category.name }, take: 2 });
      if (matches.length > 1) throw new Error(`DUPLICATE_DATABASE_CATEGORY:${category.name}`);
      const saved = matches[0]
        ? await tx.category.update({
            where: { id: matches[0].id },
            data: { sortOrder: category.sortOrder, active: true },
          })
        : await tx.category.create({
            data: { name: category.name, sortOrder: category.sortOrder, active: true },
          });
      categoryIds.set(category.key, saved.id);
    }

    const canonicalCategoryIds = [...categoryIds.values()];
    await tx.category.updateMany({
      where: { id: { notIn: canonicalCategoryIds } },
      data: { active: false },
    });
    await tx.product.updateMany({
      where: { categoryId: { notIn: canonicalCategoryIds } },
      data: { active: false },
    });

    for (const product of CATALOG_PRODUCTS) {
      const categoryId = categoryIds.get(product.categoryKey);
      if (!categoryId) throw new Error(`MISSING_DATABASE_CATEGORY:${product.categoryKey}`);
      const matches = await tx.product.findMany({
        where: { categoryId, name: product.name },
        take: 2,
      });
      if (matches.length > 1) {
        throw new Error(`DUPLICATE_DATABASE_PRODUCT:${product.categoryKey}:${product.name}`);
      }
      const payload = productPayload(product);
      if (matches[0]) {
        await tx.product.update({ where: { id: matches[0].id }, data: payload });
      } else {
        await tx.product.create({ data: { ...payload, categoryId } });
      }
    }

    const friedCategoryId = categoryIds.get("fried");
    if (friedCategoryId) {
      await tx.product.updateMany({
        where: { categoryId: friedCategoryId, name: "Fritto Teglieria" },
        data: { active: false },
      });
    }
  }, { timeout: 30_000 });
}

export async function syncCatalog(
  prisma: PrismaClient,
  options: CatalogSyncOptions,
): Promise<{ mode: "dry-run" | "apply"; plan: CatalogSyncPlan }> {
  const expected = assertExpectedCounts(options);
  const plan = await buildCatalogSyncPlan(prisma, expected);
  if (!options.apply) return { mode: "dry-run", plan };

  await applyCatalog(prisma);
  const verification = await buildCatalogSyncPlan(prisma, expected);
  const pendingChanges =
    verification.createCategories.length
    + verification.updateCategories.length
    + verification.deactivateCategories.length
    + verification.createProducts.length
    + verification.updateProducts.length
    + verification.deactivateProducts.length;
  if (pendingChanges > 0) throw new Error(`CATALOG_SYNC_VERIFICATION_FAILED:${pendingChanges}`);
  return { mode: "apply", plan };
}
