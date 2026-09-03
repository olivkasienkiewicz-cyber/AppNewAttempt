'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { format } from 'date-fns';
import { Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  bookSlot, bookAvailabilityWindow, useAppState, type Slot, type User, type PaymentInfo,
} from '@/lib/store';
import { ALL_SUBJECTS, EGZAMIN_OSMOKLASISTY_SUBJECTS, subjectDisplayLabel } from '@/lib/subjects';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { BookingConfirmModal } from '@/components/student/booking-confirm-modal';
import { SubjectRequestModal } from '@/components/student/subject-request-modal';
import { SlotRequestModal } from '@/components/SlotRequestModal';
import { PageHeader } from '@/components/brand/page-header';
import { EmptyState } from '@/components/brand/empty-state';

const WINDOW_STEP_MIN = 30;
const DURATION_OPTIONS = [60, 90, 120];
const UNI_SUPPORT_SUBJECT = 'University Application Support';
const EGZAMIN_SUBJECT = 'Egzamin ósmoklasisty';
const PINNED_TUTOR_NAME = 'Olivia Sienkiewicz';

type PendingBooking =
  | { kind: 'fixed'; slot: Slot }
  | { kind: 'window'; date: string; startTime: string; duration: number };

function isFutureSlot(slot: Slot, now = new Date()): boolean {
  const [y, m, d] = slot.date.split('-').map(Number);
  const [hh, mm] = slot.startTime.split(':').map(Number);
  const slotStart = new Date(y, m - 1, d, hh, mm);
  return slotStart.getTime() > now.getTime();
}
function formatDDMM(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${d}.${m}`;
}
function formatWeekday(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long' });
}
function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function splitCountries(detail: string | null): string[] {
  if (!detail) return [];
  return detail.split(',').map((p) => p.trim()).filter(Boolean);
}
function filterCategoryLabel(ts: { subject: string; detail: string | null }): string {
  return ts.subject === 'Other' && ts.detail ? ts.detail : ts.subject;
}

export default function StudentBrowsePage() {
  const state = useAppState();
  const router = useRouter();
  const { t } = useLanguage();

  const currentUser = state.currentUserId ? state.users[state.currentUserId] : null;

  const linkedStudent = useMemo(() => {
    if (!currentUser || currentUser.role !== 'parent') return null;
    return Object.values(state.users).find((u) => u.role === 'student' && u.parentId === currentUser.id) ?? null;
  }, [state.users, currentUser]);

  const isActingAsParent = currentUser?.role === 'parent';
  const effectiveStudent = isActingAsParent ? linkedStudent : currentUser;

  const tutors = useMemo<User[]>(() =>
    Object.values(state.users)
      .filter((u) => u.role === 'tutor')
      .sort((a, b) => {
        if (a.name === PINNED_TUTOR_NAME) return -1;
        if (b.name === PINNED_TUTOR_NAME) return 1;
        return a.name.localeCompare(b.name);
      }),
    [state.users]);

  const [searchText, setSearchText] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [slotRequestModalOpen, setSlotRequestModalOpen] = useState(false);

  const isUniSupportSelected = subjectFilter === UNI_SUPPORT_SUBJECT;
  const isEgzaminSelected = subjectFilter === EGZAMIN_SUBJECT;

  useEffect(() => {
    setLevelFilter('all');
  }, [subjectFilter]);

  const subjectOptions = useMemo(() => {
    const offered = new Set<string>();
    for (const tutor of tutors) {
      for (const ts of tutor.subjects) offered.add(filterCategoryLabel(ts));
    }
    const fixed = ALL_SUBJECTS.filter((s) => offered.has(s));
    const custom = Array.from(offered)
      .filter((label) => !(ALL_SUBJECTS as readonly string[]).includes(label))
      .sort((a, b) => a.localeCompare(b));
    return [...fixed, ...custom];
  }, [tutors]);

  const countryOptions = useMemo(() => {
    if (!isUniSupportSelected) return [];
    const set = new Set<string>();
    for (const tutor of tutors) {
      for (const ts of tutor.subjects) {
        if (ts.subject === UNI_SUPPORT_SUBJECT) {
          for (const c of splitCountries(ts.detail)) set.add(c);
        }
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [tutors, isUniSupportSelected]);

  const egzaminSubjectOptions = useMemo(() => {
    if (!isEgzaminSelected) return [];
    const set = new Set<string>();
    for (const tutor of tutors) {
      for (const ts of tutor.subjects) {
        if (ts.subject === EGZAMIN_SUBJECT && ts.detail) set.add(ts.detail);
      }
    }
    const canonical = EGZAMIN_OSMOKLASISTY_SUBJECTS.filter((s) => set.has(s));
    const extra = Array.from(set)
      .filter((s) => !(EGZAMIN_OSMOKLASISTY_SUBJECTS as readonly string[]).includes(s))
      .sort((a, b) => a.localeCompare(b));
    return [...canonical, ...extra];
  }, [tutors, isEgzaminSelected]);

  const filteredTutors = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return tutors.filter((tutor) => {
      if (q && !tutor.name.toLowerCase().includes(q)) return false;

      if (subjectFilter !== 'all') {
        const hasSubject = tutor.subjects.some((ts) => filterCategoryLabel(ts) === subjectFilter);
        if (!hasSubject) return false;
      }

      if (isUniSupportSelected) {
        if (levelFilter !== 'all') {
          const matches = tutor.subjects.some(
            (ts) => ts.subject === UNI_SUPPORT_SUBJECT && splitCountries(ts.detail).includes(levelFilter)
          );
          if (!matches) return false;
        }
      } else if (isEgzaminSelected) {
        if (levelFilter !== 'all') {
          const matches = tutor.subjects.some(
            (ts) => ts.subject === EGZAMIN_SUBJECT && ts.detail === levelFilter
          );
          if (!matches) return false;
        }
      } else if (
        levelFilter !== 'all' &&
        !tutor.subjects.some((ts) => (ts.level ?? '').toUpperCase().includes(levelFilter))
      ) {
        return false;
      }

      return true;
    });
  }, [tutors, searchText, subjectFilter, levelFilter, isUniSupportSelected, isEgzaminSelected]);

  const [selectedTutorId, setSelectedTutorId] = useState<string | null>(null);
  useEffect(() => {
    if (filteredTutors.length === 0) { setSelectedTutorId(null); return; }
    if (!selectedTutorId || !filteredTutors.some((t) => t.id === selectedTutorId)) {
      setSelectedTutorId(filteredTutors[0].id);
    }
  }, [filteredTutors, selectedTutorId]);

  const freeSlotsForTutor = useMemo<Slot[]>(() => {
    if (!selectedTutorId) return [];
    const now = new Date();
    return Object.values(state.slots)
      .filter((s) => s.tutorId === selectedTutorId && s.status === 'free' && isFutureSlot(s, now))
      .sort((a, b) => a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date));
  }, [state.slots, selectedTutorId]);

  const daysWithAvailability = useMemo<string[]>(() => {
    const set = new Set<string>();
    for (const s of freeSlotsForTutor) set.add(s.date);
    if (selectedTutorId) {
      const todayKey = format(new Date(), 'yyyy-MM-dd');
      for (const w of Object.values(state.availabilityWindows)) {
        if (w.tutorId === selectedTutorId && w.date >= todayKey) set.add(w.date);
      }
    }
    return Array.from(set).sort();
  }, [freeSlotsForTutor, state.availabilityWindows, selectedTutorId]);

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  useEffect(() => {
    if (daysWithAvailability.length === 0) { setSelectedDay(null); return; }
    if (!selectedDay || !daysWithAvailability.includes(selectedDay)) setSelectedDay(daysWithAvailability[0]);
  }, [daysWithAvailability, selectedDay]);

  const currentDayIndex = selectedDay ? daysWithAvailability.indexOf(selectedDay) : -1;
  const canGoPrev = currentDayIndex > 0;
  const canGoNext = currentDayIndex >= 0 && currentDayIndex < daysWithAvailability.length - 1;
  const goPrev = () => { if (canGoPrev) setSelectedDay(daysWithAvailability[currentDayIndex - 1]); };
  const goNext = () => { if (canGoNext) setSelectedDay(daysWithAvailability[currentDayIndex + 1]); };

  const slotsOnDay = useMemo<Slot[]>(() =>
    selectedDay ? freeSlotsForTutor.filter((s) => s.date === selectedDay) : [],
    [freeSlotsForTutor, selectedDay]);

  const [windowDuration, setWindowDuration] = useState<number>(60);

  const windowStartOptionsForDay = useMemo<string[]>(() => {
    if (!selectedTutorId || !selectedDay) return [];
    const dayWindows = Object.values(state.availabilityWindows)
      .filter((w) => w.tutorId === selectedTutorId && w.date === selectedDay);
    if (dayWindows.length === 0) return [];
    const daySlotsAll = Object.values(state.slots)
      .filter((s) => s.tutorId === selectedTutorId && s.date === selectedDay);
    const now = new Date();
    const options = new Set<string>();
    for (const w of dayWindows) {
      const wStart = toMinutes(w.startTime);
      const wEnd = toMinutes(w.endTime);
      for (let tm = wStart; tm + windowDuration <= wEnd; tm += WINDOW_STEP_MIN) {
        const candidateEnd = tm + windowDuration;
        const overlapsExisting = daySlotsAll.some((s) => {
          const sStart = toMinutes(s.startTime);
          const sEnd = sStart + s.durationMinutes;
          return tm < sEnd && sStart < candidateEnd;
        });
        if (overlapsExisting) continue;
        if (isFutureSlot({ date: selectedDay, startTime: minutesToTime(tm) } as Slot, now)) {
          options.add(minutesToTime(tm));
        }
      }
    }
    return Array.from(options).sort();
  }, [selectedTutorId, selectedDay, windowDuration, state.availabilityWindows, state.slots]);

  const hasAnyWindowsForDay = useMemo(() => {
    if (!selectedTutorId || !selectedDay) return false;
    return Object.values(state.availabilityWindows).some(
      (w) => w.tutorId === selectedTutorId && w.date === selectedDay
    );
  }, [selectedTutorId, selectedDay, state.availabilityWindows]);

  const [pendingBooking, setPendingBooking] = useState<PendingBooking | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const selectedTutor = selectedTutorId ? state.users[selectedTutorId] : undefined;

  const bookingSubjectOptions = useMemo<string[]>(() => {
    if (!selectedTutor) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const ts of selectedTutor.subjects) {
      const label = subjectDisplayLabel(ts);
      if (!seen.has(label)) { seen.add(label); out.push(label); }
    }
    return out;
  }, [selectedTutor]);

  const previewSlot = useMemo(() => {
    if (!pendingBooking) return null;
    return pendingBooking.kind === 'fixed'
      ? { date: pendingBooking.slot.date, startTime: pendingBooking.slot.startTime }
      : { date: pendingBooking.date, startTime: pendingBooking.startTime };
  }, [pendingBooking]);

  const showPaymentDetails = isActingAsParent || !effectiveStudent?.parentId;

  const handleConfirm = async (subject: string | null, discountCode: string | null) => {
    if (!pendingBooking) return;
    if (!effectiveStudent) {
      toast.error(isActingAsParent ? 'No linked student found on your account.' : 'You need to be signed in to book a slot.');
      setPendingBooking(null);
      return;
    }
    try {
      if (pendingBooking.kind === 'fixed') {
        const result = await bookSlot(pendingBooking.slot.id, effectiveStudent.id, subject, discountCode ?? undefined);
        if ('error' in result) {
          toast.error('That slot was just taken');
        } else {
          toast.success('Booking confirmed');
          if (discountCode && result.discountError) {
            const messages: Record<string, string> = {
              not_found: "That discount code wasn't valid, so the session was booked at full price.",
              already_redeemed: 'That discount code has already been used — booked at full price.',
              wrong_type: "That code isn't valid for single sessions — booked at full price.",
            };
            toast.info(messages[result.discountError] ?? 'The discount code could not be applied.');
          }
          setPaymentInfo(result.payment);
        }
      } else {
        if (!selectedTutorId) return;
        const result = await bookAvailabilityWindow({
          tutorId: selectedTutorId,
          date: pendingBooking.date,
          startTime: pendingBooking.startTime,
          durationMinutes: pendingBooking.duration,
          subject,
        });
        if ('error' in result) {
          toast.error('That time was just taken — pick another.');
        } else {
          toast.success('Booking confirmed');
          setPaymentInfo(result.payment);
        }
      }
    } catch {
      toast.error("Couldn't reach the server — check your connection and try again.");
    }
    setPendingBooking(null);
  };

  const handleSwitchAccount = () => { void signOut({ callbackUrl: '/' }); };

  if (state.dataLoaded && currentUser && currentUser.role !== 'student' && !isActingAsParent) {
    return (
      <div className="p-6">This page is for students.</div>
    );
  }
  if (state.dataLoaded && isActingAsParent && !linkedStudent) {
    return (
      <div className="p-6">No linked student found on your account.</div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-8 pb-12 sm:px-6">
      <PageHeader>
        <Button variant="ghost" size="icon" aria-label="Notifications"
          onClick={() => router.push('/notifications')} className="h-10 w-10">
          <Bell className="h-[18px] w-[18px]" />
        </Button>
        {!isActingAsParent && (
          <>
            <Button variant="ghost" onClick={() => router.push('/student/bookings')} className="h-10">My bookings</Button>
            <Button variant="ghost" onClick={() => router.push('/account')} className="h-10">Account</Button>
          </>
        )}
        {isActingAsParent && (
          <Button variant="ghost" onClick={() => router.push('/parent')} className="h-10">My bookings</Button>
        )}
        <Button variant="ghost" onClick={handleSwitchAccount} className="h-10">Switch account</Button>
      </PageHeader>

      <div className="mb-8 space-y-1">
        <p className="eyebrow">Browse</p>
        <h1 className="font-display text-4xl text-foreground">Available sessions</h1>
        {isActingAsParent && linkedStudent && (
          <p className="text-sm text-muted-foreground">Booking for {linkedStudent.name}</p>
        )}
      </div>

      {!state.dataLoaded ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : tutors.length === 0 ? (
        <EmptyState>No tutors have joined yet. Switch to a tutor account to publish slots.</EmptyState>
      ) : (
        <>
          <div className="mb-6 space-y-3">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={t.browse.searchPlaceholder}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="grid grid-cols-2 gap-3">
              <Select value={subjectFilter} onValueChange={(value) => setSubjectFilter(value ?? 'all')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t.browse.subjectLabel} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.browse.subjectAll}</SelectItem>
                  {subjectOptions.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={levelFilter} onValueChange={(value) => setLevelFilter(value ?? 'all')}>
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      isUniSupportSelected
                        ? 'Country / University'
                        : isEgzaminSelected
                        ? 'Which subject?'
                        : t.browse.levelLabel
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {isUniSupportSelected
                      ? 'All countries'
                      : isEgzaminSelected
                      ? 'All subjects'
                      : t.browse.levelAll}
                  </SelectItem>
                  {isUniSupportSelected ? (
                    countryOptions.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))
                  ) : isEgzaminSelected ? (
                    egzaminSubjectOptions.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="HL">HL</SelectItem>
                      <SelectItem value="SL">SL</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <button
              type="button"
              onClick={() => setRequestModalOpen(true)}
              className="text-sm font-medium text-[#16B8A7] hover:underline"
            >
              {t.browse.requestSubjectLink}
            </button>
          </div>

          {filteredTutors.length === 0 ? (
            <EmptyState>
              <p>{t.browse.noMatchesTitle}</p>
              <p className="mt-1 text-sm">{t.browse.noMatchesBody}</p>
              <button
                type="button"
                onClick={() => setRequestModalOpen(true)}
                className="mt-3 text-sm font-medium text-[#16B8A7] hover:underline"
              >
                {t.subjectRequest.emptyStatePrompt}
              </button>
            </EmptyState>
          ) : (
            <>
              <div className="mb-8">
                {filteredTutors.length === 1 ? (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Tutor · </span>
                    <span className="font-medium">{filteredTutors[0].name}</span>
                  </p>
                ) : (
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-muted-foreground">Tutor</span>
                    <Select
                      value={selectedTutorId ?? undefined}
                      onValueChange={(value) => setSelectedTutorId(value ?? null)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a tutor">
                          {(value: string) => filteredTutors.find((t) => t.id === value)?.name ?? 'Select a tutor'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {filteredTutors.map((tutor) => (
                          <SelectItem key={tutor.id} value={tutor.id}>{tutor.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                )}
                {selectedTutor && selectedTutor.subjects.length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {selectedTutor.subjects
                      .map((ts) => {
                        const label = subjectDisplayLabel(ts);
                        const extra = ts.subject === UNI_SUPPORT_SUBJECT && ts.detail ? ` (${ts.detail})` : '';
                        return label + (ts.level ? ` (${ts.level})` : '') + extra;
                      })
                      .join(' · ')}
                  </p>
                )}
                {selectedTutor && (
                  <button
                    type="button"
                    onClick={() => router.push(`/messages/${selectedTutor.id}`)}
                    className="mt-2 text-sm font-medium text-[#16B8A7] hover:underline"
                  >
                    Message {selectedTutor.name}
                  </button>
                )}
              </div>

              {daysWithAvailability.length === 0 ? (
                <EmptyState>
                  <p>No open slots for {selectedTutor?.name ?? 'this tutor'} right now.</p>
                  <button
                    type="button"
                    onClick={() => setSlotRequestModalOpen(true)}
                    className="mt-3 text-sm font-medium text-[#16B8A7] hover:underline"
                  >
                    Request a time
                  </button>
                </EmptyState>
              ) : (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Previous day"
                      disabled={!canGoPrev}
                      onClick={goPrev}
                      className="h-9 w-9"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">
                        {selectedDay ? formatWeekday(selectedDay) : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedDay ? formatDDMM(selectedDay) : ''}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Next day"
                      disabled={!canGoNext}
                      onClick={goNext}
                      className="h-9 w-9"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  {slotsOnDay.length > 0 && (
                    <div className="mb-6">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Fixed sessions
                      </p>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {slotsOnDay.map((slot) => (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => setPendingBooking({ kind: 'fixed', slot })}
                            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-[#16B8A7] hover:text-[#16B8A7] transition-colors"
                          >
                            {slot.startTime}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {hasAnyWindowsForDay && (
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Choose your own length
                      </p>
                      <div className="mb-3 w-36">
                        <Select value={String(windowDuration)} onValueChange={(v) => setWindowDuration(Number(v))}>
                          <SelectTrigger className="w-full" aria-label="Session length">
                            <SelectValue>{(value: string) => `${value} min`}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {DURATION_OPTIONS.map((d) => (
                              <SelectItem key={d} value={String(d)}>{d} min</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {windowStartOptionsForDay.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No open availability long enough for {windowDuration} min on this day.
                        </p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {windowStartOptionsForDay.map((startTime) => (
                            <button
                              key={startTime}
                              type="button"
                              onClick={() => {
                                if (!selectedDay) return;
                                setPendingBooking({ kind: 'window', date: selectedDay, startTime, duration: windowDuration });
                              }}
                              className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-[#16B8A7] hover:text-[#16B8A7] transition-colors"
                            >
                              {startTime}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setSlotRequestModalOpen(true)}
                    className="mt-4 text-sm font-medium text-[#16B8A7] hover:underline"
                  >
                    Don't see a time that works? Request one
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      <BookingConfirmModal
        open={pendingBooking !== null}
        onOpenChange={(nextOpen) => { if (!nextOpen) setPendingBooking(null); }}
        tutorName={selectedTutor?.name ?? ''}
        slot={previewSlot}
        subjectOptions={bookingSubjectOptions}
        onConfirm={handleConfirm}
      />

      {paymentInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-background p-6 shadow-xl">
            <h2 className="font-display text-2xl text-foreground">Booking confirmed</h2>
            {showPaymentDetails ? (
              <>
                <p className="mt-2 text-sm text-muted-foreground">
                  Please transfer payment within 48 hours using the details below.
                </p>
                <div className="mt-4 space-y-2 rounded-lg border border-border p-4 text-sm">
                  <p><span className="text-muted-foreground">Reference: </span>{paymentInfo.referenceCode}</p>
                  <p><span className="text-muted-foreground">Amount: </span>{paymentInfo.amount} {paymentInfo.currency}</p>
                  <p><span className="text-muted-foreground">Account holder: </span>{paymentInfo.bankDetails.accountHolder}</p>
                  <p><span className="text-muted-foreground">IBAN: </span>{paymentInfo.bankDetails.iban}</p>
                  <p><span className="text-muted-foreground">Bank: </span>{paymentInfo.bankDetails.bankName}</p>
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Your session is booked. Your parent will handle payment for this session.
              </p>
            )}
            <Button className="mt-6 w-full" onClick={() => setPaymentInfo(null)}>Done</Button>
          </div>
        </div>
      )}

      <SubjectRequestModal open={requestModalOpen} onOpenChange={setRequestModalOpen} />
      {selectedTutorId && (
        <SlotRequestModal
          open={slotRequestModalOpen}
          onOpenChange={setSlotRequestModalOpen}
          tutorId={selectedTutorId}
        />
      )}
    </main>
  );
}
