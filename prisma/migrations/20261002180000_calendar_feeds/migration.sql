-- AlterTable
ALTER TABLE "Setting" ADD COLUMN     "calendarRefreshMinutes" INTEGER NOT NULL DEFAULT 60;

-- CreateTable
CREATE TABLE "CalendarFeed" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "CalendarFeed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CalendarFeed_userId_key" ON "CalendarFeed"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarFeed_keyHash_key" ON "CalendarFeed"("keyHash");

-- AddForeignKey
ALTER TABLE "CalendarFeed" ADD CONSTRAINT "CalendarFeed_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- The suggested refresh of a subscribed calendar: from a quarter of an hour to a day.
ALTER TABLE "Setting" ADD CONSTRAINT "Setting_calendar_refresh_minutes" CHECK ("calendarRefreshMinutes" BETWEEN 15 AND 1440);
