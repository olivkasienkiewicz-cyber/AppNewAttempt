'use client';
import { use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, FileText, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useAppState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/brand/page-header';
import { EmptyState } from '@/components/brand/empty-state';

type Material = {
  id: string;
  fileUrl: string;
  fileName: string;
  fileType: string | null;
  uploadedAt: string;
};

const MAX_FILE_SIZE = 25 * 1024 * 1024;

export default function TutorMaterialsForStudentPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = use(params);
  const state = useAppState();
  const router = useRouter();
  const student = state.users[studentId];
  const currentUser = state.currentUserId ? state.users[state.currentUserId] : null;

  const [materials, setMaterials] = useState<Material[]>([]);
  const [whiteboardUrl, setWhiteboardUrl] = useState('');
  const [savingWhiteboard, setSavingWhiteboard] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = async () => {
    if (!currentUser) return;
    const [matRes, wbRes] = await Promise.all([
      fetch(`/api/materials?tutorId=${currentUser.id}&studentId=${studentId}`),
      fetch(`/api/materials/whiteboard?tutorId=${currentUser.id}&studentId=${studentId}`),
    ]);
    if (matRes.ok) setMaterials(await matRes.json());
    if (wbRes.ok) setWhiteboardUrl((await wbRes.json()).whiteboardUrl ?? '');
    setLoaded(true);
  };

  useEffect(() => { void load(); }, [studentId, currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error('That file is too large (max 25MB).');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch('/api/materials/upload', { method: 'POST', body: formData });
      if (!uploadRes.ok) {
        toast.error("Couldn't upload that file — try again.");
        return;
      }
      const uploaded = await uploadRes.json();
      const createRes = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          fileUrl: uploaded.url,
          fileName: uploaded.name,
          fileType: uploaded.type,
        }),
      });
      if (!createRes.ok) {
        toast.error("Uploaded, but couldn't save it — try again.");
        return;
      }
      toast.success('Material added');
      await load();
    } catch {
      toast.error("Couldn't reach the server.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/materials/${id}`, { method: 'DELETE' });
      if (!res.ok) { toast.error("Couldn't remove that file — try again."); return; }
      toast.success('Material removed');
      await load();
    } catch {
      toast.error("Couldn't reach the server.");
    }
  };

  const handleSaveWhiteboard = async () => {
    setSavingWhiteboard(true);
    try {
      const res = await fetch('/api/materials/whiteboard', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, whiteboardUrl: whiteboardUrl.trim() || null }),
      });
      if (!res.ok) { toast.error("Couldn't save the whiteboard link — try again."); return; }
      toast.success('Whiteboard link saved');
    } catch {
      toast.error("Couldn't reach the server.");
    } finally {
      setSavingWhiteboard(false);
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-4 pt-8 pb-12 sm:px-6">
      <PageHeader>
        <Button variant="ghost" size="sm" onClick={() => router.push('/tutor/materials')}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
      </PageHeader>

      <div className="mb-8 space-y-1">
        <p className="eyebrow">Materials</p>
        <h1 className="font-display text-4xl text-foreground">{student?.name ?? '…'}</h1>
      </div>

      <section className="mb-6 rounded-lg border border-border p-4">
        <h2 className="text-sm font-medium text-foreground">Whiteboard link</h2>
        <p className="mt-1 text-xs text-muted-foreground">Paste the link to your shared whiteboard for this student.</p>
        <div className="mt-3 flex gap-2">
          <Input
            type="url"
            value={whiteboardUrl}
            onChange={(e) => setWhiteboardUrl(e.target.value)}
            placeholder="https://..."
            className="h-10 flex-1"
          />
          <Button size="sm" disabled={savingWhiteboard} onClick={() => void handleSaveWhiteboard()}>
            {savingWhiteboard ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </section>

      <section className="mb-6 rounded-lg border border-border p-4">
        <h2 className="text-sm font-medium text-foreground">Upload material</h2>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
        <Button
          size="sm"
          variant="outline"
          className="mt-3 gap-1.5"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4" /> {uploading ? 'Uploading…' : 'Choose a file'}
        </Button>
      </section>

      {!loaded ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : materials.length === 0 ? (
        <EmptyState>No materials uploaded yet.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {materials.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-4 py-3">
              <a href={m.fileUrl} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-2 text-sm hover:text-[#16B8A7]">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{m.fileName}</span>
              </a>
              <button type="button" onClick={() => void handleDelete(m.id)} aria-label="Delete">
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
