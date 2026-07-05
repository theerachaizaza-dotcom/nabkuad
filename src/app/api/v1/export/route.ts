import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { buildExportWorkbook, type CountDetailRow, type LocationSummaryRow } from '@/lib/export/build-sheet';

export const runtime = 'nodejs';

function sanitizeFilenamePart(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_').trim();
}

function formatSubmittedAt(value: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
}

type LineRow = {
  location_id: string;
  full_bottles: number;
  leftover_ml: number;
  capacity_ml_snapshot: number;
  net_bottles: number | string;
  products: {
    name: string;
    sku: string | null;
    price_per_unit: string | null;
    categories: { name: string; sort_order: number } | null;
  } | null;
};

type SubmissionRow = {
  location_id: string;
  status: string;
  submitted_at: string | null;
  locations: { name: string; sort_order: number } | null;
};

export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get('session_id');
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id query parameter' }, { status: 400 });
  }

  const { data: session, error: sessionError } = await (supabaseAdmin.from('count_sessions') as any)
    .select('id, name, count_date')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: sessionError?.message || 'Session not found' }, { status: 404 });
  }

  const [linesRes, submissionsRes] = await Promise.all([
    supabaseAdmin
      .from('count_lines')
      .select(
        `location_id, full_bottles, leftover_ml, capacity_ml_snapshot, net_bottles,
         products ( name, sku, price_per_unit, categories ( name, sort_order ) )`
      )
      .eq('session_id', sessionId),
    supabaseAdmin
      .from('location_submissions')
      .select('location_id, status, submitted_at, locations ( name, sort_order )')
      .eq('session_id', sessionId)
      .order('sort_order', { ascending: true, foreignTable: 'locations' }),
  ]);

  if (linesRes.error) {
    return NextResponse.json({ error: linesRes.error.message }, { status: 500 });
  }
  if (submissionsRes.error) {
    return NextResponse.json({ error: submissionsRes.error.message }, { status: 500 });
  }

  const lines = (linesRes.data ?? []) as unknown as LineRow[];
  const submissions = (submissionsRes.data ?? []) as unknown as SubmissionRow[];

  const locationInfo = new Map<
    string,
    { name: string; sortOrder: number; status: string; submittedAt: string | null }
  >();
  submissions.forEach((s) => {
    locationInfo.set(s.location_id, {
      name: s.locations?.name ?? 'Unknown',
      sortOrder: s.locations?.sort_order ?? 0,
      status: s.status,
      submittedAt: s.submitted_at,
    });
  });

  type SortableDetailRow = CountDetailRow & { locationSort: number; categorySort: number };

  const sortableRows: SortableDetailRow[] = lines.map((line) => {
    const info = locationInfo.get(line.location_id);
    const netQty = Number(line.net_bottles);
    const price = line.products?.price_per_unit != null ? Number(line.products.price_per_unit) : null;

    return {
      location: info?.name ?? 'Unknown',
      locationSort: info?.sortOrder ?? 0,
      category: line.products?.categories?.name ?? 'Uncategorized',
      categorySort: line.products?.categories?.sort_order ?? 0,
      product: line.products?.name ?? 'Unknown',
      sku: line.products?.sku ?? '',
      capacityMl: line.capacity_ml_snapshot,
      fullBottles: line.full_bottles,
      leftoverMl: line.leftover_ml,
      netQty,
      price,
      value: price !== null ? netQty * price : null,
      status: info?.status ?? 'pending',
      submittedAt: formatSubmittedAt(info?.submittedAt ?? null),
    };
  });

  sortableRows.sort((a, b) => {
    if (a.locationSort !== b.locationSort) return a.locationSort - b.locationSort;
    if (a.location !== b.location) return a.location.localeCompare(b.location);
    if (a.categorySort !== b.categorySort) return a.categorySort - b.categorySort;
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.product.localeCompare(b.product);
  });

  const detailRows: CountDetailRow[] = sortableRows.map(({ locationSort, categorySort, ...rest }) => rest);

  // seed summary with every location for this session (even ones with nothing counted yet)
  const summaryMap = new Map<string, LocationSummaryRow & { sortOrder: number }>();
  locationInfo.forEach((info, locationId) => {
    summaryMap.set(locationId, { location: info.name, itemCount: 0, totalNet: 0, totalValue: 0, sortOrder: info.sortOrder });
  });

  for (const line of lines) {
    const info = locationInfo.get(line.location_id);
    const key = line.location_id;
    const netQty = Number(line.net_bottles);
    const price = line.products?.price_per_unit != null ? Number(line.products.price_per_unit) : null;
    const value = price !== null ? netQty * price : 0;

    const existing = summaryMap.get(key) ?? {
      location: info?.name ?? 'Unknown',
      itemCount: 0,
      totalNet: 0,
      totalValue: 0,
      sortOrder: info?.sortOrder ?? 0,
    };
    existing.itemCount += 1;
    existing.totalNet += netQty;
    existing.totalValue += value;
    summaryMap.set(key, existing);
  }

  const summaryRows: LocationSummaryRow[] = Array.from(summaryMap.values())
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({ sortOrder, ...rest }) => rest);

  const workbook = buildExportWorkbook(detailRows, summaryRows);
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

  const rawFilename = `NabKuad_${session.name}_${session.count_date}.xlsx`;
  const asciiName = sanitizeFilenamePart(session.name).replace(/[^\x00-\x7F]/g, '') || 'session';
  const asciiFallback = `NabKuad_${asciiName}_${session.count_date}.xlsx`;
  const encodedFilename = encodeURIComponent(sanitizeFilenamePart(rawFilename));

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedFilename}`,
      'Content-Length': String(buffer.length),
    },
  });
}
