"use client";

import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b]">
        <div
          className="w-10 h-10 rounded-2xl border-2 border-t-[#22c55e]"
          style={{
            borderColor: "rgba(34,197,94,0.2)",
            borderTopColor: "#22c55e",
            animation: "spin 0.8s linear infinite",
          }}
        />
      </div>
    );
  }

  if (!user) return null;
  return <>{children}</>;
}
