import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

function jsonError(message: string | string[], status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const resolvedParams = await params;
  let sessionId = resolvedParams?.id;

  // Fallback: derive sessionId from request URL if params not provided
  if (!sessionId) {
    try {
      const u = new URL(req.url);
      const m = u.pathname.match(/\/api\/v1\/sessions\/([^\/]+)\/lines/);
      sessionId = m ? decodeURIComponent(m[1]) : undefined;
    } catch (_) {
      /* ignore */
    }
  }

  if (!sessionId) return jsonError('Missing session id in route params', 400);

  let locationId: string | null = null;
  try {
    const u = new URL(req.url);
    locationId = u.searchParams.get('location_id');
  } catch (_) {
    /* ignore */
  }

  if (!locationId) return jsonError('Missing location_id query parameter', 400);

  const { data, error } = await supabaseAdmin
    .from('count_lines')
    .select('product_id, full_bottles, leftover_ml, capacity_ml_snapshot, net_bottles')
    .eq('session_id', sessionId)
    .eq('location_id', locationId);

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ lines: data ?? [] });
}
