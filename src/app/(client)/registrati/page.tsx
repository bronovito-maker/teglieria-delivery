"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    // Pre-compila dai parametri URL (provenienti dal banner post-ordine)
    const n = searchParams.get("name") || "";
    const e = searchParams.get("email") || "";
    const p = searchParams.get("phone") || "";
    if (n) setName(n);
    if (e) setEmail(e);
    if (p) setPhone(p);
  }, [searchParams]);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleOAuth(provider: "google") {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?type=customer&next=/ordine`,
      },
    });
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: "customer", full_name: name, phone },
      },
    });

    if (authError) {
      const msg = authError.message.toLowerCase();
      if (msg.includes("already registered") || msg.includes("already been registered") || authError.status === 422) {
        setError("EMAIL_EXISTS");
      } else {
        setError(authError.message);
      }
      setLoading(false);
      return;
    }

    // Send branded welcome email
    fetch("/api/customer/welcome", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name }),
    }).catch(() => {});

    setDone(true);
    setLoading(false);
  }

  if (done) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="text-5xl">📬</div>
          <h1 className="text-3xl font-display tracking-tight text-charcoal">
            Controlla la <span className="text-terracotta">Email!</span>
          </h1>
          <p className="font-body italic text-charcoal/50 leading-relaxed">
            Abbiamo inviato un link di conferma a <strong className="not-italic text-charcoal">{email}</strong>.<br />
            Clicca il link per attivare il tuo account.
          </p>
          <Link
            href="/accedi"
            className="inline-block px-8 py-4 bg-charcoal text-white rounded-2xl font-brand font-bold uppercase tracking-widest text-[11px] hover:bg-terracotta transition-all"
          >
            Vai al Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div>
          <span className="text-[10px] font-brand font-bold uppercase tracking-[0.4em] text-terracotta/60 mb-3 block">
            Nuovo Account
          </span>
          <h1 className="text-4xl font-display tracking-tight text-charcoal">
            Registrati<span className="text-terracotta">.</span>
          </h1>
          <p className="font-body italic text-charcoal/40 mt-2 text-sm">
            Ordina più velocemente con i dati salvati.
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-brand font-bold uppercase tracking-[0.2em] text-charcoal/40 ml-1 block">
              Nome e Cognome
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mario Rossi"
              autoComplete="name"
              className="w-full px-5 py-4 bg-white/80 border border-charcoal/10 rounded-2xl font-body text-sm text-charcoal focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta outline-none transition-all placeholder:text-charcoal/20 min-h-[52px]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-brand font-bold uppercase tracking-[0.2em] text-charcoal/40 ml-1 block">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="mario@esempio.it"
              autoComplete="email"
              className="w-full px-5 py-4 bg-white/80 border border-charcoal/10 rounded-2xl font-body text-sm text-charcoal focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta outline-none transition-all placeholder:text-charcoal/20 min-h-[52px]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-brand font-bold uppercase tracking-[0.2em] text-charcoal/40 ml-1 block">
              Telefono
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="333 123 4567"
              autoComplete="tel"
              className="w-full px-5 py-4 bg-white/80 border border-charcoal/10 rounded-2xl font-body text-sm text-charcoal focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta outline-none transition-all placeholder:text-charcoal/20 min-h-[52px]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-brand font-bold uppercase tracking-[0.2em] text-charcoal/40 ml-1 block">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 caratteri"
                autoComplete="new-password"
                className="w-full px-5 py-4 pr-14 bg-white/80 border border-charcoal/10 rounded-2xl font-body text-sm text-charcoal focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta outline-none transition-all placeholder:text-charcoal/20 min-h-[52px]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-charcoal/30 hover:text-charcoal/60 transition-colors p-1"
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

          {error === "EMAIL_EXISTS" ? (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-center space-y-2">
              <p className="text-[11px] text-amber-700 font-brand font-bold uppercase tracking-widest">
                Hai già un account con questa email
              </p>
              <a
                href={`/accedi?next=/account/orders`}
                className="inline-block text-sm font-semibold text-terracotta hover:underline"
              >
                Accedi al tuo account →
              </a>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
              <p className="text-[11px] text-red-600 font-brand font-bold uppercase tracking-widest text-center">{error}</p>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-charcoal text-white rounded-2xl font-brand font-bold uppercase tracking-[0.25em] text-[11px] shadow-xl shadow-charcoal/20 hover:bg-terracotta active:scale-95 disabled:opacity-50 transition-all min-h-[52px] flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creazione account...
              </>
            ) : "Crea Account"}
          </button>
        </form>

        {/* OAuth */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-charcoal/10" />
            <span className="text-[10px] font-brand font-bold uppercase tracking-widest text-charcoal/25">oppure</span>
            <div className="flex-1 h-px bg-charcoal/10" />
          </div>
          <button
            type="button"
            onClick={() => handleOAuth("google")}
            className="w-full py-3.5 bg-white border border-charcoal/10 rounded-2xl font-brand font-bold uppercase tracking-[0.15em] text-[11px] text-charcoal hover:border-charcoal/25 active:scale-95 transition-all min-h-[52px] flex items-center justify-center gap-3 shadow-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Registrati con Google
          </button>
        </div>

        <p className="text-center text-[11px] font-brand font-bold uppercase tracking-widest text-charcoal/30">
          Hai già un account?{" "}
          <Link href="/accedi" className="text-terracotta hover:underline">
            Accedi
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
