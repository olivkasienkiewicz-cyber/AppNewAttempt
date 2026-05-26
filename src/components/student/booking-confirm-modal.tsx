'use client';

import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Slot } from '@/lib/store';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tutorName: string;
  slot: Slot | null;
  onConfirm: () => void;
};

export function BookingConfirmModal({ open, onOpenChange, tutorName, slot, onConfirm }: Props) {
  const ddmm = slot
    ? (() => { const [, m, d] = slot.date.split('-'); return `${d}.${m}`; })()
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {slot && (
        <DialogContent>
          <DialogHeader>
            <p className="eyebrow">Confirm</p>
            <DialogTitle className="font-display text-2xl">Book this slot?</DialogTitle>
          </DialogHeader>

          <dl className="text-sm">
            <DetailRow label="Tutor" value={tutorName} />
            <DetailRow label="Date" value={ddmm} mono />
            <DetailRow label="Time" value={slot.startTime} mono />
          </dl>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={onConfirm}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2.5 last:border-b-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? 'font-medium tabular-nums text-foreground' : 'font-medium text-foreground'}>
        {value}
      </dd>
    </div>
  );
}
