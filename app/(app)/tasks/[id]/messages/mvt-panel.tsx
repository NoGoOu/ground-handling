"use client";

import { useActionState } from "react";
import { FormField, FormMessage } from "@/components/form-field";
import { messages } from "@/lib/messages";
import type { MvtValues, PreviewState, SendState } from "./actions";

const t = messages.outbound;

/** Preview, edit, then send the departure MVT (7. mérföldkő). */
export function MvtPanel({
  previewAction,
  sendAction,
  initial,
  offBlock,
}: {
  previewAction: (state: PreviewState, formData: FormData) => Promise<PreviewState>;
  sendAction: (state: SendState, formData: FormData) => Promise<SendState>;
  initial: MvtValues;
  /** The effective off-block in local time; null while there is no ATD. */
  offBlock: string | null;
}) {
  const [preview, previewForm, previewing] = useActionState(previewAction, {});
  const [sent, sendForm, sending] = useActionState(sendAction, {});
  const value = (key: keyof MvtValues) => preview.values?.[key] ?? initial[key];

  if (!offBlock) return <p className="text-sm text-neutral-600">{t.noAtd}</p>;
  return (
    <div className="flex flex-col gap-3">
      <form action={previewForm} className="flex flex-col gap-3">
        <FormMessage message={preview.error} />
        <p className="text-sm">
          <span className="text-neutral-500">Off-block (ATD): </span>
          <span className="font-semibold tabular-nums">{offBlock}</span>
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <FormField label={t.registration}>
            <input name="registration" defaultValue={value("registration")} className="input w-32 uppercase" required />
          </FormField>
          <FormField label={t.airborne} hint={t.timeHint}>
            <input type="datetime-local" name="airborne" defaultValue={value("airborne")} className="input" />
          </FormField>
          <FormField label={t.estimatedArrival} hint={t.timeHint}>
            <input type="datetime-local" name="estimatedArrival" defaultValue={value("estimatedArrival")} className="input" />
          </FormField>
          <FormField label={t.destination}>
            <input name="destination" defaultValue={value("destination")} maxLength={3} className="input w-20 uppercase" />
          </FormField>
        </div>
        <FormField label={t.si} hint={messages.form.optional}>
          <input name="si" defaultValue={value("si")} maxLength={200} className="input" />
        </FormField>
        <button type="submit" disabled={previewing} className="btn btn-secondary self-start">
          {t.preview}
        </button>
      </form>

      {preview.text && (
        <form action={sendForm} className="flex flex-col gap-3 border-t border-neutral-100 pt-3">
          <FormMessage message={sent.error} />
          {preview.warnings?.map((w, i) => (
            <p key={i} className="text-sm text-orange-700">
              ⚠ {w}
            </p>
          ))}
          <FormField label={t.previewTitle}>
            <textarea
              key={preview.text}
              name="text"
              defaultValue={preview.text}
              rows={6}
              spellCheck={false}
              className="input font-mono text-sm uppercase"
            />
          </FormField>
          <div className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">{t.recipients}</span>
            {preview.recipients && preview.recipients.length > 0 ? (
              <ul className="flex flex-col gap-0.5">
                {preview.recipients.map((r) => (
                  <li key={r.address}>
                    <span className="font-mono">{r.address}</span> <span className="text-neutral-500">({r.channel})</span>
                    {r.note && <span className="text-orange-700"> · {r.note}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-neutral-600">{t.noRecipients}</p>
            )}
          </div>
          {preview.typeB && (
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-neutral-600">{t.copyHint}</span>
              <pre className="select-all overflow-x-auto rounded bg-neutral-50 p-2 font-mono text-xs">{preview.typeB}</pre>
            </div>
          )}
          <button type="submit" disabled={sending} className="btn btn-primary self-start">
            {sending ? t.sending : t.send}
          </button>
          {sent.deliveries && (
            <div role="status" className="flex flex-col gap-0.5 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              <span>{t.sent}</span>
              {sent.deliveries.map((d, i) => (
                <span key={i}>{d}</span>
              ))}
              {sent.warnings?.map((w, i) => (
                <span key={`w${i}`} className="text-orange-700">
                  ⚠ {w}
                </span>
              ))}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
