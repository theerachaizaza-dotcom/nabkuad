'use client';

const STORAGE_KEY = 'nabkuad-theme';

export default function ThemeToggle() {
  function handleClick() {
    const root = document.documentElement;
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.dataset.theme = next;
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={handleClick}
      aria-label="สลับโหมดกลางวัน/กลางคืน"
      title="สลับโหมดกลางวัน/กลางคืน"
    >
      <style jsx global>{`
        .theme-toggle {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: 1px solid var(--line2);
          background: var(--card2);
          color: var(--muted);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex: 0 0 auto;
          transition: color 0.15s, border-color 0.15s;
        }
        .theme-toggle:hover {
          color: var(--mint);
          border-color: var(--mint);
        }
        .theme-toggle svg {
          width: 17px;
          height: 17px;
          fill: none;
          stroke: currentColor;
          stroke-width: 1.8;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .theme-toggle .icon-sun {
          display: none;
        }
        .theme-toggle .icon-moon {
          display: block;
        }
        [data-theme='light'] .theme-toggle .icon-sun {
          display: block;
        }
        [data-theme='light'] .theme-toggle .icon-moon {
          display: none;
        }
      `}</style>
      <svg className="icon-sun" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.5v2.4M12 19.1v2.4M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7" />
      </svg>
      <svg className="icon-moon" viewBox="0 0 24 24">
        <path d="M20 14.5A8 8 0 1 1 9.5 4a6.4 6.4 0 0 0 10.5 10.5Z" />
      </svg>
    </button>
  );
}
