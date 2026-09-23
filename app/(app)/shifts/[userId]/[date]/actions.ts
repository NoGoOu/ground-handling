"use server";

import { refresh } from "next/cache";
import type { RosterLayer } from "@/generated/prisma/client";
import { ActionError, actionUser, runAction, type ActionResult } from "@/lib/action";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canEditLayer } from "@/lib/permissions";
import type { CurrentUser } from "@/lib/session";
import { formatDateTime } from "@/lib/time";
import { fieldErrors } from "@/lib/validation/form";
import { findOverlap, segmentSchema, SEGMENT_FIELDS, type SegmentData } from "@/lib/validation/shift";

const e = messages.shiftForm.errors;

function parseSegment(formData: FormData): SegmentData {
  const values = Object.fromEntries(SEGMENT_FIELDS.map((key) => [key, String(formData.get(key) ?? "")]));
  const parsed = segmentSchema.safeParse(values);
  if (!parsed.success) throw new ActionError(Object.values(fieldErrors(parsed.error))[0] ?? messages.errors.invalidInput);
  return parsed.data;
}

function assertLayerEditable(actor: CurrentUser, layer: RosterLayer) {
  if (!canEditLayer(actor, layer)) throw new ActionError(layer === "PUBLISHED" ? messages.shiftForm.locked : e.layerLocked);
}

/** Only a non-operative segment can turn into a block (CLAUDE.md). */
async function assertBlockAllowed(segment: SegmentData) {
  const type = await prisma.segmentType.findUnique({
    where: { id: segment.segmentTypeId },
    select: { operative: true },
  });
  if (!type) throw new ActionError(e.segmentType);
  if (segment.createBlock && type.operative) throw new ActionError(e.blockOperative);
}

const overlapMessage = (template: string, clash: { start: Date; end: Date }) =>
  fmt(template, { start: formatDateTime(clash.start), end: formatDateTime(clash.end) });

/** Segments of one shift may not overlap each other. */
async function assertFreeInShift(shiftId: string, segment: SegmentData, exceptSegmentId: string | null) {
  const siblings = await prisma.shiftSegment.findMany({
    where: { shiftId, ...(exceptSegmentId ? { id: { not: exceptSegmentId } } : {}) },
    select: { start: true, end: true },
  });
  const clash = findOverlap(segment, siblings);
  if (clash) throw new ActionError(overlapMessage(e.overlap, clash));
}

/** Nor may two shifts of the same agent overlap inside one layer. */
async function assertFreeForAgent(
  userId: string,
  layer: RosterLayer,
  span: { start: Date; end: Date },
  exceptShiftId: string | null,
) {
  const shifts = await prisma.shift.findMany({
    where: { userId, layer, ...(exceptShiftId ? { id: { not: exceptShiftId } } : {}) },
    select: { segments: { select: { start: true, end: true } } },
  });
  const spans = shifts
    .map((shift) => ({
      start: shift.segments.reduce<Date | null>((min, s) => (!min || s.start < min ? s.start : min), null),
      end: shift.segments.reduce<Date | null>((max, s) => (!max || s.end > max ? s.end : max), null),
    }))
    .filter((s): s is { start: Date; end: Date } => !!s.start && !!s.end);
  const clash = findOverlap(span, spans);
  if (clash) throw new ActionError(overlapMessage(e.shiftOverlap, clash));
}

async function loadShift(shiftId: string) {
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    include: { segments: { select: { id: true, start: true, end: true } } },
  });
  if (!shift) throw new ActionError(e.notFound);
  return shift;
}

/** The span of a shift after applying one changed or added segment. */
function spanWith(
  segments: { id: string; start: Date; end: Date }[],
  segment: SegmentData,
  replacedSegmentId: string | null,
): { start: Date; end: Date } {
  const all = [...segments.filter((s) => s.id !== replacedSegmentId), segment];
  return {
    start: all.reduce((min, s) => (s.start < min ? s.start : min), all[0].start),
    end: all.reduce((max, s) => (s.end > max ? s.end : max), all[0].end),
  };
}

const segmentData = (segment: SegmentData) => ({
  start: segment.start,
  end: segment.end,
  segmentTypeId: segment.segmentTypeId,
  location: segment.location || null,
  description: segment.description || null,
  createBlock: segment.createBlock,
  travelBeforeMinutes: segment.travelBeforeMinutes,
  travelAfterMinutes: segment.travelAfterMinutes,
});

export async function createShift(
  userId: string,
  layer: RosterLayer,
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await actionUser();
    assertLayerEditable(actor, layer);

    const agent = await prisma.user.findFirst({
      where: { id: userId, active: true, teamId: { not: null } },
      select: { id: true },
    });
    if (!agent) throw new ActionError(e.notAgent);

    const segment = parseSegment(formData);
    await assertBlockAllowed(segment);
    await assertFreeForAgent(userId, layer, segment, null);

    await prisma.shift.create({
      data: {
        userId,
        layer,
        note: segment.note || null,
        segments: { create: [segmentData(segment)] },
      },
    });
    refresh();
  });
}

export async function addSegment(
  shiftId: string,
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await actionUser();
    const shift = await loadShift(shiftId);
    assertLayerEditable(actor, shift.layer);

    const segment = parseSegment(formData);
    await assertBlockAllowed(segment);
    await assertFreeInShift(shiftId, segment, null);
    await assertFreeForAgent(shift.userId, shift.layer, spanWith(shift.segments, segment, null), shiftId);

    await prisma.$transaction([
      prisma.shiftSegment.create({ data: { shiftId, ...segmentData(segment) } }),
      prisma.shift.update({ where: { id: shiftId }, data: { note: segment.note || null } }),
    ]);
    refresh();
  });
}

export async function updateSegment(
  segmentId: string,
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await actionUser();
    const existing = await prisma.shiftSegment.findUnique({ where: { id: segmentId }, select: { shiftId: true } });
    if (!existing) throw new ActionError(e.notFound);
    const shift = await loadShift(existing.shiftId);
    assertLayerEditable(actor, shift.layer);

    const segment = parseSegment(formData);
    await assertBlockAllowed(segment);
    await assertFreeInShift(shift.id, segment, segmentId);
    await assertFreeForAgent(shift.userId, shift.layer, spanWith(shift.segments, segment, segmentId), shift.id);

    await prisma.$transaction([
      prisma.shiftSegment.update({ where: { id: segmentId }, data: segmentData(segment) }),
      prisma.shift.update({ where: { id: shift.id }, data: { note: segment.note || null } }),
    ]);
    refresh();
  });
}

export async function removeSegment(segmentId: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await actionUser();
    const existing = await prisma.shiftSegment.findUnique({ where: { id: segmentId }, select: { shiftId: true } });
    if (!existing) throw new ActionError(e.notFound);
    const shift = await loadShift(existing.shiftId);
    assertLayerEditable(actor, shift.layer);
    if (shift.segments.length <= 1) throw new ActionError(e.lastSegment);

    await prisma.shiftSegment.delete({ where: { id: segmentId } });
    refresh();
  });
}

export async function removeShift(shiftId: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await actionUser();
    const shift = await loadShift(shiftId);
    assertLayerEditable(actor, shift.layer);

    await prisma.shift.delete({ where: { id: shiftId } });
    refresh();
  });
}
