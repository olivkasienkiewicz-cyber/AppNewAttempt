'use client';
import { use, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, FileText, ExternalLink } from 'lucide-react';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/brand/page-header';
import { EmptyState } from '@/components/brand/empty-state';

type Material = {
  id: string;
  fileUrl: string;
  fileName: string;
  fileType: string | null;
  uploadedAt: string;
};

export default function MaterialsForTutorPage({ params }: { params: Promise<{ tutorId: string }> }) {
  const { tutorId } = use(params);
  const state = useAppState();
  const router = useRouter();
  const currentUser = state.currentUserId ? state.users[state.currentUserId] : null;

  const linkedStudent = useMemo(() => {
    if (!currentUser || currentUser.role !== 'parent') return null;
    return Object.values(state.users).find((u) => u.role === 'student' && u.parentId === currentUser.id) ?? null;
  }, [state.users, currentUser]);

  const effectiveStudentId = currentUser?.role === 'parent' ? (linkedStudent?.id ?? currentUser.id) : currentUser?.id;
  const tutor = state.users[tutorId];

  const [materials, setMaterials] = useState<Material[]>([]);
  const [whiteboardUrl, setWhiteboardUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!effectiveStudentId) return;
    (async () => {
      const [matRes, wbRes] = await Promise.all([
        fetch(`/api/materials?tutorId=${tutorId}&studentId=${effectiveStudentId}`),
        fetch(`/api/materials/whiteboard?tutorId=${tutorId}&studentId=${effectiveStudentId}`),
      ]);
      if (matRes.ok) setMaterials(await matRes.json());
      if (wbRes.ok) setWhiteboardUrl((await wbRes.json()).whiteboardUrl);
      setLoaded(true);
    })();
  }, [tutorId, effectiveStudentId]);

  return (
    <main className="mx-auto max-w-2xl px-4 pt-8 pb-12 sm:px-6">
      <PageHeader>
        <Button variant="ghost" size="sm" onClick={() => router.push('/materials')}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
      </PageHeader>

      <div className="mb-8 space-y-1">
        <p className="eyebrow">Materials</p>
        <h1 className="font-display text-4xl text-foreground">{tutor?.name ?? '…'}</h1>
      </div>

      {whiteboardUrl && (
        
          href={whiteboardUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-6 flex items-center justify-between rounded-lg border border-[#16B8A7]/40 bg-[#16B8A7]/5 px-4 py-3 text-sm font-medium text-[#16B8A7] hover:underline"
        >
          Open whiteboard
          <ExternalLink className="h-4 w-4" />
        </a>
      )}

      {!loaded ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : materials.length === 0 ? (
        <EmptyState>No materials uploaded yet.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {materials.map((m) => (
            <li key={m.id}>
              
                href={m.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-border px-4 py-3 text-sm hover:border-[#16B8A7]"
              >
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{m.fileName}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
