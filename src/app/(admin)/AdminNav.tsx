'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'ภาพรวม',
    icon: (
      <path d="M4 11.5 12 4l8 7.5M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9" />
    ),
  },
  {
    href: '/sessions',
    label: 'รอบนับ',
    icon: (
      <>
        <rect x="4" y="5.5" width="16" height="15" rx="2.5" />
        <path d="M4 10h16M8 3v4M16 3v4" />
      </>
    ),
  },
  {
    href: '/products',
    label: 'สินค้า',
    icon: (
      <>
        <path d="M4 8.5 12 4l8 4.5-8 4.5-8-4.5Z" />
        <path d="M4 8.5v7L12 20l8-4.5v-7M12 13v7" />
      </>
    ),
  },
  {
    href: '/count',
    label: 'หน้านับ',
    icon: (
      <>
        <rect x="5.5" y="4" width="13" height="17" rx="2" />
        <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
        <path d="m8.5 13 2 2 4-4.5" />
      </>
    ),
  },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="admin-nav">
      <style jsx>{`
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
          border: 1px solid var(--line, #232d33);
          border-bottom: none;
          border-radius: 20px 20px 0 0;
          padding: 8px 10px calc(10px + env(safe-area-inset-bottom, 0px));
          z-index: 60;
          box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.35);
        }
        .nav-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          padding: 6px 4px;
          border-radius: 14px;
          color: var(--muted, #8a99a0);
          text-decoration: none;
          transition: color 0.15s;
        }
        .nav-item svg {
          width: 22px;
          height: 22px;
          fill: none;
          stroke: currentColor;
          stroke-width: 1.8;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .nav-item span {
          font-size: 11px;
          font-weight: 700;
        }
        .nav-item.active {
          color: var(--mint, #2fd196);
        }
        .nav-item.active svg {
          filter: drop-shadow(0 0 6px rgba(47, 209, 150, 0.5));
        }
      `}</style>
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
        return (
          <Link key={item.href} href={item.href} className={`nav-item${active ? ' active' : ''}`}>
            <svg viewBox="0 0 24 24">{item.icon}</svg>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
