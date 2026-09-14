import { beforeEach, describe, expect, it, vi } from "vitest";

const { updateMany, findUnique, findUniqueOrThrow, update, sendEmail } = vi.hoisted(() => ({
  updateMany: vi.fn(),
  findUnique: vi.fn(),
  findUniqueOrThrow: vi.fn(),
  update: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { orderEmailOutbox: { updateMany, findUnique, findUniqueOrThrow, update } },
}));
vi.mock("@/lib/email", () => ({ sendOrderCancellationEmail: sendEmail }));

import { deliverOrderCancellationEmail, enqueueOrderCancellationEmail } from "./order-cancellation-outbox";

describe("order cancellation email outbox", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses one unique event for each cancelled order", async () => {
    const upsert = vi.fn(async () => ({ id: "event-1" }));
    await enqueueOrderCancellationEmail({ orderEmailOutbox: { upsert } } as never, {
      id: "order-1",
      customerEmail: "mario@example.com",
      customerName: "Mario",
      orderNumber: 1,
      orderCode: "D001",
    });
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { orderId_eventType: { orderId: "order-1", eventType: "ORDER_CANCELLED" } },
      update: {},
    }));
  });

  it("claims and sends once, then treats a retry as already sent", async () => {
    updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    findUniqueOrThrow.mockResolvedValue({ id: "event-1", payload: { customerEmail: "mario@example.com", customerName: "Mario", orderNumber: 1 } });
    update.mockResolvedValue({});
    sendEmail.mockResolvedValue(undefined);
    findUnique.mockResolvedValue({ sentAt: new Date() });

    await expect(deliverOrderCancellationEmail("order-1")).resolves.toBe("sent");
    await expect(deliverOrderCancellationEmail("order-1")).resolves.toBe("already-sent");
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
});
