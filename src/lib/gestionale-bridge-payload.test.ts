import { beforeEach, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ gestionaleOrder: { create: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() } }));
vi.mock("./prisma", () => ({ prisma: { $transaction: (f: (t: typeof db) => unknown) => f(db) } }));
import { enqueueGestionaleOrder, pollGestionaleOrders } from "./gestionale-bridge";
beforeEach(() => { vi.clearAllMocks(); process.env.GESTIONALE_BRIDGE_ENABLED = "true"; });
function row(payloadVersion: number, backendOrderId: string | null = null) {
 return { payloadVersion, backendOrderId, order: { id: "same-order", total: 14, paymentMethod: "CONTANTI", items: [{id:"line",quantity:1,unitPrice:14,standardUnitPrice:16,totalPrice:14}] } };
}
it("new orders persist the payload version atomically", async () => {
 await enqueueGestionaleOrder(db as never,"same-order");
 expect(db.gestionaleOrder.create).toHaveBeenCalledWith({data:{orderId:"same-order",payloadVersion:1}});
});
it("legacy retries never gain a field that changes their commercial identity", async () => {
 db.gestionaleOrder.findMany.mockResolvedValue([row(0,"backend")]);
 const [o] = await pollGestionaleOrders(); expect(o.items[0]).not.toHaveProperty("standardUnitPrice"); expect(o.items[0].unitPrice).toBe(14);
});
it("Club preserves list and paid prices before and after acknowledgment", async () => {
 db.gestionaleOrder.findMany.mockResolvedValueOnce([row(1)]).mockResolvedValueOnce([row(1,"backend")]);
 const [a] = await pollGestionaleOrders(), [b] = await pollGestionaleOrders();
 expect(a.items).toEqual(b.items); expect(a.items[0]).toMatchObject({standardUnitPrice:16,unitPrice:14,totalPrice:14});
});
