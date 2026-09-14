import { safeEqual } from "@/lib/request-security";

type AuthClient = {
  signInWithPassword(credentials: { email: string; password: string }): Promise<{
    data: { user: { id: string } | null };
    error: unknown;
  }>;
};

export type DeleteVerificationResult =
  | { ok: true; method: "reauth" | "server-secret" }
  | { ok: false; code: "CREDENTIAL_REQUIRED" | "CREDENTIAL_INVALID" | "VERIFICATION_NOT_CONFIGURED" };

export async function verifyAdminDeletionCredential(input: {
  auth: AuthClient;
  user: { id: string; email?: string | null };
  credential?: string;
}): Promise<DeleteVerificationResult> {
  if (!input.credential) return { ok: false, code: "CREDENTIAL_REQUIRED" };
  const mode = process.env.ADMIN_ORDER_DELETE_VERIFICATION_MODE?.trim().toLowerCase() || "reauth";

  if (mode === "server-secret") {
    const secret = process.env.ADMIN_ORDER_DELETE_PASSWORD;
    if (!secret) return { ok: false, code: "VERIFICATION_NOT_CONFIGURED" };
    return safeEqual(input.credential, secret)
      ? { ok: true, method: "server-secret" }
      : { ok: false, code: "CREDENTIAL_INVALID" };
  }
  if (mode !== "reauth" || !input.user.email) return { ok: false, code: "VERIFICATION_NOT_CONFIGURED" };

  const { data, error } = await input.auth.signInWithPassword({ email: input.user.email, password: input.credential });
  if (error || data.user?.id !== input.user.id) return { ok: false, code: "CREDENTIAL_INVALID" };
  return { ok: true, method: "reauth" };
}
