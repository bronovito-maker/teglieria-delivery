ALTER TABLE "OrderItem" ADD COLUMN "allergenSnapshot" JSONB;
CREATE TABLE "AllergenRegistry" (
  "id" TEXT NOT NULL DEFAULT 'current', "version" INTEGER NOT NULL DEFAULT 1,
  "data" JSONB NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AllergenRegistry_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AllergenAudit" (
  "id" TEXT NOT NULL, "version" INTEGER NOT NULL, "actorId" TEXT NOT NULL,
  "reason" TEXT NOT NULL, "before" JSONB NOT NULL, "after" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AllergenAudit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AllergenAudit_version_key" ON "AllergenAudit"("version");
ALTER TABLE "AllergenRegistry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AllergenAudit" ENABLE ROW LEVEL SECURITY;
