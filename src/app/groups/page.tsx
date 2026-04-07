"use client";

import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Navbar } from "@/components/layout/Navbar";
import { Plus, Users, ChevronRight, LogOut, Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, updateDoc, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";

export default function GroupsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupToLeave, setGroupToLeave] = useState<any>(null);
  const [leaveLoading, setLeaveLoading] = useState(false);

  useEffect(() => {
    const fetchGroups = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, "groups"), where("members", "array-contains", user.uid));
        const snap = await getDocs(q);
        setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchGroups();
  }, [user]);

  const handleLeave = async () => {
    if (!groupToLeave || !user) return;
    setLeaveLoading(true);
    try {
      await updateDoc(doc(db, "groups", groupToLeave.id), { members: arrayRemove(user.uid) });
      setGroups(prev => prev.filter(g => g.id !== groupToLeave.id));
      setGroupToLeave(null);
    } catch (e) { console.error(e); } finally { setLeaveLoading(false); }
  };

  const isAdmin = (group: any) => group.created_by === user?.uid;

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="container mx-auto max-w-2xl px-4 py-6 pb-28 md:pb-10 space-y-5 animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-display-var)" }}>
              I tuoi Gruppi
            </h1>
            <p className="text-sm text-[var(--text-dim)] mt-0.5">
              {groups.length} gruppo{groups.length !== 1 ? "i" : ""} attivo{groups.length !== 1 ? "i" : ""}
            </p>
          </div>
          <Link href="/groups/new">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-[#0a0a0b] btn-glow"
              style={{ background: "#22c55e" }}>
              <Plus className="h-4 w-4" />
              Nuovo
            </button>
          </Link>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-2">
            {[1,2,3,4].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center rounded-2xl"
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
            <div className="h-14 w-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "var(--nav-active-bg)", border: "1px solid var(--card-border)" }}>
              <Users className="h-7 w-7 text-[var(--text-dim)]" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">Nessun gruppo ancora</p>
            <p className="text-sm text-[var(--text-dim)] mb-6 max-w-[22ch]">Crea un gruppo e invita i tuoi amici per iniziare</p>
            <Link href="/groups/new">
              <button className="px-5 py-2.5 rounded-xl text-sm font-bold text-[#0a0a0b] btn-glow" style={{ background: "#22c55e" }}>
                Crea il primo gruppo
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {groups.map((group) => (
              <div key={group.id} className="flex items-center rounded-2xl overflow-hidden transition-all"
                style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
                <Link href={`/groups/${group.id}`} className="flex items-center gap-3 p-4 flex-1 min-w-0 hover:bg-[rgba(255,255,255,0.02)] transition-all">
                  <div className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-[#0a0a0b]"
                    style={{ background: group.image_base64 ? "transparent" : "#22c55e" }}>
                    {group.image_base64
                      ? <img src={group.image_base64} alt={group.name} className="h-11 w-11 rounded-xl object-cover" />
                      : group.name.slice(0, 2).toUpperCase()
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">{group.name}</p>
                      {isAdmin(group) && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0"
                          style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}>
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-dim)] mt-0.5">
                      {group.members?.length || 1} membri · {group.currency || "EUR"}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[var(--text-dim)] flex-shrink-0" />
                </Link>
                {!isAdmin(group) && (
                  <button onClick={() => setGroupToLeave(group)}
                    className="px-4 py-4 text-[var(--text-dim)] hover:text-[#f97316] hover:bg-[rgba(249,115,22,0.06)] transition-all border-l border-[var(--card-border)]">
                    <LogOut className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Leave dialog */}
        {groupToLeave && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
            <div className="w-full max-w-sm rounded-2xl p-6 animate-fade-in"
              style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)" }}>
                  <AlertTriangle className="h-5 w-5 text-[#f97316]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Abbandona gruppo</h3>
                  <p className="text-xs text-[var(--text-dim)]">Questa azione è irreversibile</p>
                </div>
              </div>
              <p className="text-sm text-[var(--text-dim)] mb-5">
                Sei sicuro di voler abbandonare <span className="font-semibold text-foreground">{groupToLeave.name}</span>?
                Non potrai più vedere le spese del gruppo.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setGroupToLeave(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[var(--text-dim)] hover:text-foreground transition-all"
                  style={{ background: "var(--nav-active-bg)", border: "1px solid var(--card-border)" }}>
                  Annulla
                </button>
                <button onClick={handleLeave} disabled={leaveLoading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-foreground flex items-center justify-center gap-2 transition-all"
                  style={{ background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.25)", color: "#f97316" }}>
                  {leaveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><LogOut className="h-4 w-4" />Abbandona</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </ProtectedRoute>
  );
}
