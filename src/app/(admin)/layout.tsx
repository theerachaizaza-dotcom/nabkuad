import type { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'NabKuad Admin',
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Admin Dashboard</p>
            <h1 className="text-3xl font-semibold tracking-tight">Master Data</h1>
          </div>          <nav className="flex flex-wrap gap-3">
            <a href="/dashboard" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
              Monitoring
            </a>
            <a href="/sessions" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
              Sessions
            </a>
            <a href="/products" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
              Products
            </a>
          </nav>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6">{children}</div>
      </div>
    </div>
  );
}
