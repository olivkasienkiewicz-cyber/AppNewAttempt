'use client';

import * as React from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BrandMark } from './brand-mark';

// Headers with only a couple of actions (e.g. the tutor page: bell + menu)
// stay on one line. Headers with a full nav (student, parent) can't fit on a
// phone, so below `sm` they collapse behind a "Menu" button that opens every
// link at once; from `sm` up the nav sits on its own row under the brand.
const INLINE_MAX_ITEMS = 3;

export function PageHeader({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const menuId = React.useId();
  const itemCount = React.Children.toArray(children).length;
  const stacked = itemCount > INLINE_MAX_ITEMS;

  return (
    <header
      className={cn(
        'mb-8 border-b border-border pb-4',
        stacked
          ? 'flex flex-wrap items-center justify-between gap-y-3 sm:flex-col sm:flex-nowrap sm:items-start sm:justify-start'
          : 'flex items-center justify-between',
        className,
      )}
    >
      <BrandMark size="md" />

      {stacked && (
        <Button
          type="button"
          variant="outline"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((prev) => !prev)}
          className="h-11 gap-2 px-3.5 sm:hidden"
        >
          {open ? <X className="h-[18px] w-[18px]" /> : <Menu className="h-[18px] w-[18px]" />}
          Menu
        </Button>
      )}

      {children && (
        <div
          id={menuId}
          // tapping any link closes the menu (the page also changes right after)
          onClick={() => setOpen(false)}
          className={cn(
            'flex items-center gap-1',
            // 44px minimum tap targets on touch screens
            '[&>*]:min-h-11 [&>*]:min-w-11 sm:[&>*]:min-h-0 sm:[&>*]:min-w-0',
            stacked &&
              [
                // phones: hidden until "Menu" is tapped, then a boxed panel of links
                open ? 'flex' : 'hidden',
                'w-full flex-wrap gap-2 rounded-xl border border-border bg-muted/30 p-2',
                '[&>*]:whitespace-nowrap',
                // sm and up: nav on its own row under the brand, left-aligned
                'sm:-ml-2 sm:flex sm:w-auto sm:min-w-0 sm:justify-start sm:gap-0.5 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:[&>*]:px-2 sm:[&>*]:text-[13px]',
              ].join(' '),
          )}
        >
          {children}
        </div>
      )}
    </header>
  );
}
