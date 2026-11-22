import Link from "next/link";

const LINKS = [
  { href: "/", label: "Report a road problem" },
  { href: "/map", label: "Map of reports" },
  { href: "/roads", label: "Road passports" },
  { href: "/wards", label: "Ward money trail" },
  { href: "/contractors", label: "Contractors" },
  { href: "/overview", label: "City overview" },
  { href: "/queue", label: "Action queue" },
  { href: "/track", label: "Track complaint" },
  { href: "/assistant", label: "Ask AI" },
] as const;

const LEGAL = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

/** UX4G dark footer, kept short: name and links on one line, the data note under them. */
export function SiteFooter() {
  return (
    <footer className="ux4g-footer-wrapper ux4g-footer-dark rb-footer">
      <div className="ux4g-footer-row shell rb-footer-grid">
        <p className="ux4g-heading-xs-strong">Rastabaaz</p>
        <nav aria-label="Footer">
          <ul className="rb-footer-links">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="ux4g-text-link-neutral-inverse ux4g-text-link-neutral-s touch-target">
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
          complaint system.{" "}
          {LEGAL.map((link) => (
            <Link key={link.href} href={link.href} className="ux4g-text-link-neutral-inverse rb-footer-legal">
              {link.label}
            </Link>
          ))}
        </p>
      </div>
    </footer>
  );
}
