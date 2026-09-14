CREATE TABLE "GestionaleOrder" (
 "orderId" TEXT PRIMARY KEY REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "backendOrderId" TEXT UNIQUE,
 "backendVersion" INTEGER NOT NULL DEFAULT -1,
 "backendState" JSONB,
 "lastError" TEXT,
 "lastSyncedAt" TIMESTAMP(3),
 "nextPollAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "GestionaleOrder_nextPollAt_idx" ON "GestionaleOrder"("nextPollAt");
CREATE TABLE "GestionaleNonce" ("nonce" TEXT PRIMARY KEY,"expiresAt" TIMESTAMP(3) NOT NULL);
CREATE INDEX "GestionaleNonce_expiresAt_idx" ON "GestionaleNonce"("expiresAt");
ALTER TABLE "GestionaleOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GestionaleNonce" ENABLE ROW LEVEL SECURITY;

-- Owner-authorized stock choice only; no product, price or layout changes.
INSERT INTO "ProductVariant"("id","productId","name","priceDelta","active")
SELECT 'gestion-choice-' || p.id || '-' || options.n, p.id, options.choice, 0, true
FROM "Product" p JOIN (VALUES
('Estathé pesca o limone - brick', 'Estathé pesca', '1'),
('Estathé pesca o limone - brick', 'Estathé limone', '2'),
('Estathé pesca o limone - PET', 'Estathé pesca', '1'),
('Estathé pesca o limone - PET', 'Estathé limone', '2'),
('Coca-Cola, Coca-Cola Zero o Fanta - lattina', 'Coca-Cola', '1'),
('Coca-Cola, Coca-Cola Zero o Fanta - lattina', 'Coca-Cola Zero', '2'),
('Coca-Cola, Coca-Cola Zero o Fanta - lattina', 'Fanta', '3'),
('Coca-Cola, Coca-Cola Zero o Fanta Lemon - PET', 'Coca-Cola', '1'),
('Coca-Cola, Coca-Cola Zero o Fanta Lemon - PET', 'Coca-Cola Zero', '2'),
('Coca-Cola, Coca-Cola Zero o Fanta Lemon - PET', 'Fanta Lemon', '3')
) options(product,choice,n) ON p.name=options.product
WHERE NOT EXISTS(SELECT 1 FROM "ProductVariant" v WHERE v."productId"=p.id AND v.name=options.choice);
