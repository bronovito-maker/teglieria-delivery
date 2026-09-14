import { describe, expect, it } from "vitest";
import {
  DEFAULT_RECEIPT_PRINTABLE_WIDTH_MM,
  RECEIPT_QR_ERROR_CORRECTION,
  RECEIPT_QR_QUIET_ZONE_MODULES,
  RECEIPT_QR_RASTER_WIDTH_PX,
  RECEIPT_QR_SIZE_MM,
  RECEIPT_ROLL_WIDTH_MM,
  getReceiptPrintableWidthMm,
} from "./receipt-layout";

describe("layout scontrino 58 mm", () => {
  it("mantiene QR e contenuto entro la larghezza stampabile", () => {
    const printableWidth = getReceiptPrintableWidthMm();
    expect(RECEIPT_ROLL_WIDTH_MM).toBe(58);
    expect(printableWidth).toBe(DEFAULT_RECEIPT_PRINTABLE_WIDTH_MM);
    expect(RECEIPT_QR_SIZE_MM).toBeGreaterThanOrEqual(34);
    expect(RECEIPT_QR_SIZE_MM).toBeLessThanOrEqual(40);
    expect(RECEIPT_QR_SIZE_MM).toBeLessThan(printableWidth);
  });

  it("usa un QR robusto e ad alta risoluzione", () => {
    expect(RECEIPT_QR_RASTER_WIDTH_PX).toBeGreaterThanOrEqual(600);
    expect(RECEIPT_QR_QUIET_ZONE_MODULES).toBeGreaterThanOrEqual(4);
    expect(RECEIPT_QR_ERROR_CORRECTION).toBe("H");
  });

  it("accetta soltanto larghezze plausibili per un roll da 58 mm", () => {
    expect(getReceiptPrintableWidthMm("52")).toBe(52);
    expect(getReceiptPrintableWidthMm("20")).toBe(DEFAULT_RECEIPT_PRINTABLE_WIDTH_MM);
    expect(getReceiptPrintableWidthMm("testo")).toBe(DEFAULT_RECEIPT_PRINTABLE_WIDTH_MM);
  });
});
