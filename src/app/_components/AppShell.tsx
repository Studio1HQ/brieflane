"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Calendar,
  ChevronsRight,
  FoldHorizontal,
  LayoutGrid,
  Menu,
  SparklesIcon,
} from "lucide-react";

type AppShellProps = {
  children: React.ReactNode;
};

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  { href: "/meetings", label: "Meetings", icon: Calendar },
  { href: "/briefai", label: "BriefAI", icon: SparklesIcon },
];

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const params = useParams<{ id?: string }>();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentLabel = useMemo(() => {
    if (pathname.startsWith("/runs/")) {
      return `Meetings -> ${params.id ?? "Meeting"}`;
    }

    const current = navItems.find((item) =>
      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href),
    );

    return current?.label ?? "Dashboard";
  }, [pathname, params.id]);

  return (
    <div className="app-shell">
      <aside
        className={`app-sidebar ${collapsed ? "is-collapsed" : ""} ${mobileOpen ? "is-mobile-open" : ""}`}
      >
        <div className="app-sidebar__inner">
          <div className="app-sidebar__top">
            {collapsed ? (
              <button
                type="button"
                className="app-sidebar__collapsed-brand"
                aria-label="Expand sidebar"
                onClick={() => setCollapsed(false)}
              >
                <span
                  className="app-sidebar__collapsed-logo"
                  aria-hidden="true"
                >
                  <LogoMark />
                </span>

                <span
                  className="app-sidebar__collapsed-expand"
                  aria-hidden="true"
                >
                  <ChevronsRight size={18} strokeWidth={1.8} />
                </span>
              </button>
            ) : (
              <>
                <Link
                  href="/"
                  className="app-sidebar__brand"
                  aria-label="Brieflane"
                >
                  <span className="app-sidebar__brand-text">
                    Brief<span className="app-sidebar__brand-accent">lane</span>
                  </span>
                </Link>

                <button
                  type="button"
                  className="app-sidebar__toggle desktop-only"
                  onClick={() => setCollapsed(true)}
                  aria-label="Collapse sidebar"
                >
                  <FoldHorizontal size={18} strokeWidth={1.8} />
                </button>
              </>
            )}
          </div>

          <nav className="app-sidebar__nav" aria-label="Primary">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`app-nav-item ${isActive ? "is-active" : ""}`}
                  onClick={() => setMobileOpen(false)}
                  aria-label={collapsed ? item.label : undefined}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="app-nav-item__icon">
                    <Icon size={18} strokeWidth={1.9} />
                  </span>
                  <span className="app-nav-item__label">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      <div
        className={`app-shell__overlay ${mobileOpen ? "is-visible" : ""}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      <div className="app-main">
        <header className="app-navbar">
          <div className="app-navbar__left">
            <button
              type="button"
              className="app-navbar__menu mobile-only"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={18} strokeWidth={1.9} />
            </button>

            <div className="app-navbar__title-wrap">
              <h1 className="app-navbar__title">{currentLabel}</h1>
            </div>
          </div>
        </header>

        <main className="app-main__content">{children}</main>
      </div>
    </div>
  );
}

function LogoMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        d="M7 4.75h7.8l3.45 3.45v7.55A3.25 3.25 0 0 1 15 19H8.25A3.25 3.25 0 0 1 5 15.75V7A2.25 2.25 0 0 1 7 4.75Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.8 4.75V8.2H18.25"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.2 10.25H14.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.2 13.25H12.7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.1 19 7.2 21.1c-.28.31-.8.11-.8-.31V19"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16.7" cy="13.25" r="1.15" fill="var(--color-primary)" />
    </svg>
  );
}
