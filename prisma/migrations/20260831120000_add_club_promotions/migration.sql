CREATE TABLE "ClubPromotion" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(8,2) NOT NULL,
    "imageUrl" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClubPromotion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClubPromotionItem" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "ClubPromotionItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClubPromotionItem_promotionId_productId_key" ON "ClubPromotionItem"("promotionId", "productId");
CREATE INDEX "ClubPromotion_active_startsAt_endsAt_idx" ON "ClubPromotion"("active", "startsAt", "endsAt");
ALTER TABLE "ClubPromotionItem" ADD CONSTRAINT "ClubPromotionItem_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "ClubPromotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubPromotionItem" ADD CONSTRAINT "ClubPromotionItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
