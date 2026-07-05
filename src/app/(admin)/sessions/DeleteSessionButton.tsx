'use client';

import { useState, useTransition } from 'react';

type Props = {
  sessionId: string;
  sessionName: string;
  canDelete: boolean;
  deleteSession: (sessionId: string) => Promise<void>;
};

export default function DeleteSessionButton({ sessionId, sessionName, canDelete, deleteSession }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!canDelete || pending) return;

    const confirmed = window.confirm(
      `ลบรอบ ${sessionName}? ยอดที่นับในรอบนี้ทั้งหมดจะหายถาวร ยกเลิกไม่ได้`
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      try {
        await deleteSession(sessionId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'ลบไม่สำเร็จ');
      }
    });
  }

  return (
    <div className="delete-wrap">
      <style jsx global>{`
        .delete-wrap {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
        }
        .delete-btn {
          background: transparent;
          border: 1px solid var(--line2, #31404a);
          color: var(--muted, #8a99a0);
          border-radius: 10px;
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: color 0.15s, border-color 0.15s, background 0.15s;
          flex: 0 0 auto;
        }
        .delete-btn svg {
          width: 16px;
          height: 16px;
          fill: none;
          stroke: currentColor;
          stroke-width: 1.8;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .delete-btn:not(:disabled):hover,
        .delete-btn:not(:disabled):active {
          color: var(--danger, #f0656b);
          border-color: var(--danger, #f0656b);
          background: rgba(240, 101, 107, 0.08);
        }
        .delete-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .delete-err {
          font-size: 11px;
          color: var(--danger, #f0656b);
          max-width: 160px;
          text-align: right;
        }
      `}</style>
      <button
        type="button"
        className="delete-btn"
        onClick={handleClick}
        disabled={!canDelete || pending}
        title={canDelete ? 'ลบรอบนับ' : 'ปิดรอบก่อนถึงจะลบได้'}
        aria-label="ลบรอบนับ"
      >
        <svg viewBox="0 0 24 24">
          <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      </button>
      {error && <span className="delete-err">{error}</span>}
    </div>
  );
}
