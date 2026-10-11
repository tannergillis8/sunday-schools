export function Football({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 40"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <g transform="rotate(-18 32 20)">
        <ellipse cx="32" cy="20" rx="28" ry="15" fill="#8a4b24" stroke="#14213d" strokeWidth="3" />
        <path
          d="M14 11c-2 6-2 12 0 18M50 11c2 6 2 12 0 18"
          fill="none"
          stroke="#f4f6f0"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M24 20h16M28 16v8M32 16v8M36 16v8"
          fill="none"
          stroke="#f4f6f0"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
