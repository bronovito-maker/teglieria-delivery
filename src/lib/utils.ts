import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(num);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)} ${formatTime(date)}`;
}

/** Returns orderCode if present, otherwise derives it from type + orderNumber (legacy fallback) */
export function formatOrderCode(order: {
  orderCode?: string | null;
  orderNumber: number;
  type: string;
}): string {
  if (order.orderCode) return order.orderCode;
  const prefix = order.type === "DELIVERY" ? "D" : "A";
  const num = order.orderNumber;
  return `${prefix}${num < 1000 ? String(num).padStart(3, "0") : num}`;
}
