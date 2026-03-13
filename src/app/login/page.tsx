"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, Wallet, ArrowRight, User, CheckCircle2, Mail } from "lucide-react";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const getItalianError = (code: string) => {
    if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found"))
      return "Email o password non corretti.";
    if (code.includes("email-already-in-use"))
      return "Questa email è già registrata. Accedi invece.";
    if (code.includes("weak-password"))
      return "La password deve avere almeno 6 caratteri.";
    if (code.includes("invalid-email"))
      return "Indirizzo email non valido.";
    if (code.includes("too-many-requests"))
      return "Troppi tentativi. Riprova tra qualche minuto.";
    return "Si è verificato un errore. Riprova.";
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        if (!name.trim()) {
          setError("Inserisci il tuo nome.");
          setLoading(false);
          return;
        }
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(credential.user, { displayName: name.trim() });
        await setDoc(doc(db, "users", credential.user.uid), {
          name: name.trim(),
          email: email,
          avatar_url: null,
          created_at: new Date().toISOString(),
        });
      }
      router.push("/dashboard");
    } catch (err: any) {
      setError(getItalianError(err.code || "") || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Inserisci la tua email.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess("Email inviata! Controlla la tua casella di posta per reimpostare la password.");
    } catch (err: any) {
      setError(getItalianError(err.code || "") || err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchToLogin = () => { setIsLogin(true); setIsForgot(false); setError(""); setSuccess(""); };
  const switchToRegister = () => { setIsLogin(false); setIsForgot(false); setError(""); setSuccess(""); };
  const switchToForgot = () => { setIsForgot(true); setIsLogin(true); setError(""); setSuccess(""); };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-700" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.4),rgba(255,255,255,0))]" />

      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      <div className="absolute top-3/4 left-3/4 w-48 h-48 bg-fuchsia-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />

      {/* Content */}
      <div className="relative w-full max-w-md px-4 animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-18 w-18 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-2xl mb-4 border border-white/30 p-4">
            <Wallet className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">MoneySplit</h1>
          <p className="text-white/70 text-sm mt-1.5">Dividi le spese, senza stress</p>
        </div>

        {/* Glass card */}
        <div className="bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl p-8">

          {/* ── FORGOT PASSWORD VIEW ── */}
          {isForgot ? (
            <>
              <div className="flex flex-col items-center mb-6">
                <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
                  <Mail className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-white font-bold text-lg">Password dimenticata?</h2>
                <p className="text-white/70 text-sm text-center mt-1">
                  Inserisci la tua email e ti invieremo un link per reimpostare la password.
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2.5 text-sm text-red-200 bg-red-500/20 border border-red-500/30 p-3 rounded-xl mb-4">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2.5 text-sm text-emerald-200 bg-emerald-500/20 border border-emerald-500/30 p-3 rounded-xl mb-4">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  <p>{success}</p>
                </div>
              )}

              {!success && (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="reset-email" className="text-white/80 text-sm font-medium">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="mario@esempio.it"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/50 focus:ring-white/30 rounded-xl h-11"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-12 bg-white text-indigo-700 hover:bg-white/90 font-semibold rounded-xl shadow-lg gap-2 mt-2"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Mail className="h-4 w-4" /> Invia link di reset</>}
                  </Button>
                </form>
              )}

              <button
                type="button"
                onClick={switchToLogin}
                className="w-full mt-4 text-center text-white/60 hover:text-white text-sm transition-colors"
              >
                ← Torna al login
              </button>
            </>
          ) : (
            <>
              {/* Tab switcher */}
              <div className="flex gap-1 p-1 bg-white/10 rounded-xl mb-6">
                <button
                  type="button"
                  onClick={switchToLogin}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                    isLogin ? "bg-white text-indigo-700 shadow-sm" : "text-white/70 hover:text-white"
                  }`}
                >
                  Accedi
                </button>
                <button
                  type="button"
                  onClick={switchToRegister}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                    !isLogin ? "bg-white text-indigo-700 shadow-sm" : "text-white/70 hover:text-white"
                  }`}
                >
                  Registrati
                </button>
              </div>

              <p className="text-white/80 text-sm mb-5 text-center">
                {isLogin
                  ? "Bentornato! Inserisci le tue credenziali per continuare."
                  : "Crea un account per iniziare a dividere le spese."}
              </p>

              <form onSubmit={handleAuth} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2.5 text-sm text-red-200 bg-red-500/20 border border-red-500/30 p-3 rounded-xl">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                {/* Name field (registration only) */}
                {!isLogin && (
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-white/80 text-sm font-medium">Nome completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="Mario Rossi"
                        required={!isLogin}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/50 focus:ring-white/30 rounded-xl h-11 pl-9"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-white/80 text-sm font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="mario@esempio.it"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/50 focus:ring-white/30 rounded-xl h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-white/80 text-sm font-medium">Password</Label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={switchToForgot}
                        className="text-white/60 hover:text-white text-xs transition-colors"
                      >
                        Password dimenticata?
                      </button>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/50 focus:ring-white/30 rounded-xl h-11"
                  />
                  {!isLogin && (
                    <p className="text-white/50 text-xs mt-1">Minimo 6 caratteri</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-white text-indigo-700 hover:bg-white/90 font-semibold rounded-xl shadow-lg shadow-black/10 transition-all duration-200 gap-2 mt-2"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {isLogin ? "Accedi" : "Crea Account"}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-white/50 text-xs mt-6">
          Continuando, accetti i nostri Termini e la Privacy Policy.
        </p>
      </div>
    </div>
  );
}
