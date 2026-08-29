ALTER TABLE "GlobalConfig" ALTER COLUMN "deliveryFee" SET DEFAULT 2.00;
UPDATE "GlobalConfig" SET "deliveryFee" = 2.00 WHERE "id" = 'default' AND "deliveryFee" > 2.00;
