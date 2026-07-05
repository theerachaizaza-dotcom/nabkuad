import { cache } from 'react';
import { revalidatePath } from 'next/cache';
import type { Metadata } from 'next';
import { IBM_Plex_Mono, Sarabun } from 'next/font/google';
import { supabaseAdmin } from '@/lib/supabase/admin';
import ThemeToggle from '@/components/ThemeToggle';

export const metadata: Metadata = {
  title: 'Dashboard | Admin',
};

const sarabun = Sarabun({ subsets: ['latin', 'thai'], weight: ['400', '500', '600', '700', '800'] });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['500', '600', '700'] });

type CurrentSession = {
  id: string;
  name: string;
  count_date: string;
};

const getCurrentSession = cache(async (): Promise<CurrentSession | null> => {
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

type LocationSubmissionRow = {
  id: string;
  status: string;
  submitted_at: string | null;
  locations: {
    name?: string | null;
    code?: string | null;
    sort_order?: number | null;
  } | null;
};

const getLocationStatuses = cache(async (sessionId: string) => {
  const { data, error } = await supabaseAdmin
    .from('location_submissions')
    .select('id, status, submitted_at, locations(name, code, sort_order)')
    .eq('session_id', sessionId)
    .order('sort_order', { ascending: true, foreignTable: 'locations' });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as LocationSubmissionRow[];

  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    submitted_at: row.submitted_at,
    location_name: row.locations?.name ?? 'Unknown',
    location_code: row.locations?.code ?? '',
  }));
});

async function closeSession(formData: FormData): Promise<void> {
  'use server';

  const sessionId = formData.get('session_id')?.toString();
  if (!sessionId) return;

  const { error } = await (supabaseAdmin.from('count_sessions') as any)
    .update({ status: 'closed', closed_at: new Date().toISOString() })
    .eq('id', sessionId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/dashboard');
  revalidatePath('/sessions');
}

const dashboardStyles = `
  .dash-shell { min-height: 100vh; background: var(--bg); color: var(--text); padding: 20px 14px 40px; }
  .dash-shell .mono { font-family: var(--mono-font); }
  .brandbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .brandbar-right { display: flex; align-items: center; gap: 10px; }
  .brand { font-size: 22px; font-weight: 800; letter-spacing: -0.01em; }
  .brand .fp { color: var(--text); }
  .brand .p { color: var(--mint); }
  .panel {
    background: linear-gradient(155deg, var(--grad1), var(--grad2));
    border: 1px solid var(--line);
    border-radius: 20px;
    padding: 16px;
    box-shadow: var(--card-shadow);
  }
  .panel + .panel { margin-top: 12px; }
  .section-title { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 6px; }
  .subtle { color: var(--muted); font-size: 13px; }
  .row-between { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; }
  .action-btn {
    background: var(--mint); color: #04241a; border: 0; border-radius: 999px;
    padding: 10px 14px; font-weight: 800; cursor: pointer; box-shadow: 0 0 16px rgba(47, 209, 150, 0.3);
  }
  .action-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .export-btn {
    display: inline-flex; align-items: center; gap: 6px;
    background: transparent; color: var(--text); border: 1px solid var(--line2);
    border-radius: 999px; padding: 10px 14px; font-weight: 700; font-size: 14px;
    text-decoration: none; cursor: pointer;
  }
  .export-btn:hover { border-color: var(--mint); color: var(--mint); }
  .stat-grid { display: grid; gap: 10px; grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: 14px; }
  .stat-card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 12px; }
  .stat-card .label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; }
  .stat-card .value { font-family: var(--mono-font); font-size: 24px; font-weight: 700; margin-top: 6px; }
  .loc-list { display: grid; gap: 8px; margin-top: 4px; }
  .loc-card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .loc-name { font-weight: 700; }
  .loc-code { font-family: var(--mono-font); font-size: 11px; color: var(--muteder); margin-top: 2px; }
  .status-pill { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: capitalize; }
  .status-pill.submitted { background: var(--mint-soft); color: var(--mint); }
  .status-pill.pending { background: var(--card2); color: var(--muted); }
  .loc-time { font-size: 11px; color: var(--muted); margin-top: 4px; }
  @media (min-width: 640px) {
    .dash-shell { padding: 28px 24px 48px; }
  }
`;

export default async function DashboardPage() {
  const session = await getCurrentSession();

  if (!session) {
    return (
      <div className={`dash-shell ${sarabun.className}`}>
        <style>{`
          :root { --mono-font: ${ibmPlexMono.style.fontFamily}; }
          ${dashboardStyles}
        `}</style>
        <div className="brandbar">
          <div className="brand"><span className="fp">Nab</span><span className="p">Kuad</span></div>
          <div className="brandbar-right">
            <div className="subtle mono">Admin · Monitoring</div>
            <ThemeToggle />
          </div>
        </div>
        <div className="panel subtle">ไม่มีรอบนับที่เปิดอยู่ — สร้างรอบนับใหม่ที่หน้า Sessions ก่อน</div>
      </div>
    );
  }

  const locationStatuses = await getLocationStatuses(session.id);
  const submittedCount = locationStatuses.filter((status) => status.status === 'submitted').length;
  const pendingCount = locationStatuses.length - submittedCount;

  return (
    <div className={`dash-shell ${sarabun.className}`}>
      <style>{`
        :root { --mono-font: ${ibmPlexMono.style.fontFamily}; }
        ${dashboardStyles}
      `}</style>

      <div className="brandbar">
        <div className="brand"><span className="fp">Nab</span><span className="p">Kuad</span></div>
        <div className="subtle mono">Admin · Monitoring</div>
      </div>

      <div className="panel">
        <div className="section-title">Open session</div>
        <div className="row-between">
          <div>
            <p style={{ fontWeight: 800, fontSize: 16 }}>{session.name}</p>
            <p className="subtle">{session.count_date}</p>
          </div>
          <div className="action-row">
            <a href={`/api/v1/export?session_id=${session.id}`} className="export-btn" download>
              Export Excel
            </a>
            <form action={closeSession}>
              <input type="hidden" name="session_id" value={session.id} />
              <button type="submit" className="action-btn">Close session</button>
            </form>
          </div>
        </div>

        <div className="stat-grid">
          <div className="stat-card">
            <div className="label">Submitted</div>
            <div className="value">{submittedCount}</div>
          </div>
          <div className="stat-card">
            <div className="label">Pending</div>
            <div className="value">{pendingCount}</div>
          </div>
          <div className="stat-card">
            <div className="label">Locations</div>
            <div className="value">{locationStatuses.length}</div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="section-title">Location status</div>
        <div className="loc-list">
          {locationStatuses.map((status) => (
            <div key={status.id} className="loc-card">
              <div>
                <div className="loc-name">{status.location_name}</div>
                <div className="loc-code mono">{status.location_code}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className={`status-pill ${status.status}`}>{status.status}</span>
                <div className="loc-time mono">
                  {status.submitted_at ? new Date(status.submitted_at).toLocaleString() : '—'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
