'use client';

import { useState } from 'react';
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

export function AdminTutorsTable({ tutors }: { tutors: TutorProfile[] }) {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: number; message: string } | null>(null);

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
          <input
            placeholder="Photo path, e.g. /brand/tutors/anna.jpg"
            value={form.photoUrl}
            onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
            className="border rounded px-2 py-1 text-sm col-span-2"
          />
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
          disabled={saving}
          className="px-3 py-1 rounded bg-black text-white text-xs disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Add tutor'}
        </button>
      </div>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">Photo</th>
            <th className="py-2">Name</th>
            <th className="py-2">Subject</th>
            <th className="py-2">Bio</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {tutors.map((t) => (
            <tr key={t.id} className="border-b align-top">
              {editingId === t.id ? (
                <>
                  <td className="py-2">
                    <input
                      value={editForm.photoUrl}
                      onChange={(e) => setEditForm({ ...editForm, photoUrl: e.target.value })}
                      className="border rounded px-2 py-1 text-xs w-32"
                    />
                  </td>
                  <td className="py-2">
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="border rounded px-2 py-1 text-xs w-full"
                    />
                  </td>
                  <td className="py-2">
                    <input
                      value={editForm.subject}
                      onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                      className="border rounded px-2 py-1 text-xs w-full"
                    />
                  </td>
                  <td className="py-2">
                    <textarea
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      className="border rounded px-2 py-1 text-xs w-full"
                      rows={3}
                    />
                    {editError && <div className="text-xs text-red-600 mt-1">{editError}</div>}
                  </td>
                  <td className="py-2 space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => saveEdit(t.id)}
                      disabled={saving}
                      className="px-3 py-1 rounded bg-black text-white text-xs disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={cancelEditing} className="px-3 py-1 rounded text-xs">
                      Cancel
                    </button>
                  </td>
                </>
              ) : (
                <>
                  <td className="py-2 text-xs text-muted-foreground">{t.photoUrl || '—'}</td>
                  <td className="py-2">{t.name}</td>
                  <td className="py-2">{t.subject}</td>
                  <td className="py-2 max-w-xs truncate">
                    {t.bio}
                    {rowError?.id === t.id && (
                      <div className="text-xs text-red-600 mt-1 whitespace-normal">{rowError.message}</div>
                    )}
                  </td>
                  <td className="py-2 space-x-2 whitespace-nowrap">
                    <button onClick={() => startEditing(t)} className="px-3 py-1 rounded border text-xs">
                      Edit
                    </button>
                    <button
                      onClick={() => deleteTutor(t.id)}
                      className="px-3 py-1 rounded bg-red-600 text-white text-xs"
                    >
                      Remove
                    </button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
