'use client';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

export function BookingConfirmModal({
  open,
  onOpenChange,
  tutorName,
  slot,
  onConfirm,
}: Props) {
  const ddmm = slot
    ? (() => {
        const [, m, d] = slot.date.split('-');
        return `${d}.${m}`;
      })()
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {slot && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm booking</DialogTitle>
          </DialogHeader>
          <p className="text-sm">
            Book with <span className="font-medium">{tutorName}</span> on{' '}
            <span className="font-medium">{ddmm}</span> at{' '}
            <span className="font-medium">{slot.startTime}</span>?
          </p>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={onConfirm}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
