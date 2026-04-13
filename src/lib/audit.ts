type AuditPayload = {
  action: string;
  entity: string;
  entityId?: string;
  actorEmail?: string | null;
  actorId?: string | null;
  metadata?: Record<string, unknown>;
};

export function writeAuditLog(payload: AuditPayload) {
  console.info(
    "[AUDIT]",
    JSON.stringify({
      at: new Date().toISOString(),
      ...payload,
    })
  );
}
