export function getRiderCompensationConfig() {
  const perDelivery = Number(process.env.RIDER_COMPENSATION_PER_DELIVERY_EUR ?? 1.8);
  const dailyFixed = Number(process.env.RIDER_COMPENSATION_DAILY_FIXED_EUR ?? 0);
  return {
    perDelivery: Number.isFinite(perDelivery) ? perDelivery : 1.8,
    dailyFixed: Number.isFinite(dailyFixed) ? dailyFixed : 0,
  };
}

export function calculateRiderCompensation(deliveredCount: number): number {
  const { perDelivery, dailyFixed } = getRiderCompensationConfig();
  if (deliveredCount <= 0) return 0;
  return deliveredCount * perDelivery + dailyFixed;
}
