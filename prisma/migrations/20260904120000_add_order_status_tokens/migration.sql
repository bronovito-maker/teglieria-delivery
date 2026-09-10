CREATE TABLE "OrderStatusToken" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrderStatusToken_tokenHash_key" ON "OrderStatusToken"("tokenHash");
CREATE INDEX "OrderStatusToken_orderId_expiresAt_idx" ON "OrderStatusToken"("orderId", "expiresAt");

ALTER TABLE "OrderStatusToken"
ADD CONSTRAINT "OrderStatusToken_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
