-- CreateTable
CREATE TABLE "DelayCodeDocument" (
    "id" TEXT NOT NULL,
    "airlineId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedById" TEXT,
    "removedAt" TIMESTAMP(3),
    "replaced" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DelayCodeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DelayCodeDocument_storageKey_key" ON "DelayCodeDocument"("storageKey");

-- CreateIndex
CREATE INDEX "DelayCodeDocument_airlineId_idx" ON "DelayCodeDocument"("airlineId");

-- AddForeignKey
ALTER TABLE "DelayCodeDocument" ADD CONSTRAINT "DelayCodeDocument_airlineId_fkey" FOREIGN KEY ("airlineId") REFERENCES "Airline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelayCodeDocument" ADD CONSTRAINT "DelayCodeDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelayCodeDocument" ADD CONSTRAINT "DelayCodeDocument_removedById_fkey" FOREIGN KEY ("removedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- The descriptions of the default table by the IATA standard (CLAUDE.md, 8.
-- mérföldkő, utómunka); a description already given is left alone.
UPDATE "DelayCode" SET "description" = v."description"
FROM (VALUES
  ('36', 'Tankolás vagy üzemanyag-leeresztés (üzemanyag-szállító)'),
  ('68', 'A kabinszemélyzet hibája vagy külön kérése'),
  ('81', 'Útvonali légiforgalmi korlátozás vagy kapacitás'),
  ('82', 'Útvonali légiforgalmi korlátozás létszámhiány vagy berendezéshiba miatt'),
  ('93', 'Gépforgás: a gép késve érkezett egy másik járatról vagy az előző szakaszról')
) AS v("code", "description")
WHERE "DelayCode"."code" = v."code" AND "DelayCode"."description" IS NULL;
