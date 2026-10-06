"use client";
import Link from "next/link";
import { useScrollHeader } from "@/hooks/use-scroll-header";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, X, Download } from "lucide-react";
const portfolio = [
  ["Experience", "/experience"],
  ["Projects", "/projects"],
  ["Inside the platform", "/platform"],
  ["Expertise", "/expertise"],
  ["Resume", "/resume"],
  ["About Me", "/about"],
];
export default function Navigation() {
  const path = usePathname();
  useScrollHeader(path);
  const [mobileOpen, setMobileOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const [account, setAccount] = useState<
    "loading" | "authenticated" | "anonymous" | "error"
  >("loading");
  useEffect(() => {
    let request: AbortController | undefined;
    const refresh = async () => {
      request?.abort();
      const controller = new AbortController();
      request = controller;
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Account status unavailable");
        const data = await response.json();
        if (typeof data.authenticated !== "boolean")
          throw new Error("Invalid account status");
        if (!controller.signal.aborted)
          setAccount(data.authenticated ? "authenticated" : "anonymous");
      } catch {
        if (!controller.signal.aborted) setAccount("error");
      }
    };
    const visible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    void refresh();
    window.addEventListener("focus", visible);
    document.addEventListener("visibilitychange", visible);
    return () => {
      request?.abort();
      window.removeEventListener("focus", visible);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [path]);
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (
        !toggle.current?.closest(".site-header")?.contains(event.target as Node)
      )
        setMobileOpen(false);
      if (menu.current && !menu.current.contains(event.target as Node))
        menu.current.open = false;
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (menu.current?.open) {
        menu.current.open = false;
        menu.current.querySelector("summary")?.focus();
        return;
      }
      if (mobileOpen) {
        setMobileOpen(false);
        toggle.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [mobileOpen]);
  useEffect(() => {
    const timer = setTimeout(() => setMobileOpen(false), 0);
    return () => clearTimeout(timer);
  }, [path]);
  const current = (href: string) =>
    (href === "/" ? path === href : path.startsWith(href))
      ? ("page" as const)
      : undefined;
  return (
    <>
      <button
        ref={toggle}
        className="mobile-navigation-toggle"
        aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={mobileOpen}
        aria-controls="main-navigation"
        onClick={() => setMobileOpen((open) => !open)}
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
      <nav
        id="main-navigation"
        data-open={mobileOpen}
        className="main-navigation"
        aria-label="Main navigation"
        onClick={(event) => {
          if ((event.target as Element).closest("a")) setMobileOpen(false);
        }}
      >
        <Link href="/" aria-current={current("/")}>
          Home
        </Link>
        <details ref={menu} className="portfolio-menu">
          <summary
            data-active={
              portfolio.some(([, href]) => path.startsWith(href)) || undefined
            }
          >
            Portfolio <ChevronDown size={16} aria-hidden="true" />
          </summary>
          <div className="portfolio-submenu">
            {portfolio.map(([name, href]) => (
              <Link
                key={href}
                href={href}
                aria-current={current(href)}
                onClick={() => {
                  if (menu.current) menu.current.open = false;
                }}
              >
                {name}
              </Link>
            ))}
          </div>
        </details>
        <Link href="/contact" aria-current={current("/contact")}>
          Contact Us
        </Link>
        <a
          href={account === "anonymous" ? "/login" : "/portal"}
          aria-current={current(account === "anonymous" ? "/login" : "/portal")}
          aria-busy={account === "loading" || undefined}
          title={
            account === "error"
              ? "Open your account; status is temporarily unavailable"
              : undefined
          }
        >
          {account === "authenticated"
            ? "Profile"
            : account === "anonymous"
              ? "Login"
              : "Account"}
        </a>
        <div className="mobile-install-link">
          <Link href="/install">
            <Download size={18} aria-hidden="true" />
            Install app
          </Link>
          <span>No account needed</span>
        </div>
      </nav>
      <noscript>
        <style>{`.mobile-navigation-toggle {display:none!important} .main-navigation {display:flex!important;position:static!important;flex-wrap:wrap!important}`}</style>
      </noscript>
    </>
  );
}
