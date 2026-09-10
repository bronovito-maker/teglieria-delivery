export type MoneyValue = number | string;

export type MoneyLine = {
  quantity: number;
  payableUnitPrice: MoneyValue;
  standardUnitPrice?: MoneyValue | null;
};

export type AuthoritativeLineInput = {
  quantity: number;
  payableBasePrice: MoneyValue;
  standardBasePrice: MoneyValue;
  variantPrice?: MoneyValue;
  additionPrices?: readonly MoneyValue[];
};

export function toCents(value: MoneyValue): number {
  const amount = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(amount)) throw new Error("INVALID_MONEY_VALUE");
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  if (!Number.isSafeInteger(cents)) throw new Error("INVALID_CENTS_VALUE");
  return cents / 100;
}

export function calculateAuthoritativeLine(input: AuthoritativeLineInput) {
  if (!Number.isSafeInteger(input.quantity) || input.quantity <= 0) throw new Error("INVALID_MONEY_QUANTITY");
  const optionsCents = toCents(input.variantPrice ?? 0)
    + (input.additionPrices ?? []).reduce<number>((sum, price) => sum + toCents(price), 0);
  const payableUnitCents = toCents(input.payableBasePrice) + optionsCents;
  const standardUnitCents = Math.max(payableUnitCents, toCents(input.standardBasePrice) + optionsCents);
  if (payableUnitCents < 0 || standardUnitCents < 0) throw new Error("INVALID_MONEY_VALUE");
  const totalCents = payableUnitCents * input.quantity;
  return {
    payableUnitCents,
    standardUnitCents,
    totalCents,
    payableUnitPrice: fromCents(payableUnitCents),
    standardUnitPrice: fromCents(standardUnitCents),
    totalPrice: fromCents(totalCents),
  };
}

export function calculateMoneySummary(lines: readonly MoneyLine[], fees: MoneyValue = 0) {
  let subtotalCents = 0;
  let standardSubtotalCents = 0;

  for (const line of lines) {
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 0) throw new Error("INVALID_MONEY_QUANTITY");
    const payableUnitCents = toCents(line.payableUnitPrice);
    const standardUnitCents = toCents(line.standardUnitPrice ?? line.payableUnitPrice);
    if (payableUnitCents < 0 || standardUnitCents < 0) throw new Error("INVALID_MONEY_VALUE");
    subtotalCents += payableUnitCents * line.quantity;
    standardSubtotalCents += Math.max(payableUnitCents, standardUnitCents) * line.quantity;
  }

  const feesCents = toCents(fees);
  if (feesCents < 0) throw new Error("INVALID_MONEY_VALUE");
  const savingsCents = standardSubtotalCents - subtotalCents;
  return {
    subtotalCents,
    standardSubtotalCents,
    savingsCents,
    feesCents,
    totalCents: subtotalCents + feesCents,
    subtotal: fromCents(subtotalCents),
    standardSubtotal: fromCents(standardSubtotalCents),
    savings: fromCents(savingsCents),
    fees: fromCents(feesCents),
    total: fromCents(subtotalCents + feesCents),
  };
}
