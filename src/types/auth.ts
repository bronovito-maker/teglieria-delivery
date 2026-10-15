export type User = { id: string; email?: string; app_metadata: Record<string, unknown>; user_metadata: Record<string, string> };
export type Session = { user: User };
export type AuthError = { message: string };
