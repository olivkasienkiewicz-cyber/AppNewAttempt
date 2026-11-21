import * as React from 'react';
import { cn } from '@/lib/utils';
import { BrandMark } from './brand-mark';

// Headers with only a couple of actions (e.g. the tutor page: bell + menu)
// stay on one line. Headers with a full nav (student, parent) can't fit on a
// phone, so below `sm` the nav drops under the brand mark as a single
// swipeable row; from `sm` up it sits beside the brand and wraps if needed.
const INLINE_MAX_ITEMS = 3;

export function PageHeader({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const itemCount = React.Children.toArray(children).length;
  const stacked = itemCount > INLINE_MAX_ITEMS;

  return (
    <header
      className={cn(
        'mb-8 border-b border-border pb-4',
        stacked
          ? 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'
          : 'flex items-center justify-between',
        className,
      )}
    >
      <BrandMark size="md" />
      {children && (
        <div
          className={cn(
            'flex items-center gap-1',
            // 44px minimum tap targets on touch screens
            '[&>*]:min-h-11 [&>*]:min-w-11 sm:[&>*]:min-h-0 sm:[&>*]:min-w-0',
            stacked &&
              [
                // edge-to-edge swipeable row on phones (cancels the page's px-4)
                '-mx-4 overflow-x-auto overscroll-x-contain px-4',
                '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                // soft fade on the right edge hints that the row scrolls
                '[mask-image:linear-gradient(to_right,black_calc(100%_-_16px),transparent)]',
                '[&>*]:shrink-0 [&>*]:whitespace-nowrap',
                // from sm up: normal inline nav that wraps instead of overflowing
                'sm:mx-0 sm:min-w-0 sm:flex-wrap sm:justify-end sm:overflow-visible sm:px-0 sm:[mask-image:none]',
              ].join(' '),
          )}
        >
          {children}
        </div>
      )}
    </header>
  );
}
