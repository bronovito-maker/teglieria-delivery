export const ORDER_STATUS_LABELS: Record<string, string> = {
  RECEIVED: "Ricevuto",
  CONFIRMED: "Confermato",
  READY: "Pronto",
  OUT: "In uscita",
  DELIVERED: "Completato",
  CANCELLED: "Annullato",
};

export const MIN_ORDER_SUBTOTAL = 12;

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
    CONFIRMED: ["READY", "CANCELLED"],
    READY: ["OUT", "CANCELLED"],
    OUT: ["DELIVERED"],
    DELIVERED: [],
    CANCELLED: [],
  },
  ASPORTO: {
    RECEIVED: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["READY", "CANCELLED"],
    READY: ["DELIVERED", "CANCELLED"],
    DELIVERED: [],
    CANCELLED: [],
  },
};

export function getStatusTransitions(type: string, status: string): string[] {
  return ORDER_STATUS_TRANSITIONS[type]?.[status] ?? ORDER_STATUS_TRANSITIONS.DELIVERY[status] ?? [];
}
