import { cache } from 'react';
import { revalidatePath } from 'next/cache';
import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const metadata: Metadata = {
  title: 'Dashboard | Admin',
};

const getCurrentSession = cache(async () => {
  const { data, error } = await supabaseAdmin
    .from('count_sessions')
    .select('id, name, count_date')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message);
  }

  return data;
});

const getLocationStatuses = cache(async (sessionId: string) => {
  const { data, error } = await supabaseAdmin
    .from('location_submissions')
    .select('id, status, submitted_at, locations(name, code, sort_order)')
    .eq('session_id', sessionId)
    .order('locations.sort_order', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    status: row.status,
    submitted_at: row.submitted_at,
    location_name: row.locations?.name ?? 'Unknown',
    location_code: row.locations?.code ?? '',
  }));
});

async function closeSession(formData: FormData) {
  'use server';

  const sessionId = formData.get('session_id')?.toString();
  if (!sessionId) return;

  const { error } = await supabaseAdmin
    .from('count_sessions')
    .update({ status: 'closed' as const, closed_at: new Date().toISOString() })
    .eq('id', sessionId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/dashboard');
  revalidatePath('/sessions');
  return null;
}

export default async function DashboardPage() {
  const session = await getCurrentSession();

  if (!session) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm text-slate-500">Monitoring</p>
          <h2 className="text-2xl font-semibold text-slate-900">Location submission status</h2>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-700">
          No open session found. Create a new count session first.
        </div>
      </div>
    );
  }

  const locationStatuses = await getLocationStatuses(session.id);
  const submittedCount = locationStatuses.filter((status) => status.status === 'submitted').length;
  const pendingCount = locationStatuses.length - submittedCount;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">Monitoring</p>
        <h2 className="text-2xl font-semibold text-slate-900">Location submission status</h2>
        <p className="text-sm text-slate-500">Current session: {session.name} · {session.count_date}</p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-slate-500">Open session</p>
            <p className="text-lg font-semibold text-slate-900">{session.name}</p>
            <p className="text-sm text-slate-500">{session.count_date}</p>
          </div>
          <form action={closeSession} className="flex gap-3">
            <input type="hidden" name="session_id" value={session.id} />
            <button
              type="submit"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Close session
            </button>
          </form>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Submitted</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{submittedCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Pending</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{pendingCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Locations total</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{locationStatuses.length}</p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white p-6">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="border-b border-slate-200 px-4 py-3 text-left font-medium">Location</th>
              <th className="border-b border-slate-200 px-4 py-3 text-left font-medium">Code</th>
              <th className="border-b border-slate-200 px-4 py-3 text-left font-medium">Status</th>
              <th className="border-b border-slate-200 px-4 py-3 text-left font-medium">Submitted at</th>
            </tr>
          </thead>
          <tbody>
            {locationStatuses.map((status) => (
              <tr key={status.id} className="border-b border-slate-100 last:border-none">
                <td className="px-4 py-4 text-slate-900">{status.location_name}</td>
                <td className="px-4 py-4 text-slate-700">{status.location_code}</td>
                <td className="px-4 py-4 text-slate-700 capitalize">{status.status}</td>
                <td className="px-4 py-4 text-slate-700">{status.submitted_at ? new Date(status.submitted_at).toLocaleString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
