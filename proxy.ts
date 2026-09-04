import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Supabase deve aggiornare i cookie di sessione anche sulle route cliente
  // e sulle API: altrimenti il browser è loggato ma il server vede un guest.
  // Gli endpoint auth gestiscono direttamente i propri cookie: evitare che
  // una seconda istanza server legga/aggiorni la sessione nello stesso giro.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth/password|api/auth/callback|api/auth/session|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
