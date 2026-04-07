"use client";

import { useAuth } from "@/lib/AuthContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Navbar } from "@/components/layout/Navbar";
import { useState, useRef } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { compressAvatarToBase64 } from "@/utils/imageUtils";
import { Pencil, Check, X, Camera, Loader2, KeyRound, Eye, EyeOff, LogOut, Mail, Shield, CheckCircle2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

const inputClass = `w-full h-11 px-4 rounded-xl text-sm text-foreground placeholder:text-[var(--text-dim)] outline-none transition-all
  bg-muted/50 border border-[var(--card-border)]
  focus:border-[#22c55e] focus:bg-[rgba(34,197,94,0.04)] focus:shadow-[0_0_0_3px_rgba(34,197,94,0.1)]`;

const labelClass = "block text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider mb-1.5";

export default function ProfilePage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [changePwdOpen, setChangePwdOpen] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");

  const displayName = profile?.name || user?.email?.split("@")[0] || "Utente";
  const avatarUrl = profile?.avatar_url || null;
  const initials = displayName.charAt(0).toUpperCase();
  const isGoogleUser = user?.providerData?.some(p => p.providerId === "google.com");

  const handleUpdate = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { name });
      await updateProfile(user, { displayName: name });
      setIsEditing(false);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarLoading(true); setAvatarError("");
    try {
      const base64 = await compressAvatarToBase64(file);
      await updateDoc(doc(db, "users", user.uid), { avatar_url: base64 });
    } catch { setAvatarError("Errore nel caricamento. Riprova."); } finally { setAvatarLoading(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;
    setPwdLoading(true); setPwdError(""); setPwdSuccess("");
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPwd);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPwd);
      setPwdSuccess("Password aggiornata con successo!");
      setCurrentPwd(""); setNewPwd("");
      setTimeout(() => { setChangePwdOpen(false); setPwdSuccess(""); }, 2000);
    } catch (err: any) {
      if (err.code?.includes("wrong-password") || err.code?.includes("invalid-credential"))
        setPwdError("Password attuale non corretta.");
      else if (err.code?.includes("weak-password"))
        setPwdError("La nuova password deve avere almeno 6 caratteri.");
      else setPwdError("Errore. Riprova.");
    } finally { setPwdLoading(false); }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="container mx-auto max-w-lg px-4 py-6 pb-28 md:pb-10 space-y-4 animate-fade-in">
        <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-display-var)" }}>Profilo</h1>

        {/* Avatar + name */}
        <div className="rounded-2xl p-6 border border-[var(--card-border)] bg-[var(--card-bg)]">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="h-20 w-20 rounded-2xl overflow-hidden"
                style={{ border: "2px solid rgba(34,197,94,0.3)" }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-[#0a0a0b] text-2xl font-bold" style={{ background: "#22c55e" }}>{initials}</div>
                }
              </div>
              <button onClick={() => fileInputRef.current?.click()} disabled={avatarLoading}
                className="absolute -bottom-1.5 -right-1.5 h-7 w-7 rounded-xl flex items-center justify-center transition-all"
                style={{ background: "#22c55e", border: "2px solid #0a0a0b" }}>
                {avatarLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0a0a0b]" /> : <Camera className="h-3.5 w-3.5 text-[#0a0a0b]" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input type="text" value={name} onChange={e => setName(e.target.value)}
                    className={inputClass + " flex-1"} autoFocus onKeyDown={e => e.key === "Enter" && handleUpdate()} />
                  <button onClick={handleUpdate} disabled={loading}
                    className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e" }}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </button>
                    <button onClick={() => setIsEditing(false)}
                      className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 text-[var(--text-dim)] hover:text-foreground transition-all"
                      style={{ background: "var(--nav-active-bg)", border: "1px solid var(--card-border)" }}>
                      <X className="h-4 w-4" />
                    </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold text-foreground truncate">{displayName}</p>
                  <button onClick={() => { setName(displayName); setIsEditing(true); }}
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-[var(--text-dim)] hover:text-[#22c55e] hover:bg-[rgba(34,197,94,0.08)] transition-all">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <p className="text-sm text-[var(--text-dim)] mt-0.5 truncate">{user?.email}</p>
              {avatarError && <p className="text-xs text-[#f97316] mt-1">{avatarError}</p>}
            </div>
          </div>
        </div>

        {/* Account info */}
        <div className="rounded-2xl overflow-hidden border border-[var(--card-border)] bg-[var(--card-bg)]">
          <div className="px-5 py-3 flex items-center gap-3 border-b border-[var(--card-border)]">
            <Mail className="h-4 w-4 text-[var(--text-dim)]" />
            <div className="flex-1">
              <p className="text-xs text-[var(--text-dim)]">Email</p>
              <p className="text-sm font-medium text-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="px-5 py-3 flex items-center gap-3">
            <Shield className="h-4 w-4 text-[var(--text-dim)]" />
            <div className="flex-1">
              <p className="text-xs text-[var(--text-dim)]">Metodo di accesso</p>
              <p className="text-sm font-medium text-foreground">{isGoogleUser ? "Google" : "Email e password"}</p>
            </div>
            {!isGoogleUser && (
              <button onClick={() => { setChangePwdOpen(true); setPwdError(""); setPwdSuccess(""); }}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                style={{ background: "rgba(34,197,94,0.08)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}>
                Cambia
              </button>
            )}
          </div>
        </div>

        {/* Logout */}
        <button onClick={handleLogout}
          className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
          style={{ background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.15)", color: "#f97316" }}>
          <LogOut className="h-4 w-4" />Esci dall'account
        </button>

        {/* Change password modal */}
        {changePwdOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
            <div className="w-full max-w-sm rounded-2xl p-6 animate-fade-in border border-[var(--card-border)] bg-[var(--card-bg)]">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-foreground">Cambia password</h3>
                <button onClick={() => setChangePwdOpen(false)} className="text-[var(--text-dim)] hover:text-foreground transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {pwdError && <div className="flex items-center gap-2 text-sm text-[#f97316] p-3 rounded-xl mb-4" style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)" }}><AlertCircle className="h-4 w-4 flex-shrink-0" />{pwdError}</div>}
              {pwdSuccess && <div className="flex items-center gap-2 text-sm text-[#22c55e] p-3 rounded-xl mb-4" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}><CheckCircle2 className="h-4 w-4 flex-shrink-0" />{pwdSuccess}</div>}

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className={labelClass}>Password attuale</label>
                  <div className="relative">
                    <input type={showCurrentPwd ? "text" : "password"} value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} required className={inputClass + " pr-11"} placeholder="••••••••" />
                    <button type="button" onClick={() => setShowCurrentPwd(!showCurrentPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)] hover:text-foreground transition-colors">
                      {showCurrentPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Nuova password</label>
                  <div className="relative">
                    <input type={showNewPwd ? "text" : "password"} value={newPwd} onChange={e => setNewPwd(e.target.value)} required minLength={6} className={inputClass + " pr-11"} placeholder="Min. 6 caratteri" />
                    <button type="button" onClick={() => setShowNewPwd(!showNewPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)] hover:text-foreground transition-colors">
                      {showNewPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setChangePwdOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[var(--text-dim)] hover:text-foreground transition-all"
                    style={{ background: "var(--nav-active-bg)", border: "1px solid var(--card-border)" }}>Annulla</button>
                  <button type="submit" disabled={pwdLoading} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-[#0a0a0b] flex items-center justify-center gap-2 btn-glow" style={{ background: "#22c55e" }}>
                    {pwdLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><KeyRound className="h-4 w-4" />Aggiorna</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </ProtectedRoute>
  );
}
