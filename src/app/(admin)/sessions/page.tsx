import { cache } from 'react';
import { revalidatePath } from 'next/cache';
import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Session } from './types';

export const metadata: Metadata = {
  title: 'Sessions | Admin',
};

const getSessions = cache(async () => {
  const { data, error } = await supabaseAdmin
    .from('count_sessions')
    .select('id, name, count_date, status, created_at, closed_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Session[];
});

async function createSession(formData: FormData) {
  'use server';

  const name = formData.get('name')?.toString().trim() || `Session ${new Date().toISOString().slice(0, 10)}`;
  const count_date = formData.get('count_date')?.toString() || new Date().toISOString().slice(0, 10);
  const note = formData.get('note')?.toString() || null;

  const sessionPayload = {
    name,
    count_date,
    status: 'open' as const,
    note,
  };

  const { data: sessionData, error: sessionError } = await supabaseAdmin
    .from('count_sessions')
    .insert(sessionPayload)
    .select('id')
    .single();

  if (sessionError || !sessionData?.id) {
    throw new Error(sessionError?.message || 'Failed to create session');
  }

  const { data: locations, error: locationsError } = await supabaseAdmin
    .from('locations')
    .select('id')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (locationsError) {
    throw new Error(locationsError.message);
  }

  const submissionRows = (locations ?? []).map((location) => ({
    session_id: sessionData.id,
    location_id: location.id,
    status: 'pending' as const,
  }));

  const { error: submissionsError } = await supabaseAdmin
    .from('location_submissions')
    .insert(submissionRows);

  if (submissionsError) {
    throw new Error(submissionsError.message);
  }

  revalidatePath('/sessions');
  return null;
}

export default async function SessionsPage() {
  const sessions = await getSessions();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">Count Sessions</p>
          <h2 className="text-2xl font-semibold text-slate-900">Session List</h2>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
        <form action={createSession} className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-2 text-sm text-slate-700">
            Session name
            <input
              name="name"
              type="text"
              placeholder="New count session"
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-2 outline-none focus:border-slate-400"
            />
          </label>

          <label className="space-y-2 text-sm text-slate-700">
            Count date
            <input
              name="count_date"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-2 outline-none focus:border-slate-400"
            />
          </label>

          <label className="space-y-2 text-sm text-slate-700">
            Note
            <input
              name="note"
              type="text"
              placeholder="Optional note"
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-2 outline-none focus:border-slate-400"
            />
          </label>

          <div className="sm:col-span-3">
            <button
              type="submit"
              className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Create new session
            </button>
          </div>
        </form>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="border-b border-slate-200 px-4 py-3 text-left font-medium">Name</th>
              <th className="border-b border-slate-200 px-4 py-3 text-left font-medium">Count date</th>
              <th className="border-b border-slate-200 px-4 py-3 text-left font-medium">Status</th>
              <th className="border-b border-slate-200 px-4 py-3 text-left font-medium">Created</th>
              <th className="border-b border-slate-200 px-4 py-3 text-left font-medium">Closed</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id} className="border-b border-slate-100 last:border-none hover:bg-slate-50">
                <td className="px-4 py-4 text-slate-900">{session.name}</td>
                <td className="px-4 py-4 text-slate-700">{session.count_date}</td>
                <td className="px-4 py-4 text-slate-700 capitalize">{session.status}</td>
                <td className="px-4 py-4 text-slate-700">{new Date(session.created_at).toLocaleString()}</td>
                <td className="px-4 py-4 text-slate-700">{session.closed_at ? new Date(session.closed_at).toLocaleString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
