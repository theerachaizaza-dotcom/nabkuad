import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { Sarabun } from 'next/font/google';
import AdminNav from './AdminNav';

const sarabun = Sarabun({ subsets: ['latin', 'thai'], weight: ['400', '500', '600', '700', '800'] });

export const metadata: Metadata = {
  title: 'NabKuad Admin',
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`admin-shell ${sarabun.className}`}>
      <style>{`
        .admin-shell {
          min-height: 100vh;
          background: var(--bg);
        }
        .admin-content {
          padding-bottom: 88px;
        }
      `}</style>
      <div className="admin-content">{children}</div>
      <AdminNav />
    </div>
  );
}
