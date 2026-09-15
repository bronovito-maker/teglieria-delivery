-- Existing queued orders retain their immutable v0 payload.
ALTER TABLE "GestionaleOrder" ADD COLUMN "payloadVersion" INTEGER NOT NULL DEFAULT 0;
