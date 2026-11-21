"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  AskTabIcon,
  ContractorsTabIcon,
  MapTabIcon,
  ReportTabIcon,
  WardsTabIcon,
} from "@/components/site/nav-icons";

const NAV = [
  { href: "/", label: "Report", Icon: ReportTabIcon },
  { href: "/map", label: "Map", Icon: MapTabIcon },
  { href: "/wards", label: "Wards", Icon: WardsTabIcon },
  { href: "/contractors", label: "Contractors", Icon: ContractorsTabIcon },
  { href: "/assistant", label: "Ask", Icon: AskTabIcon },
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
            {NAV.map(({ href, label, Icon }) => (
              <li key={href}>
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
