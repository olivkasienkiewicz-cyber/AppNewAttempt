import Link from 'next/link';
import { FolderOpen, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Phone-only bar pinned to the bottom of the screen, so the two links people
// use most are always visible instead of being tucked away in the menu.
const TABS = [
  { href: '/messages', label: 'Messages', Icon: MessageCircle },
  { href: '/materials', label: 'Materials', Icon: FolderOpen },
] as const;

export function MobileTabBar({ className }: { className?: string }) {
  return (
    <nav
      aria-label="Quick links"
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_12px_rgba(0,0,0,0.06)] sm:hidden',
        className,
      )}
    >
      <ul className="mx-auto flex max-w-3xl">
        {TABS.map(({ href, label, Icon }) => (
          <li key={href} className="flex-1">
            <Link
              href={href}
              className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-[#16B8A7] active:text-[#16B8A7]"
            >
              <Icon className="h-6 w-6" aria-hidden />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
