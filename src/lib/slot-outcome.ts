export const OUTCOME_STATUSES = [
  "completed",
  "student_absence",
  "tutor_absence",
  "moved_per_policy",
  "moved_outside_policy",
] as const;

export type OutcomeStatus = (typeof OUTCOME_STATUSES)[number];

export const OUTCOME_LABELS: Record<OutcomeStatus, string> = {
  completed: "Completed",
  student_absence: "Student absence",
  tutor_absence: "Tutor absence",
  moved_per_policy: "Moved/cancelled according to policy",
  moved_outside_policy: "Moved/cancelled outside of policy",
};

// Outcomes whose slot.amount should be included when building a payment batch
const PAYOUT_ELIGIBLE: ReadonlySet<OutcomeStatus> = new Set([
  "completed",
  "student_absence",
  "moved_outside_policy",
]);

export function isPayoutEligible(outcome: OutcomeStatus | null): boolean {
  if (!outcome) return false;
  return PAYOUT_ELIGIBLE.has(outcome);
}

export function isValidOutcomeStatus(value: string): value is OutcomeStatus {
  return (OUTCOME_STATUSES as readonly string[]).includes(value);
}
