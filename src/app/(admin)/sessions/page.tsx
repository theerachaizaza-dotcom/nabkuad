import { cache } from 'react';
import { revalidatePath } from 'next/cache';
import type { Metadata } from 'next';
import { IBM_Plex_Mono, Sarabun } from 'next/font/google';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Session } from './types';

export const metadata: Metadata = {
  title: 'Sessions | Admin',
};

const sarabun = Sarabun({ subsets: ['latin', 'thai'], weight: ['400', '500', '600', '700', '800'] });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['500', '600', '700'] });

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

async function createSession(formData: FormData): Promise<void> {
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

  const { data: sessionData, error: sessionError } = await (supabaseAdmin.from('count_sessions') as any)
    .insert(sessionPayload)
    .select('id')
    .single();

  if (sessionError || !sessionData?.id) {
    throw new Error(sessionError?.message || 'Failed to create session');
  }

  type LocationRow = {
    id: string;
  };

  const { data: locationsData, error: locationsError } = await supabaseAdmin
    .from('locations')
    .select('id')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (locationsError) {
    throw new Error(locationsError.message);
  }

  const locations = (locationsData ?? []) as LocationRow[];

  const submissionRows = locations.map((location) => ({
    session_id: sessionData.id,
    location_id: location.id,
    status: 'pending' as const,
  }));

  const { error: submissionsError } = await (supabaseAdmin.from('location_submissions') as any)
    .insert(submissionRows);

  if (submissionsError) {
    throw new Error(submissionsError.message);
  }

  revalidatePath('/sessions');
}

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

  revalidatePath('/sessions');
}

export default async function SessionsPage() {
  const sessions = await getSessions();

  return (
    <div className={`sessions-shell ${sarabun.className}`}>
      <style>{`
        :root {
          --bg: #000000;
          --card: #12181C;
          --card2: #1A2228;
          --line: #232D33;
          --line2: #31404a;
          --mint: #2FD196;
          --mint-soft: rgba(47, 209, 150, 0.16);
          --text: #F2F5F6;
          --muted: #8A99A0;
          --muteder: #5B6B72;
        }
        * { box-sizing: border-box; }
        body { background: var(--bg); color: var(--text); }
        .mono { font-family: ${ibmPlexMono.style.fontFamily}; }
        .sessions-shell {
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          padding: 20px 14px 40px;
        }
        .brandbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .brand { font-size: 22px; font-weight: 800; letter-spacing: -0.01em; }
        .brand .fp { color: #fff; }
        .brand .p { color: var(--mint); }
        .panel {
          background: linear-gradient(155deg, #141C20, #0E1417);
          border: 1px solid var(--line);
          border-radius: 20px;
          padding: 16px;
          box-shadow: 0 0 24px rgba(47, 209, 150, 0.06);
        }
        .panel + .panel { margin-top: 12px; }
        .section-title { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 6px; }
        .section-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 12px; }
        .section-head h2 { font-size: 20px; font-weight: 800; color: var(--text); }
        .subtle { color: var(--muted); font-size: 13px; }
        .form-grid { display: grid; gap: 10px; }
        .field { display: flex; flex-direction: column; gap: 6px; }
        .field label { font-size: 12px; font-weight: 700; color: var(--muted); }
        .field input {
          width: 100%;
          border: 1px solid var(--line2);
          background: var(--card);
          color: var(--text);
          border-radius: 12px;
          padding: 11px 12px;
          font: inherit;
          outline: none;
        }
        .field input::placeholder { color: var(--muteder); }
        .field input:focus { border-color: var(--mint); box-shadow: 0 0 0 3px var(--mint-soft); }
        .action-btn {
          background: var(--mint);
          color: #04241a;
          border: 0;
          border-radius: 999px;
          padding: 10px 14px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 0 16px rgba(47, 209, 150, 0.3);
        }
        .ghost-btn {
          background: transparent;
          border: 1px solid var(--line2);
          color: var(--text);
          border-radius: 999px;
          padding: 8px 12px;
          font-weight: 700;
          cursor: pointer;
        }
        .session-list { display: grid; gap: 10px; }
        .session-card { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 13px; }
        .session-top { display: flex; justify-content: space-between; align-items: start; gap: 10px; }
        .session-name { font-size: 16px; font-weight: 800; }
        .session-meta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; color: var(--muted); font-size: 12px; }
        .status-pill { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: capitalize; }
        .status-pill.open { background: var(--mint-soft); color: var(--mint); }
        .status-pill.closed { background: var(--card2); color: var(--muted); }
        .mono-text { font-family: ${ibmPlexMono.style.fontFamily}; }
        @media (min-width: 640px) {
          .sessions-shell { padding: 28px 24px 48px; }
          .form-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .session-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
      `}</style>

      <div className="brandbar">
        <div className="brand">
          <span className="fp">Nab</span>
          <span className="p">Kuad</span>
        </div>
        <div className="subtle mono">Admin · Sessions</div>
      </div>

      <div className="panel">
        <div className="section-title">Create session</div>
        <div className="section-head">
          <h2>สร้างรอบนับใหม่</h2>
        </div>
        <form action={createSession} className="form-grid">
          <div className="field">
            <label htmlFor="name">Session name</label>
            <input id="name" name="name" type="text" autoComplete="off" placeholder="New count session" />
          </div>

          <div className="field">
            <label htmlFor="count_date">Count date</label>
            <input id="count_date" name="count_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} autoComplete="off" />
          </div>

          <div className="field">
            <label htmlFor="note">Note</label>
            <input id="note" name="note" type="text" autoComplete="off" placeholder="Optional note" />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit" className="action-btn">Create new session</button>
          </div>
        </form>
      </div>

      <div className="panel">
        <div className="section-title">Session list</div>
        <div className="section-head">
          <h2>รอบนับทั้งหมด</h2>
          <div className="subtle mono">{sessions.length} sessions</div>
        </div>

        <div className="session-list">
          {sessions.map((session) => (
            <div key={session.id} className="session-card">
              <div className="session-top">
                <div>
                  <div className="session-name">{session.name}</div>
                  <div className="session-meta">
                    <span className={`status-pill ${session.status}`}>{session.status}</span>
                    <span className="mono-text">{session.count_date}</span>
                  </div>
                </div>
                {session.status === 'open' ? (
                  <form action={closeSession}>
                    <input type="hidden" name="session_id" value={session.id} />
                    <button type="submit" className="ghost-btn">ปิดรอบ</button>
                  </form>
                ) : (
                  <span className="status-pill closed">closed</span>
                )}
              </div>
              <div className="session-meta">
                <span>สร้าง: {new Date(session.created_at).toLocaleString()}</span>
                <span>ปิด: {session.closed_at ? new Date(session.closed_at).toLocaleString() : '—'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
