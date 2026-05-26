import { cn } from '@/lib/utils';
import { BrandMark } from './brand-mark';

export function PageHeader({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'mb-8 flex items-center justify-between border-b border-border pb-4',
        className,
      )}
    >
      <BrandMark size="md" />
      {children && <div className="flex items-center gap-1">{children}</div>}
    </header>
  );
}
