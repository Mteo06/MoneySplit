"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Users, CheckCircle2, AlertTriangle, Loader2, ArrowRight, LogIn } from "lucide-react";
import Link from "next/link";

export default function JoinGroupPage() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [group, setGroup] = useState<any>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "joining" | "joined" | "already" | "error">("loading");

  useEffect(() => {
    const fetchGroup = async () => {
      if (!id) return;
      try {
        const snap = await getDoc(doc(db, "groups", id as string));
        if (!snap.exists()) { setStatus("error"); return; }
        const g = { id: snap.id, ...snap.data() };
        setGroup(g);
        if (user && (g as any).members?.includes(user.uid)) { setStatus("already"); }
        else { setStatus("ready"); }
      } catch { setStatus("error"); }
    };
    if (!authLoading) fetchGroup();
  }, [id, user, authLoading]);

  const handleJoin = async () => {
    if (!user) { router.push(`/login?redirect=/groups/join/${id}`); return; }
    setStatus("joining");
    try {
      await updateDoc(doc(db, "groups", id as string), { members: arrayUnion(user.uid) });
      setStatus("joined");
      setTimeout(() => router.push(`/groups/${id}`), 1500);
    } catch { setStatus("error"); }
  };

  if (authLoading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="w-10 h-10 rounded-2xl border-2 border-[#22c55e]/30 border-t-[#22c55e] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-4">
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(34,197,94,0.1) 0%, transparent 70%)" }} />

      <div className="relative w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="h-8 w-8 rounded-xl flex items-center justify-center text-foreground font-bold"
            style={{ background: "#22c55e", boxShadow: "0 0 20px rgba(34,197,94,0.35)" }}>M</div>
          <span className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-display-var)" }}>MoneySplit</span>
        </div>

        <div className="rounded-2xl p-6 text-center" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
          {status === "error" && (
            <>
              <div className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)" }}>
                <AlertTriangle className="h-7 w-7 text-[#f97316]" />
              </div>
              <h1 className="text-lg font-bold text-foreground mb-2">Invito non valido</h1>
              <p className="text-sm text-[var(--text-dim)] mb-6">Il link non è valido o il gruppo non esiste più.</p>
              <Link href="/dashboard">
                <button className="px-5 py-2.5 rounded-xl text-sm font-bold text-[#0a0a0b] btn-glow" style={{ background: "#22c55e" }}>
                  Vai alla dashboard
                </button>
              </Link>
            </>
          )}

          {status === "already" && (
            <>
              <div className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
                <CheckCircle2 className="h-7 w-7 text-[#22c55e]" />
              </div>
              <h1 className="text-lg font-bold text-foreground mb-2">Sei già nel gruppo</h1>
              <p className="text-sm text-[var(--text-dim)] mb-6">Fai già parte di <span className="text-foreground font-semibold">{group?.name}</span>.</p>
              <button onClick={() => router.push(`/groups/${id}`)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-[#0a0a0b] btn-glow flex items-center gap-2 mx-auto" style={{ background: "#22c55e" }}>
                Apri gruppo <ArrowRight className="h-4 w-4" />
              </button>
            </>
          )}

          {status === "joined" && (
            <>
              <div className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
                <CheckCircle2 className="h-7 w-7 text-[#22c55e]" />
              </div>
              <h1 className="text-lg font-bold text-foreground mb-2">Benvenuto!</h1>
              <p className="text-sm text-[var(--text-dim)]">Hai unito il gruppo <span className="text-foreground font-semibold">{group?.name}</span>. Redirect in corso…</p>
            </>
          )}

          {(status === "ready" || status === "joining") && group && (
            <>
              <div className="h-14 w-14 rounded-xl flex items-center justify-center mx-auto mb-4 text-foreground font-bold"
                style={{ background: "#22c55e" }}>
                {group.image_base64
                  ? <img src={group.image_base64} alt={group.name} className="h-14 w-14 rounded-xl object-cover" />
                  : group.name.slice(0, 2).toUpperCase()
                }
              </div>
              <p className="text-xs text-[var(--text-dim)] uppercase tracking-wider mb-1">Sei stato invitato in</p>
              <h1 className="text-xl font-bold text-foreground mb-1" style={{ fontFamily: "var(--font-display-var)" }}>{group.name}</h1>
              <p className="text-sm text-[var(--text-dim)] mb-6">
                {group.members?.length || 1} membri · {group.currency || "EUR"}
              </p>

              {!user ? (
                <>
                  <p className="text-sm text-[#a0a0a8] mb-4">Accedi o registrati per unirti al gruppo.</p>
                  <Link href={`/login?redirect=/groups/join/${id}`}>
                    <button className="w-full py-2.5 rounded-xl text-sm font-bold text-[#0a0a0b] btn-glow flex items-center justify-center gap-2" style={{ background: "#22c55e" }}>
                      <LogIn className="h-4 w-4" />Accedi e unisciti
                    </button>
                  </Link>
                </>
              ) : (
                <button onClick={handleJoin} disabled={status === "joining"}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-foreground flex items-center justify-center gap-2" style={{ background: "#22c55e" }}>
                  {status === "joining"
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <><Users className="h-4 w-4" />Unisciti al gruppo</>
                  }
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
