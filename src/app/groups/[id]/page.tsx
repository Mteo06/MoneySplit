"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Navbar } from "@/components/layout/Navbar";
import { useParams, useRouter } from "next/navigation";
import {
  doc, getDoc, getDocs, collection, query, where,
  onSnapshot, deleteDoc, updateDoc, arrayRemove, arrayUnion
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  ArrowLeft, Plus, Receipt, Users, Link as LinkIcon,
  CheckCircle2, Loader2, Trash2, LogOut, AlertTriangle,
  X, Crown, Camera, ChevronDown, ChevronUp, ScanLine
} from "lucide-react";
import Link from "next/link";
import { AddExpenseModal } from "@/components/expenses/AddExpenseModal";
import { simplifyDebts } from "@/utils/settlementAlgorithm";
import { compressImageToBase64 } from "@/utils/imageUtils";
import { clsx } from "clsx";

const CATEGORY_ICONS: Record<string, string> = {
  Cibo: "🍔", Viaggio: "✈️", Trasporto: "🚗", Alloggio: "🏨",
  Shopping: "🛍️", Intrattenimento: "🎬", Altro: "💸",
};

const TABS = ["Spese", "Saldi", "Membri"] as const;
type Tab = typeof TABS[number];

const labelClass = "block text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider mb-1.5";

