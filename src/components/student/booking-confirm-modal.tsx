'use client';
import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

type PreviewSlot = { date: string; startTime: string };
type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tutorName: string;
  slot: PreviewSlot | null;
  subjectOptions: string[];
  onConfirm: (subject: string | null, discountCode: string | null) => void;
};

export function BookingConfirmModal({ open, onOpenChange, tutorName, slot, subjectOptions, onConfirm }: Props) {
  const [selectedSubject, setSelectedSubject] = useState<string | undefined>(undefined);
  const [discountCode, setDiscountCode] = useState('');

  useEffect(() => {
    if (open) {
      setSelectedSubject(subjectOptions.length === 1 ? subjectOptions[0] : undefined);
      setDiscountCode('');
    }
  }, [open, subjectOptions]);

  const ddmm = slot
    ? (() => { const [, m, d] = slot.date.split('-'); return `${d}.${m}`; })()
    : '';
  const needsChoice = subjectOptions.length > 1;
  const canConfirm = !needsChoice || !!selectedSubject;

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
          {subjectOptions.length > 0 && (
            <div className="flex flex-col gap-2 pt-2">
              <Label className="text-xs text-muted-foreground">Which subject is this session for?</Label>
              {subjectOptions.length === 1 ? (
                <p className="text-sm font-medium text-foreground">{subjectOptions[0]}</p>
              ) : (
                <Select value={selectedSubject} onValueChange={(value) => setSelectedSubject(value ?? undefined)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjectOptions.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
          <div className="flex flex-col gap-2 pt-2">
            <Label htmlFor="discount-code" className="text-xs text-muted-foreground">
              Discount code (optional)
            </Label>
            <Input
              id="discount-code"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              placeholder="e.g. FAIR2026"
              className="h-10"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              disabled={!canConfirm}
              onClick={() => onConfirm(selectedSubject ?? null, discountCode.trim() || null)}
            >
              Confirm
            </Button>
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
