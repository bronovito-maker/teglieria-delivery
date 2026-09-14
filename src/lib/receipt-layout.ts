export const RECEIPT_ROLL_WIDTH_MM = 58;
export const DEFAULT_RECEIPT_PRINTABLE_WIDTH_MM = 48;
export const RECEIPT_QR_SIZE_MM = 38;
export const RECEIPT_QR_RASTER_WIDTH_PX = 768;
export const RECEIPT_QR_QUIET_ZONE_MODULES = 4;
export const RECEIPT_QR_ERROR_CORRECTION = "H" as const;

const MIN_PRINTABLE_WIDTH_MM = 42;
const MAX_PRINTABLE_WIDTH_MM = 54;

/**
 * Returns the printable head width from the printer datasheet/configuration.
 * 48 mm is the conservative fallback for common 58 mm / 384-dot printers.
 */
export function getReceiptPrintableWidthMm(value = process.env.RECEIPT_PRINTABLE_WIDTH_MM): number {
  if (!value) return DEFAULT_RECEIPT_PRINTABLE_WIDTH_MM;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < MIN_PRINTABLE_WIDTH_MM || parsed > MAX_PRINTABLE_WIDTH_MM) {
    return DEFAULT_RECEIPT_PRINTABLE_WIDTH_MM;
  }
  return parsed;
}
