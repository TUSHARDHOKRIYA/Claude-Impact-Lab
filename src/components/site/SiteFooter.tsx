import Link from "next/link";

const LINKS = [
  { href: "/", label: "Report a road problem" },
  { href: "/map", label: "Map of reports" },
  { href: "/wards", label: "Ward money trail" },
  { href: "/contractors", label: "Contractor scorecards" },
  { href: "/assistant", label: "Ask AI assistant" },
  { href: "/privacy", label: "Privacy policy" },
  { href: "/terms", label: "Terms & conditions" },
] as const;

/** UX4G dark footer. */
export function SiteFooter() {
  return (
    <footer className="ux4g-footer-wrapper ux4g-footer-dark rb-footer">
      <div className="ux4g-footer-row shell rb-footer-grid">
        <p className="ux4g-heading-xs-strong">Rastabaaz</p>
        <nav aria-label="Footer">
          <ul className="ux4g-grid ux4g-gap-2xs">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="ux4g-text-link-neutral-inverse ux4g-text-link-neutral-m touch-target">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="ux4g-body-xs-default rb-footer-note">
          Ward codes and road names are real. Every amount, date, contractor and
          work order comes from the synthetic Claude Impact Lab dataset. Reports
          filed here are public and anonymous, and do not reach the BMC
          complaint system.
        </p>
      </div>
    </footer>
  );
}
