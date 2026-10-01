"use client";

import { useActionState } from "react";
import { FormField, FormMessage } from "@/components/form-field";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import type { FaultFormInput } from "@/lib/validation/faults";
import type { FaultFormState } from "../actions";

// The fault report, made for a phone: big targets, the camera for photos.

const f = messages.faults;

export function ReportForm({
  action,
  equipment,
  initial,
  maxPhotos,
}: {
  action: (state: FaultFormState, formData: FormData) => Promise<FaultFormState>;
  equipment: { id: string; label: string; group: string }[];
  initial: FaultFormInput;
  maxPhotos: number;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const value = (key: keyof FaultFormInput) => state.values?.[key] ?? initial[key];
  const groups = [...new Set(equipment.map((item) => item.group))];
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormMessage message={state.message} />
      <FormField label={f.equipment} error={state.errors?.equipmentId}>
        <select name="equipmentId" defaultValue={value("equipmentId")} className="input text-base" required>
          <option value="" disabled>
            {f.chooseEquipment}
          </option>
          {groups.map((group) => (
            <optgroup key={group} label={group}>
              {equipment
                .filter((item) => item.group === group)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </FormField>
      <FormField label={f.description} error={state.errors?.description}>
        <textarea name="description" defaultValue={value("description")} rows={4} maxLength={2000} className="input text-base" required />
      </FormField>
      <FormField label={f.photos} hint={messages.form.optional}>
        <input
          type="file"
          name="photos"
          multiple
          accept="image/jpeg,image/png,application/pdf"
          className="text-base file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-4 file:py-3 file:font-medium file:text-neutral-800"
        />
      </FormField>
      <p className="-mt-2 text-xs text-neutral-500">{fmt(f.photosHint, { max: maxPhotos })}</p>
      <label className="flex min-h-12 items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-base text-red-900">
        <input type="checkbox" name="outOfService" defaultChecked={value("outOfService") === "on"} className="size-6 shrink-0" />
        {f.outOfService}
      </label>
      <button type="submit" disabled={pending} className="btn btn-primary btn-lg self-stretch sm:self-start">
        {pending ? messages.form.saving : f.send}
      </button>
    </form>
  );
}
