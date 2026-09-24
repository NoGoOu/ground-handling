-- AlterTable
ALTER TABLE "Flight" ALTER COLUMN "inboundFlightNumber" DROP NOT NULL,
ALTER COLUMN "outboundFlightNumber" DROP NOT NULL,
ALTER COLUMN "sta" DROP NOT NULL,
ALTER COLUMN "std" DROP NOT NULL;

-- Rule 11: a flight has an arrival part, a departure part, or both. Each part
-- is whole: its flight number and scheduled time come together, and its
-- estimated and actual times only exist with it.
ALTER TABLE "Flight"
  ADD CONSTRAINT "Flight_has_a_part" CHECK ("sta" IS NOT NULL OR "std" IS NOT NULL),
  ADD CONSTRAINT "Flight_arrival_part_whole" CHECK (
    ("inboundFlightNumber" IS NULL) = ("sta" IS NULL)
    AND ("sta" IS NOT NULL OR ("eta" IS NULL AND "ata" IS NULL))
  ),
  ADD CONSTRAINT "Flight_departure_part_whole" CHECK (
    ("outboundFlightNumber" IS NULL) = ("std" IS NULL)
    AND ("std" IS NOT NULL OR ("etd" IS NULL AND "atd" IS NULL))
  );
