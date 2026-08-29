"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type FeedbackState = { orderNumber: number; submitted: boolean; expired: boolean };

export default function FeedbackPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<FeedbackState | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ positive: boolean } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/feedback/${token}`)
      .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
      .then(({ ok, data }) => ok ? setState(data) : setError(data.error ?? "Link non valido"))
      .catch(() => setError("Non riusciamo a caricare questa valutazione."));
  }, [token]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rating) return setError("Seleziona una valutazione da 1 a 5 stelle.");
    setLoading(true);
    setError("");
    const response = await fetch(`/api/feedback/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ overallRating: rating, comment: comment || undefined }),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) return setError(data.error ?? "Non è stato possibile inviare il feedback.");
    setResult(data);
  }

  if (result) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-warm-light px-5 py-12 text-center text-charcoal">
        <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-sm sm:p-12">
          <p className="text-5xl">{result.positive ? "🍕" : "💛"}</p>
          <h1 className="mt-5 font-display text-4xl">Grazie davvero!</h1>
          <p className="mt-4 font-body text-sm leading-relaxed text-charcoal/60">
            Il tuo feedback ci aiuta a rendere La Teglieria sempre migliore.
          </p>
          {result.positive && (
            <a href="https://g.page/r/CW1blgo1a4szECE/review" target="_blank" rel="noopener noreferrer" className="mt-7 inline-flex rounded-full bg-terracotta px-6 py-3 text-xs font-bold uppercase tracking-widest text-white">
              Raccontalo anche su Google ↗
            </a>
          )}
          <Link href="/" className="mt-6 block text-xs font-bold uppercase tracking-widest text-charcoal/40">Torna al sito</Link>
        </div>
      </main>
    );
  }

  if (error || state?.expired || state?.submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-warm-light px-5 py-12 text-center text-charcoal">
        <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-sm sm:p-12">
          <h1 className="font-display text-4xl">Valutazione non disponibile</h1>
          <p className="mt-4 font-body text-sm leading-relaxed text-charcoal/60">{error || (state?.submitted ? "Hai già inviato il tuo feedback, grazie!" : "Questo link è scaduto.")}</p>
          <Link href="/" className="mt-7 inline-flex rounded-full bg-charcoal px-6 py-3 text-xs font-bold uppercase tracking-widest text-white">Torna al sito</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-warm-light px-5 py-12 text-charcoal">
      <form onSubmit={submit} className="w-full max-w-md rounded-[2rem] bg-white p-7 shadow-sm sm:p-10">
        <p className="text-center text-[10px] font-bold uppercase tracking-[0.3em] text-terracotta">La Teglieria · Ordine #{state?.orderNumber ?? "…"}</p>
        <h1 className="mt-4 text-center font-display text-4xl leading-none">Com&apos;è andata?</h1>
        <p className="mt-4 text-center font-body text-sm leading-relaxed text-charcoal/60">Bastano 30 secondi per aiutarci a migliorare.</p>
        <div className="mt-8 flex justify-center gap-1" aria-label="Valutazione da 1 a 5 stelle">
          {[1, 2, 3, 4, 5].map((value) => (
            <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${value} stelle`} className={`p-1 text-3xl transition-transform hover:scale-110 ${value <= rating ? "text-marigold" : "text-charcoal/15"}`}>★</button>
          ))}
        </div>
        <label className="mt-8 block text-xs font-bold uppercase tracking-widest text-charcoal/50">Vuoi aggiungere qualcosa? <span className="font-normal normal-case tracking-normal">(facoltativo)</span>
          <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={2000} rows={4} className="mt-2 w-full rounded-2xl border border-charcoal/10 bg-warm-light/40 p-4 text-sm font-normal normal-case tracking-normal outline-none focus:border-terracotta" placeholder="Cosa ti è piaciuto? Cosa possiamo migliorare?" />
        </label>
        {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}
        <button disabled={loading || !state} className="mt-6 w-full rounded-full bg-terracotta px-6 py-4 text-xs font-bold uppercase tracking-widest text-white disabled:opacity-50">{loading ? "Invio…" : "Invia valutazione"}</button>
      </form>
    </main>
  );
}
