'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { answerCustomer, ASSISTANT_TOPICS, type AssistantReply } from '@/lib/customer-assistant';
export default function CustomerAssistant() {
  const [open, setOpen] = useState(false), [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{ question?: string; answer: AssistantReply }>>([]);
  const field = useRef<HTMLInputElement>(null), log = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useEffect(() => { if (open) field.current?.focus(); }, [open]);
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight }); }, [messages]);
  useEffect(() => { setOpen(false); }, [pathname]);
  const send = (question: string) => {
    if (!question.trim()) return;
    setMessages(old => [...old.slice(-14), { question: question.trim().slice(0,600), answer: answerCustomer(question) }]);setInput('');
  };
  if (/^\/(admin|rider)(\/|$)/.test(pathname)) return null;
  return <aside className="fixed bottom-4 right-4 z-40 max-w-[calc(100vw-2rem)]" aria-label="Assistente La Teglieria">
    {open && <section className="mb-3 flex max-h-[75dvh] w-96 max-w-full flex-col overflow-hidden rounded-2xl border border-charcoal/20 bg-white shadow-xl" aria-label="Chat informativa" onKeyDown={e => { if(e.key==='Escape')setOpen(false); }}>
      <header className="flex items-center justify-between border-b p-4"><strong>Ti aiutiamo a scegliere</strong><button type="button" onClick={()=>setOpen(false)} aria-label="Chiudi assistente" className="rounded px-3 py-2">✕</button></header>
      <div ref={log} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4" role="log" aria-live="polite" aria-relevant="additions">
        <p className="text-sm">Ciao! Mezza teglia: circa 2 persone, fino a 2 gusti. Intera: circa 4 persone, fino a 4 gusti. Chiedimi come prenotare!</p>
        {messages.map((m,i)=><div key={i} className="space-y-2"><p className="rounded-lg bg-orange-50 p-3 text-sm"><strong>Tu: </strong>{m.question}</p><div className="rounded-lg bg-stone-50 p-3 text-sm"><p className="whitespace-pre-line">{m.answer.text}</p>{m.answer.link && <a className="mt-3 inline-block font-bold underline" href={m.answer.link.href}>{m.answer.link.label}</a>}</div></div>)}
      </div>
      <div className="flex flex-wrap gap-2 px-4 pb-3">{ASSISTANT_TOPICS.map(topic=><button type="button" className="rounded-full border px-3 py-2 text-xs" key={topic} onClick={()=>send(topic)}>{topic}</button>)}</div>
      <form className="flex gap-2 border-t p-3" onSubmit={e=>{e.preventDefault();send(input);}}><input ref={field} maxLength={600} value={input} onChange={e=>setInput(e.target.value)} aria-label="La tua domanda" placeholder="Scrivi la tua domanda…" className="min-w-0 flex-1 rounded border p-2 text-base"/><button type="submit" disabled={!input.trim()} className="rounded bg-charcoal px-4 py-2 text-white disabled:opacity-40">Invia</button></form>
      <p className="px-4 pb-3 text-xs text-stone-600">Assistenza informativa. Nessun ordine viene creato in chat. <button type="button" className="underline" onClick={()=>setMessages([])}>Cancella conversazione</button></p>
    </section>}
    <button type="button" aria-expanded={open} onClick={()=>setOpen(!open)} className="float-right rounded-full bg-charcoal px-5 py-3 font-bold text-white shadow-lg">{open?'Chiudi aiuto':'Hai bisogno di aiuto?'}</button>
  </aside>;
}
