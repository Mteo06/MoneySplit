"use client";

import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { LogOut, User, Wallet, Users } from "lucide-react";
import { usePathname } from "next/navigation";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Navbar() {
  const { user, profile } = useAuth();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  if (!user) return null; // Only show navbar for authenticated users

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: Wallet },
    { href: "/groups", label: "Groups", icon: Users },
    { href: "/profile", label: "Profile", icon: User },
  ];

  return (
    <>
      {/* Desktop Top Navbar */}
      <nav className="hidden md:flex items-center justify-between px-6 py-4 bg-white border-b sticky top-0 z-50">
        <div className="flex items-center space-x-8">
          <Link href="/dashboard" className="text-xl font-bold text-indigo-600">
            MoneySplit
          </Link>
          <div className="flex space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  pathname.startsWith(item.href)
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-700">
            {profile?.name || user.email}
          </span>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-50 px-2 pb-safe pt-2">
        <div className="flex justify-around items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center p-2 rounded-lg transition-colors flex-1 text-center",
                  isActive
                    ? "text-indigo-600"
                    : "text-gray-500 hover:text-gray-900"
                )}
              >
                <Icon className={cn("h-6 w-6 mb-1", isActive && "fill-indigo-50")} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
