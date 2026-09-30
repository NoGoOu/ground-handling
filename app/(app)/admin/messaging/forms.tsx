"use client";

import { useActionState } from "react";
import { ActionFeedback } from "@/components/action-feedback";
import { FormField, FormMessage } from "@/components/form-field";
import type { ActionResult } from "@/lib/action";
import { messages } from "@/lib/messages";
import type { DelayCodeFormInput } from "@/lib/validation/delay-code";
import type { AddressFormInput, AirportFormInput, SenderFormInput } from "@/lib/validation/messaging";
import type {
  AddressFormState,
  AirportFormState,
  ApiKeyFormState,
  DelayCodeFormState,
  SenderFormState,
  SlotToleranceFormState,
} from "./actions";

const t = messages.messaging.apiKeys;

export function ApiKeyForm({ action }: { action: (state: ApiKeyFormState, formData: FormData) => Promise<ApiKeyFormState> }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormMessage message={state.error} />
      {state.key && (
        <div role="status" className="flex flex-col gap-1 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          <span>{t.created}</span>
          <code className="select-all break-all rounded bg-white px-2 py-1 font-mono text-sm">{state.key}</code>
        </div>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <FormField label={t.name}>
          <input name="name" maxLength={60} className="input" required />
        </FormField>
        <button type="submit" disabled={pending} className="btn btn-primary mb-0.5">
          {pending ? messages.form.saving : t.create}
        </button>
      </div>
    </form>
  );
}

export function RevokeKeyButton({ action }: { action: () => Promise<ActionResult> }) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <button
        type="submit"
        disabled={pending}
        className="btn btn-secondary py-1 text-xs"
        onClick={(event) => {
          if (!window.confirm(t.confirmRevoke)) event.preventDefault();
        }}
      >
        {t.revoke}
      </button>
      <ActionFeedback result={result} successText={t.revokedDone} />
    </form>
  );
}

export function DelayCodeForm({
  action,
  initial,
  submitLabel,
}: {
  action: (state: DelayCodeFormState, formData: FormData) => Promise<DelayCodeFormState>;
  initial: DelayCodeFormInput;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const value = (key: keyof DelayCodeFormInput) => state.values?.[key] ?? initial[key];
  const d = messages.delayCodes;
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <FormMessage message={state.message} notice={state.notice} />
      <div className="flex flex-wrap items-end gap-3">
        <FormField label={d.code} error={state.errors?.code}>
          <input key={value("code")} name="code" defaultValue={value("code")} className="input w-20 font-mono uppercase" required />
        </FormField>
        <FormField label={d.description} hint={messages.form.optional} error={state.errors?.description}>
          <input key={value("description")} name="description" defaultValue={value("description")} maxLength={200} className="input w-72" />
        </FormField>
        <label className="mb-2 flex items-center gap-2 text-sm">
          <input key={value("active")} type="checkbox" name="active" defaultChecked={value("active") === "on"} />
          {d.active}
        </label>
        <button type="submit" disabled={pending} className="btn btn-secondary mb-0.5">
          {pending ? messages.form.saving : submitLabel}
        </button>
      </div>
    </form>
  );
}

export function SenderForm({
  action,
  initial,
}: {
  action: (state: SenderFormState, formData: FormData) => Promise<SenderFormState>;
  initial: SenderFormInput;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const value = (key: keyof SenderFormInput) => state.values?.[key] ?? initial[key];
  const a = messages.addressBook;
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <FormMessage message={state.message} notice={state.notice} />
      <div className="flex flex-wrap items-end gap-3">
        <FormField label={a.senderEmail} hint={messages.form.optional} error={state.errors?.senderEmail}>
          <input name="senderEmail" type="email" defaultValue={value("senderEmail")} className="input w-72" />
        </FormField>
        <FormField label={a.senderTypeB} hint={messages.form.optional} error={state.errors?.senderTypeB}>
          <input name="senderTypeB" defaultValue={value("senderTypeB")} maxLength={7} className="input w-32 font-mono uppercase" />
        </FormField>
        <button type="submit" disabled={pending} className="btn btn-secondary mb-0.5">
          {pending ? messages.form.saving : a.saveSender}
        </button>
      </div>
    </form>
  );
}

