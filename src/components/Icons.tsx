export function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg className="star-svg" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3.2 14.4 8.3l5.6.7-4.1 3.8 1.1 5.5L12 15.8 7 18.3l1.1-5.5L4 9l5.6-.7L12 3.2z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChevronLeft() {
  return (
    <svg className="chevron" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14.5 5.5 8 12l6.5 6.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function VaultMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 48 48" aria-hidden="true">
      <rect width="48" height="48" rx="12" fill="#144833" />
      <rect x="11" y="9" width="26" height="31" rx="4" fill="#FFF8EE" />
      <rect x="11" y="9" width="26" height="8" rx="4" fill="#F0B429" />
      <rect x="11" y="14" width="26" height="3" fill="#F0B429" />
      <path d="M24 21.2 25.7 24.8l3.9.5-2.9 2.6.8 3.8L24 30.1l-3.5 1.6.8-3.8-2.9-2.6 3.9-.5L24 21.2z" fill="#E25B45" />
    </svg>
  );
}
