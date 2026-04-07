"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Navbar } from "@/components/layout/Navbar";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArrowLeft, Loader2, Users, Globe, Plus } from "lucide-react";
import Link from "next/link";

const CURRENCIES = [
  { value: "EUR", label: "Euro", symbol: "€" },
  { value: "USD", label: "Dollaro USA", symbol: "$" },
  { value: "GBP", label: "Sterlina", symbol: "£" },
  { value: "CHF", label: "Franco Svizzero", symbol: "Fr" },
];

const inputClass = `w-full h-11 px-4 rounded-xl text-sm text-foreground outline-none transition-all
  bg-muted/50 border border-[var(--card-border)]
  focus:border-[#22c55e] focus:bg-[rgba(34,197,94,0.04)] focus:shadow-[0_0_0_3px_rgba(34,197,94,0.1)]`;

const labelClass = "block text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider mb-1.5";

export default function NewGroupPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setLoading(true); setError("");
    try {
      const ref = await addDoc(collection(db, "groups"), {
        name: name.trim(), currency, created_by: user.uid,
        members: [user.uid], created_at: serverTimestamp(),
      });
      router.push(`/groups/${ref.id}`);
    } catch (err: any) {
      setError("Errore durante la creazione. Riprova.");
      setLoading(false);
    }
  };

  const selectedCurrency = CURRENCIES.find(c => c.value === currency);

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="container mx-auto max-w-lg px-4 py-6 pb-28 md:pb-10 animate-fade-in">
        <Link href="/groups" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-dim)] hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" />Torna ai Gruppi
        </Link>

        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
          {/* Header */}
          <div className="px-6 pt-6 pb-6 relative overflow-hidden border-b border-[var(--card-border)]">
            <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
            <div className="absolute -top-8 -right-8 w-32 h-32 pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)" }} />
            <div className="relative z-10 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl flex items-center justify-center text-[#22c55e]"
                style={{ background: "var(--nav-active-bg)", border: "1px solid rgba(34,197,94,0.2)" }}>
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-display-var)" }}>Crea Gruppo</h1>
                <p className="text-sm text-[var(--text-dim)]">Configura le spese condivise</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleCreate}>
            <div className="px-6 py-6 space-y-5">
              {error && (
                <div className="text-sm text-[#f97316] p-3 rounded-xl"
                  style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)" }}>
                  {error}
                </div>
              )}
              <div>
                <label className={labelClass}>Nome del gruppo</label>
                <input type="text" placeholder="es. Weekend a Parigi, Appartamento…" value={name}
                  onChange={e => setName(e.target.value)} disabled={loading} required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}><Globe className="h-3.5 w-3.5 inline mr-1" />Valuta</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {CURRENCIES.map(c => (
                    <button key={c.value} type="button" onClick={() => setCurrency(c.value)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                      style={currency === c.value
                        ? { background: "var(--nav-active-bg)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e" }
                        : { background: "var(--card-bg)", border: "1px solid var(--card-border)", color: "var(--text-dim)" }}>
                      <span className="font-bold">{c.symbol}</span>
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {name.trim() && (
                <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: "var(--nav-active-bg)", border: "1px solid var(--card-border)" }}>
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center text-[#0a0a0b] text-sm font-bold flex-shrink-0"
                    style={{ background: "#22c55e" }}>
                    {name.slice(0,2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{name}</p>
                    <p className="text-xs text-[var(--text-dim)]">1 membro · {selectedCurrency?.symbol} {selectedCurrency?.label}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <Link href="/groups" className="flex-1">
                <button type="button" className="w-full py-2.5 rounded-xl text-sm font-semibold text-[var(--text-dim)] hover:text-foreground transition-all"
                  style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
                  Annulla
                </button>
              </Link>
              <button type="submit" disabled={loading || !name.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-foreground flex items-center justify-center gap-2 transition-all btn-glow disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "#22c55e" }}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" />Crea Gruppo</>}
              </button>
            </div>
          </form>
        </div>
      </main>
    </ProtectedRoute>
  );
}
