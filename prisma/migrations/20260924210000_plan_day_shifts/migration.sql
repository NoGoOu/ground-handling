-- DropForeignKey
ALTER TABLE "PlanPosition" DROP CONSTRAINT "PlanPosition_shiftId_fkey";

-- DropIndex
DROP INDEX "PlanPosition_shiftId_key";

-- AlterTable
ALTER TABLE "PlanPosition" DROP COLUMN "shiftId";

-- AlterTable
ALTER TABLE "Shift" ADD COLUMN     "planDayId" TEXT;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_planDayId_fkey" FOREIGN KEY ("planDayId") REFERENCES "PlanDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

