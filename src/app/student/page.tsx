'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  bookSlot, useAppState, type Slot, type User, type PaymentInfo,
} from '@/lib/store';
import { useLanguage } from '@/components/providers';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { BookingConfirmModal } from '@/components/student/booking-confirm-modal';
import { SubjectRequestModal } from '@/components/student/subject-request-modal';
import { PageHeader } from '@/components/brand/page-header';
import { EmptyState } from '@/components/brand/empty-state';

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

export default function StudentBrowsePage() {
  const state = useAppState();
  const router = useRouter();
  const { t } = useLanguage();

  const tutors = useMemo<User[]>(() =>
    Object.values(state.users).filter((u) => u.role === 'tutor').sort((a, b) => a.name.localeCompare(b.name)),
    [state.users]);

  // --- Part A: filters ---
  const [searchText, setSearchText] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [requestModalOpen, setRequestModalOpen] = useState(false);

  const subjectOptions = useMemo(() => {
    const set = new Set<string>();
    for (const tutor of tutors) {
      if (tutor.subject) set.add(tutor.subject);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [tutors]);

  const filteredTutors = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return tutors.filter((tutor) => {
      if (q && !tutor.name.toLowerCase().includes(q)) return false;
      if (subjectFilter !== 'all' && tutor.subject !== subjectFilter) return false;
      if (levelFilter !== 'all' && !(tutor.level ?? '').toUpperCase().includes(levelFilter)) return false;
      return true;
    });
  }, [tutors, searchText, subjectFilter, levelFilter]);

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

  const daysWithSlots = useMemo<string[]>(() => {
    const set = new Set<string>();
    for (const s of freeSlotsForTutor) set.add(s.date);
    return Array.from(set).sort();
  }, [freeSlotsForTutor]);

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  useEffect(() => {
    if (daysWithSlots.length === 0) { setSelectedDay(null); return; }
    if (!selectedDay || !daysWithSlots.includes(selectedDay)) setSelectedDay(daysWithSlots[0]);
  }, [daysWithSlots, selectedDay]);

  const currentDayIndex = selectedDay ? daysWithSlots.indexOf(selectedDay) : -1;
  const canGoPrev = currentDayIndex > 0;
  const canGoNext = currentDayIndex >= 0 && currentDayIndex < daysWithSlots.length - 1;
  const goPrev = () => { if (canGoPrev) setSelectedDay(daysWithSlots[currentDayIndex - 1]); };
  const goNext = () => { if (canGoNext) setSelectedDay(daysWithSlots[currentDayIndex + 1]); };

  const slotsOnDay = useMemo<Slot[]>(() =>
    selectedDay ? freeSlotsForTutor.filter((s) => s.date === selectedDay) : [],
    [freeSlotsForTutor, selectedDay]);

  const [pendingSlot, setPendingSlot] = useState<Slot | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const selectedTutor = selectedTutorId ? state.users[selectedTutorId] : undefined;

  const handleConfirm = async () => {
    if (!pendingSlot) return;
    if (!state.currentUserId) { toast.error('You need to be signed in to book a slot.'); setPendingSlot(null); return; }
    try {
      const result = await bookSlot(pendingSlot.id, state.currentUserId);
      if ('error' in result) {
        toast.error('That slot was just taken');
      } else {
        toast.success('Booking confirmed');
        setPaymentInfo(result.payment);
      }
    } catch {
      toast.error("Couldn't reach the server — check your connection and try again.");
    }
    setPendingSlot(null);
  };

  const handleSwitchAccount = () => { void signOut({ callbackUrl: '/' }); };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-8 pb-12 sm:px-6">
      <PageHeader>
        <Button variant="ghost" size="icon" aria-label="Notifications"
          onClick={() => router.push('/notifications')} className="h-10 w-10">
          <Bell className="h-[18px] w-[18px]" />
        </Button>
        <Button variant="ghost" onClick={handleSwitchAccount} className="h-10">Switch account</Button>
      </PageHeader>

      <div className="mb-8 space-y-1">
        <p className="eyebrow">Browse</p>
        <h1 className="font-display text-4xl text-foreground">Available sessions</h1>
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
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
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
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t.browse.levelLabel} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.browse.levelAll}</SelectItem>
                  <SelectItem value="HL">HL</SelectItem>
                  <SelectItem value="SL">SL</SelectItem>
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
                    <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Tutor</span>
                    <Select value={selectedTutorId ?? undefined} onValueChange={setSelectedTutorId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a tutor">{selectedTutor?.name ?? 'Choose a tutor'}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {filteredTutors.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </label>
                )}
              </div>

              {selectedDay && (
                <div className="mb-8 flex items-center justify-between border-y border-border py-5">
                  <Button variant="ghost" size="icon" aria-label="Previous day with free slots"
                    disabled={!canGoPrev} onClick={goPrev} className="h-11 w-11">
                    <ChevronLeft className="h-5 w-5" aria-hidden />
                  </Button>
                  <div className="text-center">
                    <div className="font-display text-4xl text-foreground tabular-nums">{formatDDMM(selectedDay)}</div>
                    <div className="mt-0.5 text-xs uppercase tracking-wider text-muted-foreground">{formatWeekday(selectedDay)}</div>
                  </div>
                  <Button variant="ghost" size="icon" aria-label="Next day with free slots"
                    disabled={!canGoNext} onClick={goNext} className="h-11 w-11">
                    <ChevronRight className="h-5 w-5" aria-hidden />
                  </Button>
                </div>
              )}

              {selectedDay && slotsOnDay.length === 0 ? (
                <EmptyState>No free slots on this day.</EmptyState>
              ) : !selectedDay ? (
                <EmptyState>No upcoming slots from this tutor.</EmptyState>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
                  {slotsOnDay.map((slot) => (
                    <button key={slot.id} type="button" onClick={() => setPendingSlot(slot)}
                      className="flex h-16 items-center justify-center rounded-lg border border-border bg-card text-base font-medium tabular-nums transition-colors hover:border-foreground/30 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      {slot.startTime}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      <BookingConfirmModal
        open={pendingSlot !== null}
        onOpenChange={(open) => { if (!open) setPendingSlot(null); }}
        tutorName={selectedTutor?.name ?? ''}
        slot={pendingSlot}
        onConfirm={handleConfirm}
      />

      <SubjectRequestModal
        open={requestModalOpen}
        onOpenChange={setRequestModalOpen}
      />

      {paymentInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg">
            <h2 className="font-display text-2xl text-foreground">Complete payment by bank transfer</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your slot is booked. Please transfer the amount below to confirm it, using the reference code so we can match your payment.
            </p>

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Account holder</dt>
                <dd className="text-right font-medium">{paymentInfo.bankDetails.accountHolder}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">IBAN</dt>
                <dd className="text-right font-medium tabular-nums">{paymentInfo.bankDetails.iban}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Bank</dt>
                <dd className="text-right font-medium">{paymentInfo.bankDetails.bankName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Amount</dt>
                <dd className="text-right font-medium tabular-nums">{paymentInfo.amount.toFixed(2)} {paymentInfo.currency}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Reference</dt>
                <dd className="text-right font-medium tabular-nums">{paymentInfo.referenceCode}</dd>
              </div>
            </dl>

            <p className="mt-4 text-xs text-muted-foreground">
              Please include the reference code exactly as shown — it&apos;s the only way we can match your transfer to this booking.
            </p>

            <Button className="mt-6 w-full" onClick={() => setPaymentInfo(null)}>
              Got it
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
