type UserLike = {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
} | null;

function readCsvEnv(name: string): string[] {
  const value = process.env[name];
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim().replace(/^['"]|['"]$/g, "").toLowerCase())
    .filter(Boolean);
}

export function getUserRole(user: UserLike): string | null {
  if (!user) return null;
  const metaRole = user.user_metadata?.role;
  if (typeof metaRole === "string" && metaRole.trim()) return metaRole.trim().toLowerCase();
  const appRole = user.app_metadata?.role;
  if (typeof appRole === "string" && appRole.trim()) return appRole.trim().toLowerCase();
  return null;
}

export function isAdminRbacStrictEnabled(): boolean {
  return String(process.env.ADMIN_RBAC_STRICT || "true").toLowerCase() !== "false";
}

export function isAdminUser(user: UserLike): boolean {
  if (!user) return false;
  const role = getUserRole(user);
  if (role === "admin") return true;
  const adminAllowlist = readCsvEnv("ADMIN_ALLOWLIST_EMAILS");
  const email = user.email?.toLowerCase();
  return Boolean(email && adminAllowlist.includes(email));
}

export function isOperatorUser(user: UserLike): boolean {
  if (!user) return false;
  if (isAdminUser(user)) return true;
  const role = getUserRole(user);
  if (role === "operator") return true;
  const operatorAllowlist = readCsvEnv("OPERATOR_ALLOWLIST_EMAILS");
  const email = user.email?.toLowerCase();
  return Boolean(email && operatorAllowlist.includes(email));
}

export function hasAdminPanelAccess(user: UserLike): boolean {
  if (!user) return false;
  if (!isAdminRbacStrictEnabled()) return true;
  return isOperatorUser(user);
}
