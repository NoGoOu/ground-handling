import { describe, expect, it } from "vitest";
import { snapshotFiles, snapshotTime } from "./files";
import { errorCounts, mergeSnapshots } from "./merge";
import { sampleRecord, sampleSnapshotText, type SampleRecord } from "./sample.fixture";
import { nearestTime, parseScheduled, parseSnapshot, readRecord, type Snapshot } from "./snapshot";

const at = (iso: string) => new Date(iso);

function snapshot(takenAt: string, arrivals: SampleRecord[], departures: SampleRecord[] = []): Snapshot {
  const parsed = parseSnapshot(sampleSnapshotText(arrivals, departures), at(takenAt));
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.snapshot;
}

describe("files of the backup", () => {
  it("reads the time from the file name, in UTC", () => {
    expect(snapshotTime("aodb_20261001_0641Z.json")).toEqual(at("2026-10-01T06:41:00Z"));
    expect(snapshotTime("aodb_20261001_2541Z.json")).toBeNull();
    expect(snapshotTime("aodb_20260231_0641Z.json")).toBeNull();
    expect(snapshotTime("mentes.ps1")).toBeNull();
  });

  it("lists the snapshots of the day folders in time order, skipping other files and a gap", () => {
    const files = snapshotFiles([
      { name: "2026-10-02", files: ["aodb_20261002_0011Z.json", "naplo.txt"] },
      { name: "2026-10-01", files: ["aodb_20261001_2341Z.json", "aodb_20261001_2311Z.json"] },
      // 2026-10-03 is missing; 2026-10-04 has a file of the day before in it.
      { name: "2026-10-04", files: ["aodb_20261003_2341Z.json"] },
      { name: "regi", files: ["aodb_20261001_0011Z.json"] },
    ]);
    expect(files.map((f) => f.takenAt.toISOString())).toEqual([
      "2026-10-01T23:11:00.000Z",
      "2026-10-01T23:41:00.000Z",
      "2026-10-02T00:11:00.000Z",
      "2026-10-03T23:41:00.000Z",
    ]);
  });

  it("keeps only the snapshots in the window, and a minute only once", () => {
    const files = snapshotFiles(
      [
        { name: "2026-10-01", files: ["aodb_20261001_2341Z.json"] },
        { name: "2026-10-02", files: ["aodb_20261002_0011Z.json", "aodb_20261002_0041Z.json"] },
        { name: "2026-10-03", files: ["aodb_20261002_0011Z.json"] },
      ],
      { start: at("2026-10-02T00:00:00Z"), end: at("2026-10-02T00:41:00Z") },
    );
    expect(files).toEqual([{ folder: "2026-10-02", file: "aodb_20261002_0011Z.json", takenAt: at("2026-10-02T00:11:00Z") }]);
  });
});

describe("a snapshot", () => {
  it("reads a file with and without a byte order mark", () => {
    for (const bom of [false, true]) {
      const parsed = parseSnapshot(sampleSnapshotText([sampleRecord()], [], { bom }), at("2026-10-01T06:11:00Z"));
      expect(parsed.ok && parsed.snapshot.arrivals).toHaveLength(1);
    }
  });

  it("refuses a file that is not JSON or not a flight list", () => {
    expect(parseSnapshot("<html>", at("2026-10-01T06:11:00Z"))).toEqual({ ok: false, error: "json" });
    expect(parseSnapshot('{"success":false,"data":null}', at("2026-10-01T06:11:00Z"))).toEqual({ ok: false, error: "shape" });
  });

  it("reads the scheduled time as UTC", () => {
    expect(parseScheduled("01.10.2026 07:20")).toEqual(at("2026-10-01T07:20:00Z"));
    expect(parseScheduled("31.09.2026 07:20")).toBeNull();
    expect(parseScheduled("01.10.2026 7:20")).toBeNull();
  });

  it("puts a time without a day on the day nearest the scheduled time", () => {
    const late = at("2026-10-01T23:50:00Z");
    expect(nearestTime("00:10", late)).toEqual(at("2026-10-02T00:10:00Z"));
    expect(nearestTime("23:40", late)).toEqual(at("2026-10-01T23:40:00Z"));
    const early = at("2026-10-02T00:05:00Z");
    expect(nearestTime("23:55", early)).toEqual(at("2026-10-01T23:55:00Z"));
    expect(nearestTime("06:30", at("2026-10-01T07:20:00Z"))).toEqual(at("2026-10-01T06:30:00Z"));
    // Twelve hours either way: the later day.
    expect(nearestTime("12:00", at("2026-10-01T00:00:00Z"))).toEqual(at("2026-10-01T12:00:00Z"));
    expect(nearestTime("24:00", early)).toBeNull();
  });

  it("normalises a record: flight number, registration, empty fields", () => {
    const read = readRecord(
      sampleRecord({ flightNumber: "QQ0042", registration: "XX-QAA", standExt: "", route: "aaa", estimatedTime: "07:25" }),
    );
    expect(read).toMatchObject({
      ok: true,
      errors: [],
      record: {
        aodbId: 900001,
        airline: "QQ",
        flightNumber: "QQ42",
        route: "AAA",
        stand: null,
        registration: "XXQAA",
        estimated: at("2026-10-01T07:25:00Z"),
        actual: null,
      },
    });
  });

  it("takes a three-letter designator", () => {
    expect(readRecord(sampleRecord({ flightNumber: "QQX123" }))).toMatchObject({ record: { airline: "QQX", flightNumber: "QQX123" } });
    expect(readRecord(sampleRecord({ flightNumber: "Q12345" }))).toMatchObject({ record: { airline: "Q1", flightNumber: "Q12345" } });
  });

  it("leaves out a record without id, flight number or scheduled time, and empties a bad time", () => {
    expect(readRecord(sampleRecord({ id: 0 }))).toEqual({ ok: false, error: "id", aodbId: null });
    expect(readRecord(sampleRecord({ flightNumber: "12" }))).toEqual({ ok: false, error: "flightNumber", aodbId: 900001 });
    expect(readRecord(sampleRecord({ scheduledTime: "2026-10-01 07:20" }))).toEqual({ ok: false, error: "scheduledTime", aodbId: 900001 });
    expect(readRecord(sampleRecord({ actualTime: "7:2" }))).toMatchObject({ ok: true, errors: ["actualTime"], record: { actual: null } });
  });
});

