import type { CookieOptions } from "@supabase/ssr";

// Browser, route handlers e proxy devono usare esattamente la stessa
// rappresentazione della sessione. In particolare, il client browser deve
// poter leggere i cookie per sincronizzarsi con il server SSR.
export const SUPABASE_COOKIE_OPTIONS: CookieOptions = {
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  // The browser Supabase client must read its session cookie in this shared
  // configuration. Sensitive mutations are protected by strict Origin checks.
  httpOnly: false,
};

export const SUPABASE_COOKIE_ENCODING = "base64url" as const;
