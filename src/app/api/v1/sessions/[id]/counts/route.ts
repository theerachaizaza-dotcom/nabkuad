import { ZodError } from 'zod';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { normalizeCount } from '@/lib/calc/net-bottles';
import { upsertCountsSchema } from '@/lib/validation/api';

function jsonError(message: string | string[], status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  let payload: any;

  try {
    payload = upsertCountsSchema.parse(await req.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError((error as ZodError).issues.map((i) => i.message), 400);
    }
    return jsonError('Invalid request body', 400);
  }

  const resolvedParams = await params;
  let sessionId = resolvedParams?.id;

  // Fallback: derive sessionId from request URL if params not provided
  if (!sessionId) {
    try {
      const u = new URL(req.url);
      const m = u.pathname.match(/\/api\/v1\/sessions\/([^\/]+)\/counts/);
      sessionId = m ? decodeURIComponent(m[1]) : undefined;
    } catch (_) {
      /* ignore */
    }
  }

  if (!sessionId) {
    return jsonError('Missing session id in route params', 400);
  }

  if (!payload.location_id) {
    return jsonError('Missing location_id in request body', 400);
  }

  const invalidLineIndex = payload.lines.findIndex(
    (line: any) => !line.product_id || typeof line.product_id !== 'string'
  );
  if (invalidLineIndex !== -1) {
    return jsonError(`Line ${invalidLineIndex} is missing a valid product_id`, 400);
  }

  const productIds = Array.from(new Set(payload.lines.map((line: any) => line.product_id)));
  if (productIds.some((id) => !id)) {
    return jsonError('One or more product_id values are invalid or missing', 400);
  }

  const [{ data: session, error: sessionError }, { data: location, error: locationError }] = await Promise.all([
    supabaseAdmin
      .from('count_sessions')
      .select('id')
      .eq('id', sessionId)
      .maybeSingle(),
    supabaseAdmin
      .from('locations')
      .select('id')
      .eq('id', payload.location_id)
      .maybeSingle(),
  ]);

  if (sessionError || locationError) {
    const message = sessionError?.message || locationError?.message;
    return jsonError(message ?? 'Unable to validate session or location', 500);
  }

  if (!session) {
    return jsonError('Session not found', 404);
  }

  if (!location) {
    return jsonError('Location not found', 404);
  }

  const { data: products, error: productsError } = await supabaseAdmin
    .from('products')
    .select('id, capacity_ml, count_mode')
    .in('id', productIds);

  if (productsError) {
    return jsonError(productsError.message, 500);
  }

  const productsData = products ?? [];
  const productById = new Map((productsData as any[]).map((product) => [product.id, product] as const));

  const missingProducts = productIds.filter((id) => !productById.has(id));

  if (missingProducts.length > 0) {
    return jsonError(`Products not found: ${missingProducts.join(', ')}`, 400);
  }

  const linesToUpsert = payload.lines.map((line: any) => {
    const product = productById.get(line.product_id) as any;
    const normalized = normalizeCount(line.full_bottles, line.leftover_ml, product.capacity_ml, product.count_mode);

    return {
      session_id: sessionId,
      location_id: payload.location_id,
      product_id: line.product_id,
      full_bottles: normalized.fullBottles,
      leftover_ml: normalized.leftoverMl,
      capacity_ml_snapshot: product.capacity_ml,
    };
  });

  const { error: upsertError } = await supabaseAdmin
    .from('count_lines')
    .upsert(linesToUpsert as any, {
      onConflict: 'session_id,location_id,product_id',
    });

  if (upsertError) {
    return jsonError(upsertError.message, 500);
  }

  return NextResponse.json({ success: true });
}
