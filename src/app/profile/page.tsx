"use client";

import { useAuth } from "@/lib/AuthContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Navbar } from "@/components/layout/Navbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { updateProfile } from "firebase/auth";
import { compressAvatarToBase64 } from "@/utils/imageUtils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Check, X, Mail, User, Shield, Camera, Loader2 } from "lucide-react";

export default function ProfilePage() {
  const { user, profile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setAvatarUrl(profile.avatar_url || null);
    }
  }, [profile]);

  const handleUpdate = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { name });
      await updateProfile(user, { displayName: name });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 15 * 1024 * 1024) {
      alert("Il file è troppo grande. Massimo 15 MB.");
      return;
    }

    setAvatarLoading(true);
    try {
      // Compress to 200×200 square, stored as base64 in Firestore
      const base64 = await compressAvatarToBase64(file);
      await updateDoc(doc(db, "users", user.uid), { avatar_url: base64 });
      await updateProfile(user, { photoURL: base64 });
      setAvatarUrl(base64);
    } catch (error) {
      console.error("Error compressing avatar:", error);
      alert("Errore durante il caricamento della foto. Riprova.");
    } finally {
      setAvatarLoading(false);
    }
  };

  const displayName = name || profile?.name || user?.email?.split("@")[0] || "Utente";
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="container mx-auto max-w-xl px-4 py-6 pb-32 md:pb-10 space-y-5 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profilo</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Gestisci i dettagli del tuo account</p>
        </div>

        {/* Avatar + Name Hero Card */}
        <div className="bg-card border border-border/60 rounded-3xl overflow-hidden shadow-xl shadow-black/5">
          {/* Gradient banner */}
          <div className="relative h-24 gradient-hero overflow-hidden">
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-violet-600/20 rounded-full blur-xl" />
          </div>

          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-10 mb-4">
              {/* Clickable avatar */}
              <div className="relative group">
                <Avatar className="h-20 w-20 border-4 border-card shadow-xl">
                  <AvatarImage src={avatarUrl || ""} />
                  <AvatarFallback className="text-2xl font-bold gradient-primary text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {/* Camera hover overlay */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarLoading}
                  className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  title="Cambia foto profilo"
                >
                  {avatarLoading
                    ? <Loader2 className="h-5 w-5 text-white animate-spin" />
                    : <Camera className="h-5 w-5 text-white" />
                  }
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleAvatarChange}
                />
                {/* Camera badge */}
                <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary border-2 border-card flex items-center justify-center">
                  {avatarLoading
                    ? <Loader2 className="h-3 w-3 text-white animate-spin" />
                    : <Camera className="h-3 w-3 text-white" />
                  }
                </div>
              </div>

              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="gap-2 rounded-xl border-border/60 hover:border-primary/40"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Modifica
                </Button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-3 animate-slide-up">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-sm font-semibold">Nome visualizzato</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 rounded-xl border-border/60"
                    placeholder="Il tuo nome"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button onClick={handleUpdate} disabled={loading} className="gap-2 rounded-xl shadow-md shadow-primary/20">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    {loading ? "Salvataggio..." : "Salva"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setIsEditing(false); setName(profile?.name || ""); }}
                    className="gap-2 rounded-xl"
                  >
                    <X className="h-4 w-4" />
                    Annulla
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-bold text-foreground">{displayName}</h2>
                <p className="text-muted-foreground text-sm mt-0.5">{user?.email}</p>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center -mt-2">
          Passa il cursore sulla foto per cambiarla · Ridimensionata automaticamente
        </p>

        {/* Info cards */}
        <div className="space-y-3">
          <div className="bg-card border border-border/60 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nome</p>
              <p className="font-semibold text-foreground truncate">{displayName}</p>
            </div>
          </div>

          <div className="bg-card border border-border/60 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <Mail className="h-5 w-5 text-blue-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</p>
              <p className="font-semibold text-foreground truncate">{user?.email}</p>
            </div>
          </div>

          <div className="bg-card border border-border/60 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <Shield className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Stato Account</p>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <p className="font-semibold text-foreground">Verificato</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
