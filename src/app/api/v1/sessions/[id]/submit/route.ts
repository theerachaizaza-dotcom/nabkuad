import { ZodError } from 'zod';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { submitSchema } from '@/lib/validation/api';

function jsonError(message: string | string[], status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let payload: any;

  try {
    payload = submitSchema.parse(await req.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError((error as ZodError).issues.map((i) => i.message), 400);
    }
    return jsonError('Invalid request body', 400);
  }

  const resolvedParams = await params;
  let sessionId: string | undefined = resolvedParams?.id;
  if (!sessionId) {
    try {
      const u = new URL(req.url);
      const m = u.pathname.match(/\/api\/v1\/sessions\/([^\/]+)\/submit/);
      sessionId = m ? decodeURIComponent(m[1]) : undefined;
    } catch (_) {
      /* ignore */
    }
  }

  if (!sessionId) return jsonError('Missing session id', 400);

  const { data, error } = await (supabaseAdmin.from('location_submissions') as any)
    .update({ status: 'submitted', submitted_at: new Date().toISOString() })
    .eq('session_id', sessionId)
    .eq('location_id', payload.location_id);

  if (error) {
    return jsonError(error.message, 500);
  }

  if (!data || data.length === 0) {
    // If no submission row exists yet, create one and mark submitted
    const { error: insertError } = await (supabaseAdmin.from('location_submissions') as any)
      .insert({ session_id: sessionId, location_id: payload.location_id, status: 'submitted', submitted_at: new Date().toISOString() });

    if (insertError) {
      // If another process inserted the row concurrently, the unique constraint may trigger.
      // Treat duplicate-key insert as idempotent success.
      if (typeof insertError.message === 'string' && insertError.message.includes('duplicate key')) {
        return NextResponse.json({ success: true });
      }
      return jsonError(insertError.message, 500);
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: true });
}
