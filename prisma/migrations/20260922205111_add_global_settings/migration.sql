-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "deviationGreenMaxMinutes" INTEGER NOT NULL DEFAULT 0,
    "deviationYellowMaxMinutes" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);
