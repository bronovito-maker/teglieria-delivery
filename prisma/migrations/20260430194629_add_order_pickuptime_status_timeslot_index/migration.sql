-- AlterTable
ALTER TABLE "DaySchedule"
ALTER COLUMN "dinnerActive" SET DEFAULT true,
ALTER COLUMN "dinnerStart" SET DEFAULT '16:00';

-- CreateIndex
CREATE INDEX "Order_pickupTime_status_timeSlot_idx" ON "Order"("pickupTime", "status", "timeSlot");
