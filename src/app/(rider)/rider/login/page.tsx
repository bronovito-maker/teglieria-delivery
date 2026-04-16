"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RiderLoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [redirectTo, setRedirectTo] = useState("/rider/dashboard");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setMessage(params.get("message"));
    setRedirectTo(params.get("next") || "/rider/dashboard");
  }, []);

  useEffect(() => {
    async function checkSession() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) router.replace(redirectTo);
    }
    checkSession();
  }, [router, supabase, redirectTo]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError("Credenziali non valide. Riprova.");
      setLoading(false);
      return;
    }

    router.push(redirectTo);
  }

  return (
    <div className="admin-layout min-h-screen bg-warm-light flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white/60 backdrop-blur-2xl rounded-[2.5rem] border border-charcoal/5 shadow-2xl overflow-hidden">

          {/* Brand strip */}
          <div className="bg-charcoal flex items-center gap-4 px-7 py-6">
            <span className="text-3xl shrink-0">🛵</span>
            <div>
              <p className="text-[10px] font-logo font-bold text-terracotta uppercase tracking-[0.3em]">
                La Teglieria
              </p>
              <h2 className="text-2xl font-display tracking-wide text-white leading-tight">
                Area Rider
              </h2>
            </div>
          </div>

          {/* Form */}
          <div className="p-7">
            <div className="mb-7">
              <h1 className="text-4xl font-display tracking-tight text-charcoal">
                Rider <span className="text-terracotta">Login.</span>
              </h1>
              <p className="font-brand text-charcoal/30 mt-1 uppercase tracking-widest text-[10px]">
                Accedi per gestire le consegne
              </p>
            </div>

            {message && (
              <div className="mb-5 p-4 bg-terracotta/5 border border-terracotta/10 rounded-2xl text-[11px] font-brand font-bold uppercase tracking-widest text-terracotta text-center">
                {message}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-brand font-bold tracking-[0.2em] text-charcoal/40 ml-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-4 bg-warm-light/60 border border-charcoal/8 rounded-2xl font-brand text-sm text-charcoal focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta outline-none transition-all placeholder:text-charcoal/20 min-h-[52px]"
                  placeholder="rider@lateglieria.it"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-brand font-bold tracking-[0.2em] text-charcoal/40 ml-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-5 py-4 pr-14 bg-warm-light/60 border border-charcoal/8 rounded-2xl font-brand text-sm text-charcoal focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta outline-none transition-all placeholder:text-charcoal/20 min-h-[52px]"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-charcoal/30 hover:text-charcoal/60 transition-colors p-1"
                    aria-label={showPassword ? "Nascondi password" : "Mostra password"}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 rounded-2xl border border-red-100 animate-in slide-in-from-top-2">
                  <p className="text-[11px] text-red-600 font-brand font-bold uppercase tracking-widest text-center">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-charcoal text-white rounded-2xl font-brand font-bold uppercase tracking-[0.25em] text-[11px] shadow-xl shadow-charcoal/20 hover:bg-terracotta active:scale-95 disabled:opacity-50 transition-all min-h-[52px] flex items-center justify-center gap-3 mt-2"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Verifica in corso...
                  </>
                ) : (
                  "Entra in Servizio"
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-[10px] font-brand font-bold uppercase tracking-widest text-charcoal/30">
              Non hai un account?{" "}
              <a href="/rider/register" className="text-terracotta hover:underline">
                Unisciti al team
              </a>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
