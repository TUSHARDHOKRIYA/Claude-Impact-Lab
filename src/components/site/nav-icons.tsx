/** Tab icons for the site nav. Decorative: each sits beside its text label. */
type Props = { className?: string };

function Svg({ className, children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={22}
      height={22}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  );
}

export function ReportTabIcon(props: Props) {
  return (
    <Svg {...props}>
      <path d="M4 8a2 2 0 0 1 2-2h1.5l1.5-2h6l1.5 2H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
      <circle cx="12" cy="12.5" r="3.5" />
    </Svg>
  );
}

export function MapTabIcon(props: Props) {
  return (
    <Svg {...props}>
      <path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Z" />
      <path d="M9 4v14M15 6v14" />
    </Svg>
  );
}

export function WardsTabIcon(props: Props) {
  return (
    <Svg {...props}>
      <path d="M4 20h16" />
      <path d="M6.5 16v-5M12 16V6M17.5 16v-8" />
    </Svg>
  );
}

export function ContractorsTabIcon(props: Props) {
  return (
    <Svg {...props}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4.5V3h6v1.5M8.5 10.5l1.5 1.5 3-3M8.5 16h7" />
    </Svg>
  );
}

export function AskTabIcon(props: Props) {
  return (
    <Svg {...props}>
      <path d="M5 18.5V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H8.5L5 18.5Z" />
      <path d="M9 9.5h6M9 12.5h4" />
    </Svg>
  );
}
