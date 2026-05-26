# Tutor Booking

A lightweight tutor ↔ student booking prototype. One Next.js app, no backend — all state lives in `localStorage` behind a single module so the demo runs entirely client-side and can be upgraded to a real database without touching any UI code.

## Stack

- Next.js 16 (App Router) + React 19
- TypeScript, strict
- Tailwind v4, shadcn/ui (`base-nova` style), `lucide-react`
- `sonner` for toasts, `date-fns` for date math

## Features

- **Onboarding.** Role select → name entry → straight into the relevant home. Fresh users land in under 20 seconds.
- **Profile picker.** Once at least one profile exists, the home screen lists them; an "+ New profile" button drops back into the role-select flow. With no profiles it skips straight to role select.
- **Tutor availability editor.** A 30-day calendar; tap a day to manage 15-minute-granularity slots. Past times on today's date are disabled at the picker; booked slots can't be deleted.
- **Tutor home.** All your slots grouped by day with a `Free` / `Booked by <name>` pill.
- **Student browse.** Tutor picker (if more than one), a `DD.MM` day header flanked by ◀ ▶ arrows that step only
