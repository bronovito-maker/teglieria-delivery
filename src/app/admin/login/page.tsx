"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "unauthorized") {
      setError("Non hai i permessi per accedere al pannello admin.");
    }
  }, []);

  useEffect(() => {
    async function checkSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        router.replace("/admin/dashboard");
      }
    }
    checkSession();
  }, [router, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const authClient = createClient({ persistSession: rememberMe });
    const { error } = await authClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Login attempt failed:", error);
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/admin/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-warm-light p-6">
      <div className="reveal active w-full max-w-lg p-12 md:p-16 bg-white/70 backdrop-blur-2xl rounded-[3rem] border border-charcoal/5 shadow-2xl">
        <div className="text-center mb-12">
          <span className="text-[10px] font-brand font-bold uppercase tracking-[0.4em] text-terracotta/60 mb-6 block px-4 py-1.5 border border-terracotta/20 rounded-full bg-white/50 w-fit mx-auto">
            Area Riservata
          </span>
          <h1 className="text-4xl md:text-5xl font-brand font-medium uppercase tracking-tight text-charcoal">
            Admin <span className="text-terracotta">Login.</span>
          </h1>
          <p className="font-body italic text-charcoal/40 mt-4 tracking-widest uppercase text-[10px]">Autenticazione Richiesta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] uppercase font-brand font-bold tracking-[0.2em] text-charcoal/30 ml-4">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-8 py-5 bg-white border border-charcoal/5 rounded-full font-body italic text-sm focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta outline-none transition-all placeholder:text-charcoal/20 shadow-sm"
              placeholder="admin@lateglieria.it"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] uppercase font-brand font-bold tracking-[0.2em] text-charcoal/30 ml-4">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-8 py-5 bg-white border border-charcoal/5 rounded-full font-body italic text-sm focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta outline-none transition-all placeholder:text-charcoal/20 shadow-sm"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="flex items-center justify-between px-4 py-2">
             <span className="text-[10px] uppercase font-brand font-bold tracking-widest text-charcoal/40 italic">Rimani Connesso</span>
             <button
               type="button"
               role="switch"
               aria-checked={rememberMe}
               onClick={() => setRememberMe((prev) => !prev)}
               className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                 rememberMe ? "bg-terracotta" : "bg-charcoal/10"
               }`}
             >
               <span
                 className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                   rememberMe ? "translate-x-6" : "translate-x-1"
                 }`}
               />
             </button>
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
            {loading ? "Verifica in corso..." : "Accedi alla Console"}
          </button>
        </form>
      </div>
    </div>
  );
}
