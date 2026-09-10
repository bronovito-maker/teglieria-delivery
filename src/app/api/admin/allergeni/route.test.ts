import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialGraph } from "@/lib/allergens/initial-data";
const mocks=vi.hoisted(()=>({ getUser:vi.fn(), find:vi.fn(), update:vi.fn(), audit:vi.fn() }));
vi.mock("@/lib/supabase/server",()=>({createClient:async()=>({auth:{getUser:mocks.getUser}})}));
vi.mock("@/lib/prisma",()=>({prisma:{ $transaction:async(fn: (tx: unknown)=>unknown)=>fn({allergenRegistry:{findUniqueOrThrow:mocks.find,updateMany:mocks.update},allergenAudit:{create:mocks.audit}}) }}));
import { GET, PATCH } from "./route";
const graph=initialGraph([]);
function request(patch: Record<string,unknown>={},origin="http://localhost:3000") {
  return new Request("http://localhost:3000/api/admin/allergeni",{method:"PATCH",headers:{origin,"content-type":"application/json"},body:JSON.stringify({version:1,id:"Fiordilatte",node:{...graph.nodes.Fiordilatte,allergens:[6,7],sourceType:"LABEL",sourceRef:"Scheda fornitore lotto 123"},reason:"Aggiornamento etichetta fornitore",...patch})});
}
describe("Salvataggio registro allergeni",()=>{
  beforeEach(()=>{vi.clearAllMocks();mocks.getUser.mockResolvedValue({data:{user:{id:"operator",app_metadata:{role:"operator"}}}});mocks.find.mockResolvedValue({version:1,data:structuredClone(graph)});mocks.update.mockResolvedValue({count:1});mocks.audit.mockResolvedValue({});});
  it("nega lettura e modifica a clienti non operatori",async()=>{mocks.getUser.mockResolvedValue({data:{user:{id:"customer"}}});expect((await GET()).status).toBe(403);expect((await PATCH(request())).status).toBe(403);expect(mocks.update).not.toHaveBeenCalled();});
  it("nega richieste cross-origin",async()=>{expect((await PATCH(request({},"https://untrusted.example"))).status).toBe(403);expect(mocks.update).not.toHaveBeenCalled();});
  it("impedisce di certificare assenza senza fonte",async()=>{expect((await PATCH(request({node:{name:"Fiordilatte",status:"NONE_CONFIRMED",allergens:[],components:[]}}))).status).toBe(400);expect(mocks.update).not.toHaveBeenCalled();});
  it("non sovrascrive una versione più recente",async()=>{expect((await PATCH(request({version:2}))).status).toBe(409);expect(mocks.audit).not.toHaveBeenCalled();});
  it("registra modifica, fonte, autore e nuova versione insieme",async()=>{expect((await PATCH(request())).status).toBe(200);expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({where:{id:"current",version:1}}));const audit=mocks.audit.mock.calls[0][0].data;expect(audit.version).toBe(2);expect(audit.actorId).toBe("operator");expect(audit.after.nodes.Fiordilatte.allergens).toEqual([6,7]);expect(audit.before.nodes.Fiordilatte.allergens).toEqual([7]);});
  it("rifiuta cicli senza scrivere",async()=>{expect((await PATCH(request({node:{...graph.nodes.Fiordilatte,components:["Fiordilatte"]}}))).status).toBe(400);expect(mocks.update).not.toHaveBeenCalled();});
});
