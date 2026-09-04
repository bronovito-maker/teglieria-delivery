import type { CookieOptions } from "@supabase/ssr";

// Browser, route handlers e proxy devono usare esattamente la stessa
// rappresentazione della sessione. In particolare, il client browser deve
// poter leggere i cookie per sincronizzarsi con il server SSR.
export const SUPABASE_COOKIE_OPTIONS: CookieOptions = {
  path: "/",
  sameSite: "lax",
  httpOnly: false,
};

export const SUPABASE_COOKIE_ENCODING = "base64url" as const;
