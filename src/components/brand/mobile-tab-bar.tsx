import Link from 'next/link';
import { FolderOpen, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Phone-only bar pinned to the bottom of the screen, so the two links people
// use most are always visible instead of being tucked away in the menu.
// Navy with white text so it clearly reads as navigation, not page content.
const TABS = [
  { href: '/messages', label: 'Messages', Icon: MessageCircle },
  { href: '/materials', label: 'Materials', Icon: FolderOpen },
] as const;

export function MobileTabBar({ className }: { className?: string }) {
  return (
    <nav
      aria-label="Quick links"
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 bg-[#0E2A47] pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_20px_rgba(14,42,71,0.2)] sm:hidden',
        className,
      )}
    >
      <ul className="mx-auto flex max-w-3xl">
        {TABS.map(({ href, label, Icon }) => (
          <li key={href} className="flex-1 [&:not(:first-child)]:border-l [&:not(:first-child)]:border-white/15">
            <Link
              href={href}
              className="flex min-h-14 flex-col items-center justify-center gap-1 text-[13px] font-semibold text-white transition-colors hover:text-[#7CD8C5] active:bg-white/10"
            >
              <Icon className="h-6 w-6 text-[#7CD8C5]" aria-hidden />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
