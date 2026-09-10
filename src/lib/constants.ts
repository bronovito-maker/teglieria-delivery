export const ORDER_STATUS_LABELS: Record<string, string> = {
  RECEIVED: "Ricevuto",
  CONFIRMED: "Confermato",
  READY: "Pronto",
  OUT: "In uscita",
  DELIVERED: "Completato",
  CANCELLED: "Annullato",
};

export const MIN_ORDER_SUBTOTAL = 12;

export const BASE_DELIVERY_FEE = 2;

export const ASPORTO_START_TIME = ORDER_TIME_SLOT_CONFIG.ASPORTO.start;
export const DELIVERY_START_TIME = ORDER_TIME_SLOT_CONFIG.DELIVERY.start;
export const DELIVERY_END_TIME = ORDER_TIME_SLOT_CONFIG.DELIVERY.end;

export function getItalianTimeSlot(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Rome",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/** 2 € entro il primo km; oltre, 0,33 €/km arrotondato per eccesso al decimo. */
export function calculateDeliveryFee(deliveryKm?: number | null): number {
  if (!Number.isFinite(deliveryKm) || (deliveryKm ?? 0) <= 1) return BASE_DELIVERY_FEE;
  const extra = Math.ceil(((deliveryKm as number) - 1) * 0.33 * 10 - 1e-9) / 10;
  return Number((BASE_DELIVERY_FEE + extra).toFixed(2));
}

export const ORDER_STATUS_COLORS: Record<string, string> = {
  RECEIVED: "bg-marigold/20 text-marigold border border-marigold/20",
  CONFIRMED: "bg-terracotta/20 text-terracotta border border-terracotta/20",
  READY: "bg-terracotta/10 text-terracotta border border-terracotta/10",
  OUT: "bg-charcoal/80 text-white shadow-sm",
  DELIVERED: "bg-charcoal/10 text-charcoal/60 border border-charcoal/10",
  CANCELLED: "bg-charcoal text-white",
};

export const ORDER_TYPE_LABELS: Record<string, string> = {
  ASPORTO: "Asporto",
  DELIVERY: "Delivery",
};

export const ORDER_CHANNEL_LABELS: Record<string, string> = {
  WEB: "Sito Web",
  PHONE: "Telefono",
  COUNTER: "Banco",
};

export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  ASSIGNED: "Assegnato",
  PICKED_UP: "Ritirato",
  EN_ROUTE: "In consegna",
  DELIVERED: "Consegnato",
};

// Valid next states per type. ASPORTO skips OUT (no rider dispatch).
export const ORDER_STATUS_TRANSITIONS: Record<string, Record<string, string[]>> = {
  DELIVERY: {
    RECEIVED: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["PREPARING", "READY", "CANCELLED"],
    PREPARING: ["READY", "CANCELLED"],
    READY: ["OUT", "CANCELLED"],
    OUT: ["DELIVERED"],
    DELIVERED: [],
    CANCELLED: [],
  },
  ASPORTO: {
    RECEIVED: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["PREPARING", "READY", "CANCELLED"],
    PREPARING: ["READY", "CANCELLED"],
    READY: ["DELIVERED", "CANCELLED"],
    DELIVERED: [],
    CANCELLED: [],
  },
};

export const DELIVERY_STATUS_TRANSITIONS: Record<string, string[]> = {
  ASSIGNED: ["PICKED_UP", "EN_ROUTE"],
  PICKED_UP: ["EN_ROUTE"],
  EN_ROUTE: ["DELIVERED"],
  DELIVERED: [],
};

export function getStatusTransitions(type: string, status: string): string[] {
  return ORDER_STATUS_TRANSITIONS[type]?.[status] ?? ORDER_STATUS_TRANSITIONS.DELIVERY[status] ?? [];
}

export function canTransitionOrderStatus(type: string, current: string, requested: string): boolean {
  return current === requested || getStatusTransitions(type, current).includes(requested);
}

export function canTransitionDeliveryStatus(current: string | null, requested: string): boolean {
  if (current === requested) return true;
  if (current === null) return requested === "ASSIGNED" || requested === "EN_ROUTE";
  return DELIVERY_STATUS_TRANSITIONS[current]?.includes(requested) ?? false;
}
import { ORDER_TIME_SLOT_CONFIG } from "./order-time-slots";

export {
  buildOrderTimeSlot,
  formatOrderTimeSlot,
  generateOrderTimeSlots,
  isOrderTimeAllowed,
  ORDER_TIME_SLOT_CONFIG,
} from "./order-time-slots";
