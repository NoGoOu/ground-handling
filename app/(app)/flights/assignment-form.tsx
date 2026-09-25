"use client";

import { useActionState, useRef } from "react";
import type { ActionResult } from "@/lib/action";
import { messages } from "@/lib/messages";
import type { FlightKind, TurnaroundType } from "@/lib/turnaround";

const t = messages.assignment;

export interface AgentOption {
  id: string;
  name: string;
  active: boolean;
}

function AgentSelect({
  name,
  label,
  value,
  agents,
  onChange,
}: {
  name: string;
  label: string;
  value: string | null;
  agents: AgentOption[];
  onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-xs text-neutral-500">{label}</span>
      <select name={name} defaultValue={value ?? ""} onChange={onChange} className="input py-1 text-sm">
        <option value="">{t.none}</option>
        {agents.map((agent) => (
          <option key={agent.id} value={agent.id} disabled={!agent.active}>
            {agent.name} {agent.active ? "" : t.inactive}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Saves as soon as a selection changes. */
export function AssignmentForm({
  action,
  type,
  kind,
  agents,
  arrivalAgentId,
  departureAgentId,
}: {
  action: (state: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  type: TurnaroundType | null;
  kind: FlightKind;
  agents: AgentOption[];
  arrivalAgentId: string | null;
  departureAgentId: string | null;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);
  const submit = () => formRef.current?.requestSubmit();

  return (
    <form
      ref={formRef}
      action={formAction}
      // Re-mount with the saved values after the page refreshes.
      key={`${kind}:${type}:${arrivalAgentId}:${departureAgentId}`}
      aria-busy={pending}
      className={`flex min-w-56 flex-col gap-1 ${pending ? "opacity-60" : ""}`}
    >
      {kind === "ARRIVAL_ONLY" ? (
        <AgentSelect name="arrivalAgentId" label={t.arrival} value={arrivalAgentId} agents={agents} onChange={submit} />
      ) : kind === "DEPARTURE_ONLY" ? (
        <AgentSelect
          name="departureAgentId"
          label={t.departure}
          value={departureAgentId}
          agents={agents}
          onChange={submit}
        />
      ) : type === "QUICK" ? (
        <>
          <AgentSelect name="arrivalAgentId" label={t.agent} value={arrivalAgentId} agents={agents} onChange={submit} />
          <span className="text-xs text-neutral-500">{t.quickHint}</span>
        </>
      ) : (
        <>
          <AgentSelect name="arrivalAgentId" label={t.arrival} value={arrivalAgentId} agents={agents} onChange={submit} />
          <AgentSelect
            name="departureAgentId"
            label={t.departure}
            value={departureAgentId}
            agents={agents}
            onChange={submit}
          />
        </>
      )}
      <noscript>
        <button type="submit" className="btn btn-secondary">
          {t.save}
        </button>
      </noscript>
      {state && !state.ok && <span className="text-sm text-red-700">{state.error}</span>}
      {state?.ok && state.warning && <span className="text-sm text-orange-700">⚠ {state.warning}</span>}
    </form>
  );
}
