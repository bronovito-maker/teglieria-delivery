import { createClient } from "@supabase/supabase-js";

/**
 * Client con service role — solo server-side, mai esporre al client.
 * Usato per: generare magic link, operazioni admin Supabase Auth.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
