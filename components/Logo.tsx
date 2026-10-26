export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="visionai-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c6cff" />
          <stop offset="1" stopColor="#e45cc8" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#visionai-logo)" />
      <path
        d="M32 14c-10 0-18.5 7.3-22 18 3.5 10.7 12 18 22 18s18.5-7.3 22-18c-3.5-10.7-12-18-22-18Z"
        fill="none"
        stroke="#fff"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="32" r="7" fill="#fff" />
      <path d="M45 12l1.6 3.4L50 17l-3.4 1.6L45 22l-1.6-3.4L40 17l3.4-1.6Z" fill="#fff" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="text-[17px] font-semibold tracking-tight">
        Vision<span className="text-accent">AI</span>
      </span>
    </span>
  );
}
