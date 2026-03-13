"use client";

import { useAuth } from "@/lib/AuthContext";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, Users, User } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Navbar() {
  const { user, profile } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  if (!user) return null;

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/groups", label: "Gruppi", icon: Users },
    { href: "/profile", label: "Profilo", icon: User },
  ];

  const displayName = profile?.name || user.email?.split("@")[0] || "Utente";
  const initials = displayName.charAt(0).toUpperCase();

  // Use router.push for mobile nav to avoid triggering browser chrome on PWA
  const handleMobileNav = (href: string) => {
    if (pathname !== href) router.push(href);
  };

  return (
    <>
      {/* Desktop Top Navbar */}
      <nav className="hidden md:flex items-center justify-between px-8 py-0 h-16 bg-white/80 backdrop-blur-xl border-b border-border/60 sticky top-0 z-50 shadow-sm">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <button onClick={() => router.push("/dashboard")} className="flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform duration-200">
              <span className="text-white text-sm font-bold">M</span>
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-primary to-violet-600 bg-clip-text text-transparent">
              MoneySplit
            </span>
          </button>

          {/* Nav Links */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/60 text-sm text-muted-foreground">
            <div className="h-6 w-6 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-semibold">
              {initials}
            </div>
            <span className="font-medium text-foreground">{displayName}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-2 rounded-xl"
          >
            <LogOut className="h-4 w-4" />
            <span>Esci</span>
          </Button>
        </div>
      </nav>

      {/* Mobile Bottom Navigation — uses router.push to avoid URL bar on PWA */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-3 pb-4 pt-2">
        <div className="glass rounded-2xl shadow-2xl shadow-black/10 border-border/40 overflow-hidden">
          <div className="flex justify-around items-center px-1 py-2">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <button
                  key={item.href}
                  onClick={() => handleMobileNav(item.href)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 flex-1 text-center min-w-0",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className={cn(
                    "p-1.5 rounded-lg transition-all duration-200",
                    isActive ? "bg-primary/15" : ""
                  )}>
                    <item.icon className={cn(
                      "h-5 w-5 transition-all duration-200",
                      isActive && "stroke-[2.5px]"
                    )} />
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium tracking-tight",
                    isActive ? "font-semibold" : ""
                  )}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
