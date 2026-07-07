import { BrandMark } from '@/components/brand/brand-mark';

export default function CheckEmailPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <BrandMark size="md" />
      <div className="space-y-2">
        <p className="eyebrow">Almost there</p>
        <h1 className="font-display text-4xl text-foreground">Check your email</h1>
        <p className="text-sm text-muted-foreground">
          We sent you a sign-in link. Open it on this device to continue.
        </p>
      </div>
    </main>
  );
}
