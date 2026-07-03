import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const [categoriesRes, productsRes, locationsRes] = await Promise.all([
    supabaseAdmin
      .from('categories')
      .select('id, name, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabaseAdmin
      .from('products')
      .select('id, name, category_id, sku, capacity_ml, count_mode, unit, units_per_pack, price_per_unit')
      .eq('is_active', true)
      .order('name', { ascending: true }),
    supabaseAdmin
      .from('locations')
      .select('id, name, code, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
  ]);

  if (categoriesRes.error || productsRes.error || locationsRes.error) {
    const message = categoriesRes.error?.message || productsRes.error?.message || locationsRes.error?.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({
    categories: categoriesRes.data ?? [],
    products: productsRes.data ?? [],
    locations: locationsRes.data ?? [],
  });
}
