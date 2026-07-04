'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Category, Product } from './types';
import { IBM_Plex_Mono, Sarabun } from 'next/font/google';

const sarabun = Sarabun({ subsets: ['latin', 'thai'], weight: ['400', '500', '600', '700', '800'] });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['500', '600', '700'] });

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
    <div className={`min-h-screen bg-[#000000] px-4 py-5 text-[#F2F5F6] sm:px-6 ${sarabun.className}`}>
      <style jsx global>{`
        :root {
          --bg: #000000;
          --card: #12181C;
          --card2: #1A2228;
          --grad1: #141C20;
          --grad2: #0E1417;
          --line: #232D33;
          --line2: #31404a;
          --mint: #2FD196;
          --mint-soft: rgba(47, 209, 150, 0.14);
          --text: #F2F5F6;
          --muted: #8A99A0;
          --muteder: #5B6B72;
        }
        body { background: var(--bg); color: var(--text); }
        .mono { font-family: ${ibmPlexMono.style.fontFamily}; }
        .panel { background: linear-gradient(155deg, var(--grad1), var(--grad2)); border: 1px solid var(--line); border-radius: 20px; box-shadow: 0 0 0 1px rgba(255,255,255,0.01) inset; }
        .input-shell { background: var(--bg); border: 1px solid var(--line2); border-radius: 14px; color: var(--text); }
        .input-shell:focus-within { border-color: var(--mint); box-shadow: 0 0 0 3px var(--mint-soft); }
        .table-shell { background: linear-gradient(155deg, var(--grad1), var(--grad2)); border: 1px solid var(--line); border-radius: 20px; overflow: hidden; }
        .table-head { background: rgba(255,255,255,0.03); color: var(--muted); }
        .table-row { border-top: 1px solid var(--line); }
        .table-row:hover { background: rgba(47,209,150,0.05); }
        .pill { border-radius: 999px; border: 1px solid var(--line2); background: var(--card2); color: var(--text); }
        .pill.active { background: var(--mint); color: #04241a; border-color: transparent; box-shadow: 0 0 16px rgba(47,209,150,0.25); }
        .btn-primary { background: var(--mint); color: #04241a; font-weight: 800; box-shadow: 0 0 18px rgba(47,209,150,0.25); }
        .btn-secondary { background: var(--card2); color: var(--text); border: 1px solid var(--line2); }
        .btn-ghost { background: transparent; color: var(--muted); border: 1px solid var(--line2); }
      `}</style>

      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="panel flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
          <div>
            <p className="text-sm text-[#8A99A0]">Products</p>
            <h2 className="text-2xl font-semibold text-[#F2F5F6]">Master Data</h2>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button type="button" onClick={handleNew} className="btn-primary rounded-full px-4 py-2 text-sm transition">
              Add Product
            </button>
            <div className="input-shell flex items-center px-3 py-2 sm:min-w-[260px]">
              <span className="mr-2 text-sm text-[#8A99A0]">🔎</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                autoComplete="off"
                type="search"
                placeholder="Search products..."
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
          </div>
        </div>

        {showForm && (
          <div className="panel p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-[#F2F5F6]">{editing ? 'Edit Product' : 'Add Product'}</h3>
                <p className="text-sm text-[#8A99A0]">กำหนดข้อมูลสินค้า, capacity, count mode, price</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
                className="btn-ghost rounded-full px-3 py-1 text-sm"
              >
                Close
              </button>
            </div>

            <form action={editing ? updateProduct : createProduct} className="grid gap-4 sm:grid-cols-2">
              {editing && <input type="hidden" name="product_id" value={formState.id} />}

              <label className="space-y-2 text-sm text-[#8A99A0]">
                Product name
                <input
                  name="name"
                  value={formState.name}
                  autoComplete="off"
                  onChange={(event) => setFormState({ ...formState, name: event.target.value })}
                  className="input-shell w-full px-4 py-2 outline-none"
                  required
                />
              </label>

              <label className="space-y-2 text-sm text-[#8A99A0]">
                SKU
                <input
                  name="sku"
                  value={formState.sku}
                  autoComplete="off"
                  onChange={(event) => setFormState({ ...formState, sku: event.target.value })}
                  className="input-shell w-full px-4 py-2 outline-none"
                />
              </label>

              <label className="space-y-2 text-sm text-[#8A99A0]">
                Category
                <select
                  name="category_id"
                  value={formState.category_id ?? ''}
                  autoComplete="off"
                  onChange={(event) => setFormState({ ...formState, category_id: event.target.value || null })}
                  className="input-shell w-full px-4 py-2 outline-none"
                >
                  <option value="">Uncategorized</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm text-[#8A99A0]">
                Capacity (ML)
                <input
                  type="number"
                  min="1"
                  name="capacity_ml"
                  value={formState.capacity_ml}
                  autoComplete="off"
                  onChange={(event) => setFormState({ ...formState, capacity_ml: event.target.value })}
                  className="input-shell w-full px-4 py-2 outline-none"
                  required
                />
              </label>

              <label className="space-y-2 text-sm text-[#8A99A0]">
                Count mode
                <select
                  name="count_mode"
                  value={formState.count_mode}
                  autoComplete="off"
                  onChange={(event) => setFormState({ ...formState, count_mode: event.target.value as 'fractional' | 'unit' })}
                  className="input-shell w-full px-4 py-2 outline-none"
                >
                  <option value="fractional">fractional</option>
                  <option value="unit">unit</option>
                </select>
              </label>

              <label className="space-y-2 text-sm text-[#8A99A0]">
                Price per unit (฿)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="price_per_unit"
                  value={formState.price_per_unit}
                  autoComplete="off"
                  onChange={(event) => setFormState({ ...formState, price_per_unit: event.target.value })}
                  className="input-shell w-full px-4 py-2 outline-none"
                />
              </label>

              <label className="space-y-2 text-sm text-[#8A99A0]">
                Unit label
                <input
                  name="unit"
                  value={formState.unit}
                  autoComplete="off"
                  onChange={(event) => setFormState({ ...formState, unit: event.target.value })}
                  className="input-shell w-full px-4 py-2 outline-none"
                />
              </label>

              <label className="flex items-center gap-3 text-sm text-[#8A99A0] sm:col-span-2">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formState.is_active}
                  onChange={(event) => setFormState({ ...formState, is_active: event.target.checked })}
                  className="h-4 w-4 rounded border-[#31404a] bg-transparent text-[#2FD196] focus:ring-[#2FD196]"
                />
                Active
              </label>

              <div className="flex flex-wrap gap-3 sm:col-span-2">
                <button type="submit" className="btn-primary rounded-full px-5 py-2 text-sm transition">
                  {editing ? 'Save changes' : 'Create product'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditing(null);
                  }}
                  className="btn-secondary rounded-full px-5 py-2 text-sm transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="table-shell">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3 text-left font-medium">SKU</th>
                <th className="px-4 py-3 text-left font-medium">Product</th>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                <th className="px-4 py-3 text-right font-medium">Capacity</th>
                <th className="px-4 py-3 text-left font-medium">Mode</th>
                <th className="px-4 py-3 text-right font-medium">Price</th>
                <th className="px-4 py-3 text-center font-medium">Active</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="table-row">
                  <td className="px-4 py-4 text-[#F2F5F6]">{product.sku ?? '-'}</td>
                  <td className="px-4 py-4 text-[#F2F5F6]">{product.name}</td>
                  <td className="px-4 py-4 text-[#8A99A0]">{product.category_name ?? 'Uncategorized'}</td>
                  <td className="px-4 py-4 text-right text-[#F2F5F6]">{product.capacity_ml}</td>
                  <td className="px-4 py-4 text-[#F2F5F6]">
                    <span className={`pill px-3 py-1 text-xs font-semibold ${product.count_mode === 'fractional' ? 'active' : ''}`}>
                      {product.count_mode}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right text-[#F2F5F6]">{formatPrice(product.price_per_unit)}</td>
                  <td className="px-4 py-4 text-center text-[#F2F5F6]">{product.is_active ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-4 text-right">
                    <div className="inline-flex gap-2">
                      <button type="button" onClick={() => handleEdit(product)} className="btn-ghost rounded-full px-3 py-1 text-xs font-medium">
                        Edit
                      </button>
                      <form action={deleteProduct}>
                        <input type="hidden" name="product_id" value={product.id} />
                        <button type="submit" className="rounded-full border border-[#F0656B]/30 px-3 py-1 text-xs font-medium text-[#F0656B] transition hover:bg-[#F0656B]/10">
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
    </div>
  );
}
