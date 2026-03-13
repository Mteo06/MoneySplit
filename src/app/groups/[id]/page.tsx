"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useParams, useRouter } from "next/navigation";
import {
  doc, getDoc, getDocs, collection, query, where,
  onSnapshot, deleteDoc, updateDoc, arrayRemove
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  ArrowLeft, Plus, Receipt, Users, Link as LinkIcon,
  CheckCircle2, Loader2, Trash2, LogOut, UserMinus, AlertTriangle, ScanLine, X
} from "lucide-react";
import Link from "next/link";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader,
  DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AddExpenseModal } from "@/components/expenses/AddExpenseModal";
import { simplifyDebts } from "@/utils/settlementAlgorithm";

const CATEGORY_ICONS: Record<string, string> = {
  Cibo: "🍔", Viaggio: "✈️", Trasporto: "🚗", Alloggio: "🏨",
  Shopping: "🛍️", Intrattenimento: "🎬", Altro: "💸",
  Food: "🍔", Travel: "✈️", Transport: "🚗", Accommodation: "🏨",
  Entertainment: "🎬", Other: "💸",
};

export default function GroupDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();

  const [group, setGroup] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  // Confirm dialogs
  const [expenseToDelete, setExpenseToDelete] = useState<any>(null);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [receiptToView, setReceiptToView] = useState<string | null>(null);

  const isAdmin = group?.created_by === user?.uid;

  const getUserName = (uid: string) => {
    if (uid === user?.uid) return "Tu";
    return usersMap[uid]?.name || usersMap[uid]?.email?.split("@")[0] || "Utente";
  };

  const getInitials = (uid: string) => {
    const name = getUserName(uid);
    return name === "Tu" ? "T" : name.charAt(0).toUpperCase();
  };

  // ─── Delete Expense ────────────────────────────────────────────────────────
  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return;
    setActionLoading(true);
    try {
      // Delete all expense_participants for this expense
      const qPart = query(
        collection(db, "expense_participants"),
        where("expense_id", "==", expenseToDelete.id)
      );
      const pSnap = await getDocs(qPart);
      await Promise.all(pSnap.docs.map(d => deleteDoc(d.ref)));
      // Delete the expense itself
      await deleteDoc(doc(db, "expenses", expenseToDelete.id));
      setExpenseToDelete(null);
    } catch (err) {
      console.error("Error deleting expense:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Remove Member (admin only) ────────────────────────────────────────────
  const handleRemoveMember = async () => {
    if (!memberToRemove || !group) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "groups", group.id), {
        members: arrayRemove(memberToRemove),
      });
      setGroup((prev: any) => ({
        ...prev,
        members: prev.members.filter((m: string) => m !== memberToRemove),
      }));
      setMemberToRemove(null);
    } catch (err) {
      console.error("Error removing member:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Leave Group ───────────────────────────────────────────────────────────
  const handleLeaveGroup = async () => {
    if (!user || !group) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "groups", group.id), {
        members: arrayRemove(user.uid),
      });
      router.push("/groups");
    } catch (err) {
      console.error("Error leaving group:", err);
      setActionLoading(false);
    }
  };

  // ─── Data Fetching ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !id) return;

    const fetchGroup = async () => {
      try {
        const docRef = doc(db, "groups", id as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const groupData = docSnap.data();
          if (!groupData.members.includes(user.uid)) {
            router.push("/groups");
            return;
          }
          setGroup({ id: docSnap.id, ...groupData });
        } else {
          router.push("/groups");
          return;
        }
      } catch (error) {
        console.error("Error fetching group details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();

    // ⚠️ FIX: Remove orderBy to avoid requiring a composite Firestore index.
    // We sort client-side by created_at after receiving the snapshot.
    const q = query(
      collection(db, "expenses"),
      where("group_id", "==", id)
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const expensesList = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          // Sort descending by created_at client-side (handles pending writes too)
          .sort((a: any, b: any) => {
            const aTs = a.created_at?.toMillis?.() ?? a.created_at ?? 0;
            const bTs = b.created_at?.toMillis?.() ?? b.created_at ?? 0;
            return bTs - aTs;
          });

        setExpenses(expensesList);

        if (expensesList.length > 0) {
          const expenseIds = expensesList.map((e: any) => e.id);
          const chunks: string[][] = [];
          for (let i = 0; i < expenseIds.length; i += 10)
            chunks.push(expenseIds.slice(i, i + 10));

          let allParticipants: any[] = [];
          for (const chunk of chunks) {
            const qPart = query(
              collection(db, "expense_participants"),
              where("expense_id", "in", chunk)
            );
            const pSnap = await getDocs(qPart);
            allParticipants = [...allParticipants, ...pSnap.docs.map((d: any) => d.data())];
          }
          setParticipants(allParticipants);
        } else {
          setParticipants([]);
        }
      },
      (error) => {
        console.error("Snapshot error:", error);
      }
    );

    const fetchUsers = async () => {
      const uSnap = await getDocs(collection(db, "users"));
      const uMap: Record<string, any> = {};
      uSnap.docs.forEach((d: any) => { uMap[d.id] = d.data(); });
      setUsersMap(uMap);
    };
    fetchUsers();

    return () => unsubscribe();
  }, [id, user, router]);

  // ─── Loading / Guard ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <ProtectedRoute>
        <Navbar />
        <div className="flex h-[calc(100vh-64px)] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Caricamento gruppo...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!group) return null;

  // ─── Balances ──────────────────────────────────────────────────────────────
  const totalGroupExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

  const balancesMap: Record<string, number> = {};
  group.members.forEach((uid: string) => { balancesMap[uid] = 0; });
  expenses.forEach(exp => {
    if (balancesMap[exp.paid_by] !== undefined) balancesMap[exp.paid_by] += exp.amount;
  });
  participants.forEach(p => {
    if (balancesMap[p.user_id] !== undefined) balancesMap[p.user_id] -= p.share_amount;
  });

  const balancesArray = Object.keys(balancesMap).map(uid => ({ userId: uid, amount: balancesMap[uid] }));
  const settlements = simplifyDebts(balancesArray);

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="container mx-auto max-w-4xl px-4 py-6 pb-32 md:pb-10 space-y-5 animate-fade-in">

        {/* Top Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/groups"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Gruppi
          </Link>
          <div className="flex gap-2">
            {/* Invite */}
            <Dialog>
              <DialogTrigger className="hidden sm:inline-flex items-center gap-2 h-9 px-3 text-sm font-medium rounded-xl border border-border/60 bg-background hover:bg-accent hover:text-accent-foreground transition-colors">
                <LinkIcon className="h-4 w-4" />
                Invita
              </DialogTrigger>
              <DialogContent className="rounded-3xl sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Invita in {group.name}</DialogTitle>
                  <DialogDescription>Condividi questo link per far unire gli amici al gruppo.</DialogDescription>
                </DialogHeader>
                <div className="flex items-center gap-2 mt-4">
                  <Input
                    readOnly
                    value={`${typeof window !== "undefined" ? window.location.origin : ""}/groups/join/${group.id}`}
                    className="rounded-xl text-sm"
                  />
                  <Button
                    className="rounded-xl shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/groups/join/${group.id}`);
                      alert("Copiato!");
                    }}
                  >
                    Copia
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Add Expense */}
            <Button className="gap-2 rounded-xl shadow-md shadow-primary/20" onClick={() => setIsAddExpenseOpen(true)}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Aggiungi Spesa</span>
              <span className="sm:hidden">Aggiungi</span>
            </Button>
          </div>
        </div>

        {/* Group Hero Card */}
        <div className="relative overflow-hidden bg-card border border-border/60 rounded-3xl shadow-xl shadow-black/5">
          <div className="gradient-hero absolute inset-0 opacity-10" />
          <div className="relative z-10 p-6 flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-primary/30 flex-shrink-0">
              {group.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">{group.name}</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                {group.members.length} membri · {group.currency}
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-semibold">
                Totale: {totalGroupExpenses.toFixed(2)} {group.currency}
              </div>
            </div>
            {/* Leave Group */}
            {!isAdmin && (
              <button
                onClick={() => setLeaveDialogOpen(true)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-red-500 transition-colors mt-2 sm:mt-0"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Abbandona</span>
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="expenses" className="w-full">
          <TabsList className="w-full grid grid-cols-4 h-11 rounded-2xl bg-muted/70 p-1">
            <TabsTrigger value="expenses" className="rounded-xl text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary">
              Spese
            </TabsTrigger>
            <TabsTrigger value="balances" className="rounded-xl text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary">
              Saldi
            </TabsTrigger>
            <TabsTrigger value="settle" className="rounded-xl text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary">
              Pareggia
            </TabsTrigger>
            <TabsTrigger value="members" className="rounded-xl text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary">
              Membri
            </TabsTrigger>
          </TabsList>

          {/* ── Expenses Tab ───────────────────────────────────────────────── */}
          <TabsContent value="expenses" className="space-y-3 mt-4">
            {expenses.length === 0 ? (
              <div className="bg-card border border-dashed border-border rounded-3xl p-10 flex flex-col items-center text-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
                  <Receipt className="h-7 w-7 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Nessuna spesa ancora</h3>
                  <p className="text-sm text-muted-foreground mt-0.5 max-w-xs">Inizia a tracciare le spese condivise del gruppo.</p>
                </div>
                <Button onClick={() => setIsAddExpenseOpen(true)} className="rounded-xl gap-2">
                  <Plus className="h-4 w-4" />
                  Aggiungi la prima spesa
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {expenses.map((expense) => {
                  const canDelete = expense.paid_by === user?.uid || isAdmin;
                  const hasReceipt = !!expense.receipt_base64;
                  return (
                    <div key={expense.id} className="bg-card border border-border/60 rounded-2xl p-4 flex items-center justify-between hover:shadow-md transition-all duration-200 shadow-sm group">
                      <div
                        className="flex gap-3 items-center min-w-0 flex-1 cursor-pointer"
                        onClick={() => hasReceipt && setReceiptToView(expense.receipt_base64)}
                      >
                        <div className="relative h-11 w-11 flex-shrink-0">
                          <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center text-xl">
                            {CATEGORY_ICONS[expense.category] || "💸"}
                          </div>
                          {hasReceipt && (
                            <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center shadow-sm" title="Scontrino allegato">
                              <ScanLine className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-foreground text-sm truncate">{expense.description}</h4>
                          <div className="flex items-center text-xs text-muted-foreground gap-1.5 mt-0.5">
                            <span>
                              {expense.created_at?.toDate
                                ? expense.created_at.toDate().toLocaleDateString("it-IT")
                                : new Date().toLocaleDateString("it-IT")}
                            </span>
                            <span>·</span>
                            <span>
                              Pagato da{" "}
                              <span className="font-medium text-foreground">
                                {getUserName(expense.paid_by)}
                              </span>
                            </span>
                            {hasReceipt && (
                              <span className="text-primary font-medium">· 📎 scontrino</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        <div className="text-right">
                          <p className="font-bold text-foreground text-base">{Number(expense.amount).toFixed(2)}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{expense.currency}</p>
                        </div>
                        {canDelete && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setExpenseToDelete(expense); }}
                            className="opacity-0 group-hover:opacity-100 p-2 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all"
                            title="Elimina spesa"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── Balances Tab ───────────────────────────────────────────────── */}
          <TabsContent value="balances" className="space-y-2.5 mt-4">
            {balancesArray.every(b => Math.abs(b.amount) < 0.01) ? (
              <div className="bg-card border border-border/60 rounded-3xl p-10 flex flex-col items-center text-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Tutto in pari!</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">Tutti i conti sono a zero.</p>
                </div>
              </div>
            ) : (
              balancesArray.map((balance) => {
                const isUser = balance.userId === user?.uid;
                const isOwed = balance.amount > 0.01;
                if (Math.abs(balance.amount) < 0.01) return null;
                return (
                  <div key={balance.userId} className="bg-card border border-border/60 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center font-bold text-sm text-muted-foreground">
                        {getInitials(balance.userId)}
                      </div>
                      <span className="font-semibold text-foreground text-sm">
                        {isUser ? "Tu" : getUserName(balance.userId)}
                      </span>
                    </div>
                    <div className={`text-right px-3 py-1.5 rounded-xl ${isOwed ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"}`}>
                      <p className="text-xs font-medium">{isOwed ? "deve ricevere" : "deve"}</p>
                      <p className="font-bold">{Math.abs(balance.amount).toFixed(2)} {group.currency}</p>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          {/* ── Settle Up Tab ──────────────────────────────────────────────── */}
          <TabsContent value="settle" className="space-y-2.5 mt-4">
            {settlements.length === 0 ? (
              <div className="bg-card border border-border/60 rounded-3xl p-10 flex flex-col items-center text-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Nessun rimborso necessario!</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">Tutti i conti sono in pari.</p>
                </div>
              </div>
            ) : (
              settlements.map((tx, idx) => {
                const isFromMe = tx.from === user?.uid;
                const isToMe = tx.to === user?.uid;
                return (
                  <div key={idx} className="bg-card border border-border/60 rounded-2xl p-4 flex items-center justify-between shadow-sm gap-4">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm ${isFromMe ? "bg-red-500/10 text-red-600" : "bg-muted text-muted-foreground"}`}>
                        {getInitials(tx.from)}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm min-w-0 flex-wrap">
                        <span className={`font-semibold ${isFromMe ? "text-red-600" : "text-foreground"}`}>
                          {isFromMe ? "Tu" : getUserName(tx.from)}
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <span className={`font-semibold ${isToMe ? "text-emerald-600" : "text-foreground"}`}>
                          {isToMe ? "tu" : getUserName(tx.to)}
                        </span>
                      </div>
                    </div>
                    <div className="bg-primary/10 text-primary px-4 py-2 rounded-xl font-bold text-sm flex-shrink-0">
                      {tx.amount.toFixed(2)} {group.currency}
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          {/* ── Members Tab ────────────────────────────────────────────────── */}
          <TabsContent value="members" className="space-y-2.5 mt-4">
            {isAdmin && (
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-2.5 text-sm text-amber-700">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <p>Sei l'amministratore di questo gruppo. Puoi rimuovere i membri.</p>
              </div>
            )}
            <div className="space-y-2">
              {group.members.map((uid: string) => {
                const isCurrentUser = uid === user?.uid;
                const memberData = usersMap[uid];
                const name = isCurrentUser ? "Tu" : (memberData?.name || memberData?.email?.split("@")[0] || "Utente");
                const email = memberData?.email || "";
                const initials = name === "Tu" ? "T" : name.charAt(0).toUpperCase();
                const isMemberAdmin = uid === group.created_by;

                return (
                  <div key={uid} className="bg-card border border-border/60 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                      isCurrentUser ? "gradient-primary text-white shadow-md shadow-primary/30" : "bg-muted text-muted-foreground"
                    }`}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground text-sm">{name}</p>
                        {isCurrentUser && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Tu</span>
                        )}
                        {isMemberAdmin && (
                          <span className="text-xs bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full font-medium">Admin</span>
                        )}
                      </div>
                      {email && <p className="text-xs text-muted-foreground truncate">{email}</p>}
                    </div>

                    {/* Admin can remove non-admin members (not themselves) */}
                    {isAdmin && !isCurrentUser && !isMemberAdmin && (
                      <button
                        onClick={() => setMemberToRemove(uid)}
                        className="p-2 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all flex-shrink-0"
                        title="Rimuovi dal gruppo"
                      >
                        <UserMinus className="h-4 w-4" />
                      </button>
                    )}

                    {/* Non-admin current user can leave */}
                    {isCurrentUser && !isAdmin && (
                      <button
                        onClick={() => setLeaveDialogOpen(true)}
                        className="p-2 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all flex-shrink-0"
                        title="Abbandona gruppo"
                      >
                        <LogOut className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        {/* ── Add Expense Modal ──────────────────────────────────────────────── */}
        {group && (
          <AddExpenseModal
            groupId={group.id}
            groupCurrency={group.currency}
            members={group.members}
            usersMap={usersMap}
            isOpen={isAddExpenseOpen}
            onClose={() => setIsAddExpenseOpen(false)}
          />
        )}

        {/* ── Confirm: Delete Expense ────────────────────────────────────────── */}
        <Dialog open={!!expenseToDelete} onOpenChange={(o) => !o && setExpenseToDelete(null)}>
          <DialogContent className="rounded-3xl sm:max-w-sm">
            <DialogHeader>
              <div className="h-12 w-12 rounded-2xl bg-red-500/10 flex items-center justify-center mb-3">
                <Trash2 className="h-6 w-6 text-red-500" />
              </div>
              <DialogTitle>Elimina spesa</DialogTitle>
              <DialogDescription>
                Sei sicuro di voler eliminare{" "}
                <strong>"{expenseToDelete?.description}"</strong>?
                Questa azione non può essere annullata.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 mt-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setExpenseToDelete(null)} disabled={actionLoading}>
                Annulla
              </Button>
              <Button
                className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 text-white"
                onClick={handleDeleteExpense}
                disabled={actionLoading}
              >
                {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Elimina
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Confirm: Remove Member ─────────────────────────────────────────── */}
        <Dialog open={!!memberToRemove} onOpenChange={(o) => !o && setMemberToRemove(null)}>
          <DialogContent className="rounded-3xl sm:max-w-sm">
            <DialogHeader>
              <div className="h-12 w-12 rounded-2xl bg-red-500/10 flex items-center justify-center mb-3">
                <UserMinus className="h-6 w-6 text-red-500" />
              </div>
              <DialogTitle>Rimuovi membro</DialogTitle>
              <DialogDescription>
                Sei sicuro di voler rimuovere{" "}
                <strong>{memberToRemove ? getUserName(memberToRemove) : ""}</strong>{" "}
                dal gruppo? Il membro perderà l'accesso al gruppo.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 mt-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setMemberToRemove(null)} disabled={actionLoading}>
                Annulla
              </Button>
              <Button
                className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 text-white"
                onClick={handleRemoveMember}
                disabled={actionLoading}
              >
                {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Rimuovi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Confirm: Leave Group ───────────────────────────────────────────── */}
        <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
          <DialogContent className="rounded-3xl sm:max-w-sm">
            <DialogHeader>
              <div className="h-12 w-12 rounded-2xl bg-red-500/10 flex items-center justify-center mb-3">
                <LogOut className="h-6 w-6 text-red-500" />
              </div>
              <DialogTitle>Abbandona gruppo</DialogTitle>
              <DialogDescription>
                Sei sicuro di voler abbandonare <strong>"{group?.name}"</strong>?
                Dovrai essere reinvitato per rientrare.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 mt-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setLeaveDialogOpen(false)} disabled={actionLoading}>
                Annulla
              </Button>
              <Button
                className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 text-white"
                onClick={handleLeaveGroup}
                disabled={actionLoading}
              >
                {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Abbandona
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Receipt Lightbox ───────────────────────────────────────────────── */}
        {receiptToView && (
          <div
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setReceiptToView(null)}
          >
            <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setReceiptToView(null)}
                className="absolute -top-12 right-0 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="bg-card rounded-3xl overflow-hidden shadow-2xl">
                <div className="px-4 pt-4 pb-2 border-b border-border/60">
                  <p className="font-semibold text-foreground text-sm">📎 Foto Scontrino</p>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={receiptToView}
                  alt="Scontrino"
                  className="w-full max-h-[70vh] object-contain"
                />
              </div>
            </div>
          </div>
        )}

      </main>
    </ProtectedRoute>
  );
}
