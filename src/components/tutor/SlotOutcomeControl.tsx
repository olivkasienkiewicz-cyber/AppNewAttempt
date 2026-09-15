"use client";

import { useState } from "react";
import { OUTCOME_STATUSES, OUTCOME_LABELS, type OutcomeStatus } from "@/lib/slot-outcome";

export function SlotOutcomeControl({
  slotId,
  currentOutcome,
  slotHasEnded,
}: {
  slotId: string;
  currentOutcome: OutcomeStatus | null;
  slotHasEnded: boolean;
}) {
  const [outcome, setOutcome] = useState<OutcomeStatus | null>(currentOutcome);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!slotHasEnded) {
    return null;
  }

  async function handleSelect(newOutcome: OutcomeStatus) {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/tutor/slots/${slotId}/outcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome_status: newOutcome }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status");
      }

      setOutcome(newOutcome);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (outcome) {
    return (
      <span className="text-sm text-teal-700 font-medium">
        {OUTCOME_LABELS[outcome]}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        disabled={saving}
        defaultValue=""
        onChange={(e) => handleSelect(e.target.value as OutcomeStatus)}
        className="text-sm border border-navy-200 rounded-md px-2 py-1"
      >
        <option value="" disabled>
          Mark class status
        </option>
        {OUTCOME_STATUSES.map((status) => (
          <option key={status} value={status}>
            {OUTCOME_LABELS[status]}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
