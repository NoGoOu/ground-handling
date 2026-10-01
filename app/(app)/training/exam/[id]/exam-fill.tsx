"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/lib/action";
import type { ExamineeQuestion } from "@/lib/exams/snapshot";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";

// Filling an e-exam (CLAUDE.md, 10. mérföldkő, "Kitöltés"), on a phone too:
// every change is saved at once (a written answer after a short pause), so
// that the answers saved when the time is up are handed in. The right answers
// never reach this page.

const a = messages.attempts;
type SaveState = "saving" | "saved" | "failed";

function remaining(deadline: number, now: number): string {
  const seconds = Math.max(0, Math.floor((deadline - now) / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export function ExamFill({
  questions,
  saved,
  deadline,
  saveAction,
  submitAction,
}: {
  questions: ExamineeQuestion[];
  saved: { choices: number[]; text: string }[];
  /** Epoch milliseconds; null without a time limit. */
  deadline: number | null;
  saveAction: (index: number, choices: number[], text: string | null) => Promise<ActionResult>;
  submitAction: () => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState(saved);
  const [states, setStates] = useState<(SaveState | null)[]>(() => questions.map(() => null));
  const [now, setNow] = useState(() => Date.now());
  const [submitting, startSubmit] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  // The clock: when the time is up the server hands the saved answers in.
  useEffect(() => {
    if (deadline === null) return;
    const tick = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= deadline) {
        clearInterval(tick);
        router.refresh();
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [deadline, router]);

  const save = async (index: number, choices: number[], text: string | null) => {
    setStates((list) => list.map((state, i) => (i === index ? "saving" : state)));
    const result = await saveAction(index, choices, text);
    setStates((list) => list.map((state, i) => (i === index ? (result.ok ? "saved" : "failed") : state)));
    if (!result.ok) setError(result.error);
  };

  const choose = (index: number, option: number, single: boolean) => {
    const current = answers[index].choices;
    const choices = single ? [option] : current.includes(option) ? current.filter((c) => c !== option) : [...current, option].sort((x, y) => x - y);
    setAnswers((list) => list.map((answer, i) => (i === index ? { ...answer, choices } : answer)));
    void save(index, choices, null);
  };

  const write = (index: number, text: string, immediately: boolean) => {
    setAnswers((list) => list.map((answer, i) => (i === index ? { ...answer, text } : answer)));
    clearTimeout(timers.current.get(index));
    if (immediately) void save(index, [], text);
    else timers.current.set(index, setTimeout(() => void save(index, [], text), 1000));
  };

  const submit = () => {
    if (!window.confirm(a.confirmSubmit)) return;
    startSubmit(async () => {
      // A written answer still waiting for its pause is saved first.
      for (const [index, timer] of timers.current) {
        clearTimeout(timer);
        await save(index, [], answers[index].text);
      }
      timers.current.clear();
      const result = await submitAction();
      if (!result.ok) setError(result.error);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {deadline !== null && (
        <p className="sticky top-0 z-10 rounded-lg bg-sky-50 px-3 py-2 text-lg font-semibold text-sky-900 tabular-nums">
          {fmt(a.timeLeft, { time: remaining(deadline, now) })}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <ol className="flex flex-col gap-4">
        {questions.map((question, index) => (
          <li key={index} className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex items-baseline justify-between gap-2 text-sm text-neutral-500">
              <span>{fmt(a.question, { n: index + 1, points: question.points })}</span>
              <span aria-live="polite">{states[index] && a[states[index] === "saving" ? "saving" : states[index] === "saved" ? "saved" : "saveFailed"]}</span>
            </div>
            <p className="text-base font-medium whitespace-pre-line">{question.text}</p>
            <p className="text-xs text-neutral-500">{a.kinds[question.kind]}</p>
            {question.kind === "TEXT" ? (
              <textarea
                value={answers[index].text}
                onChange={(event) => write(index, event.target.value, false)}
                onBlur={(event) => write(index, event.target.value, true)}
                rows={4}
                maxLength={5000}
                className="input text-base"
              />
            ) : (
              <div className="flex flex-col gap-2">
                {question.options.map((option, optionIndex) => (
                  <label
                    key={optionIndex}
                    className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 px-3 py-2 text-base has-[:checked]:border-sky-500 has-[:checked]:bg-sky-50"
                  >
                    <input
                      type={question.kind === "SINGLE" ? "radio" : "checkbox"}
                      name={`q${index}`}
                      checked={answers[index].choices.includes(optionIndex)}
                      onChange={() => choose(index, optionIndex, question.kind === "SINGLE")}
                      className="size-5 shrink-0"
                    />
                    {option}
                  </label>
                ))}
              </div>
            )}
          </li>
        ))}
      </ol>
      <button type="button" onClick={submit} disabled={submitting} className="btn btn-primary btn-lg self-stretch sm:self-start">
        {a.submit}
      </button>
    </div>
  );
}
