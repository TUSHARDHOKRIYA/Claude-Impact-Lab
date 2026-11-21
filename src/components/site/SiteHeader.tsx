"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Report" },
  { href: "/map", label: "Map" },
  { href: "/wards", label: "Wards" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/" || pathname.startsWith("/report");
  return pathname === href || pathname.startsWith(`${href}/`) || (href === "/wards" && pathname.startsWith("/contractors"));
}

/** UX4G navbar, with the road's lane marking along its lower edge. */
export function SiteHeader() {
  const pathname = usePathname() ?? "/";

  return (
    <header className="rh-header">
      <nav className="ux4g-navbar" aria-label="Site">
        <div className="ux4g-navbar-wrap shell">
          <Link href="/" className="rh-wordmark touch-target">
            <span className="ux4g-heading-xs-strong">Rasta Hisaab</span>
            <span lang="mr" className="ux4g-label-m-default ux4g-text-neutral-secondary">
              रस्ता हिशोब
            </span>
          </Link>
          <ul className="ux4g-navbar-links rh-nav">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(pathname, item.href) ? "page" : undefined}
                  className="ux4g-text-link-neutral-m rh-nav-link touch-target"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
      <div className="rh-lane" aria-hidden="true" />
    </header>
  );
}
