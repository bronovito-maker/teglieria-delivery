export type ServiceType = "DELIVERY" | "ASPORTO";

export type ServiceAvailabilityConfig = {
  deliveryEnabled?: boolean;
  deliveryDisabledUntil?: Date | string | null;
  pickupEnabled?: boolean;
  pickupDisabledUntil?: Date | string | null;
  serviceMessage?: string | null;
};

export type ServiceState = {
  active: boolean;
  disabledUntil: string | null;
  label: string | null;
};

function italianDateTime(value: Date): string {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Rome",
  }).format(value);
}

function resolve(enabled: boolean | undefined, untilValue: Date | string | null | undefined, name: string, now: Date): ServiceState {
  const until = untilValue ? new Date(untilValue) : null;
  const hasFutureDeadline = Boolean(until && Number.isFinite(until.getTime()) && until > now);
  const active = enabled !== false || (Boolean(until) && !hasFutureDeadline);
  const disabledUntil = !active && hasFutureDeadline ? until!.toISOString() : null;
  return {
    active,
    disabledUntil,
    label: active ? null : disabledUntil
      ? `${name} torna disponibile ${italianDateTime(until!)}`
      : `${name} torna presto`,
  };
}

export function getServiceAvailability(config: ServiceAvailabilityConfig | null | undefined, now = new Date()) {
  const delivery = resolve(config?.deliveryEnabled, config?.deliveryDisabledUntil, "Il Delivery", now);
  const pickup = resolve(config?.pickupEnabled, config?.pickupDisabledUntil, "Il ritiro in sede", now);
  return {
    delivery,
    pickup,
    allDisabled: !delivery.active && !pickup.active,
    message: config?.serviceMessage?.trim() || null,
  };
}

export function serviceForOrderType(type: ServiceType, availability: ReturnType<typeof getServiceAvailability>) {
  return type === "DELIVERY" ? availability.delivery : availability.pickup;
}
