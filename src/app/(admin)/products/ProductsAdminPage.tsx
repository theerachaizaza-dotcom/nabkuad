'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Category, Product } from './types';

type Props = {
  products: Product[];
  categories: Category[];
  createProduct: (formData: FormData) => Promise<void>;
  updateProduct: (formData: FormData) => Promise<void>;
  deleteProduct: (formData: FormData) => Promise<void>;
};

type FormState = {
  id?: string;
  name: string;
  sku: string;
  category_id: string | null;
  capacity_ml: string;
  count_mode: 'fractional' | 'unit';
  price_per_unit: string;
  unit: string;
  is_active: boolean;
};

function formatPrice(price: string | null) {
  return price ? Number(price).toFixed(2) : '-';
}

const defaultFormState: FormState = {
  name: '',
  sku: '',
  category_id: null,
  capacity_ml: '700',
  count_mode: 'fractional',
  price_per_unit: '',
  unit: 'bottle',
  is_active: true,
};

export default function ProductsAdminPage({ products, categories, createProduct, updateProduct, deleteProduct }: Props) {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [formState, setFormState] = useState<FormState>(defaultFormState);

  useEffect(() => {
    if (!editing) {
      setFormState(defaultFormState);
      return;
    }

    setFormState({
      id: editing.id,
      name: editing.name,
      sku: editing.sku ?? '',
      category_id: editing.category_id ?? null,
      capacity_ml: String(editing.capacity_ml),
      count_mode: editing.count_mode,
      price_per_unit: editing.price_per_unit ?? '',
      unit: editing.unit,
      is_active: editing.is_active,
    });
  }, [editing]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) => {
      return [product.name, product.sku, product.category_name]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query));
    });
  }, [products, search]);

  const handleEdit = (product: Product) => {
    setEditing(product);
    setShowForm(true);
  };

  const handleNew = () => {
    setEditing(null);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">Products</p>
          <h2 className="text-2xl font-semibold text-slate-900">Master Data</h2>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleNew}
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Add Product
          </button>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            type="search"
            placeholder="Search products..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none transition focus:border-slate-400 sm:w-auto"
          />
        </div>
      </div>

      {showForm && (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                {editing ? 'Edit Product' : 'Add Product'}
              </h3>
              <p className="text-sm text-slate-500">กำหนดข้อมูลสินค้า, capacity, count_mode, price</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditing(null);
              }}
              className="rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
            >
              Close
            </button>
          </div>

          <form
            action={editing ? updateProduct : createProduct}
            className="grid gap-4 sm:grid-cols-2"
          >
            {editing && <input type="hidden" name="product_id" value={formState.id} />}

            <label className="space-y-2 text-sm text-slate-700">
              Product name
              <input
                name="name"
                value={formState.name}
                onChange={(event) => setFormState({ ...formState, name: event.target.value })}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-2 outline-none focus:border-slate-400"
                required
              />
            </label>

            <label className="space-y-2 text-sm text-slate-700">
              SKU
              <input
                name="sku"
                value={formState.sku}
                onChange={(event) => setFormState({ ...formState, sku: event.target.value })}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-2 outline-none focus:border-slate-400"
              />
            </label>

            <label className="space-y-2 text-sm text-slate-700">
              Category
              <select
                name="category_id"
                value={formState.category_id ?? ''}
                onChange={(event) => setFormState({ ...formState, category_id: event.target.value || null })}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-2 outline-none focus:border-slate-400"
              >
                <option value="">Uncategorized</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm text-slate-700">
              Capacity (ML)
              <input
                type="number"
                min="1"
                name="capacity_ml"
                value={formState.capacity_ml}
                onChange={(event) => setFormState({ ...formState, capacity_ml: event.target.value })}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-2 outline-none focus:border-slate-400"
                required
              />
            </label>

            <label className="space-y-2 text-sm text-slate-700">
              Count mode
              <select
                name="count_mode"
                value={formState.count_mode}
                onChange={(event) => setFormState({ ...formState, count_mode: event.target.value as 'fractional' | 'unit' })}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-2 outline-none focus:border-slate-400"
              >
                <option value="fractional">fractional</option>
                <option value="unit">unit</option>
              </select>
            </label>

            <label className="space-y-2 text-sm text-slate-700">
              Price per unit (฿)
              <input
                type="number"
                step="0.01"
                min="0"
                name="price_per_unit"
                value={formState.price_per_unit}
                onChange={(event) => setFormState({ ...formState, price_per_unit: event.target.value })}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-2 outline-none focus:border-slate-400"
              />
            </label>

            <label className="space-y-2 text-sm text-slate-700">
              Unit label
              <input
                name="unit"
                value={formState.unit}
                onChange={(event) => setFormState({ ...formState, unit: event.target.value })}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-2 outline-none focus:border-slate-400"
              />
            </label>

            <label className="flex items-center gap-3 text-sm text-slate-700 sm:col-span-2">
              <input
                type="checkbox"
                name="is_active"
                checked={formState.is_active}
                onChange={(event) => setFormState({ ...formState, is_active: event.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
              />
              Active
            </label>

            <div className="flex flex-wrap gap-3 sm:col-span-2">
              <button
                type="submit"
                className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                {editing ? 'Save changes' : 'Create product'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
                className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="border-b border-slate-200 px-4 py-3 text-left font-medium">SKU</th>
              <th className="border-b border-slate-200 px-4 py-3 text-left font-medium">Product</th>
              <th className="border-b border-slate-200 px-4 py-3 text-left font-medium">Category</th>
              <th className="border-b border-slate-200 px-4 py-3 text-right font-medium">Capacity</th>
              <th className="border-b border-slate-200 px-4 py-3 text-left font-medium">Mode</th>
              <th className="border-b border-slate-200 px-4 py-3 text-right font-medium">Price</th>
              <th className="border-b border-slate-200 px-4 py-3 text-center font-medium">Active</th>
              <th className="border-b border-slate-200 px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => (
              <tr key={product.id} className="border-b border-slate-100 last:border-none hover:bg-slate-50">
                <td className="px-4 py-4 text-slate-700">{product.sku ?? '-'}</td>
                <td className="px-4 py-4 text-slate-900">{product.name}</td>
                <td className="px-4 py-4 text-slate-700">{product.category_name ?? 'Uncategorized'}</td>
                <td className="px-4 py-4 text-right text-slate-700">{product.capacity_ml}</td>
                <td className="px-4 py-4 text-slate-700">{product.count_mode}</td>
                <td className="px-4 py-4 text-right text-slate-700">{formatPrice(product.price_per_unit)}</td>
                <td className="px-4 py-4 text-center text-slate-700">{product.is_active ? 'Yes' : 'No'}</td>
                <td className="px-4 py-4 text-right">
                  <div className="inline-flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(product)}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      Edit
                    </button>
                    <form action={deleteProduct}>
                      <input type="hidden" name="product_id" value={product.id} />
                      <button
                        type="submit"
                        className="rounded-full border border-rose-200 px-3 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
