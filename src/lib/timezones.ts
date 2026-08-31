// Poland (Europe/Warsaw) is the canonical timezone for all stored dates
// and times — every slot's `date` and `startTime` in the database is
// always Poland local time, regardless of which zone a tutor entered it
// in or which zone a student is viewing it in. Conversion only ever
// happens at the UI edges: tutors convert their input INTO Poland time
// before saving, and students convert Poland time OUT to their chosen
// display zone. Nothing about storage or overlap-checking changes.
export const CANONICAL_TIMEZONE = 'Europe/Warsaw';

export const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: 'Europe/Warsaw', label: 'Warsaw (Poland — standard)' },
  { value: 'Europe/London', label: 'London (UK)' },
  { value: 'Europe/Dublin', label: 'Dublin (Ireland)' },
  { value: 'Europe/Paris', label: 'Paris (France)' },
  { value: 'Europe/Berlin', label: 'Berlin (Germany)' },
  { value: 'Europe/Madrid', label: 'Madrid (Spain)' },
  { value: 'Europe/Rome', label: 'Rome (Italy)' },
  { value: 'Europe/Athens', label: 'Athens (Greece)' },
  { value: 'Europe/Moscow', label: 'Moscow (Russia)' },
  { value: 'America/New_York', label: 'New York (US Eastern)' },
  { value: 'America/Chicago', label: 'Chicago (US Central)' },
  { value: 'America/Denver', label: 'Denver (US Mountain)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (US Pacific)' },
  { value: 'America/Toronto', label: 'Toronto (Canada)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (Brazil)' },
  { value: 'Asia/Dubai', label: 'Dubai (UAE)' },
  { value: 'Asia/Kolkata', label: 'Mumbai / Delhi (India)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (China)' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Asia/Tokyo', label: 'Tokyo (Japan)' },
  { value: 'Australia/Sydney', label: 'Sydney (Australia)' },
] as const;

// Offset (in minutes, positive = ahead of UTC) of `timeZone` at the given
// instant. Computed via Intl.DateTimeFormat rather than a library, since
// the app has no other timezone dependency yet.
function offsetMinutesAt(utcInstant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts = dtf.formatToParts(utcInstant);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const asUtcMs = Date.UTC(
    Number(map.year), Number(map.month) - 1, Number(map.day),
    Number(map.hour), Number(map.minute), Number(map.second)
  );
  return (asUtcMs - utcInstant.getTime()) / 60000;
}

// Converts a wall-clock date+time (e.g. "2026-03-10" / "14:00") as
// understood in `fromZone` into the equivalent wall-clock date+time in
// `toZone`. Two passes handle DST transitions correctly in all but the
// rare ambiguous/skipped hour right at a transition boundary.
export function convertWallTime(
  date: string,
  time: string,
  fromZone: string,
  toZone: string
): { date: string; time: string } {
  if (fromZone === toZone) return { date, time };

  const guessUtcMs = Date.parse(`${date}T${time}:00Z`);
  const offsetA1 = offsetMinutesAt(new Date(guessUtcMs), fromZone);
  const refinedUtcMs = guessUtcMs - offsetA1 * 60000;
  const offsetA2 = offsetMinutesAt(new Date(refinedUtcMs), fromZone);
  const actualUtcMs = guessUtcMs - offsetA2 * 60000;

  const offsetB = offsetMinutesAt(new Date(actualUtcMs), toZone);
  const displayMs = actualUtcMs + offsetB * 60000;
  const d = new Date(displayMs);

  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${mi}` };
}

// Best-effort guess at the browser's own IANA zone, for defaulting a
// student's display-zone dropdown. Falls back to the canonical zone if
// detection fails or returns something not in our curated list.
export function detectBrowserTimezone(): string {
  try {
    const guess = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (TIMEZONE_OPTIONS.some((o) => o.value === guess)) return guess;
  } catch {
    /* Intl not available or threw — fall through to default */
  }
  return CANONICAL_TIMEZONE;
}
