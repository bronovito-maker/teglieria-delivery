import { createBrowserClient } from "@supabase/ssr";

type BrowserClientOptions = {
  persistSession?: boolean;
};

export function createClient(options?: BrowserClientOptions) {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: options?.persistSession ?? true,
      },
    }
  );
}
