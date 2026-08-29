CREATE TABLE "ClubCard" (
    "id" TEXT NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "authUserId" TEXT NOT NULL,
    "memberName" TEXT,
    "memberEmail" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClubCard_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClubCard_cardNumber_key" ON "ClubCard"("cardNumber");
CREATE UNIQUE INDEX "ClubCard_authUserId_key" ON "ClubCard"("authUserId");

ALTER TABLE "Order" ADD COLUMN "clubCardId" TEXT;
CREATE INDEX "Order_clubCardId_idx" ON "Order"("clubCardId");
ALTER TABLE "Order" ADD CONSTRAINT "Order_clubCardId_fkey" FOREIGN KEY ("clubCardId") REFERENCES "ClubCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
