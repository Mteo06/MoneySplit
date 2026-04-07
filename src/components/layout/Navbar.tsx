"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { LayoutDashboard, Users, User, Sun, Moon } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home",    icon: LayoutDashboard },
  { href: "/groups",    label: "Gruppi",  icon: Users },
  { href: "/profile",   label: "Profilo", icon: User },
];

export function Navbar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Initial check
    if (typeof window !== "undefined") {
      setIsDark(document.documentElement.classList.contains("dark"));
    }
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Desktop top bar */}
      <header
        className="hidden md:flex items-center justify-between px-6 py-3 sticky top-0 z-40"
        style={{
          background: "var(--header-bg)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--card-border)",
        }}
      >
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 no-underline">
          <div
            className="h-8 w-8 rounded-xl flex items-center justify-center text-[#0a0a0b] font-bold text-sm"
            style={{ background: "#22c55e", boxShadow: "0 0 16px rgba(34,197,94,0.3)" }}
          >
            M
          </div>
          <span className="text-sm font-bold text-foreground" style={{ fontFamily: "var(--font-display-var)" }}>
            MoneySplit
          </span>
        </Link>

        {/* Nav links and Theme Toggle */}
        <nav className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link key={href} href={href}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all no-underline"
                  style={active
                    ? { background: "var(--nav-active-bg)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }
                    : { color: "var(--text-dim)", border: "1px solid transparent" }}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </div>

          <button
            onClick={toggleTheme}
            className="h-9 w-9 flex items-center justify-center rounded-xl transition-all border border-transparent hover:border-border hover:bg-muted"
            title={isDark ? "Passa a tema chiaro" : "Passa a tema scuro"}
          >
            {isDark ? (
              <Sun className="h-4 w-4 text-foreground" />
            ) : (
              <Moon className="h-4 w-4 text-foreground" />
            )}
          </button>
        </nav>
      </header>

      {/* Mobile bottom bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center pt-1"
        style={{
          background: "var(--header-bg)",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid var(--card-border)",
          paddingBottom: "calc(6px + env(safe-area-inset-bottom))",
        }}
      >
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href}
              className="flex-1 flex flex-col items-center gap-1 py-1 transition-all no-underline"
              style={{ color: active ? "#22c55e" : "var(--text-dim)" }}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-semibold tracking-wide">{label}</span>
              {active && (
                <span
                  className="absolute bottom-0 w-8 h-0.5 rounded-full"
                  style={{ background: "#22c55e", marginBottom: "env(safe-area-inset-bottom)" }}
                />
              )}
            </Link>
          );
        })}
        {/* Mobile Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex-1 flex flex-col items-center gap-1 py-1 transition-all no-underline"
          style={{ color: "var(--text-dim)" }}
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          <span className="text-[10px] font-semibold tracking-wide">{isDark ? "Light" : "Dark"}</span>
        </button>
      </nav>
    </>
  );
}
