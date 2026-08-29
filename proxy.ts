import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Supabase deve aggiornare i cookie di sessione anche sulle route cliente
  // e sulle API: altrimenti il browser è loggato ma il server vede un guest.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
