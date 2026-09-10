const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escape untrusted text before placing it in an HTML text or attribute context. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (character) => HTML_ESCAPE_MAP[character]);
}

/** Return an escaped HTTP(S) URL, or null for unsafe/malformed values. */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return escapeHtml(url.toString());
  } catch {
    return null;
  }
}