export function AddressForm({
  action,
  airlines,
  types,
}: {
  action: (state: AddressFormState, formData: FormData) => Promise<AddressFormState>;
  airlines: { id: string; label: string }[];
  types: readonly string[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const a = messages.addressBook;
  const value = (key: keyof AddressFormInput, fallback: string) => state.values?.[key] ?? fallback;
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <FormMessage message={state.message} notice={state.notice} />
      <div className="flex flex-wrap items-end gap-3">
        <FormField label={a.airline} error={state.errors?.airlineId}>
          <select name="airlineId" defaultValue={value("airlineId", "")} className="input" required>
            <option value="" disabled>
              –
            </option>
            {airlines.map((airline) => (
              <option key={airline.id} value={airline.id}>
                {airline.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={a.messageType} error={state.errors?.messageType}>
          <select name="messageType" defaultValue={value("messageType", "MVT")} className="input">
            {types.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={a.channel} error={state.errors?.channel}>
          <select name="channel" defaultValue={value("channel", "EMAIL")} className="input">
            <option value="EMAIL">{a.channels.EMAIL}</option>
            <option value="SITA">{a.channels.SITA}</option>
          </select>
        </FormField>
        <FormField label={a.address} error={state.errors?.address}>
          <input key={state.notice ?? "address"} name="address" defaultValue={value("address", "")} className="input w-72" required />
        </FormField>
        <button type="submit" disabled={pending} className="btn btn-secondary mb-0.5">
          {a.add}
        </button>
      </div>
    </form>
  );
}

export function AddressActions({
  active,
  toggle,
  remove,
}: {
  active: boolean;
  toggle: () => Promise<ActionResult>;
  remove: () => Promise<ActionResult>;
}) {
  const [toggled, toggleForm, toggling] = useActionState(toggle, null);
  const [removed, removeForm, removing] = useActionState(remove, null);
  const a = messages.addressBook;
  return (
    <span className="inline-flex items-center gap-2">
      <form action={toggleForm}>
        <button type="submit" disabled={toggling} className="btn btn-secondary py-1 text-xs">
          {active ? a.deactivate : a.activate}
        </button>
      </form>
      <form action={removeForm}>
        <button
          type="submit"
          disabled={removing}
          className="btn btn-secondary py-1 text-xs"
          onClick={(event) => {
            if (!window.confirm(a.confirmRemove)) event.preventDefault();
          }}
        >
          {a.remove}
        </button>
      </form>
      <ActionFeedback result={toggled?.ok === false ? toggled : removed?.ok === false ? removed : null} />
    </span>
  );
}

export function AirportForm({
  action,
  initial,
  submitLabel,
}: {
  action: (state: AirportFormState, formData: FormData) => Promise<AirportFormState>;
  initial: AirportFormInput;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const value = (key: keyof AirportFormInput) => state.values?.[key] ?? initial[key];
  const a = messages.airports;
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <FormMessage message={state.message} notice={state.notice} />
      <div className="flex flex-wrap items-end gap-3">
        <FormField label={a.iata} error={state.errors?.iataCode}>
          <input key={value("iataCode")} name="iataCode" defaultValue={value("iataCode")} maxLength={3} className="input w-20 font-mono uppercase" required />
        </FormField>
        <FormField label={a.icao} error={state.errors?.icaoCode}>
          <input key={value("icaoCode")} name="icaoCode" defaultValue={value("icaoCode")} maxLength={4} className="input w-24 font-mono uppercase" required />
        </FormField>
        <FormField label={a.name} error={state.errors?.name}>
          <input key={value("name")} name="name" defaultValue={value("name")} maxLength={100} className="input w-72" required />
        </FormField>
        <button type="submit" disabled={pending} className="btn btn-secondary mb-0.5">
          {pending ? messages.form.saving : submitLabel}
        </button>
      </div>
    </form>
  );
}

export function SlotToleranceForm({
  action,
  initial,
}: {
  action: (state: SlotToleranceFormState, formData: FormData) => Promise<SlotToleranceFormState>;
  initial: number;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const s = messages.slotTolerance;
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <FormMessage message={state.message} notice={state.notice} />
      <div className="flex flex-wrap items-end gap-3">
        <FormField label={s.label} hint={s.unit} error={state.errors?.slotToleranceMinutes}>
          <input
            name="slotToleranceMinutes"
            type="number"
            min={0}
            max={240}
            defaultValue={state.values?.slotToleranceMinutes ?? String(initial)}
            className="input w-24"
            required
          />
        </FormField>
        <button type="submit" disabled={pending} className="btn btn-secondary mb-0.5">
          {pending ? messages.form.saving : s.save}
        </button>
      </div>
    </form>
  );
}

/** The airline's delay code document: a new file takes the place of the old one (8. mérföldkő, utómunka). */
export function DelayDocumentForm({
  action,
  hasDocument,
}: {
  action: (state: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  hasDocument: boolean;
}) {
  const [result, formAction, pending] = useActionState(action, null);
  const d = messages.delayDocuments;
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <input type="file" name="file" accept=".pdf,application/pdf" className="text-sm" required />
        <button type="submit" disabled={pending} className="btn btn-secondary py-1 text-xs">
          {pending ? messages.form.saving : hasDocument ? d.replace : d.upload}
        </button>
      </div>
      <ActionFeedback result={result} successText={d.uploaded} />
    </form>
  );
}

export function RemoveDelayDocumentButton({ action }: { action: () => Promise<ActionResult> }) {
  const [result, formAction, pending] = useActionState(action, null);
  const d = messages.delayDocuments;
  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <button
        type="submit"
        disabled={pending}
        className="btn btn-secondary py-1 text-xs"
        onClick={(event) => {
          if (!window.confirm(d.confirmRemove)) event.preventDefault();
        }}
      >
        {d.remove}
      </button>
      <ActionFeedback result={result} successText={d.removedDone} />
    </form>
  );
}
