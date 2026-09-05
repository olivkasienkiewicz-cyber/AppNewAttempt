'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { format } from 'date-fns';
import { Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  bookSlot, bookAvailabilityWindow, bookSlotsBundle, useAppState, type Slot, type User, type PaymentInfo,
} from '@/lib/store';
import { ALL_SUBJECTS, EGZAMIN_OSMOKLASISTY_SUBJECTS, subjectDisplayLabel } from '@/lib/subjects';
import { amountForSlot } from '@/lib/payment';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { BookingConfirmModal } from '@/components/student/booking-confirm-modal';
import { SubjectRequestModal } from '@/components/student/subject-request-modal';
import { SlotRequestModal } from '@/components/SlotRequestModal';
import { PageHeader } from '@/components/brand/page-header';
import { EmptyState } from '@/components/brand/empty-state';

const WINDOW_STEP_MIN = 30;
const BASE_DURATION_OPTIONS = [60, 90, 120];
const UNI_SUPPORT_SUBJECT = 'University Application Support';
const EGZAMIN_SUBJECT = 'Egzamin ósmoklasisty';
const PINNED_TUTOR_NAME = 'Olivia Sienkiewicz';
const MIN_BUNDLE_SIZE = 2;

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
  const effectiveStudent = isActingAsParent ? (linkedStudent ?? currentUser) : currentUser;

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

  // Free-lesson code check for unlocking a 30-min duration option
  const [trialCode, setTrialCode] = useState('');
  const [checkingTrialCode, setCheckingTrialCode] = useState(false);
  const [trialCodeUnlocked, setTrialCodeUnlocked] = useState<string | null>(null);
  const [trialCodeError, setTrialCodeError] = useState<string | null>(null);

  const durationOptions = useMemo(
    () => (trialCodeUnlocked ? [30, ...BASE_DURATION_OPTIONS] : BASE_DURATION_OPTIONS),
    [trialCodeUnlocked]
  );

  const handleCheckTrialCode = async () => {
    const code = trialCode.trim();
    if (!code) return;
    setCheckingTrialCode(true);
    setTrialCodeError(null);
    try {
      const res = await fetch('/api/discount-codes/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const messages: Record<string, string> = {
          not_found: "That code isn't valid.",
          expired: 'That code has expired.',
          already_redeemed: 'That code has already been used.',
        };
        setTrialCodeError(messages[data?.error] ?? 'Something went wrong — try again.');
        return;
      }
      if (data.requiredDurationMinutes === 30) {
        setTrialCodeUnlocked(code.toUpperCase());
        setWindowDuration(30);
        toast.success('Free 30-minute lesson unlocked!');
      } else {
        setTrialCodeError("That code isn't for a free 30-minute lesson — try it at checkout instead.");
      }
    } catch {
      setTrialCodeError("Couldn't reach the server.");
    } finally {
      setCheckingTrialCode(false);
    }
  };

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

  const [bundleMode, setBundleMode] = useState(false);
  const [selectedSlotIds, setSelectedSlotIds] = useState<Set<string>>(new Set());
  const [bundleDiscountCode, setBundleDiscountCode] = useState('');
  const [bundleDiscountError, setBundleDiscountError] = useState<string | null>(null);
  const [bundleSubmitting, setBundleSubmitting] = useState(false);

  const selectedSlots = useMemo<Slot[]>(
    () => Array.from(selectedSlotIds)
      .map((id) => state.slots[id])
      .filter((s): s is Slot => Boolean(s)),
    [selectedSlotIds, state.slots]
  );
  const selectedTotal = useMemo(
    () => selectedSlots.reduce((sum, s) => sum + amountForSlot(s.durationMinutes, s.subject), 0),
    [selectedSlots]
  );

  const toggleBundleMode = () => {
    setBundleMode((prev) => !prev);
    setSelectedSlotIds(new Set());
    setBundleDiscountCode('');
    setBundleDiscountError(null);
  };

  const toggleSlotSelection = (slotId: string) => {
    setSelectedSlotIds((prev) => {
      const next = new Set(prev);
      if (next.has(slotId)) next.delete(slotId);
      else next.add(slotId);
      return next;
    });
    if (bundleDiscountError) setBundleDiscountError(null);
  };

  const handleBundleCheckout = async () => {
    if (!effectiveStudent || selectedSlotIds.size < MIN_BUNDLE_SIZE) return;
    setBundleSubmitting(true);
    setBundleDiscountError(null);
    try {
      const result = await bookSlotsBundle(
        Array.from(selectedSlotIds),
        effectiveStudent.id,
        bundleDiscountCode.trim() || undefined
      );
      if ('error' in result) {
        toast.error('One of those sessions was just taken — please reselect.');
        return;
      }
      toast.success(`${selectedSlots.length} sessions booked`);
      if (result.discountError) {
        const messages: Record<string, string> = {
          not_found: "That discount code wasn't valid, so the bundle was booked at full price.",
          already_redeemed: 'That discount code has already been used — booked at full price.',
          wrong_type: "That code isn't valid for bundles — booked at full price.",
          wrong_duration: "That code didn't match — booked at full price.",
          expired: 'That discount code has expired — booked at full price.',
        };
        toast.info(messages[result.discountError] ?? 'The discount code could not be applied.');
      } else if (result.payment.discountApplied) {
        toast.success(`Code ${result.payment.discountCode} applied`);
      }
      setPaymentInfo(result.payment);
      setBundleMode(false);
      setSelectedSlotIds(new Set());
      setBundleDiscountCode('');
    } catch {
      toast.error("Couldn't reach the server — check your connection and try again.");
    } finally {
      setBundleSubmitting(false);
    }
  };

  const handleConfirm = async (subject: string | null, discountCode: string | null) => {
    if (!pendingBooking) return;
    if (!effectiveStudent) {
      toast.error('You need to be signed in to book a slot.');
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
              wrong_duration: "That code didn't match this session length — booked at full price.",
              expired: 'That discount code has expired — booked at full price.',
            };
            toast.info(messages[result.discountError] ?? 'The discount code could not be applied.');
          }
          setPaymentInfo(result.payment);
        }
      } else {
        if (!selectedTutorId) return;
        const effectiveDiscountCode = pendingBooking.duration === 30 ? trialCodeUnlocked ?? undefined : discountCode ?? undefined;
        const result = await bookAvailabilityWindow({
          tutorId: selectedTutorId,
          date: pendingBooking.date,
          startTime: pendingBooking.startTime,
          durationMinutes: pendingBooking.duration,
          subject,
          discountCode: effectiveDiscountCode,
          studentId: effectiveStudent.id,
        });
        if ('error' in result) {
          toast.error('That time was just taken — pick another.');
        } else {
          toast.success('Booking confirmed');
          if (result.discountError) {
            toast.error("That free-lesson code couldn't be applied — please contact us.");
          } else if (pendingBooking.duration === 30) {
            setTrialCodeUnlocked(null);
            setTrialCode('');
            setWindowDuration(60);
          }
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

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-8 pb-24 sm:px-6">
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

      <div className="mb-8 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="eyebrow">Browse</p>
          <h1 className="font-display text-4xl text-foreground">Available sessions</h1>
          {isActingAsParent && (
            <p className="text-sm text-muted-foreground">
              {linkedStudent ? `Booking for ${linkedStudent.name}` : 'Booking under your own account'}
            </p>
          )}
        </div>
        <Button
          variant={bundleMode ? 'default' : 'outline'}
          size="sm"
          onClick={toggleBundleMode}
          className="mt-1 shrink-0"
        >
          {bundleMode ? 'Cancel selection' : 'Book multiple'}
        </Button>
      </div>

      {bundleMode && (
        <div className="mb-6 rounded-lg border border-[#16B8A7]/40 bg-[#16B8A7]/5 px-4 py-3">
          <p className="text-sm text-foreground">
            Select two or more sessions below, from any tutor, then pay for them together.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {selectedSlotIds.size} session{selectedSlotIds.size === 1 ? '' : 's'} selected
            {selectedSlots.length > 0 ? ` · ${selectedTotal} PLN` : ''}
          </p>
        </div>
      )}

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
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Subjects</span>
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
              </label>
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
                        {slotsOnDay.map((slot) => {
                          const isSelected = selectedSlotIds.has(slot.id);
                          return (
                            <button
                              key={slot.id}
                              type="button"
                              onClick={() => bundleMode ? toggleSlotSelection(slot.id) : setPendingBooking({ kind: 'fixed', slot })}
                              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                                isSelected
                                  ? 'border-[#16B8A7] bg-[#16B8A7]/10 text-[#16B8A7]'
                                  : 'border-border text-foreground hover:border-[#16B8A7] hover:text-[#16B8A7]'
                              }`}
                            >
                              {slot.startTime}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {!bundleMode && hasAnyWindowsForDay && (
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Choose your own length
                      </p>

                      {!trialCodeUnlocked && (
                        <div className="mb-3 flex items-center gap-2">
                          <Input
                            type="text"
                            value={trialCode}
                            onChange={(e) => { setTrialCode(e.target.value); if (trialCodeError) setTrialCodeError(null); }}
                            placeholder="Mam kod na darmową lekcję 30 min"
                            className="h-9 flex-1 text-sm"
                          />
                          <Button size="sm" variant="outline" disabled={!trialCode.trim() || checkingTrialCode} onClick={() => void handleCheckTrialCode()}>
                            {checkingTrialCode ? '…' : 'Sprawdź'}
                          </Button>
                        </div>
                      )}
                      {trialCodeError && <p className="mb-3 text-xs text-destructive">{trialCodeError}</p>}
                      {trialCodeUnlocked && (
                        <p className="mb-3 text-xs text-success">30-minutowa darmowa lekcja odblokowana kodem {trialCodeUnlocked}.</p>
                      )}

                      <div className="mb-3 w-36">
                        <Select value={String(windowDuration)} onValueChange={(v) => setWindowDuration(Number(v))}>
                          <SelectTrigger className="w-full" aria-label="Session length">
                            <SelectValue>{(value: string) => `${value} min`}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {durationOptions.map((d) => (
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

                  {!bundleMode && (
                    <button
                      type="button"
                      onClick={() => setSlotRequestModalOpen(true)}
                      className="mt-4 text-sm font-medium text-[#16B8A7] hover:underline"
                    >
                      Don't see a time that works? Request one
                    </button>
                  )}
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
                {paymentInfo.discountApplied && (
                  <p className="mt-2 text-sm text-[#16B8A7]">Discount code {paymentInfo.discountCode} applied!</p>
                )}
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

      {bundleMode && selectedSlotIds.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background px-4 py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
          <div className="mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {selectedSlotIds.size} session{selectedSlotIds.size === 1 ? '' : 's'} · {selectedTotal} PLN
              </p>
              {selectedSlotIds.size < MIN_BUNDLE_SIZE && (
                <p className="text-xs text-muted-foreground">Select at least {MIN_BUNDLE_SIZE} sessions to book as a bundle.</p>
              )}
              {bundleDiscountError && <p className="text-xs text-destructive">{bundleDiscountError}</p>}
            </div>
            <Input
              type="text"
              value={bundleDiscountCode}
              onChange={(e) => { setBundleDiscountCode(e.target.value); if (bundleDiscountError) setBundleDiscountError(null); }}
              placeholder="Discount code (optional)"
              className="h-9 w-full text-sm sm:w-48"
            />
            <Button
              disabled={selectedSlotIds.size < MIN_BUNDLE_SIZE || bundleSubmitting}
              onClick={() => void handleBundleCheckout()}
              className="sm:shrink-0"
            >
              {bundleSubmitting ? 'Booking…' : 'Book & Pay'}
            </Button>
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
