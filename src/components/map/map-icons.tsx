/** Line icons for the map explorer. Decorative: labels carry the meaning. */
function Svg({ size = 20, children }: { size?: number; children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function ListIcon() {
  return (
    <Svg>
      <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
    </Svg>
  );
}

export function MapIcon() {
  return (
    <Svg>
      <path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2Z M9 4v14M15 6v14" />
    </Svg>
  );
}

export function ChevronIcon() {
  return (
    <Svg size={16}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  );
}

export function CalendarIcon() {
  return (
    <Svg size={18}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </Svg>
  );
}
