import { cache } from 'react';
import { revalidatePath } from 'next/cache';
import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase/admin';
import ProductsAdminPage from './ProductsAdminPage';

export const metadata: Metadata = {
  title: 'Products | Admin',
};

const getProducts = cache(async () => {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('id, name, sku, category_id, capacity_ml, count_mode, price_per_unit, unit, is_active, categories(name)')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    sku: row.sku,
    category_id: row.category_id,
    category_name: row.categories?.name ?? null,
    capacity_ml: row.capacity_ml,
    count_mode: row.count_mode,
    price_per_unit: row.price_per_unit,
    unit: row.unit,
    is_active: row.is_active,
  }));
});

const getCategories = cache(async () => {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('id, name')
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
});

async function createProduct(formData: FormData) {
  'use server';

  const payload = {
    name: formData.get('name')?.toString() ?? '',
    sku: formData.get('sku')?.toString() || null,
    category_id: formData.get('category_id')?.toString() || null,
    capacity_ml: Number(formData.get('capacity_ml') ?? 0),
    count_mode: (formData.get('count_mode')?.toString() as 'fractional' | 'unit') ?? 'fractional',
    price_per_unit: formData.get('price_per_unit') ? formData.get('price_per_unit')?.toString() : null,
    unit: formData.get('unit')?.toString() || 'bottle',
    is_active: formData.get('is_active') === 'on',
  };

  await supabaseAdmin.from('products').insert(payload);
  revalidatePath('/(admin)/products');
}

async function updateProduct(formData: FormData) {
  'use server';

  const productId = formData.get('product_id')?.toString();
  if (!productId) return;

  const payload = {
    name: formData.get('name')?.toString() ?? '',
    sku: formData.get('sku')?.toString() || null,
    category_id: formData.get('category_id')?.toString() || null,
    capacity_ml: Number(formData.get('capacity_ml') ?? 0),
    count_mode: (formData.get('count_mode')?.toString() as 'fractional' | 'unit') ?? 'fractional',
    price_per_unit: formData.get('price_per_unit') ? formData.get('price_per_unit')?.toString() : null,
    unit: formData.get('unit')?.toString() || 'bottle',
    is_active: formData.get('is_active') === 'on',
  };

  await supabaseAdmin.from('products').update(payload).eq('id', productId);
  revalidatePath('/(admin)/products');
}

async function deleteProduct(formData: FormData) {
  'use server';

  const productId = formData.get('product_id')?.toString();
  if (!productId) return;

  await supabaseAdmin.from('products').delete().eq('id', productId);
  revalidatePath('/(admin)/products');
}

export default async function ProductsPage() {
  const products = await getProducts();
  const categories = await getCategories();

  return (
    <ProductsAdminPage
      products={products}
      categories={categories}
      createProduct={createProduct}
      updateProduct={updateProduct}
      deleteProduct={deleteProduct}
    />
  );
}