describe("merging the snapshots", () => {
  it("takes the values of the last snapshot a record is in, whatever order the snapshots come in", () => {
    const { legs, occurrences } = mergeSnapshots([
      snapshot("2026-10-01T06:41:00Z", [sampleRecord({ standExt: "12", estimatedTime: "07:30" })]),
      snapshot("2026-10-01T06:11:00Z", [sampleRecord({ standExt: "10", estimatedTime: "07:25" })]),
    ]);
    expect(occurrences).toBe(2);
    expect(legs).toHaveLength(1);
    expect(legs[0]).toMatchObject({
      direction: "ARRIVAL",
      stand: "12",
      estimated: at("2026-10-01T07:30:00Z"),
      firstSeen: at("2026-10-01T06:11:00Z"),
      lastSeen: at("2026-10-01T06:41:00Z"),
    });
  });

  it("keeps the actual time and the registration once given, also when a later snapshot has them empty", () => {
    const { legs } = mergeSnapshots([
      snapshot("2026-10-01T07:11:00Z", [sampleRecord({ actualTime: "07:28", registration: "XXQAA" })]),
      snapshot("2026-10-01T07:41:00Z", [sampleRecord({ actualTime: null, registration: null, standExt: "14" })]),
    ]);
    expect(legs[0]).toMatchObject({ actual: at("2026-10-01T07:28:00Z"), registration: "XXQAA", stand: "14" });
  });

  it("takes a later registration and actual time over an earlier one", () => {
    const { legs } = mergeSnapshots([
      snapshot("2026-10-01T05:11:00Z", [sampleRecord({ registration: "XXQAA" })]),
      snapshot("2026-10-01T07:41:00Z", [sampleRecord({ registration: "XXQAB", actualTime: "07:31" })]),
    ]);
    expect(legs[0]).toMatchObject({ registration: "XXQAB", actual: at("2026-10-01T07:31:00Z") });
  });

  it("keeps a flight that leaves the window, and one seen again after a gap", () => {
    const early = sampleRecord({ id: 900001, scheduledTime: "01.10.2026 05:00", actualTime: "05:05" });
    const later = sampleRecord({ id: 900002, flightNumber: "QQ1236", scheduledTime: "01.10.2026 15:00" });
    const { legs } = mergeSnapshots([
      snapshot("2026-10-01T04:41:00Z", [early, later]),
      // A gap of four hours, then the early flight is out of the window.
      snapshot("2026-10-01T08:41:00Z", [later]),
    ]);
    expect(legs.map((leg) => [leg.aodbId, leg.lastSeen.toISOString()])).toEqual([
      [900001, "2026-10-01T04:41:00.000Z"],
      [900002, "2026-10-01T08:41:00.000Z"],
    ]);
    expect(legs[0].actual).toEqual(at("2026-10-01T05:05:00Z"));
  });

  it("follows a changed scheduled time, and resolves the times against it", () => {
    const { legs } = mergeSnapshots([
      snapshot("2026-10-01T18:11:00Z", [sampleRecord({ scheduledTime: "01.10.2026 22:30" })]),
      snapshot("2026-10-01T22:41:00Z", [sampleRecord({ scheduledTime: "01.10.2026 23:55", estimatedTime: "00:20" })]),
    ]);
    expect(legs[0]).toMatchObject({ scheduled: at("2026-10-01T23:55:00Z"), estimated: at("2026-10-02T00:20:00Z") });
  });

  it("keeps arrivals and departures with the same id apart", () => {
    const { legs } = mergeSnapshots([
      snapshot("2026-10-01T06:11:00Z", [sampleRecord()], [sampleRecord({ flightNumber: "QQ1235", scheduledTime: "01.10.2026 08:10", bound: "0" })]),
    ]);
    expect(legs.map((leg) => [leg.direction, leg.flightNumber])).toEqual([
      ["ARRIVAL", "QQ1234"],
      ["DEPARTURE", "QQ1235"],
    ]);
  });

  it("counts the unreadable records and keeps the earlier values of a record", () => {
    const { legs, errors } = mergeSnapshots([
      snapshot("2026-10-01T06:11:00Z", [sampleRecord({ standExt: "10" }), sampleRecord({ id: 900009, flightNumber: "" })]),
      snapshot("2026-10-01T06:41:00Z", [sampleRecord({ scheduledTime: "" })]),
    ]);
    expect(legs).toHaveLength(1);
    expect(legs[0].stand).toBe("10");
    expect(errorCounts(errors)).toEqual({ flightNumber: 1, scheduledTime: 1 });
    expect(errors[0]).toEqual({ direction: "ARRIVAL", aodbId: 900009, error: "flightNumber", snapshot: at("2026-10-01T06:11:00Z") });
  });
});
