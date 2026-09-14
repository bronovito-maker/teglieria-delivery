export type OrderServiceType = "ASPORTO" | "DELIVERY";
export const ROME_TIME_ZONE = "Europe/Rome";

export const ORDER_TIME_SLOT_CONFIG = {
  ASPORTO: {
    start: "16:00",
    end: "22:00",
    intervalMinutes: 30,
    displayAsInterval: true,
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
    label: `${start}/${end}`,
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
  return generateOrderTimeSlots(type).some((slot) => slot.start === time);
}

function partsInRome(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ROME_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function getRomeDateString(value: Date = new Date()): string {
  const parts = partsInRome(value);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getRomeDateOffsetString(offsetDays: number, value: Date = new Date()): string {
  const current = getRomeDateString(value);
  const [year, month, day] = current.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + offsetDays)).toISOString().slice(0, 10);
}

export function getRomeTimeString(value: Date | string): string | null {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  const parts = partsInRome(date);
  return `${parts.hour}:${parts.minute}`;
}

export function romeDateTimeToDate(date: string, time = "00:00"): Date {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMinutes = timeToMinutes(time);
  if (!dateMatch || timeMinutes == null) throw new Error(`INVALID_ROME_DATE_TIME:${date}T${time}`);

  const target = Date.UTC(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
    Math.floor(timeMinutes / 60),
    timeMinutes % 60,
  );
  let guess = target;
  for (let index = 0; index < 3; index += 1) {
    const parts = partsInRome(new Date(guess));
    const rendered = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    guess += target - rendered;
  }
  return new Date(guess);
}

export function getRomeDayBounds(date: string): { gte: Date; lt: Date } {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!dateMatch) throw new Error(`INVALID_ROME_DATE:${date}`);
  const followingDay = new Date(Date.UTC(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]) + 1));
  const followingDate = followingDay.toISOString().slice(0, 10);
  return { gte: romeDateTimeToDate(date), lt: romeDateTimeToDate(followingDate) };
}

export function getRomeDayOfWeek(date: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error(`INVALID_ROME_DATE:${date}`);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))).getUTCDay();
}
