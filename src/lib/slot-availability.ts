export type BookingSlot = {
  time: string; start?: string; end?: string; label?: string;
  available: boolean; remaining: number; requiresCashierDecision?: boolean;
};
export type DayAvailability = {
  slots: BookingSlot[]; closed?: boolean; unavailableReason?: string; message?: string;
};
export type DayResult = { date: string; data: DayAvailability | null };
export const SLOT_VERIFICATION_ERROR = "Non riesco a verificare gli orari di questa data. Riprova tra poco.";

function validDay(value: unknown): value is DayAvailability {
  if (!value || typeof value !== "object") return false;
  const day = value as DayAvailability;
  return Array.isArray(day.slots) && day.slots.every(slot => slot &&
    typeof slot.time === "string" && /^\d{2}:\d{2}$/.test(slot.time) &&
    typeof slot.available === "boolean" && typeof slot.remaining === "number" &&
    Number.isFinite(slot.remaining));
}

// A failure on one date must not invalidate confirmed availability on another date.
// Selected date first, at most two in-flight requests, bounded request duration.
export async function fetchSlotDays(
  days: string[], selectedDate: string, orderType: string, capacityItems: string,
  signal: AbortSignal, fetcher: typeof fetch = fetch, timeoutMs = 10000,
): Promise<DayResult[]> {
  const results: DayResult[] = days.map(date => ({ date, data: null }));
  const queue = days.map((_, index) => index);
  const selected = days.indexOf(selectedDate);
  if (selected >= 0) { queue.splice(selected, 1); queue.unshift(selected); }
  let cursor = 0;
  async function worker() {
    while (!signal.aborted && cursor < queue.length) {
      const index = queue[cursor++];
      const controller = new AbortController();
      const abort = () => controller.abort();
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) controller.abort();
      const timer = setTimeout(abort, timeoutMs);
      try {
        const query = new URLSearchParams({ date: days[index], type: orderType, items: capacityItems });
        const response = await fetcher(`/api/logistica/fasce?${query}`, {
          cache: "no-store", signal: controller.signal,
        });
        if (response.ok) {
          const data: unknown = await response.json();
          if (validDay(data)) results[index].data = data;
        }
      } catch {
        // Keep this date unknown; never represent a transport error as sold out.
      } finally {
        clearTimeout(timer);
        signal.removeEventListener("abort", abort);
      }
    }
  }
  await Promise.all([worker(), worker()]);
  return results;
}

export function resolveSlotDays(results: DayResult[], selectedDate: string) {
  const available = (result: DayResult) => result.data?.slots.some(slot => slot.available);
  const selected = results.find(result => result.date === selectedDate);
  const closedDays = new Set(results.filter(result => result.data?.closed === true).map(result => result.date));
  const unavailableDays = new Set(results.filter(result => result.data && !available(result)).map(result => result.date));
  // Do not change a selected date because its verification failed.
  const target = selected && !selected.data ? undefined :
    selected && available(selected) ? selected : results.find(available);
  const failed = !target && results.some(result => !result.data);
  const confirmed = results.filter((result): result is DayResult & { data: DayAvailability } => !!result.data);
  const message = target ? "" : confirmed.find(result => result.data.unavailableReason === "CART_EXCEEDS_SLOT_CAPACITY")?.data.message ||
    (!failed ? confirmed.find(result => result.data.unavailableReason === "STOCK_UNAVAILABLE")?.data.message : "") || "";
  return {
    date: target?.date ?? selectedDate,
    slots: target?.data?.slots.filter(slot => slot.available) ?? [],
    closedDays, unavailableDays, message,
    error: failed ? SLOT_VERIFICATION_ERROR : "",
    dayClosed: !target && !failed,
  };
}
