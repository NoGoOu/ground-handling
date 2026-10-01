import Link from "next/link";
import { listReportableEquipment, MAX_FAULT_PHOTOS } from "@/lib/data/faults";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { canReportFault } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { reportFaultAction } from "../actions";
import { ReportForm } from "./report-form";

// Reporting a fault (CLAUDE.md, 11. mérföldkő, "Hibajegy"), from a phone too.
// ?equipment= picks the equipment, e.g. from its data sheet.

const f = messages.faults;

export default async function ReportFaultPage(props: PageProps<"/faults/new">) {
  await requireCapability(canReportFault);
  const { equipment: chosen } = await props.searchParams;
  const equipment = await listReportableEquipment();
  const preselected = typeof chosen === "string" && equipment.some((item) => item.id === chosen) ? chosen : "";
  return (
    <div className="flex flex-col gap-4">
      <Link href="/faults" className="self-start text-sm text-sky-700 hover:underline">
        {f.back}
      </Link>
      <h1 className="text-2xl font-bold">{f.reportTitle}</h1>
      <p className="max-w-3xl text-neutral-700">{f.reportIntro}</p>
      <section className="rounded-xl border border-neutral-200 bg-white p-4">
        <ReportForm
          action={reportFaultAction}
          maxPhotos={MAX_FAULT_PHOTOS}
          initial={{ equipmentId: preselected, description: "", outOfService: "" }}
          equipment={equipment.map((item) => ({
            id: item.id,
            group: item.type.name,
            label: fmt(f.equipmentOption, { identifier: item.identifier, type: item.type.name, status: messages.equipment.statuses[item.status] }),
          }))}
        />
      </section>
    </div>
  );
}
