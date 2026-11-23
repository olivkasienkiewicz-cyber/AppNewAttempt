'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

export type BookFormTutor = { id: string; name: string; subjects: string[] };
export type BookFormStudent = { id: string; name: string; email: string };

const DURATIONS = [30, 45, 60, 90, 120];

const ERROR_MESSAGES: Record<string, string> = {
  tutor_time_conflict: 'That tutor already has something at that time.',
  subject_not_taught_by_tutor: "That tutor doesn't teach this subject.",
  invalid_date: 'Pick a date.',
  invalid_start_time: 'Pick a start time.',
  invalid_subject: 'Pick a subject.',
  forbidden: 'Only the admin can book sessions.',
};

const fieldClass = 'w-full rounded border border-border bg-background px-2 py-1.5 text-sm';
const labelClass = 'block text-xs font-medium text-muted-foreground mb-1';

// Books a session for a student with a tutor and sends exactly the same
// confirmations as when the student books it themselves (student email with
// bank details, tutor email, admin email, in-app notifications).
export function AdminBookForm({ tutors, students }: { tutors: BookFormTutor[]; students: BookFormStudent[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tutorId, setTutorId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [discountCode, setDiscountCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const tutor = useMemo(() => tutors.find((t) => t.id === tutorId) ?? null, [tutors, tutorId]);

  function onTutorChange(id: string) {
    setTutorId(id);
    const next = tutors.find((t) => t.id === id);
    // Pick the subject automatically when the tutor only teaches one.
    setSubject(next && next.subjects.length === 1 ? next.subjects[0] : '');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setMessage(null);
    if (!tutorId || !studentId) {
      setMessage({ tone: 'error', text: 'Pick a tutor and a student.' });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tutorId,
          studentId,
          date,
          startTime,
          durationMinutes,
          subject,
          discountCode: discountCode.trim() || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; discountError?: string | null };
      if (!res.ok) {
        setMessage({ tone: 'error', text: ERROR_MESSAGES[data.error ?? ''] ?? "Couldn't book the session — try again." });
        return;
      }
      const student = students.find((s) => s.id === studentId);
      setMessage({
        tone: 'ok',
        text: `Booked. Confirmation emails sent to ${student?.name ?? 'the student'}, the tutor and you.${
          data.discountError ? ` The discount code didn't apply (${data.discountError.replace(/_/g, ' ')}).` : ''
        }`,
      });
      setDate('');
      setStartTime('');
      setDiscountCode('');
      router.refresh();
    } catch {
      setMessage({ tone: 'error', text: "Couldn't book the session — try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-6 rounded-lg border border-border p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-sm font-medium text-[#16B8A7] hover:underline"
        aria-expanded={open}
      >
        {open ? '− Book a session for a student' : '+ Book a session for a student'}
      </button>

      {open && (
        <form onSubmit={submit} className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="book-tutor">Tutor</label>
            <select id="book-tutor" value={tutorId} onChange={(e) => onTutorChange(e.target.value)} className={fieldClass} required>
              <option value="" disabled>Select tutor</option>
              {tutors.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="book-student">Student</label>
            <select id="book-student" value={studentId} onChange={(e) => setStudentId(e.target.value)} className={fieldClass} required>
              <option value="" disabled>Select student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="book-subject">Subject</label>
            <select
              id="book-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={fieldClass}
              disabled={!tutor}
              required
            >
              <option value="" disabled>{tutor ? 'Select subject' : 'Select a tutor first'}</option>
              {(tutor?.subjects ?? []).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="book-date">Date</label>
            <input id="book-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldClass} required />
          </div>
          <div>
            <label className={labelClass} htmlFor="book-time">Start time (Poland)</label>
            <input id="book-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={fieldClass} required />
          </div>
          <div>
            <label className={labelClass} htmlFor="book-duration">Length</label>
            <select
              id="book-duration"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className={fieldClass}
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>{d} min</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="book-discount">Discount code (optional)</label>
            <input
              id="book-discount"
              type="text"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              className={fieldClass}
              autoCapitalize="characters"
            />
          </div>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={busy}
              className="rounded bg-[#16B8A7] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy ? 'Booking…' : 'Book & send confirmations'}
            </button>
            {message && (
              <span className={`text-sm ${message.tone === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>{message.text}</span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
