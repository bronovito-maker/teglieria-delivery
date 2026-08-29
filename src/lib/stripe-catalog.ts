import Stripe from "stripe";
import { prisma } from "./prisma";
import { getStripe } from "./stripe";

export type StripeCatalogProduct = {
  id: string;
  name: string;
  description: string | null;
  price: unknown;
  active: boolean;
  stripeProductId: string | null;
  stripePriceId: string | null;
};

function cents(value: unknown): number {
  return Math.round(Number(value) * 100);
}

export async function syncStripeCatalogProduct(product: StripeCatalogProduct) {
  const stripe = getStripe();
  let stripeProduct: Stripe.Product;

  if (product.stripeProductId) {
    stripeProduct = await stripe.products.update(product.stripeProductId, {
      name: product.name,
      description: product.description || undefined,
      active: product.active,
      metadata: { catalogProductId: product.id },
    });
  } else {
    stripeProduct = await stripe.products.create(
      {
        name: product.name,
        description: product.description || undefined,
        active: product.active,
        metadata: { catalogProductId: product.id },
      },
      { idempotencyKey: `catalog-product-${product.id}` },
    );
  }

  const amount = cents(product.price);
  const currentPrice = product.stripePriceId ? await stripe.prices.retrieve(product.stripePriceId) : null;
  const priceChanged = !currentPrice || !currentPrice.active || currentPrice.unit_amount !== amount || currentPrice.currency !== "eur";
  let stripePriceId = product.stripePriceId;

  if (priceChanged) {
    const newPrice = await stripe.prices.create(
      {
        product: stripeProduct.id,
        currency: "eur",
        unit_amount: amount,
        active: product.active,
        metadata: { catalogProductId: product.id },
      },
      { idempotencyKey: `catalog-price-${product.id}-${amount}` },
    );
    stripePriceId = newPrice.id;
    if (product.active && !newPrice.active) {
      // A previous interrupted sync may have left the idempotent Price archived.
      // Reactivate it and verify the result before assigning it as default.
      await stripe.prices.update(newPrice.id, { active: true });
      const reactivatedPrice = await stripe.prices.retrieve(newPrice.id);
      if (!reactivatedPrice.active) {
        const replacementPrice = await stripe.prices.create({
          product: stripeProduct.id,
          currency: "eur",
          unit_amount: amount,
          active: true,
          metadata: { catalogProductId: product.id },
        });
        stripePriceId = replacementPrice.id;
      }
    }
    if (currentPrice?.active) await stripe.prices.update(currentPrice.id, { active: false });
    if (product.active) await stripe.products.update(stripeProduct.id, { default_price: newPrice.id });
  } else if (!product.active && currentPrice?.active) {
    await stripe.prices.update(currentPrice.id, { active: false });
  }

  await prisma.product.update({
    where: { id: product.id },
    data: { stripeProductId: stripeProduct.id, stripePriceId },
  });
  return { stripeProductId: stripeProduct.id, stripePriceId };
}
