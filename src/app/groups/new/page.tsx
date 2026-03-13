"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArrowLeft, Loader2, Users, Globe } from "lucide-react";
import Link from "next/link";

const CURRENCIES = [
  { value: "EUR", label: "Euro", symbol: "€" },
  { value: "USD", label: "Dollaro USA", symbol: "$" },
  { value: "GBP", label: "Sterlina Inglese", symbol: "£" },
  { value: "CHF", label: "Franco Svizzero", symbol: "Fr" },
];

export default function NewGroupPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    setLoading(true);
    setError("");

    try {
      const groupData = {
        name: name.trim(),
        currency,
        created_by: user.uid,
        members: [user.uid],
        created_at: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "groups"), groupData);
      router.push(`/groups/${docRef.id}`);
    } catch (err: any) {
      console.error("Error creating group:", err);
      setError("Errore durante la creazione del gruppo. Riprova.");
      setLoading(false);
    }
  };

  const selectedCurrency = CURRENCIES.find(c => c.value === currency);

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="container mx-auto max-w-lg px-4 py-6 pb-32 md:pb-10 animate-fade-in">
        {/* Back link */}
        <Link
          href="/groups"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna ai Gruppi
        </Link>

        {/* Card */}
        <div className="bg-card border border-border/60 rounded-3xl shadow-xl shadow-black/5 overflow-hidden">
          {/* Card header with gradient */}
          <div className="relative gradient-hero px-6 pt-8 pb-10 overflow-hidden">
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-violet-600/20 rounded-full blur-xl" />
            <div className="relative z-10 flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-lg">
                <Users className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Crea Gruppo</h1>
                <p className="text-white/70 text-sm">Configura il tracciamento delle spese condivise</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleCreateGroup}>
            <div className="px-6 py-6 space-y-5">
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold text-foreground">
                  Nome del Gruppo
                </Label>
                <Input
                  id="name"
                  placeholder="es. Weekend a Parigi, Appartamento"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  required
                  className="h-12 rounded-xl border-border/60 focus:border-primary/50 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency" className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  Valuta Predefinita
                </Label>
                <Select value={currency} onValueChange={(val) => val && setCurrency(val)} disabled={loading}>
                  <SelectTrigger id="currency" className="h-12 rounded-xl border-border/60 text-base">
                    <SelectValue placeholder="Seleziona valuta" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {CURRENCIES.map(c => (
                      <SelectItem key={c.value} value={c.value} className="rounded-lg">
                        <span className="font-mono font-bold text-primary mr-2">{c.symbol}</span>
                        {c.label} <span className="text-muted-foreground ml-1">({c.value})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Valuta predefinita per le nuove spese del gruppo.
                </p>
              </div>

              {/* Preview */}
              {name.trim() && (
                <div className="bg-muted/50 rounded-2xl p-4 border border-border/40">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Anteprima</p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center text-white font-bold text-sm shadow-md shadow-primary/20">
                      {name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{name}</p>
                      <p className="text-xs text-muted-foreground">1 membro · {selectedCurrency?.symbol} {selectedCurrency?.label}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <Link href="/groups" className="flex-1">
                <Button type="button" variant="outline" className="w-full rounded-xl h-12" disabled={loading}>
                  Annulla
                </Button>
              </Link>
              <Button
                type="submit"
                className="flex-1 h-12 rounded-xl shadow-md shadow-primary/20"
                disabled={loading || !name.trim()}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crea Gruppo
              </Button>
            </div>
          </form>
        </div>
      </main>
    </ProtectedRoute>
  );
}
