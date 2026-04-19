// Allineato agli enum Prisma del DB
export type OrderType = "DELIVERY" | "ASPORTO";

export type OrderStatus =
  | "RECEIVED"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "OUT"
  | "DELIVERED"
  | "CANCELLED";

export type OrderItem = {
  name: string;     // productName
  quantity: number;
  price: number;    // unitPrice
};

export type UserOrder = {
  id: string;
  orderCode: string | null;
  orderNumber: number;
  type: OrderType;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  total: number;
  subtotal: number;
  address: string | null;
  estimatedTime: string | null; // ISO string, null se non impostato
};

export const CLOSED_STATUSES: OrderStatus[] = ["DELIVERED", "CANCELLED"];
