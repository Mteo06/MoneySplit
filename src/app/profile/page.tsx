"use client";

import { useAuth } from "@/lib/AuthContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Navbar } from "@/components/layout/Navbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { compressAvatarToBase64 } from "@/utils/imageUtils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Check, X, Mail, User, Shield, Camera, Loader2, KeyRound, Eye, EyeOff } from "lucide-react";

export default function ProfilePage() {
  const { user, profile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Change password state
  const [changePwdOpen, setChangePwdOpen] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");

  // Profile name comes live from AuthContext (via onSnapshot)
  const displayName = profile?.name || user?.email?.split("@")[0] || "Utente";
  const avatarUrl = profile?.avatar_url || null;
  const initials = displayName.charAt(0).toUpperCase();

  // Sync edit field when profile loads
  const editName = isEditing ? name : (profile?.name || "");

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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;
    if (newPwd.length < 6) {
      setPwdError("La nuova password deve avere almeno 6 caratteri.");
      return;
    }
    setPwdLoading(true);
    setPwdError("");
    setPwdSuccess("");
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPwd);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPwd);
      setPwdSuccess("Password aggiornata con successo! ✓");
      setCurrentPwd("");
      setNewPwd("");
      setTimeout(() => { setChangePwdOpen(false); setPwdSuccess(""); }, 2000);
    } catch (err: any) {
      if (err.code?.includes("wrong-password") || err.code?.includes("invalid-credential"))
        setPwdError("Password attuale non corretta.");
      else
        setPwdError("Errore. Riprova tra qualche minuto.");
    } finally {
      setPwdLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 15 * 1024 * 1024) {
      setAvatarError("File troppo grande. Massimo 15 MB.");
      return;
    }

    setAvatarLoading(true);
    setAvatarError("");
    try {
      // Compress to 200×200 square JPEG and save to Firestore only
      // (Firebase Auth photoURL has a URL length limit — can't store base64 there)
      const base64 = await compressAvatarToBase64(file);
      await updateDoc(doc(db, "users", user.uid), { avatar_url: base64 });
      // AuthContext onSnapshot will pick up the change automatically — no manual setState needed
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      setAvatarError("Errore durante il caricamento. Riprova.");
    } finally {
      setAvatarLoading(false);
      // Reset file input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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
                  {avatarUrl && <AvatarImage src={avatarUrl} />}
                  <AvatarFallback className="text-2xl font-bold gradient-primary text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {/* Camera hover overlay */}
                <button
                  onClick={() => !avatarLoading && fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  title="Cambia foto profilo"
                  type="button"
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
                <button
                  type="button"
                  onClick={() => !avatarLoading && fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary border-2 border-card flex items-center justify-center hover:scale-110 transition-transform"
                >
                  {avatarLoading
                    ? <Loader2 className="h-3 w-3 text-white animate-spin" />
                    : <Camera className="h-3 w-3 text-white" />
                  }
                </button>
              </div>

              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setIsEditing(true); setName(profile?.name || ""); }}
                  className="gap-2 rounded-xl border-border/60 hover:border-primary/40"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Modifica
                </Button>
              )}
            </div>

            {avatarError && (
              <p className="text-xs text-destructive mb-2">{avatarError}</p>
            )}

            {isEditing ? (
              <div className="space-y-3 animate-slide-up">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-sm font-semibold">Nome visualizzato</Label>
                  <Input
                    id="name"
                    value={editName}
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
                    onClick={() => setIsEditing(false)}
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

          {/* Change Password Card */}
          <div className="bg-card border border-border/60 rounded-2xl shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => { setChangePwdOpen(o => !o); setPwdError(""); setPwdSuccess(""); }}
              className="w-full p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors"
            >
              <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                <KeyRound className="h-5 w-5 text-violet-500" />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Password</p>
                <p className="font-semibold text-foreground">Cambia password</p>
              </div>
              <span className="text-muted-foreground text-sm">{changePwdOpen ? "▲" : "▼"}</span>
            </button>

            {changePwdOpen && (
              <form onSubmit={handleChangePassword} className="px-4 pb-4 space-y-3 border-t border-border/60 pt-4">
                {pwdError && (
                  <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-xl">{pwdError}</p>
                )}
                {pwdSuccess && (
                  <p className="text-xs text-emerald-600 bg-emerald-500/10 px-3 py-2 rounded-xl">{pwdSuccess}</p>
                )}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Password attuale</Label>
                  <div className="relative">
                    <Input
                      type={showCurrentPwd ? "text" : "password"}
                      placeholder="••••••••"
                      value={currentPwd}
                      onChange={e => setCurrentPwd(e.target.value)}
                      required
                      className="h-11 rounded-xl pr-10"
                    />
                    <button type="button" onClick={() => setShowCurrentPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showCurrentPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Nuova password</Label>
                  <div className="relative">
                    <Input
                      type={showNewPwd ? "text" : "password"}
                      placeholder="••••••••"
                      value={newPwd}
                      onChange={e => setNewPwd(e.target.value)}
                      required
                      className="h-11 rounded-xl pr-10"
                    />
                    <button type="button" onClick={() => setShowNewPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showNewPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Minimo 6 caratteri</p>
                </div>
                <Button type="submit" disabled={pwdLoading} className="w-full rounded-xl gap-2 shadow-md shadow-primary/20">
                  {pwdLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  {pwdLoading ? "Aggiornamento..." : "Aggiorna password"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
