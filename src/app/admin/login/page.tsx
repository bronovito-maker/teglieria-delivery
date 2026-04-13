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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white via-[#fff7f5] to-white p-6">
      <div className="w-full max-w-md p-8 md:p-10 bg-white/90 rounded-3xl border border-red-100/80 shadow-[0_20px_45px_rgba(31,38,135,0.1)]">
        <div className="text-center mb-8">
          <p className="text-[11px] md:text-xs font-bold uppercase tracking-[0.22em] text-[#cf2a1d]/80 mb-2">
            Area Riservata
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-[#1d1d1f]">La Teglieria Admin</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-red-100 rounded-xl focus:ring-2 focus:ring-[#cf2a1d] focus:border-[#cf2a1d] outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-red-100 rounded-xl focus:ring-2 focus:ring-[#cf2a1d] focus:border-[#cf2a1d] outline-none"
              required
            />
          </div>

          <label className="flex items-center justify-between gap-3 rounded-xl border border-red-100 px-4 py-2.5 bg-red-50/35">
            <span className="text-sm font-medium text-gray-700">Rimani connesso</span>
            <button
              type="button"
              role="switch"
              aria-checked={rememberMe}
              onClick={() => setRememberMe((prev) => !prev)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full p-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#cf2a1d]/40 ${
                rememberMe ? "bg-[#cf2a1d]" : "bg-gray-300"
              }`}
            >
              <span
                className={`h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
                  rememberMe ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </label>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-white rounded-xl font-semibold tomato-glass border hover:brightness-105 disabled:opacity-50 transition-all"
          >
            {loading ? "Accesso..." : "Accedi"}
          </button>
        </form>
      </div>
    </div>
  );
}
