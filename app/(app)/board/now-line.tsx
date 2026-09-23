"use client";

import { useSyncExternalStore } from "react";
import { messages } from "@/lib/messages";

const TICK_MS = 30_000;

function subscribe(onChange: () => void) {
  const timer = setInterval(onChange, TICK_MS);
  return () => clearInterval(timer);
}

// Bucketed so the snapshot only changes once per tick.
const clientNow = () => Math.floor(Date.now() / TICK_MS) * TICK_MS;
// On the server there is no "now": the clocks would differ and the markup would not match.
const serverNow = () => null;

/** Vertical line at the current time; moves on its own while the page is open. */
export function NowLine({ startMs, endMs, withLabel = false }: { startMs: number; endMs: number; withLabel?: boolean }) {
  const now = useSyncExternalStore(subscribe, clientNow, serverNow);

  if (now === null || now < startMs || now > endMs) return null;
  const left = ((now - startMs) / (endMs - startMs)) * 100;

  return (
    <div className="pointer-events-none absolute inset-y-0 z-20 w-px bg-red-500" style={{ left: `${left}%` }}>
      {withLabel && (
        <span className="absolute -top-0.5 left-1 rounded bg-red-500 px-1 text-[10px] font-medium text-white">
          {messages.board.now}
        </span>
      )}
    </div>
  );
}
