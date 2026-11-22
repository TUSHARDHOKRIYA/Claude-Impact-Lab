"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  AskTabIcon,
  AuditTabIcon,
  ContractorsTabIcon,
  MapTabIcon,
  OverviewTabIcon,
  ReportTabIcon,
  RoadsTabIcon,
  WardsTabIcon,
} from "@/components/site/nav-icons";

const NAV = [
  { href: "/", label: "Report", Icon: ReportTabIcon, mobile: true },
  { href: "/map", label: "Map", Icon: MapTabIcon, mobile: true },
  { href: "/roads", label: "Roads", Icon: RoadsTabIcon, mobile: true },
  { href: "/wards", label: "Wards", Icon: WardsTabIcon, mobile: true },
  { href: "/assistant", label: "Ask", Icon: AskTabIcon, mobile: true },
  { href: "/overview", label: "Overview", Icon: OverviewTabIcon, mobile: false },
  { href: "/contractors", label: "Contractors", Icon: ContractorsTabIcon, mobile: false },
  { href: "/accountability", label: "Audit", Icon: AuditTabIcon, mobile: false },
  { href: "/queue", label: "Queue", Icon: AuditTabIcon, mobile: false },
  { href: "/spend-vs-need", label: "Spend vs Need", Icon: OverviewTabIcon, mobile: false },
  { href: "/citizen", label: "Citizen Hub", Icon: ReportTabIcon, mobile: false },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/" || pathname === "/report" || pathname.startsWith("/report/");
  // A public report or a place is something you reach from the map.
  if (href === "/map" && /^\/(reports|places)\//.test(pathname)) return true;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * UX4G navbar, with the road's lane marking along its lower edge. On phones
 * the same list becomes a tab bar fixed to the bottom of the screen.
 */
export function SiteHeader() {
  const pathname = usePathname() ?? "/";

  return (
    <header className="rb-header">
      <nav className="ux4g-navbar" aria-label="Site">
        <div className="ux4g-navbar-wrap shell">
          <Link href="/" className="rb-wordmark touch-target">
            <span className="ux4g-heading-xs-strong">Rastabaaz</span>
            <span lang="mr" className="ux4g-label-m-default ux4g-text-neutral-secondary">
              रस्ताबाज
            </span>
          </Link>
          <ul className="ux4g-navbar-links rb-nav">
            {NAV.map(({ href, label, Icon, mobile }) => (
              <li key={href} className={mobile ? undefined : "rb-nav-desktop-only"}>
                <Link
                  href={href}
                  aria-current={isActive(pathname, href) ? "page" : undefined}
                  className="ux4g-text-link-neutral-m rb-nav-link touch-target"
                >
                  <Icon className="rb-nav-icon" />
                  <span>{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
      <div className="rb-lane" aria-hidden="true" />
    </header>
  );
}
