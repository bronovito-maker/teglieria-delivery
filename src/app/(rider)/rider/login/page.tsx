"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RiderLoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [redirectTo, setRedirectTo] = useState("/rider/dashboard");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setMessage(params.get("message"));
    setRedirectTo(params.get("next") || "/rider/dashboard");
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // After login, redirect to a dashboard or the pending order if any
    router.push(redirectTo);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-warm-light p-6">
      <div className="reveal active w-full max-w-lg p-12 md:p-16 bg-white/70 backdrop-blur-2xl rounded-[3rem] border border-charcoal/5 shadow-2xl">
        <div className="text-center mb-12">
          <span className="text-[10px] font-brand font-bold uppercase tracking-[0.4em] text-marigold mb-6 block px-4 py-1.5 border border-marigold/20 rounded-full bg-white/50 w-fit mx-auto">
            Rider Community
          </span>
          <h1 className="text-4xl md:text-5xl font-brand font-medium uppercase tracking-tight text-charcoal">
            Rider <span className="text-terracotta">Login.</span>
          </h1>
          <p className="font-body italic text-charcoal/40 mt-4 tracking-widest uppercase text-[10px]">Gestisci le tue consegne</p>
        </div>
        
        {message && (
          <div className="mb-8 p-4 bg-terracotta/5 border border-terracotta/10 rounded-2xl text-[11px] font-brand font-bold uppercase tracking-widest text-terracotta text-center">
            {message}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] uppercase font-brand font-bold tracking-[0.2em] text-charcoal/30 ml-4">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-8 py-5 bg-white border border-charcoal/5 rounded-full font-body italic text-sm focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta outline-none transition-all placeholder:text-charcoal/20 shadow-sm"
              placeholder="rider@lateglieria.it"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] uppercase font-brand font-bold tracking-[0.2em] text-charcoal/30 ml-4">
              Password
            </label>
            <input
              type="password"
              required
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
            {loading ? "Verifica in corso..." : "Entra in Servizio"}
          </button>
        </form>

        <p className="mt-10 text-center text-[10px] font-brand font-bold uppercase tracking-widest text-charcoal/40">
          Non hai ancora un account? <a href="/rider/register" className="text-terracotta hover:underline">Unisciti al team</a>
        </p>
      </div>
    </div>
  );
}
