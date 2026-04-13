export const ORDER_STATUS_LABELS: Record<string, string> = {
  RECEIVED: "Ricevuto",
  CONFIRMED: "Confermato",
  PREPARING: "In preparazione",
  READY: "Pronto",
  OUT: "In uscita",
  DELIVERED: "Completato",
  CANCELLED: "Annullato",
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  RECEIVED: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PREPARING: "bg-orange-100 text-orange-800",
  READY: "bg-green-100 text-green-800",
  OUT: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-gray-100 text-gray-800",
  CANCELLED: "bg-red-100 text-red-800",
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

// Valid next states for each order status
export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  RECEIVED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["OUT", "CANCELLED"],
  OUT: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};
