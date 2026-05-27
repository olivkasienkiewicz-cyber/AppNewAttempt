import { cn } from '@/lib/utils';

export function EmptyState({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-lg border border-border bg-card px-6 py-12 text-center',
        className,
      )}
    >
      <svg width="48" height="48" viewBox="0 0 28 28" aria-hidden focusable="false" className="text-muted-foreground/40">
        <rect x="2" y="4"  width="22" height="4.2" rx="1.4" fill="none" stroke="currentColor" strokeWidth="0.8"/>
        <rect x="2" y="10" width="22" height="4.2" rx="1.4" fill="none" stroke="currentColor" strokeWidth="0.8"/>
        <rect x="2" y="16" width="22" height="4.2" rx="1.4" fill="none" stroke="currentColor" strokeWidth="0.8"/>
        <rect x="2" y="22" width="16" height="4.2" rx="1.4" fill="none" stroke="currentColor" strokeWidth="0.8"/>
      </svg>
      <div className="max-w-sm text-sm text-muted-foreground">{children}</div>
    </div>
  );
}
