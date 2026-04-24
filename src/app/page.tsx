import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { GraduationCap } from 'lucide-react';

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6 dark:from-slate-950 dark:to-slate-900">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <GraduationCap className="h-6 w-6 text-primary" aria-hidden />
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Tutor Booking
          </CardTitle>
          <CardDescription>Coming soon</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          A lightweight prototype for connecting tutors and students.
          <br />
          This single-browser build stores everything in <code>localStorage</code>.
        </CardContent>
      </Card>
    </main>
  );
}