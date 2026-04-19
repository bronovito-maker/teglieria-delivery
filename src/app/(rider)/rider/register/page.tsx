"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RiderRegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1. Verifica che l'email sia stata pre-approvata dall'admin
    const checkRes = await fetch("/api/rider/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, checkOnly: true }),
    });
    if (!checkRes.ok) {
      const data = await checkRes.json().catch(() => ({}));
      setError(data.error ?? "Email non autorizzata. Contatta lo staff.");
      setLoading(false);
      return;
    }

    // 2. Crea account Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: "rider", full_name: name } },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // 3. Collega authUserId al record rider esistente
    if (authData.user) {
      const res = await fetch("/api/rider/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authUserId: authData.user.id, name, email, phone }),
      });

      if (res.ok) {
        router.push("/rider/login?message=Registrazione completata! Puoi accedere con email e password.");
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Errore durante la creazione del profilo.");
        await supabase.auth.signOut();
      }
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-warm-light p-6">
      <div className="reveal active w-full max-w-lg p-12 md:p-16 bg-white/70 backdrop-blur-2xl rounded-[3rem] border border-charcoal/5 shadow-2xl">
        <div className="text-center mb-12">
          <span className="text-[10px] font-brand font-bold uppercase tracking-[0.4em] text-marigold mb-6 block px-4 py-1.5 border border-marigold/20 rounded-full bg-white/50 w-fit mx-auto">
            Nuova Collaborazione
          </span>
          <h1 className="text-4xl md:text-5xl font-display tracking-tight text-charcoal">
            Unisciti al <span className="text-terracotta">Team.</span>
          </h1>
          <p className="font-body italic text-charcoal/40 mt-4 tracking-widest uppercase text-[10px]">Crea il tuo profilo Rider</p>
        </div>
        
        <form onSubmit={handleRegister} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] uppercase font-brand font-bold tracking-[0.2em] text-charcoal/30 ml-4">
              Nome Completo
            </label>
            <input
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-8 py-5 bg-white border border-charcoal/5 rounded-full font-body italic text-sm focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta outline-none transition-all placeholder:text-charcoal/20 shadow-sm"
              placeholder="Mario Rossi"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] uppercase font-brand font-bold tracking-[0.2em] text-charcoal/30 ml-4">
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-8 py-5 bg-white border border-charcoal/5 rounded-full font-body italic text-sm focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta outline-none transition-all placeholder:text-charcoal/20 shadow-sm"
              placeholder="rider@lateglieria.it"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] uppercase font-brand font-bold tracking-[0.2em] text-charcoal/30 ml-4">
              Telefono
            </label>
            <input
              type="tel"
              required
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-8 py-5 bg-white border border-charcoal/5 rounded-full font-body italic text-sm focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta outline-none transition-all placeholder:text-charcoal/20 shadow-sm"
              placeholder="333 1234567"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] uppercase font-brand font-bold tracking-[0.2em] text-charcoal/30 ml-4">
              Password
            </label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-8 py-5 bg-white border border-charcoal/5 rounded-full font-body italic text-sm focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta outline-none transition-all placeholder:text-charcoal/20 shadow-sm"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 rounded-2xl border border-red-100 animate-in slide-in-from-top-2">
              <p className="text-[11px] text-red-600 font-brand font-bold uppercase tracking-widest text-center">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-6 bg-charcoal text-white rounded-full font-brand font-bold uppercase tracking-[0.3em] text-[10px] shadow-2xl shadow-charcoal/30 hover:bg-terracotta hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all mt-6"
          >
            {loading ? "Creazione profilo..." : "Invia Candidatura"}
          </button>
        </form>

        <p className="mt-10 text-center text-[10px] font-brand font-bold uppercase tracking-widest text-charcoal/40">
          Hai già un account? <a href="/rider/login" className="text-terracotta hover:underline">Accedi</a>
        </p>
      </div>
    </div>
  );
}
