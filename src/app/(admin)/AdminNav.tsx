'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CalendarClock, Package, ListChecks } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'ภาพรวม', Icon: LayoutDashboard },
  { href: '/sessions', label: 'รอบนับ', Icon: CalendarClock },
  { href: '/products', label: 'สินค้า', Icon: Package },
  { href: '/count', label: 'หน้านับ', Icon: ListChecks },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="admin-nav">
      <style jsx global>{`
        .admin-nav {
          position: fixed;
          left: 50%;
          bottom: 0;
          transform: translateX(-50%);
          width: 100%;
          max-width: 640px;
          display: flex;
          justify-content: space-around;
          gap: 4px;
          background: rgba(18, 24, 28, 0.92);
          backdrop-filter: blur(10px);
          border: 1px solid #232d33;
          border-bottom: none;
          border-radius: 20px 20px 0 0;
          padding: 8px 10px calc(10px + env(safe-area-inset-bottom, 0px));
          z-index: 60;
          box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.35);
        }
        .admin-nav .nav-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          padding: 6px 4px;
          border-radius: 14px;
          color: #8a99a0;
          text-decoration: none;
          transition: color 0.15s;
        }
        .admin-nav .nav-item span {
          font-size: 11px;
          font-weight: 700;
        }
        .admin-nav .nav-item.active {
          color: #2fd196;
        }
        .admin-nav .nav-item.active svg {
          filter: drop-shadow(0 0 6px rgba(47, 209, 150, 0.5));
        }
      `}</style>
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname?.startsWith(`${href}/`);
        return (
          <Link key={href} href={href} className={`nav-item${active ? ' active' : ''}`}>
            <Icon size={22} strokeWidth={1.8} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
