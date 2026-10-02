'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// ดึงข้อมูลหน้า dashboard ใหม่อัตโนมัติ — ให้เห็นยอดที่สตาฟส่งเข้ามาโดยไม่ต้องกดรีเฟรชเอง
// - ทุก intervalMs ขณะเปิดหน้านี้ค้างไว้
// - ทันทีที่กลับมาที่แท็บ / กด back กลับมาหน้านี้ (กันเห็นสำเนาเก่าจาก cache)
export default function AutoRefresh({ intervalMs = 15000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') router.refresh();
    };

    // กลับมาหน้านี้ด้วย back/ลิงก์ในแอป Next จะเอาสำเนาเก่าใน cache มาแสดง — ดึงใหม่ทันทีที่ mount
    refresh();

    const timer = window.setInterval(refresh, intervalMs);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('pageshow', refresh);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('pageshow', refresh);
    };
  }, [router, intervalMs]);

  return null;
}
