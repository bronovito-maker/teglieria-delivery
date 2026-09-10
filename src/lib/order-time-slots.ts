export type OrderServiceType = "ASPORTO" | "DELIVERY";

export const ORDER_TIME_SLOT_CONFIG = {
  ASPORTO: {
    start: "16:00",
    end: "22:00",
    intervalMinutes: 30,
    displayAsInterval: false,
  },
  DELIVERY: {
    start: "19:00",
    end: "22:00",
    intervalMinutes: 30,
    displayAsInterval: true,
  },
} as const;

export type OrderTimeSlot = {
  time: string;
  start: string;
  end: string;
  label: string;
};

export function timeToMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

export function buildOrderTimeSlot(
  type: OrderServiceType,
  start: string,
  intervalMinutes: number = ORDER_TIME_SLOT_CONFIG[type].intervalMinutes,
): OrderTimeSlot {
  const startMinutes = timeToMinutes(start);
  if (startMinutes == null || intervalMinutes <= 0) throw new Error(`INVALID_TIME_SLOT:${start}`);
  const end = minutesToTime(startMinutes + intervalMinutes);
  return {
    time: start,
    start,
    end,
    label: type === "DELIVERY" ? `${start}/${end}` : start,
  };
}

export function generateOrderTimeSlots(
  type: OrderServiceType,
  start: string = ORDER_TIME_SLOT_CONFIG[type].start,
  end: string = ORDER_TIME_SLOT_CONFIG[type].end,
  intervalMinutes: number = ORDER_TIME_SLOT_CONFIG[type].intervalMinutes,
): OrderTimeSlot[] {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  if (startMinutes == null || endMinutes == null || startMinutes >= endMinutes || intervalMinutes <= 0) {
    return [];
  }

  const slots: OrderTimeSlot[] = [];
  for (let current = startMinutes; current + intervalMinutes <= endMinutes; current += intervalMinutes) {
    slots.push(buildOrderTimeSlot(type, minutesToTime(current), intervalMinutes));
  }
  return slots;
}

export function formatOrderTimeSlot(type: OrderServiceType, start?: string | null): string {
  if (!start) return "";
  try {
    return buildOrderTimeSlot(type, start).label;
  } catch {
    return start;
  }
}

export function isOrderTimeAllowed(type: OrderServiceType, time: string): boolean {
  const minutes = timeToMinutes(time);
  const start = timeToMinutes(ORDER_TIME_SLOT_CONFIG[type].start);
  const end = timeToMinutes(ORDER_TIME_SLOT_CONFIG[type].end);
  if (minutes == null || start == null || end == null) return false;
  return minutes >= start && minutes < end;
}
