ALTER TABLE "GlobalConfig"
ADD COLUMN "deliveryEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "deliveryDisabledUntil" TIMESTAMP(3),
ADD COLUMN "pickupEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "pickupDisabledUntil" TIMESTAMP(3),
ADD COLUMN "serviceMessage" TEXT,
ADD COLUMN "serviceUpdatedBy" TEXT;
