// Native acceptance and fulfillment events can describe the same customer state.
// Keep the complete backend audit trail; show each consecutive state only once.
export function customerStatusHistory<T extends {status: string}>(history: readonly T[]): T[] {
  return history.filter((entry, index) => index === 0 || entry.status !== history[index - 1].status);
}
