import type { ActionResult } from "@/lib/action";

export function ActionFeedback({ result, successText }: { result: ActionResult | null; successText?: string }) {
  if (!result) return null;
  if (!result.ok) {
    return (
      <p role="alert" className="text-sm font-medium text-red-700">
        {result.error}
      </p>
    );
  }
  if (result.warning) {
    return (
      <p role="status" className="text-sm font-medium text-orange-700">
        ⚠ {result.warning}
      </p>
    );
  }
  return successText ? (
    <p role="status" className="text-sm text-emerald-700">
      {successText}
    </p>
  ) : null;
}