export default function GroupDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();

  const [group, setGroup] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("Spese");
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const [expenseToDelete, setExpenseToDelete] = useState<any>(null);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [receiptToView, setReceiptToView] = useState<string | null>(null);
  const [memberToPromote, setMemberToPromote] = useState<string | null>(null);
  const [deleteGroupDialog, setDeleteGroupDialog] = useState(false);
  const [groupImageLoading, setGroupImageLoading] = useState(false);
  const groupImageInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = group?.created_by === user?.uid ||
    (group?.admin_ids && group.admin_ids.includes(user?.uid));
  const isMemberAdmin = (uid: string) =>
    uid === group?.created_by || (group?.admin_ids && group.admin_ids.includes(uid));

  const getUserName = (uid: string) => {
    if (uid === user?.uid) return "Tu";
    return usersMap[uid]?.name || usersMap[uid]?.email?.split("@")[0] || "Utente";
  };
  const getInitials = (uid: string) => {
    const n = getUserName(uid); return n === "Tu" ? "T" : n.charAt(0).toUpperCase();
  };

  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return;
    setActionLoading(true);
    try {
      const qPart = query(collection(db, "expense_participants"), where("expense_id", "==", expenseToDelete.id));
      const pSnap = await getDocs(qPart);
      await Promise.all(pSnap.docs.map(d => deleteDoc(d.ref)));
      await deleteDoc(doc(db, "expenses", expenseToDelete.id));
      setExpenseToDelete(null);
    } catch (e) { console.error(e); } finally { setActionLoading(false); }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove || !group) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "groups", group.id), { members: arrayRemove(memberToRemove) });
      setGroup((prev: any) => ({ ...prev, members: prev.members.filter((m: string) => m !== memberToRemove) }));
      setMemberToRemove(null);
    } catch (e) { console.error(e); } finally { setActionLoading(false); }
  };

  const handleLeaveGroup = async () => {
    if (!user || !group) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "groups", group.id), { members: arrayRemove(user.uid) });
      router.push("/groups");
    } catch (e) { console.error(e); setActionLoading(false); }
  };

  const handlePromoteMember = async () => {
    if (!memberToPromote || !group) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "groups", group.id), { admin_ids: arrayUnion(memberToPromote) });
      setGroup((prev: any) => ({ ...prev, admin_ids: [...(prev.admin_ids || []), memberToPromote] }));
      setMemberToPromote(null);
    } catch (e) { console.error(e); } finally { setActionLoading(false); }
  };

  const handleDeleteGroup = async () => {
    if (!group) return;
    setActionLoading(true);
    try {
      const expenseIds = expenses.map(e => e.id);
      if (expenseIds.length > 0) {
        const chunks: string[][] = [];
        for (let i = 0; i < expenseIds.length; i += 10) chunks.push(expenseIds.slice(i, i + 10));
        for (const chunk of chunks) {
          const qPart = query(collection(db, "expense_participants"), where("expense_id", "in", chunk));
          const pSnap = await getDocs(qPart);
          await Promise.all(pSnap.docs.map(d => deleteDoc(d.ref)));
        }
      }
      await Promise.all(expenses.map(e => deleteDoc(doc(db, "expenses", e.id))));
      await deleteDoc(doc(db, "groups", group.id));
      router.push("/groups");
    } catch (e) { console.error(e); setActionLoading(false); }
  };

  const handleGroupImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !group) return;
    setGroupImageLoading(true);
    try {
      const base64 = await compressImageToBase64(file, 400, 400, 0.8);
      await updateDoc(doc(db, "groups", group.id), { image_base64: base64 });
      setGroup((prev: any) => ({ ...prev, image_base64: base64 }));
    } catch (e) { console.error(e); } finally {
      setGroupImageLoading(false);
      if (groupImageInputRef.current) groupImageInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (!user || !id) return;
    const fetchGroup = async () => {
      try {
        const snap = await getDoc(doc(db, "groups", id as string));
        if (snap.exists()) {
          const g = snap.data();
          if (!g.members.includes(user.uid)) { router.push("/groups"); return; }
          setGroup({ id: snap.id, ...g });
        } else { router.push("/groups"); return; }
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchGroup();

    const q = query(collection(db, "expenses"), where("group_id", "==", id));
    const unsub = onSnapshot(q, async (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => (b.created_at?.toMillis?.() ?? 0) - (a.created_at?.toMillis?.() ?? 0));
      setExpenses(list);

      if (list.length > 0) {
        const expIds = list.map((e: any) => e.id);
        const chunks: string[][] = [];
        for (let i = 0; i < expIds.length; i += 10) chunks.push(expIds.slice(i, i + 10));
        let allP: any[] = [];
        for (const chunk of chunks) {
          const pSnap = await getDocs(query(collection(db, "expense_participants"), where("expense_id", "in", chunk)));
          allP = [...allP, ...pSnap.docs.map(d => d.data())];
        }
        setParticipants(allP);
      } else { setParticipants([]); }
    }, e => console.error(e));

    const fetchUsers = async () => {
      const uSnap = await getDocs(collection(db, "users"));
      const uMap: Record<string, any> = {};
      uSnap.docs.forEach(d => { uMap[d.id] = d.data(); });
      setUsersMap(uMap);
    };
    fetchUsers();
    return () => unsub();
  }, [user, id, router]);

  // ── Balance calculation ──
  const memberBalances = (group?.members || []).map((uid: string) => {
    const paid = expenses.filter(e => e.paid_by === uid).reduce((s: number, e: any) => s + (e.amount || 0), 0);
    const owed = participants.filter(p => p.user_id === uid).reduce((s: number, p: any) => s + (p.share_amount || 0), 0);
    return { userId: uid, amount: paid - owed };
  });
  const settlements = simplifyDebts(memberBalances);

  const inviteLink = typeof window !== "undefined" ? `${window.location.origin}/groups/join/${id}` : "";
  const copyInvite = async () => {
    try { await navigator.clipboard.writeText(inviteLink); setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2000); } catch { }
  };

  const currencySymbol = group?.currency === "USD" ? "$" : group?.currency === "GBP" ? "£" : group?.currency === "CHF" ? "Fr" : "€";

  if (loading) {
    return (
      <ProtectedRoute>
        <Navbar />
        <main className="container mx-auto max-w-2xl px-4 py-6 space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </main>
      </ProtectedRoute>
    );
  }

  if (!group) return null;

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="container mx-auto max-w-2xl px-4 py-4 pb-28 md:pb-10 space-y-4 animate-fade-in">

        {/* Back */}
        <Link href="/groups" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-dim)] hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />Gruppi
        </Link>

        {/* Group header */}
        <div className="relative overflow-hidden rounded-2xl p-5"
          style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
          <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
          <div className="absolute -top-8 -right-8 w-36 h-36 pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 70%)" }} />
          <div className="relative z-10 flex items-center gap-4">
            {/* Group image */}
            <div className="relative flex-shrink-0">
              <div className="h-14 w-14 rounded-2xl overflow-hidden flex items-center justify-center text-[#0a0a0b] text-lg font-bold"
                style={{ background: group.image_base64 ? "transparent" : "#22c55e", border: "1px solid rgba(255,255,255,0.08)" }}>
                {group.image_base64
                  ? <img src={group.image_base64} alt={group.name} className="h-14 w-14 object-cover" />
                  : group.name.slice(0, 2).toUpperCase()
                }
              </div>
              {isAdmin && (
                <button onClick={() => groupImageInputRef.current?.click()} disabled={groupImageLoading}
                  className="absolute -bottom-1 -right-1 h-6 w-6 rounded-lg flex items-center justify-center"
                  style={{ background: "#22c55e", border: "2px solid #0a0a0b" }}>
                  {groupImageLoading ? <Loader2 className="h-3 w-3 animate-spin text-[#0a0a0b]" /> : <Camera className="h-3 w-3 text-[#0a0a0b]" />}
                </button>
              )}
              <input ref={groupImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleGroupImageChange} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-foreground truncate" style={{ fontFamily: "var(--font-display-var)" }}>{group.name}</h1>
              <p className="text-sm text-[var(--text-dim)]">{group.members?.length || 1} membri · {group.currency}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Invite link */}
              <button onClick={copyInvite}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                style={copySuccess
                  ? { background: "var(--nav-active-bg)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e" }
                  : { background: "var(--nav-active-bg)", border: "1px solid var(--card-border)", color: "var(--text-dim)" }}>
                {copySuccess ? <CheckCircle2 className="h-3.5 w-3.5" /> : <LinkIcon className="h-3.5 w-3.5" />}
                {copySuccess ? "Copiato!" : "Invita"}
              </button>
              {/* Add expense */}
              <button onClick={() => setIsAddExpenseOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#0a0a0b] btn-glow"
                style={{ background: "#22c55e" }}>
                <Plus className="h-3.5 w-3.5" />Spesa
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-2xl" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all"
              style={activeTab === tab
                ? { background: "#22c55e", color: "#0a0a0b" }
                : { color: "var(--text-dim)" }}>
              {tab}
            </button>
          ))}
        </div>

        {/* ── SPESE TAB ── */}
        {activeTab === "Spese" && (
          <div>
            {expenses.length === 0 ? (
              <div className="flex flex-col items-center py-14 text-center rounded-2xl"
                style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
                <div className="h-14 w-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: "var(--nav-active-bg)", border: "1px solid var(--card-border)" }}>
                  <Receipt className="h-7 w-7 text-[var(--text-dim)]" />
                </div>
                <p className="text-base font-bold text-foreground mb-1">Nessuna spesa</p>
                <p className="text-sm text-[var(--text-dim)] mb-5">Aggiungi la prima spesa del gruppo</p>
                <button onClick={() => setIsAddExpenseOpen(true)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-[#0a0a0b] btn-glow flex items-center gap-2" style={{ background: "#22c55e" }}>
                  <Plus className="h-4 w-4" />Aggiungi spesa
                </button>
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
                {expenses.map((exp, i) => {
                  const myShare = participants.find(p => p.expense_id === exp.id && p.user_id === user?.uid)?.share_amount;
                  const iPaid = exp.paid_by === user?.uid;
                  const canDelete = isAdmin || exp.paid_by === user?.uid;
                  return (
                    <div key={exp.id} className={clsx("flex items-center gap-3 px-4 py-3 hover:bg-[rgba(255,255,255,0.02)] transition-all group", i < expenses.length - 1 && "border-b border-[rgba(255,255,255,0.05)]")}>
                      <div className="h-10 w-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                        style={{ background: "rgba(255,255,255,0.04)" }}>
                        {CATEGORY_ICONS[exp.category] || "💸"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{exp.description}</p>
                        <p className="text-xs text-[var(--text-dim)]">{getUserName(exp.paid_by)} ha pagato</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-foreground tabular">{currencySymbol}{(exp.amount || 0).toFixed(2)}</p>
                        {myShare != null && (
                          <p className="text-xs tabular" style={{ color: iPaid ? "#22c55e" : "#f97316" }}>
                            {iPaid ? "+" : "-"}{currencySymbol}{Math.abs(myShare).toFixed(2)} tu
                          </p>
                        )}
                      </div>
                      {/* Receipt + delete */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        {exp.receipt_base64 && (
                          <button onClick={() => setReceiptToView(exp.receipt_base64)}
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-[#505058] hover:text-[#22c55e] hover:bg-[rgba(34,197,94,0.08)] transition-all">
                            <ScanLine className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => setExpenseToDelete(exp)}
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-[#505058] hover:text-[#f97316] hover:bg-[rgba(249,115,22,0.08)] transition-all">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── SALDI TAB ── */}
        {activeTab === "Saldi" && (
          <div className="space-y-3">
            {/* My balance */}
            {(() => {
              const myBal = memberBalances.find((b: any) => b.userId === user?.uid);
              const bal = myBal?.amount || 0;
              const pos = bal > 0.01; const neg = bal < -0.01;
              return (
                <div className="p-5 rounded-2xl" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
                  <p className="text-xs text-[var(--text-dim)] uppercase tracking-wider mb-1">Il tuo saldo in questo gruppo</p>
                  <p className="text-3xl font-bold tabular" style={{ fontFamily: "var(--font-display-var)", color: pos ? "#22c55e" : neg ? "#f97316" : "var(--text-dim)" }}>
                    {pos ? "+" : neg ? "-" : ""}{currencySymbol}{Math.abs(bal).toFixed(2)}
                  </p>
                  <p className="text-sm text-[var(--text-dim)] mt-1">
                    {pos ? "Gli altri ti devono questo importo" : neg ? "Devi questo importo agli altri" : "Sei in pari! 🎉"}
                  </p>
                </div>
              );
            })()}

            {/* All balances */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
              <p className="px-4 py-3 text-xs font-bold text-[var(--text-dim)] uppercase tracking-wider border-b border-[var(--card-border)]">
                Saldo per membro
              </p>
              {memberBalances.map((b: any, i: number) => {
                const pos = b.amount > 0.01; const neg = b.amount < -0.01;
                return (
                  <div key={b.userId} className={clsx("flex items-center gap-3 px-4 py-3", i < memberBalances.length - 1 && "border-b border-[rgba(255,255,255,0.05)]")}>
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 text-[#22c55e]"
                      style={{ background: "var(--nav-active-bg)" }}>
                      {getInitials(b.userId)}
                    </div>
                    <p className="flex-1 text-sm font-medium text-foreground">{getUserName(b.userId)}</p>
                    <p className="text-sm font-bold tabular" style={{ color: pos ? "#22c55e" : neg ? "#f97316" : "var(--text-dim)" }}>
                      {pos ? "+" : neg ? "-" : ""}{currencySymbol}{Math.abs(b.amount).toFixed(2)}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Settlements */}
            {settlements.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="px-4 py-3 text-xs font-bold text-[#70707a] uppercase tracking-wider" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  Rimborsi ottimizzati
                </p>
                {settlements.map((s, i) => (
                  <div key={i} className={clsx("flex items-center gap-3 px-4 py-3", i < settlements.length - 1 && "border-b border-[rgba(255,255,255,0.05)]")}>
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: "rgba(249,115,22,0.1)", color: "#f97316" }}>
                      {getInitials(s.from)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        <span className="font-semibold">{getUserName(s.from)}</span>
                        <span className="text-[var(--text-dim)] mx-1.5">→</span>
                        <span className="font-semibold">{getUserName(s.to)}</span>
                      </p>
                    </div>
                    <span className="text-sm font-bold tabular text-[#22c55e]">
                      {currencySymbol}{s.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {settlements.length === 0 && expenses.length > 0 && (
              <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
                <CheckCircle2 className="h-5 w-5 text-[#22c55e] flex-shrink-0" />
                <p className="text-sm font-medium text-[#22c55e]">Tutti i conti sono in pari! 🎉</p>
              </div>
            )}
          </div>
        )}

        {/* ── MEMBRI TAB ── */}
        {activeTab === "Membri" && (
          <div className="space-y-3">
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
              {group.members.map((uid: string, i: number) => (
                <div key={uid} className={clsx("flex items-center gap-3 px-4 py-3", i < group.members.length - 1 && "border-b border-[rgba(255,255,255,0.05)]")}>
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
                    {usersMap[uid]?.avatar_url
                      ? <img src={usersMap[uid].avatar_url} alt="" className="h-10 w-10 rounded-xl object-cover" />
                      : getInitials(uid)
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">{getUserName(uid)}</p>
                      {isMemberAdmin(uid) && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 flex items-center gap-1"
                          style={{ background: "var(--nav-active-bg)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}>
                          <Crown className="h-2.5 w-2.5" />Admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-dim)] truncate">{usersMap[uid]?.email}</p>
                  </div>
                  {isAdmin && uid !== user?.uid && (
                    <div className="flex items-center gap-1">
                      {!isMemberAdmin(uid) && (
                        <button onClick={() => setMemberToPromote(uid)}
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--text-dim)] hover:text-[#22c55e] hover:bg-[rgba(34,197,94,0.08)] transition-all">
                          <Crown className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button onClick={() => setMemberToRemove(uid)}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--text-dim)] hover:text-[#f97316] hover:bg-[rgba(249,115,22,0.08)] transition-all">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Invite + leave/delete */}
            <button onClick={copyInvite}
              className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
              style={copySuccess
                ? { background: "var(--nav-active-bg)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e" }
                : { background: "var(--card-bg)", border: "1px solid var(--card-border)", color: "var(--text-dim)" }}>
              {copySuccess ? <CheckCircle2 className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
              {copySuccess ? "Link copiato!" : "Copia link d'invito"}
            </button>

            {isAdmin ? (
              <button onClick={() => setDeleteGroupDialog(true)}
                className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                style={{ background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.15)", color: "#f97316" }}>
                <Trash2 className="h-4 w-4" />Elimina gruppo
              </button>
            ) : (
              <button onClick={() => setLeaveDialogOpen(true)}
                className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                style={{ background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.15)", color: "#f97316" }}>
                <LogOut className="h-4 w-4" />Abbandona gruppo
              </button>
            )}
          </div>
        )}
      </main>

      {/* ── AddExpenseModal ── */}
      <AddExpenseModal
        groupId={id as string} groupCurrency={group.currency || "EUR"}
        isOpen={isAddExpenseOpen} onClose={() => setIsAddExpenseOpen(false)}
        members={group.members || []} usersMap={usersMap}
      />

      {/* ── Receipt viewer ── */}
      {receiptToView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)" }}
          onClick={() => setReceiptToView(null)}>
          <div className="relative max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setReceiptToView(null)}
              className="absolute -top-3 -right-3 h-8 w-8 rounded-full flex items-center justify-center z-10"
              style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.1)", color: "#f0f0ee" }}>
              <X className="h-4 w-4" />
            </button>
            <img src={receiptToView} alt="Scontrino" className="w-full rounded-2xl object-contain" style={{ maxHeight: "80dvh" }} />
          </div>
        </div>
      )}

      {/* ── Confirm modals ── */}
      {(expenseToDelete || memberToRemove || leaveDialogOpen || memberToPromote || deleteGroupDialog) && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6 animate-fade-in"
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>

            {expenseToDelete && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)" }}>
                    <Trash2 className="h-5 w-5 text-[#f97316]" />
                  </div>
                  <div><h3 className="text-base font-bold text-[#f0f0ee]">Elimina spesa</h3><p className="text-xs text-[#70707a]">Operazione irreversibile</p></div>
                </div>
                <p className="text-sm text-[#a0a0a8] mb-5">Vuoi eliminare <span className="font-semibold text-[#f0f0ee]">{expenseToDelete.description}</span>?</p>
                <div className="flex gap-3">
                  <button onClick={() => setExpenseToDelete(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[var(--text-dim)]" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>Annulla</button>
                  <button onClick={handleDeleteExpense} disabled={actionLoading} className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2" style={{ background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.25)", color: "#f97316" }}>
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Trash2 className="h-4 w-4" />Elimina</>}
                  </button>
                </div>
              </>
            )}

            {memberToRemove && (
              <>
                <h3 className="text-base font-bold text-[#f0f0ee] mb-2">Rimuovi membro</h3>
                <p className="text-sm text-[#a0a0a8] mb-5">Vuoi rimuovere <span className="font-semibold text-[#f0f0ee]">{getUserName(memberToRemove)}</span> dal gruppo?</p>
                <div className="flex gap-3">
                  <button onClick={() => setMemberToRemove(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[#a0a0a8]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>Annulla</button>
                  <button onClick={handleRemoveMember} disabled={actionLoading} className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2" style={{ background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.25)", color: "#f97316" }}>
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Rimuovi"}
                  </button>
                </div>
              </>
            )}

            {leaveDialogOpen && (
              <>
                <h3 className="text-base font-bold text-[#f0f0ee] mb-2">Abbandona gruppo</h3>
                <p className="text-sm text-[#a0a0a8] mb-5">Non potrai più vedere le spese di <span className="font-semibold text-[#f0f0ee]">{group.name}</span>.</p>
                <div className="flex gap-3">
                  <button onClick={() => setLeaveDialogOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[#a0a0a8]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>Annulla</button>
                  <button onClick={handleLeaveGroup} disabled={actionLoading} className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2" style={{ background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.25)", color: "#f97316" }}>
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><LogOut className="h-4 w-4" />Abbandona</>}
                  </button>
                </div>
              </>
            )}

            {memberToPromote && (
              <>
                <h3 className="text-base font-bold text-[#f0f0ee] mb-2">Promuovi ad Admin</h3>
                <p className="text-sm text-[#a0a0a8] mb-5">Vuoi rendere <span className="font-semibold text-[#f0f0ee]">{getUserName(memberToPromote)}</span> amministratore?</p>
                <div className="flex gap-3">
                  <button onClick={() => setMemberToPromote(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[var(--text-dim)]" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>Annulla</button>
                  <button onClick={handlePromoteMember} disabled={actionLoading} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-foreground flex items-center justify-center gap-2 btn-glow" style={{ background: "#22c55e" }}>
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Crown className="h-4 w-4" />Promuovi</>}
                  </button>
                </div>
              </>
            )}

            {deleteGroupDialog && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)" }}>
                    <AlertTriangle className="h-5 w-5 text-[#f97316]" />
                  </div>
                  <div><h3 className="text-base font-bold text-[#f0f0ee]">Elimina gruppo</h3><p className="text-xs text-[#70707a]">Operazione irreversibile</p></div>
                </div>
                <p className="text-sm text-[#a0a0a8] mb-5">Verranno eliminate tutte le spese di <span className="font-semibold text-[#f0f0ee]">{group.name}</span>.</p>
                <div className="flex gap-3">
                  <button onClick={() => setDeleteGroupDialog(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[#a0a0a8]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>Annulla</button>
                  <button onClick={handleDeleteGroup} disabled={actionLoading} className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2" style={{ background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.25)", color: "#f97316" }}>
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Trash2 className="h-4 w-4" />Elimina tutto</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
