"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInWithPopup, GoogleAuthProvider, updateProfile } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Eye, EyeOff, Loader2, AlertCircle, Mail, Lock, User } from "lucide-react";

const inputClass = `w-full h-11 px-4 rounded-xl text-sm text-foreground placeholder:text-[var(--text-dim)] outline-none transition-all
  bg-muted/50 border border-[var(--card-border)]
  focus:border-[#22c55e] focus:bg-[rgba(34,197,94,0.04)] focus:shadow-[0_0_0_3px_rgba(34,197,94,0.1)]`;

export default function LoginPage() {
  const router = useRouter();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const friendlyError = (code: string) => {
    if (code.includes("user-not-found") || code.includes("wrong-password") || code.includes("invalid-credential"))
      return "Email o password non corretti.";
    if (code.includes("email-already-in-use")) return "Email già registrata. Prova ad accedere.";
    if (code.includes("weak-password")) return "Password troppo corta (min. 6 caratteri).";
    if (code.includes("invalid-email")) return "Indirizzo email non valido.";
    return "Errore. Riprova tra qualche secondo.";
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      if (isSignup) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name });
        await setDoc(doc(db, "users", cred.user.uid), {
          name, email, created_at: new Date().toISOString(),
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.push("/dashboard");
    } catch (err: any) {
      setError(friendlyError(err.code || ""));
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true); setError("");
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      const userDoc = await getDoc(doc(db, "users", result.user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, "users", result.user.uid), {
          name: result.user.displayName || "Utente",
          email: result.user.email,
          avatar_url: result.user.photoURL || null,
          created_at: new Date().toISOString(),
        });
      }
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.code === "auth/popup-closed-by-user" ? "" : friendlyError(err.code || ""));
    } finally { setGoogleLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-foreground">
      {/* Background accents */}
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
      <div
        className="absolute pointer-events-none"
        style={{
          top: "20%", left: "50%", transform: "translateX(-50%)",
          width: "500px", height: "500px",
          background: "radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 65%)",
        }}
      />

      <div className="relative w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div
            className="h-14 w-14 rounded-2xl flex items-center justify-center text-[#0a0a0b] text-2xl font-bold"
            style={{ background: "#22c55e", boxShadow: "0 0 32px rgba(34,197,94,0.35)" }}
          >
            M
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-display-var)" }}>
              MoneySplit
            </h1>
            <p className="text-sm text-[var(--text-dim)] mt-0.5">
              {isSignup ? "Crea il tuo account" : "Bentornato!"}
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6 space-y-4 border border-[var(--card-border)] bg-[var(--card-bg)]">

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            className="w-full h-11 flex items-center justify-center gap-2.5 rounded-xl text-sm font-semibold text-foreground transition-all hover:bg-muted/50 disabled:opacity-50"
            style={{ background: "transparent", border: "1px solid var(--card-border)" }}
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                  <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                  <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
                  <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
                </svg>
                Continua con Google
              </>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--card-border)]" />
            <span className="text-xs text-[var(--text-dim)] font-medium">oppure</span>
            <div className="flex-1 h-px bg-[var(--card-border)]" />
          </div>

          {/* Form */}
          <form onSubmit={handleEmailAuth} className="space-y-3">
            {error && (
              <div className="flex items-center gap-2 text-sm text-[#f97316] p-3 rounded-xl"
                style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)" }}>
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {isSignup && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-dim)]" />
                <input
                  type="text" placeholder="Nome" value={name}
                  onChange={e => setName(e.target.value)}
                  required={isSignup} disabled={loading}
                  className={inputClass + " pl-10"}
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-dim)]" />
              <input
                type="email" placeholder="Email" value={email}
                onChange={e => setEmail(e.target.value)}
                required disabled={loading}
                className={inputClass + " pl-10"}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-dim)]" />
              <input
                type={showPwd ? "text" : "password"} placeholder="Password" value={password}
                onChange={e => setPassword(e.target.value)}
                required disabled={loading} minLength={6}
                className={inputClass + " pl-10 pr-11"}
              />
              <button
                type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)] hover:text-foreground transition-colors"
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full h-11 rounded-xl text-sm font-bold text-[#0a0a0b] flex items-center justify-center gap-2 btn-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              style={{ background: "#22c55e" }}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                isSignup ? "Crea account" : "Accedi"
              )}
            </button>
          </form>

          {/* Toggle */}
          <p className="text-sm text-center text-[var(--text-dim)]">
            {isSignup ? "Hai già un account?" : "Non hai un account?"}{" "}
            <button
              onClick={() => { setIsSignup(!isSignup); setError(""); }}
              className="font-semibold transition-colors text-[#22c55e]"
            >
              {isSignup ? "Accedi" : "Registrati"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
