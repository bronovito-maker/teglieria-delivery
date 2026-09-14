import { beforeAll, afterAll, expect, it } from "vitest";
import { createHmac, randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { prisma } from "./prisma";
import { enqueueGestionaleOrder, pollGestionaleOrders, acknowledgeGestionaleOrder } from "./gestionale-bridge";
import { POST } from "@/app/api/integrations/gestionale/bridge/route";
import { BRIDGE_PATH } from "./gestionale-bridge-contract";
const local = process.env.DATABASE_URL?.startsWith("postgresql://luca@127.0.0.1:55434/bridge_test");
const test = it.skipIf(!local);
const ids: string[] = [];
beforeAll(() => { if(local) {process.env.GESTIONALE_BRIDGE_ENABLED = "true";process.env.GESTIONALE_BRIDGE_SECRET = "test-only-production-bridge-secret-never-deploy";} });
afterAll(async () => {if(local) {await prisma.order.deleteMany({where:{id:{in:ids}}});await prisma.$disconnect();} });
async function create(paymentMethod: "CONTANTI" | "STRIPE" = "CONTANTI") {
 return prisma.$transaction(async tx => {const order = await tx.order.create({data:{type:"ASPORTO",channel:"WEB",customerName:"COLLAUDO DATABASE ISOLATO",customerPhone:"0000000000",subtotal:12,total:12,paymentMethod,pickupTime:new Date()}});ids.push(order.id);await enqueueGestionaleOrder(tx,order.id);return order;});
}
test("queue and order are atomic, including transaction rollback", async () => {
 let rolledBack = "";
 await expect(prisma.$transaction(async tx => {const o = await tx.order.create({data:{type:"ASPORTO",channel:"WEB",customerName:"Rollback",customerPhone:"0",subtotal:12,total:12}});rolledBack=o.id;await enqueueGestionaleOrder(tx,o.id);throw Error("rollback");})).rejects.toThrow("rollback");
 expect(await prisma.order.findUnique({where:{id:rolledBack}})).toBeNull();expect(await prisma.gestionaleOrder.findUnique({where:{orderId:rolledBack}})).toBeNull();
 const order=await create();expect(await prisma.gestionaleOrder.findUnique({where:{orderId:order.id}})).not.toBeNull();
});
test("offline retry preserves identity and unpaid Stripe is excluded", async () => {
 const order=await create(), stripe=await create("STRIPE");
 const first=await pollGestionaleOrders();expect(first.some(o=>o.id===order.id)).toBe(true);expect(first.some(o=>o.id===stripe.id)).toBe(false);
 await prisma.gestionaleOrder.update({where:{orderId:order.id},data:{nextPollAt:new Date(0)}});
 expect((await pollGestionaleOrders()).some(o=>o.id===order.id)).toBe(true);
 await prisma.order.update({where:{id:stripe.id},data:{paymentStatus:"PAID",stripePaymentIntentId:"pi_LOCAL_TEST"}});
 expect((await pollGestionaleOrders()).some(o=>o.id===stripe.id)).toBe(true);
});
test("ack is idempotent, rejects wrong identity, and late callbacks do not regress", async () => {
 const order=await create();const state={orderId:order.id,order_id:randomUUID(),row_version:2,acceptance_state:"ACCEPTED" as const,production_state:"preparing",fulfillment_state:"PENDING",payment_state:"UNPAID",fiscal_state:"NOT_ISSUED",sale_id:null};
 await acknowledgeGestionaleOrder(state);await acknowledgeGestionaleOrder(state);
 expect((await prisma.order.findUnique({where:{id:order.id}}))?.status).toBe("PREPARING");
 await acknowledgeGestionaleOrder({...state,row_version:1,production_state:"new"});
 expect((await prisma.order.findUnique({where:{id:order.id}}))?.status).toBe("PREPARING");
 expect(await prisma.orderStatusLog.count({where:{orderId:order.id}})).toBe(1);
 await expect(acknowledgeGestionaleOrder({...state,order_id:"OTHER"})).rejects.toThrow("ORDER_ID_CONFLICT");
});
test("HTTP signature and durable nonce prevent replays", async () => {
 const body=JSON.stringify({operation:"poll"}), timestamp=String(Math.floor(Date.now()/1000)),nonce=randomUUID();
 const sig=createHmac("sha256",process.env.GESTIONALE_BRIDGE_SECRET!).update(`${timestamp}\n${nonce}\nPOST\n${BRIDGE_PATH}\n${body}`).digest("hex");
 const request=()=>new NextRequest("http://localhost"+BRIDGE_PATH,{method:"POST",body,headers:{"x-gestionale-timestamp":timestamp,"x-gestionale-nonce":nonce,"x-gestionale-signature":sig}});
 expect((await POST(request())).status).toBe(200);expect((await POST(request())).status).toBe(409);
 expect((await POST(new NextRequest("http://localhost"+BRIDGE_PATH,{method:"POST",body}))).status).toBe(401);
});
