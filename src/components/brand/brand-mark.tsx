import { cn } from '@/lib/utils';

type Size = 'sm' | 'md' | 'lg';

export function BrandMark({
  size = 'md',
  wordmark = true,
  className,
}: {
  size?: Size;
  wordmark?: boolean;
  className?: string;
}) {
  const sizes: Record<Size, { mark: number; gap: string; word: string }> = {
    sm: { mark: 18, gap: 'gap-1.5', word: 'text-sm' },
    md: { mark: 22, gap: 'gap-2',   word: 'text-[15px]' },
    lg: { mark: 30, gap: 'gap-2.5', word: 'text-xl' },
  };
  const s = sizes[size];

  return (
    <span
      className={cn('inline-flex items-center', s.gap, className)}
      aria-label="Studilly"
    >
      <svg
        width={s.mark}
        height={s.mark}
        viewBox="0 0 28 28"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        focusable="false"
      >
        <rect x="2" y="4"  width="22" height="4.2" rx="1.4" fill="#0E2A47" />
        <rect x="2" y="10" width="22" height="4.2" rx="1.4" fill="#16B8A7" />
        <rect x="2" y="16" width="22" height="4.2" rx="1.4" fill="#0E2A47" />
        <rect x="2" y="22" width="16" height="4.2" rx="1.4" fill="#7CD8C5" />
      </svg>
      {wordmark && (
        <span className={cn('font-medium tracking-tight text-foreground', s.word)}>
          Studilly
        </span>
      )}
    </span>
  );
}
