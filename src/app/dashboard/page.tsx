"use client";

import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Plus, Users, ArrowUpRight, ArrowDownRight, TrendingUp, Receipt } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { clsx } from "clsx";

const CATEGORY_ICONS: Record<string, string> = {
  Cibo: "🍔", Viaggio: "✈️", Trasporto: "🚗", Alloggio: "🏨",
  Shopping: "🛍️", Intrattenimento: "🎬", Altro: "💸",
  Food: "🍔", Travel: "✈️", Transport: "🚗", Accommodation: "🏨",
  Entertainment: "🎬", Other: "💸",
};

interface GroupBalance {
  group: any;
  myBalance: number; // positive = they owe me, negative = I owe
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [totalBalance, setTotalBalance] = useState(0);
  const [groupBalances, setGroupBalances] = useState<GroupBalance[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<any[]>([]);
  const [totalOwed, setTotalOwed] = useState(0);  // how much others owe me
  const [totalOwing, setTotalOwing] = useState(0); // how much I owe
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      try {
        // ── 1. Fetch user's groups ────────────────────────────────────────────
        const qGroups = query(
          collection(db, "groups"),
          where("members", "array-contains", user.uid)
        );
        const groupsSnap = await getDocs(qGroups);
        const userGroups = groupsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        if (userGroups.length === 0) {
          setLoading(false);
          return;
        }

        const groupIds = userGroups.map((g: any) => g.id);

        // ── 2. Fetch ALL expenses across all groups (no orderBy → no index needed)
        // Process in chunks of 10 (Firestore "in" limit)
        const chunks: string[][] = [];
        for (let i = 0; i < groupIds.length; i += 10)
          chunks.push(groupIds.slice(i, i + 10));

        let allExpenses: any[] = [];
        for (const chunk of chunks) {
          const qExp = query(
            collection(db, "expenses"),
            where("group_id", "in", chunk)
          );
          const snap = await getDocs(qExp);
          allExpenses = [...allExpenses, ...snap.docs.map(d => ({ id: d.id, ...d.data() }))];
        }

        // Sort client-side (newest first)
        allExpenses.sort((a, b) => {
          const aTs = a.created_at?.toMillis?.() ?? 0;
          const bTs = b.created_at?.toMillis?.() ?? 0;
          return bTs - aTs;
        });

        // ── 3. Fetch expense_participants for all expenses ─────────────────────
        let allParticipants: any[] = [];
        if (allExpenses.length > 0) {
          const expenseIds = allExpenses.map(e => e.id);
          const expChunks: string[][] = [];
          for (let i = 0; i < expenseIds.length; i += 10)
            expChunks.push(expenseIds.slice(i, i + 10));

          for (const chunk of expChunks) {
            const qPart = query(
              collection(db, "expense_participants"),
              where("expense_id", "in", chunk)
            );
            const pSnap = await getDocs(qPart);
            allParticipants = [...allParticipants, ...pSnap.docs.map(d => d.data())];
          }
        }

        // ── 4. Calculate balance per group ────────────────────────────────────
        const gbList: GroupBalance[] = userGroups.map((group: any) => {
          const groupExpenses = allExpenses.filter(e => e.group_id === group.id);
          const groupExpenseIds = new Set(groupExpenses.map(e => e.id));

          // What the user paid in this group
          const paid = groupExpenses
            .filter(e => e.paid_by === user.uid)
            .reduce((s: number, e: any) => s + (e.amount || 0), 0);

          // What the user owes in this group (their share)
          const owed = allParticipants
            .filter(p => p.user_id === user.uid && groupExpenseIds.has(p.expense_id))
            .reduce((s: number, p: any) => s + (p.share_amount || 0), 0);

          return { group, myBalance: paid - owed };
        });

        // Sort: biggest debt first, then biggest credit
        gbList.sort((a, b) => Math.abs(b.myBalance) - Math.abs(a.myBalance));

        // ── 5. Totals ─────────────────────────────────────────────────────────
        const net = gbList.reduce((s, gb) => s + gb.myBalance, 0);
        const owed_total = gbList.filter(gb => gb.myBalance > 0.01).reduce((s, gb) => s + gb.myBalance, 0);
        const owing_total = gbList.filter(gb => gb.myBalance < -0.01).reduce((s, gb) => s + Math.abs(gb.myBalance), 0);

        setGroupBalances(gbList);
        setTotalBalance(net);
        setTotalOwed(owed_total);
        setTotalOwing(owing_total);
        setRecentExpenses(allExpenses.slice(0, 3));
      } catch (error) {
        console.error("Error fetching dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const skeletonClass = "h-full w-full bg-gradient-to-r from-muted via-muted/60 to-muted animate-pulse rounded-2xl";

  // Progress bar: ratio of "owed to me" vs "total flow"
  const totalFlow = totalOwed + totalOwing;
  const barWidth = totalFlow > 0 ? Math.round((totalOwed / totalFlow) * 100) : 50;

  const displayName = profile?.name || user?.displayName || user?.email?.split("@")[0] || "Ciao";

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="container mx-auto max-w-4xl px-4 py-6 pb-32 md:pb-10 space-y-6 animate-fade-in">

        {/* Hero Balance Card */}
        <section>
          <div className="relative overflow-hidden rounded-3xl gradient-hero p-6 md:p-8 shadow-2xl shadow-primary/25">
            <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-violet-600/20 rounded-full blur-2xl" />

            <div className="relative z-10">
              <p className="text-white/70 text-sm font-medium uppercase tracking-widest mb-1">
                Saldo Totale · Ciao, {displayName.split(" ")[0]} 👋
              </p>
              <div className="flex items-end justify-between">
                <div>
                  {loading ? (
                    <div className="h-12 w-40 bg-white/20 rounded-xl animate-pulse" />
                  ) : (
                    <p className="text-white text-5xl font-bold tracking-tight">
                      {totalBalance >= 0 ? "+" : "-"}€{Math.abs(totalBalance).toFixed(2)}
                    </p>
                  )}
                  <p className="text-white/70 text-sm mt-2 flex items-center gap-1.5">
                    {totalBalance >= 0 ? (
                      <><TrendingUp className="h-4 w-4 text-emerald-300" /> Ti devono in totale</>
                    ) : (
                      <><ArrowDownRight className="h-4 w-4 text-red-300" /> Devi in totale</>
                    )}
                  </p>
                </div>
                <div className={clsx(
                  "h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg",
                  totalBalance >= 0 ? "bg-emerald-400/20 border border-emerald-400/30" : "bg-red-400/20 border border-red-400/30"
                )}>
                  {totalBalance >= 0
                    ? <ArrowUpRight className="h-7 w-7 text-emerald-300" />
                    : <ArrowDownRight className="h-7 w-7 text-red-300" />
                  }
                </div>
              </div>

              {/* Progress bar: green = owed to me, red = I owe */}
              <div className="mt-5 space-y-1.5">
                <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-400/70 rounded-full transition-all duration-700"
                    style={{ width: `${barWidth}%` }}
                  />
                  <div
                    className="h-full bg-red-400/70 rounded-full transition-all duration-700"
                    style={{ width: `${100 - barWidth}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-white/60">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-400/70 inline-block" />
                    +€{totalOwed.toFixed(2)} da ricevere
                  </span>
                  <span className="flex items-center gap-1">
                    -€{totalOwing.toFixed(2)} da dare
                    <span className="h-2 w-2 rounded-full bg-red-400/70 inline-block" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Groups Section */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-bold text-foreground">I tuoi Gruppi</h2>
              <Link href="/groups/new">
                <Button size="sm" variant="ghost" className="gap-1.5 text-primary hover:text-primary hover:bg-primary/10 rounded-xl font-medium">
                  <Plus className="h-4 w-4" />
                  Nuovo
                </Button>
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 rounded-2xl overflow-hidden">
                    <div className={skeletonClass} />
                  </div>
                ))}
              </div>
            ) : groupBalances.length === 0 ? (
              <div className="bg-card border border-border/60 rounded-2xl p-6 flex flex-col items-center text-center gap-3 shadow-sm">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">Nessun gruppo ancora</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Crea un gruppo per iniziare</p>
                </div>
                <Link href="/groups/new">
                  <Button size="sm" className="rounded-xl shadow-sm">Crea gruppo</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {groupBalances.slice(0, 4).map(({ group, myBalance }) => {
                  const isOwed = myBalance > 0.01;
                  const isOwing = myBalance < -0.01;
                  return (
                    <Link key={group.id} href={`/groups/${group.id}`}>
                      <div className="bg-card border border-border/60 rounded-2xl p-4 flex items-center gap-3 hover:border-primary/30 hover:shadow-md transition-all duration-200 cursor-pointer shadow-sm">
                        <div className="h-11 w-11 rounded-xl gradient-primary flex items-center justify-center text-white font-bold text-base flex-shrink-0 shadow-md shadow-primary/20">
                          {group.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground text-sm truncate">{group.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {group.members?.length || 1} membro{(group.members?.length || 1) !== 1 ? "i" : ""}
                          </p>
                        </div>
                        {/* Per-group balance badge */}
                        {isOwed && (
                          <div className="flex-shrink-0 text-right bg-emerald-500/10 text-emerald-600 px-2.5 py-1.5 rounded-xl">
                            <p className="text-[10px] font-medium leading-none mb-0.5">ti devono</p>
                            <p className="text-sm font-bold">+€{myBalance.toFixed(2)}</p>
                          </div>
                        )}
                        {isOwing && (
                          <div className="flex-shrink-0 text-right bg-red-500/10 text-red-600 px-2.5 py-1.5 rounded-xl">
                            <p className="text-[10px] font-medium leading-none mb-0.5">devi</p>
                            <p className="text-sm font-bold">-€{Math.abs(myBalance).toFixed(2)}</p>
                          </div>
                        )}
                        {!isOwed && !isOwing && (
                          <div className="flex-shrink-0 text-right bg-muted text-muted-foreground px-2.5 py-1.5 rounded-xl">
                            <p className="text-xs font-medium">pari</p>
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
                {groupBalances.length > 4 && (
                  <Link href="/groups">
                    <Button variant="ghost" className="w-full text-primary hover:bg-primary/10 rounded-xl text-sm">
                      Vedi tutti i {groupBalances.length} gruppi
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </section>

          {/* Recent Expenses Section */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-bold text-foreground">Spese Recenti</h2>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 rounded-2xl overflow-hidden">
                    <div className={skeletonClass} />
                  </div>
                ))}
              </div>
            ) : recentExpenses.length === 0 ? (
              <div className="bg-card border border-border/60 rounded-2xl p-6 flex flex-col items-center text-center gap-3 shadow-sm">
                <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center">
                  <Receipt className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">Nessuna spesa ancora</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Aggiungi una spesa da un gruppo</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentExpenses.map((expense) => {
                  // Handle Firestore Timestamp or plain date safely
                  const date = expense.created_at?.toDate
                    ? expense.created_at.toDate().toLocaleDateString("it-IT")
                    : expense.created_at
                    ? new Date(expense.created_at).toLocaleDateString("it-IT")
                    : "—";

                  const isPaidByMe = expense.paid_by === user?.uid;

                  return (
                    <div key={expense.id} className="bg-card border border-border/60 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg flex-shrink-0">
                          {CATEGORY_ICONS[expense.category] || "💸"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">{expense.description}</p>
                          <p className="text-xs text-muted-foreground">{date}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="font-bold text-foreground">€{Number(expense.amount).toFixed(2)}</p>
                        <p className={`text-[10px] font-medium ${isPaidByMe ? "text-emerald-600" : "text-muted-foreground"}`}>
                          {isPaidByMe ? "hai pagato tu" : "pagato da altri"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {groupBalances.length > 0 && (
              <Link href="/groups">
                <Button className="w-full rounded-2xl h-12 gap-2 shadow-md shadow-primary/20 mt-1">
                  <Plus className="h-5 w-5" />
                  Aggiungi Spesa
                </Button>
              </Link>
            )}
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
}
