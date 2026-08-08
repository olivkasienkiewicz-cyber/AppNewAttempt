'use client';

import { useState, useRef, DragEvent } from 'react';
import { useRouter } from 'next/navigation';

type TutorProfile = {
  id: number;
  name: string;
  subject: string;
  bio: string;
  photoUrl: string;
  displayOrder: number;
};

const emptyForm = { name: '', subject: '', bio: '', photoUrl: '', displayOrder: 0 };

async function extractErrorMessage(res: Response, fallback: string) {
  try {
    const text = await res.text();
    if (!text) return fallback;
    try {
      const json = JSON.parse(text);
      return json.error || json.message || text;
    } catch {
      return text;
    }
  } catch {
    return fallback;
  }
}

function DropZone({
  onFile,
  uploading,
  label,
}: {
  onFile: (file: File) => void;
  uploading: boolean;
  label?: string;
}) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrag(e: DragEvent, active: boolean) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(active);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  }

  return (
    <div
      onDragEnter={(e) => handleDrag(e, true)}
      onDragOver={(e) => handleDrag(e, true)}
      onDragLeave={(e) => handleDrag(e, false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded px-3 py-4 text-xs text-center cursor-pointer transition-colors ${
        dragActive ? 'border-black bg-gray-50' : 'border-gray-300'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
      />
      {uploading ? 'Uploading...' : label || 'Drop a photo here, or click to choose'}
    </div>
  );
}

export function AdminTutorsTable({ tutors }: { tutors: TutorProfile[] }) {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: number; message: string } | null>(null);
  const [uploadingAdd, setUploadingAdd] = useState(false);
  const [uploadingEdit, setUploadingEdit] = useState(false);

  async function uploadPhoto(file: File): Promise<string> {
    const body = new FormData();
    body.append('file', file);
    const res = await fetch('/api/admin/tutors/upload', { method: 'POST', body });
    if (!res.ok) {
      throw new Error(await extractErrorMessage(res, 'Failed to upload photo'));
    }
    const data = await res.json();
    return data.url as string;
  }

  async function handleAddDrop(file: File) {
    setUploadingAdd(true);
    setAddError(null);
    try {
      const url = await uploadPhoto(file);
      setForm((f) => ({ ...f, photoUrl: url }));
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to upload photo');
    } finally {
      setUploadingAdd(false);
    }
  }

  async function handleEditDrop(file: File) {
    setUploadingEdit(true);
    setEditError(null);
    try {
      const url = await uploadPhoto(file);
      setEditForm((f) => ({ ...f, photoUrl: url }));
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to upload photo');
    } finally {
      setUploadingEdit(false);
    }
  }

  async function addTutor() {
    if (!form.name.trim() || !form.bio.trim()) {
      setAddError('Name and bio are required.');
      return;
    }
    setSaving(true);
    setAddError(null);
    try {
      const res = await fetch('/api/admin/tutors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        throw new Error(await extractErrorMessage(res, 'Failed to add tutor'));
      }
      setForm(emptyForm);
      router.refresh();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add tutor');
    } finally {
      setSaving(false);
    }
  }

  function startEditing(t: TutorProfile) {
    setEditingId(t.id);
    setEditForm({ name: t.name, subject: t.subject, bio: t.bio, photoUrl: t.photoUrl, displayOrder: t.displayOrder });
    setEditError(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditError(null);
  }

  async function saveEdit(id: number) {
    setSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/admin/tutors/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        throw new Error(await extractErrorMessage(res, 'Failed to save'));
      }
      setEditingId(null);
      router.refresh();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function deleteTutor(id: number) {
    if (!confirm('Remove this tutor from the public page?')) return;
    setSaving(true);
    setRowError(null);
    try {
      const res = await fetch(`/api/admin/tutors/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error(await extractErrorMessage(res, 'Failed to delete'));
      }
      router.refresh();
    } catch (err) {
      setRowError({ id, message: err instanceof Error ? err.message : 'Failed to delete' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="border rounded p-4 space-y-3">
        <h2 className="text-sm font-semibold">Add a tutor</h2>
        <div className="grid grid-cols-2 gap-3">
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border rounded px-2 py-1 text-sm"
          />
          <input
            placeholder="Subject(s), e.g. Math HL, Physics SL"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className="border rounded px-2 py-1 text-sm"
          />
          <div className="col-span-2 space-y-2">
            <DropZone onFile={handleAddDrop} uploading={uploadingAdd} />
            <input
              placeholder="Or paste a photo path/URL, e.g. /brand/tutors/anna.jpg"
              value={form.photoUrl}
              onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
              className="border rounded px-2 py-1 text-sm w-full"
            />
            {form.photoUrl && (
              <img src={form.photoUrl} alt="Preview" className="h-16 w-16 object-cover rounded border" />
            )}
          </div>
          <textarea
            placeholder="Bio"
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            className="border rounded px-2 py-1 text-sm col-span-2"
            rows={3}
          />
        </div>
        {addError && <div className="text-xs text-red-600">{addError}</div>}
        <button
          onClick={addTutor}
          disabled={saving || uploadingAdd}
          className="px-3 py-1 rounded bg-black text-white text-xs disabled:opacity-50"
        >
