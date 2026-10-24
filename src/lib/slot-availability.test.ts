import { describe, expect, it } from "vitest";
import { fetchSlotDays, resolveSlotDays, SLOT_VERIFICATION_ERROR, type DayResult } from "./slot-availability";
const days = ["2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"];
const slot = { time: "20:00", available: true, remaining: 3 };
const good = () => ({ slots: [slot] });
const healthy = (): DayResult[] => days.map(date => ({ date, data: good() }));
const mock = (fn: (date: string, init?: RequestInit) => Promise<Response>) =>
  ((input: RequestInfo | URL, init?: RequestInit) => fn(new URL(String(input), "http://localhost").searchParams.get("date")!, init)) as typeof fetch;

describe("checkout slot verification", () => {
  it("retains verified selected day despite future day HTTP failure (regression)", async () => {
    const response = await fetchSlotDays(days, days[0], "ASPORTO", "[]", new AbortController().signal,
      mock(async date => date === days[4] ? new Response("unavailable", {status:503}) : Response.json(good())));
    const result = resolveSlotDays(response, days[0]);
    expect(result.slots).toEqual([slot]); expect(result.date).toBe(days[0]); expect(result.error).toBe("");
    expect(result.unavailableDays.has(days[4])).toBe(false);
  });
  it("keeps failed selected date unknown and prevents checkout using unverified slots", () => {
    const data = healthy(); data[0].data = null;
    const result = resolveSlotDays(data, days[0]);
    expect(result.slots).toEqual([]); expect(result.error).toBe(SLOT_VERIFICATION_ERROR);
    expect(result.date).toBe(days[0]); expect(result.dayClosed).toBe(false);
    expect(result.closedDays.has(days[0])).toBe(false); expect(result.unavailableDays.has(days[0])).toBe(false);
  });
  it("shows temporary failure instead of sold out when every request fails", () => {
    const result = resolveSlotDays(days.map(date => ({date,data:null})), days[0]);
    expect(result.error).toBe(SLOT_VERIFICATION_ERROR); expect(result.dayClosed).toBe(false);
  });
  it("falls forward only when selected date is confirmed full or closed", () => {
    const data = healthy(); data[0].data = { slots: [], closed: true };
    const result = resolveSlotDays(data, days[0]);
    expect(result.date).toBe(days[1]); expect(result.slots).toEqual([slot]);
    expect(result.closedDays.has(days[0])).toBe(true);
  });
  it("retains genuine stock/capacity explanations and distinguishes verified sold out", () => {
    const data = days.map(date => ({date,data:{slots:[],unavailableReason:"STOCK_UNAVAILABLE",message:"Scorte insufficienti"}}));
    const result = resolveSlotDays(data,days[0]);
    expect(result.dayClosed).toBe(true);expect(result.message).toBe("Scorte insufficienti");expect(result.error).toBe("");
  });
  it("rejects malformed or non-JSON responses without erasing another day", async () => {
    for (const body of ["invalid", JSON.stringify({slots:"invalid"}), JSON.stringify({slots:[{time:"20:00"}]})]) {
      const results = await fetchSlotDays(days,days[0],"DELIVERY","[]",new AbortController().signal,
        mock(async date => date === days[1] ? new Response(body) : Response.json(good())));
      expect(results[1].data).toBe(null);expect(resolveSlotDays(results,days[0]).slots).toEqual([slot]);
    }
  });
  it("recovers on retry without preserving a stale availability error", async () => {
    const signal = new AbortController().signal;
    const failed = await fetchSlotDays(days,days[0],"ASPORTO","[]",signal,mock(async()=>new Response("",{status:500})));
    expect(resolveSlotDays(failed,days[0]).error).not.toBe("");
    const recovered = await fetchSlotDays(days,days[0],"ASPORTO","[]",signal,mock(async()=>Response.json(good())));
    expect(resolveSlotDays(recovered,days[0]).error).toBe("");
    expect(resolveSlotDays(recovered,days[0]).slots).toEqual([slot]);
  });
  it("limits concurrency to two and prioritizes the selected date", async () => {
    let active=0,max=0;const called:string[]=[];
    await fetchSlotDays(days,days[5],"ASPORTO","[]",new AbortController().signal,mock(async date=>{
      called.push(date);active++;max=Math.max(max,active);
      await new Promise(resolve=>setTimeout(resolve,2));active--;return Response.json(good());
    }));
    expect(called[0]).toBe(days[5]);expect(max).toBe(2);expect(called).toHaveLength(7);
  });
  it("aborts abandoned queries and never starts the remaining queued requests", async () => {
    const controller = new AbortController();let calls=0;
    const result = fetchSlotDays(days,days[0],"ASPORTO","[]",controller.signal,mock(async(_,init)=>{
      calls++;return new Promise((_,reject)=>init?.signal?.addEventListener("abort",()=>reject(new Error("aborted")),{once:true}));
    }));
    controller.abort();const data=await result;
    expect(calls).toBe(2);expect(data.every(r=>r.data===null)).toBe(true);
  });
  it("times out a stalled date without losing successful dates", async () => {
    const results = await fetchSlotDays(days,days[0],"ASPORTO","[]",new AbortController().signal,mock(async(date,init)=>{
      if(date!==days[1])return Response.json(good());
      return new Promise((_,reject)=>init?.signal?.addEventListener("abort",()=>reject(new Error("timeout")),{once:true}));
    }),10);
    expect(results[1].data).toBe(null);expect(resolveSlotDays(results,days[0]).slots).toEqual([slot]);
  });
  it("does not couple slot queries to Stripe/cash choice or send payment details", async () => {
    for (const type of ["ASPORTO","DELIVERY"]) {
      const urls:string[]=[];
      const fetcher = (async(input: RequestInfo|URL)=>{urls.push(String(input));return Response.json(good());}) as typeof fetch;
      const result=await fetchSlotDays(days,days[0],type,'[{"productId":"test","quantity":1}]',new AbortController().signal,fetcher);
      expect(resolveSlotDays(result,days[0]).slots).toEqual([slot]);
      expect(urls.every(url=>!url.includes("STRIPE")&&!url.includes("CONTANTI")&&!url.includes("payment"))).toBe(true);
    }
  });
});
