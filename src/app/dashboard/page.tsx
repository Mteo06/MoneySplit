"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Navbar } from "@/components/layout/Navbar";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Users, TrendingUp, TrendingDown, Plus, ArrowRight } from "lucide-react";
import Link from "next/link";

interface GroupSummary {
  id: string;
  name: string;
  currency: string;
  members: string[];
  image_base64?: string;
  myBalance: number;
}

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const displayName = profile?.name || user?.email?.split("@")[0] || "Utente";
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Buongiorno";
    if (h < 18) return "Buon pomeriggio";
    return "Buonasera";
  })();

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const gSnap = await getDocs(query(collection(db, "groups"), where("members", "array-contains", user.uid)));
        const groupList = gSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

        const withBalances: GroupSummary[] = await Promise.all(
          groupList.map(async (g: any) => {
            const expSnap = await getDocs(query(collection(db, "expenses"), where("group_id", "==", g.id)));
            const exps = expSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
            const expIds = exps.map(e => e.id);
            let myBalance = 0;

            if (expIds.length > 0) {
              const chunks: string[][] = [];
              for (let i = 0; i < expIds.length; i += 10) chunks.push(expIds.slice(i, i + 10));
              let allParts: any[] = [];
              for (const chunk of chunks) {
                const pSnap = await getDocs(query(collection(db, "expense_participants"), where("expense_id", "in", chunk)));
                allParts = [...allParts, ...pSnap.docs.map(d => d.data())];
              }
              const paid = exps.filter(e => e.paid_by === user.uid).reduce((s, e) => s + (e.amount || 0), 0);
              const owed = allParts.filter(p => p.user_id === user.uid).reduce((s, p) => s + (p.share_amount || 0), 0);
              myBalance = paid - owed;
            }
            return { ...g, myBalance };
          })
        );
        setGroups(withBalances);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchData();
  }, [user]);

  const totalBalance = groups.reduce((s, g) => s + g.myBalance, 0);
  const totalPositive = groups.filter(g => g.myBalance > 0.01).reduce((s, g) => s + g.myBalance, 0);
  const totalNegative = groups.filter(g => g.myBalance < -0.01).reduce((s, g) => s + g.myBalance, 0);

  const currencySymbol = (currency: string) =>
    ({ EUR: "€", USD: "$", GBP: "£", CHF: "Fr" }[currency] || "€");

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="container mx-auto max-w-2xl px-4 py-6 pb-28 md:pb-10 space-y-5 animate-fade-in">

        {/* Greeting */}
        <div>
          <p className="text-sm text-[var(--text-dim)]">{greeting},</p>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-display-var)" }}>
            {displayName} 👋
          </h1>
        </div>

        {/* Balance summary cards */}
        {loading ? (
          <div className="grid grid-cols-3 gap-3">
            {[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-2xl bg-muted" />)}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {/* Total */}
            <div className="col-span-3 sm:col-span-1 relative overflow-hidden rounded-2xl p-4 border border-[var(--card-border)] bg-[var(--card-bg)]">
              <div className="absolute -top-4 -right-4 w-20 h-20 pointer-events-none"
                style={{ background: `radial-gradient(circle, ${totalBalance >= 0 ? "rgba(34,197,94,0.15)" : "rgba(249,115,22,0.15)"} 0%, transparent 70%)` }} />
              <p className="text-xs text-[var(--text-dim)] uppercase tracking-wider mb-1">Bilancio totale</p>
              <p className="text-2xl font-bold tabular" style={{ fontFamily: "var(--font-display-var)", color: totalBalance > 0.01 ? "#22c55e" : totalBalance < -0.01 ? "#f97316" : "var(--text-dim)" }}>
                {totalBalance > 0 ? "+" : ""}€{totalBalance.toFixed(2)}
              </p>
              <p className="text-xs text-[var(--text-dim)]/70 mt-1">{groups.length} grupp{groups.length !== 1 ? "i" : "o"}</p>
            </div>

            <div className="rounded-2xl p-4 border border-[var(--card-border)] bg-[var(--card-bg)]">
              <TrendingUp className="h-4 w-4 text-[#22c55e] mb-2" />
              <p className="text-xs text-[var(--text-dim)] mb-0.5">Ti devono</p>
              <p className="text-lg font-bold text-[#22c55e] tabular">€{totalPositive.toFixed(2)}</p>
            </div>

            <div className="rounded-2xl p-4 border border-[var(--card-border)] bg-[var(--card-bg)]">
              <TrendingDown className="h-4 w-4 text-[#f97316] mb-2" />
              <p className="text-xs text-[var(--text-dim)] mb-0.5">Devi dare</p>
              <p className="text-lg font-bold text-[#f97316] tabular">€{Math.abs(totalNegative).toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* Groups section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-foreground">I tuoi gruppi</h2>
            <Link href="/groups/new">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#0a0a0b] btn-glow bg-[#22c55e]">
                <Plus className="h-3.5 w-3.5" />Nuovo
              </button>
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-2xl bg-muted" />)}
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center py-14 text-center rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
              <div className="h-12 w-12 rounded-2xl flex items-center justify-center mb-3 border border-border bg-muted/20">
                <Users className="h-6 w-6 text-[var(--text-dim)]" />
              </div>
              <p className="text-sm font-bold text-foreground/70 mb-1">Nessun gruppo</p>
              <p className="text-xs text-[var(--text-dim)] mb-4 max-w-[24ch]">Crea un gruppo per iniziare a dividere le spese</p>
              <Link href="/groups/new">
                <button className="px-4 py-2 rounded-xl text-xs font-bold text-[#0a0a0b] btn-glow bg-[#22c55e]">
                  Crea gruppo
                </button>
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden border border-[var(--card-border)] bg-[var(--card-bg)]">
              {groups.map((g, i) => {
                const bal = g.myBalance;
                const pos = bal > 0.01; const neg = bal < -0.01;
                const sym = currencySymbol(g.currency);
                return (
                  <Link key={g.id} href={`/groups/${g.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-all no-underline"
                    style={{ borderBottom: i < groups.length - 1 ? "1px solid var(--card-border)" : "none" }}>
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center text-[#0a0a0b] text-sm font-bold flex-shrink-0"
                      style={{ background: g.image_base64 ? "transparent" : "#22c55e" }}>
                      {g.image_base64
                        ? <img src={g.image_base64} alt={g.name} className="h-10 w-10 rounded-xl object-cover" />
                        : g.name.slice(0, 2).toUpperCase()
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{g.name}</p>
                      <p className="text-xs text-[var(--text-dim)]">{g.members?.length || 1} membri</p>
                    </div>
                    <div className="text-right flex-shrink-0 flex items-center gap-2">
                      <div>
                        <p className="text-sm font-bold tabular" style={{ color: pos ? "#22c55e" : neg ? "#f97316" : "var(--text-dim)" }}>
                          {pos ? "+" : neg ? "-" : ""}{sym}{Math.abs(bal).toFixed(2)}
                        </p>
                        <p className="text-xs text-[var(--text-dim)]/70">{pos ? "credito" : neg ? "debito" : "in pari"}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-[var(--text-dim)]" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
