'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  WORK_CHECK_CONFIG,
  workCheckLabel,
  workCheckPrice,
  type WorkCheck,
  type WorkCheckStatus,
} from '@/lib/work-check';

type Tutor = { id: string; name: string };
type Tab = 'action' | 'review' | 'delivered' | 'cancelled';

const STATUS_PILL: Record<WorkCheckStatus, { label: string; cls: string }> = {
  awaiting_quote: { label: 'Needs price', cls: 'bg-violet-100 text-violet-700' },
  awaiting_payment: { label: 'Awaiting payment', cls: 'bg-amber-100 text-amber-700' },
  paid: { label: 'Paid', cls: 'bg-sky-100 text-sky-700' },
  delivered: { label: 'Delivered', cls: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-700' },
};

function tabFor(c: WorkCheck): Tab {
  if (c.status === 'cancelled') return 'cancelled';
  if (c.status === 'delivered') return 'delivered';
  if (c.status === 'paid' && c.tutorId) return 'review';
  return 'action';
}

function fmt(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function AdminWorkChecksTable({
  checks,
  basePrices,
  tutors,
}: {
  checks: WorkCheck[];
  basePrices: Record<string, number | null>;
  tutors: Tutor[];
}) {
  const router = useRouter();
  // Latest server copy of each check the admin changed on this page; the
  // rest come straight from the (refreshed) server props.
  const [updates, setUpdates] = useState<Record<string, WorkCheck>>({});
  const data = useMemo(() => checks.map((c) => updates[c.id] ?? c), [checks, updates]);
  const [now] = useState(() => Date.now());
  const [tab, setTab] = useState<Tab>('action');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState<Record<string, string>>({});
  const [payoutDraft, setPayoutDraft] = useState<Record<string, string>>({});

  const counts = useMemo(() => {
    const out: Record<Tab, number> = { action: 0, review: 0, delivered: 0, cancelled: 0 };
    for (const c of data) out[tabFor(c)]++;
    return out;
  }, [data]);
  const visible = data.filter((c) => tabFor(c) === tab);

  async function act(id: string, payload: Record<string, unknown>, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/work-checks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'failed');
      const updated = json.check as WorkCheck;
      setUpdates((prev) => ({ ...prev, [id]: updated }));
      router.refresh();
    } catch (err) {
      alert(`Couldn't update this check (${(err as Error).message}) — try again.`);
    } finally {
      setBusyId(null);
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'action', label: 'Needs action' },
    { key: 'review', label: 'In review' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              tab === t.key ? 'bg-[#0E2A47] text-white' : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label} <span className="opacity-70">({counts[t.key]})</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing here.</p>
      ) : (
        <div className="space-y-3">
          {visible.map((c) => {
            const cfg = WORK_CHECK_CONFIG[c.product];
            const pill = STATUS_PILL[c.status];
            const busy = busyId === c.id;
            const basePrice = basePrices[c.id] ?? cfg?.price ?? 0;
            const priceInput = priceDraft[c.id] ?? String(basePrice);
            const previewTotal = Number(priceInput) > 0
              ? workCheckPrice(c.product, { secondCheck: c.secondCheck }, Number(priceInput))
              : null;
            const payoutInput = payoutDraft[c.id] ?? (c.tutorPayout != null ? String(c.tutorPayout) : '');
            const overdue = c.status === 'paid' && c.dueAt != null && new Date(c.dueAt).getTime() < now;

            return (
              <div key={c.id} className="rounded-lg border border-border p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {workCheckLabel(c.product)}
                      {c.subject ? ` – ${c.subject}` : ''}
                      {c.secondCheck && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">2nd check</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.studentName ?? '—'} · ordered {fmt(c.createdAt)} · <span className="font-mono">{c.referenceCode}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${pill.cls}`}>{pill.label}</span>
                    <p className="mt-1 font-semibold">
                      {c.amount != null ? `${c.amount.toFixed(2)} PLN` : `from ${cfg?.price ?? '?'} PLN`}
                    </p>
                    {c.discountCode && (
                      <p className="text-xs text-muted-foreground">
                        code {c.discountCode}
                        {c.status === 'awaiting_quote' ? ' (applied with price)' : ''}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <a href={c.draftUrl} target="_blank" rel="noopener noreferrer" className="text-[#16B8A7] hover:underline">
                    Draft: {c.draftName}
                  </a>
                  {c.feedbackUrl && (
                    <a href={c.feedbackUrl} target="_blank" rel="noopener noreferrer" className="text-[#16B8A7] hover:underline">
                      Feedback: {c.feedbackName}
                    </a>
                  )}
                  {c.paidAt && <span className="text-muted-foreground">Paid {fmt(c.paidAt)}</span>}
                  {c.dueAt && c.status === 'paid' && (
                    <span className={overdue ? 'font-medium text-red-600' : 'text-muted-foreground'}>Due {fmt(c.dueAt)}</span>
                  )}
                  {c.deliveredAt && <span className="text-muted-foreground">Delivered {fmt(c.deliveredAt)}</span>}
                </div>
                {c.studentNote && <p className="mt-2 whitespace-pre-line rounded bg-muted/50 p-2 text-xs">{c.studentNote}</p>}

                {c.status !== 'cancelled' && (
                  <div className="mt-3 flex flex-wrap items-end gap-4 border-t border-border/60 pt-3">
                    {(c.status === 'awaiting_quote' || c.status === 'awaiting_payment') && cfg?.fromPrice && (
                      <label className="text-xs">
                        <span className="mb-1 block text-muted-foreground">
                          Base price (PLN){previewTotal != null && c.secondCheck ? ` → ${previewTotal} as 2nd check` : ''}
                        </span>
                        <span className="flex gap-2">
                          <input
                            type="number"
                            min={1}
                            value={priceInput}
                            onChange={(e) => setPriceDraft((p) => ({ ...p, [c.id]: e.target.value }))}
                            className="w-24 rounded border border-border bg-background px-2 py-1"
                          />
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => act(c.id, { action: 'set_price', basePrice: Number(priceInput) })}
                            className="rounded bg-[#16B8A7] px-2.5 py-1 font-medium text-white disabled:opacity-50"
                          >
                            {c.status === 'awaiting_quote' ? 'Confirm price & email' : 'Update price'}
                          </button>
                        </span>
                      </label>
                    )}

                    {c.status !== 'delivered' && (
                      <label className="text-xs">
                        <span className="mb-1 block text-muted-foreground">Tutor</span>
                        <select
                          value={c.tutorId ?? ''}
                          disabled={busy}
                          onChange={(e) => act(c.id, { action: 'assign', tutorId: e.target.value || null })}
                          className="rounded border border-border bg-background px-2 py-1 disabled:opacity-50"
                        >
                          <option value="">Unassigned</option>
                          {tutors.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {c.status === 'delivered' && <span className="text-xs">Tutor: <strong>{c.tutorName ?? '—'}</strong></span>}

                    <label className="text-xs">
                      <span className="mb-1 block text-muted-foreground">Tutor payout (PLN)</span>
                      <span className="flex gap-2">
                        <input
                          type="number"
                          min={0}
                          value={payoutInput}
                          placeholder="—"
                          onChange={(e) => setPayoutDraft((p) => ({ ...p, [c.id]: e.target.value }))}
                          className="w-24 rounded border border-border bg-background px-2 py-1"
                        />
                        {payoutDraft[c.id] !== undefined && payoutDraft[c.id] !== String(c.tutorPayout ?? '') && (
                          <button
                            type="button"
                            disabled={busy || payoutInput === ''}
                            onClick={() => act(c.id, { action: 'set_payout', payout: Number(payoutInput) })}
                            className="rounded border border-border px-2.5 py-1 font-medium disabled:opacity-50"
                          >
                            Save
                          </button>
                        )}
                      </span>
                    </label>

                    <div className="ml-auto flex gap-3 text-xs font-medium">
                      {c.status === 'awaiting_payment' && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => act(c.id, { action: 'mark_paid' })}
                          className="rounded bg-[#0E2A47] px-3 py-1.5 text-white disabled:opacity-50"
                        >
                          Mark paid
                        </button>
                      )}
                      {c.status === 'paid' && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => act(c.id, { action: 'mark_unpaid' }, 'Move this check back to awaiting payment?')}
                          className="text-muted-foreground hover:underline disabled:opacity-50"
                        >
                          Mark unpaid
                        </button>
                      )}
                      {c.status !== 'delivered' && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => act(c.id, { action: 'cancel' }, 'Cancel this check? The student is not emailed.')}
                          className="text-red-600 hover:underline disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {c.feedbackSummary && (
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer text-muted-foreground">Tutor&apos;s summary</summary>
                    <p className="mt-1 whitespace-pre-line">{c.feedbackSummary}</p>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
