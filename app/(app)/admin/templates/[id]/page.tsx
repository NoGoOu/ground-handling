import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canAdminister } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { addMinutes, computeTimeline, diffMinutes, sortByOrder } from "@/lib/turnaround";
import { isLockedCode } from "@/lib/validation/template";
import { addMilestone, deleteMilestone, moveMilestone, updateMilestone, updateTemplate } from "../actions";
import { milestoneGrid } from "../milestone-grid";
import { AddMilestoneForm, MilestoneRowForm, TemplateParamsForm } from "../template-forms";

const t = messages.templateForm;

export default async function TemplatePage(props: PageProps<"/admin/templates/[id]">) {
  await requireCapability(canAdminister);
  const { id } = await props.params;
  const template = await prisma.turnaroundTemplate.findUnique({
    where: { id },
    include: { airline: true, milestones: true },
  });
  if (!template) notFound();

  const milestones = sortByOrder(template.milestones);

  // Preview: planned times relative to ATA on a quick turnaround (STD = ATA + minimum), as in rule 4.
  const ata = new Date(Date.UTC(2000, 0, 1, 12, 0));
  const preview = computeTimeline({
    flight: { sta: ata, ata, std: addMinutes(ata, template.minTurnaroundMinutes) },
    params: template,
    milestones,
    recorded: new Map(),
  });
  const previewFor = (milestoneId: string) => {
    const row = preview.rows.find((r) => r.milestone.id === milestoneId);
    if (!row) return "";
    const minutes = diffMinutes(row.planned, ata);
    return minutes > 0 ? `+${minutes}` : String(minutes);
  };

  return (
    <div className="flex flex-col gap-6">
      <Link href={`/admin/airlines/${template.airlineId}`} className="self-start text-sm text-sky-700 hover:underline">
        {messages.admin.back}
      </Link>
      <div>
        <h1 className="text-2xl font-bold">{fmt(t.title, { name: template.name })}</h1>
        <p className="text-neutral-600">{fmt(t.airline, { airline: `${template.airline.name} (${template.airline.iataCode})` })}</p>
      </div>

      <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="text-lg font-semibold">{t.params}</h2>
        <TemplateParamsForm
          action={updateTemplate.bind(null, template.id)}
          initial={{
            name: template.name,
            minTurnaroundMinutes: String(template.minTurnaroundMinutes),
            travelMinutes: String(template.travelMinutes),
            postDepartureMinutes: String(template.postDepartureMinutes),
            departureReportMinutes: String(template.departureReportMinutes),
            minBreakMinutes: String(template.minBreakMinutes),
          }}
        />
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t.milestones}</h2>
          <p className="text-sm text-neutral-600">{t.liveNote}</p>
          <p className="text-sm text-neutral-600">{t.locked}</p>
        </div>
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <div className="hidden border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-xs text-neutral-600 uppercase lg:flex lg:gap-2">
            <div className={`flex-1 ${milestoneGrid}`}>
              <span>{t.code}</span>
              <span>{t.milestoneName}</span>
              <span>{t.anchor}</span>
              <span>{t.offset}</span>
              <span className="text-center">{t.required}</span>
              <span>{t.part}</span>
              <span className="text-center" title={t.previewHint}>
                {t.preview}
              </span>
              <span />
            </div>
            <span className="w-40" />
          </div>
          <ul className="divide-y divide-neutral-100">
            {milestones.map((milestone, index) => (
              <MilestoneRowForm
                key={milestone.id}
                milestone={milestone}
                locked={isLockedCode(milestone.code)}
                preview={previewFor(milestone.id)}
                isFirst={index === 0}
                isLast={index === milestones.length - 1}
                saveAction={updateMilestone.bind(null, template.id, milestone.id)}
                moveAction={moveMilestone.bind(null, template.id, milestone.id)}
                deleteAction={deleteMilestone.bind(null, template.id, milestone.id)}
              />
            ))}
          </ul>
        </div>
        <p className="text-xs text-neutral-500">{t.previewHint}</p>
        <AddMilestoneForm action={addMilestone.bind(null, template.id)} />
      </section>
    </div>
  );
}
