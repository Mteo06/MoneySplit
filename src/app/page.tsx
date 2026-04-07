"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import {
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  X,
  Mail,
  Lock,
  User,
  ChevronDown,
} from "lucide-react";

// ─────────────────────────────────────────────
// AUTH MODAL
// ─────────────────────────────────────────────
function AuthModal({
  onClose,
  defaultMode = "signup",
}: {
  onClose: () => void;
  defaultMode?: "login" | "signup";
}) {
  const router = useRouter();
  const [isSignup, setIsSignup] = useState(defaultMode === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const friendlyError = (code: string) => {
    if (
      code.includes("user-not-found") ||
      code.includes("wrong-password") ||
      code.includes("invalid-credential")
    )
      return "Email o password non corretti.";
    if (code.includes("email-already-in-use"))
      return "Email già registrata. Prova ad accedere.";
    if (code.includes("weak-password"))
      return "Password troppo corta (min. 6 caratteri).";
    if (code.includes("invalid-email")) return "Indirizzo email non valido.";
    return "Errore. Riprova tra qualche secondo.";
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (isSignup) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name });
        await setDoc(doc(db, "users", cred.user.uid), {
          name,
          email,
          created_at: new Date().toISOString(),
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.push("/dashboard");
    } catch (err: any) {
      setError(friendlyError(err.code || ""));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError("");
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
      if (err.code !== "auth/popup-closed-by-user")
        setError(friendlyError(err.code || ""));
    } finally {
      setGoogleLoading(false);
    }
  };

  const inputClass = `w-full h-11 px-4 rounded-xl text-sm text-foreground placeholder:text-[var(--text-dim)] outline-none transition-all
    bg-muted/50 border border-[var(--card-border)]
    focus:border-[#22c55e] focus:bg-[rgba(34,197,94,0.04)] focus:shadow-[0_0_0_3px_rgba(34,197,94,0.1)]`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(12px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl overflow-hidden animate-fade-in"
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-2.5">
            <div
              className="h-8 w-8 rounded-xl flex items-center justify-center text-[#0a0a0b] font-bold text-sm"
              style={{
                background: "#22c55e",
                boxShadow: "0 0 16px rgba(34,197,94,0.3)",
              }}
            >
              M
            </div>
            <span className="text-sm font-bold text-foreground">MoneySplit</span>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-xl flex items-center justify-center text-[var(--text-dim)] hover:text-foreground hover:bg-muted/50 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Tab toggle */}
          <div
            className="flex gap-1 p-1 rounded-xl"
            style={{
              background: "var(--nav-active-bg)",
              border: "1px solid var(--card-border)",
            }}
          >
            {[
              { v: false, l: "Accedi" },
              { v: true, l: "Registrati" },
            ].map(({ v, l }) => (
              <button
                key={l}
                type="button"
                onClick={() => {
                  setIsSignup(v);
                  setError("");
                }}
                className="flex-1 py-2 text-sm font-semibold rounded-lg transition-all"
                style={
                  isSignup === v
                    ? { background: "#22c55e", color: "#0a0a0b" }
                    : { color: "#70707a" }
                }
              >
                {l}
              </button>
            ))}
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            className="w-full h-11 flex items-center justify-center gap-2.5 rounded-xl text-sm font-semibold text-foreground transition-all hover:bg-muted/50 disabled:opacity-50"
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
            }}
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path
                    fill="#4285F4"
                    d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"
                  />
                  <path
                    fill="#34A853"
                    d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"
                  />
                  <path
                    fill="#EA4335"
                    d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"
                  />
                </svg>
                Continua con Google
              </>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div
              className="flex-1 h-px"
              style={{ background: "var(--card-border)" }}
            />
            <span className="text-xs text-[var(--text-dim)] font-medium">oppure</span>
            <div
              className="flex-1 h-px"
              style={{ background: "var(--card-border)" }}
            />
          </div>

          {/* Form */}
          <form onSubmit={handleEmailAuth} className="space-y-3">
            {error && (
              <div
                className="flex items-center gap-2 text-sm text-[#f97316] p-3 rounded-xl"
                style={{
                  background: "rgba(249,115,22,0.08)",
                  border: "1px solid rgba(249,115,22,0.2)",
                }}
              >
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {isSignup && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#505058]" />
                <input
                  type="text"
                  placeholder="Il tuo nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={isSignup}
                  disabled={loading}
                  className={inputClass + " pl-10"}
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#505058]" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className={inputClass + " pl-10"}
              />
            </div>

            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
                className={inputClass + " pl-10 pr-11"}
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
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
              ) : isSignup ? (
                "Crea account gratis"
              ) : (
                "Accedi"
              )}
            </button>
          </form>

          <p className="text-xs text-center text-[var(--text-dim)]">
            {isSignup
              ? "Registrandoti accetti i Termini di servizio. "
              : ""}
            Nessuna carta richiesta.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// LANDING PAGE
// ─────────────────────────────────────────────
export default function LandingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"login" | "signup">("signup");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && user) router.push("/dashboard");
  }, [user, authLoading, router]);

  const openSignup = () => {
    setModalMode("signup");
    setModalOpen(true);
  };
  const openLogin = () => {
    setModalMode("login");
    setModalOpen(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b]">
        <div
          className="w-10 h-10 rounded-2xl border-2 border-t-[#22c55e] animate-spin"
          style={{
            borderColor: "rgba(34,197,94,0.2)",
            borderTopColor: "#22c55e",
          }}
        />
      </div>
    );
  }

  const faqs = [
    {
      q: "Devo davvero creare un account?",
      a: "Sì, è necessario un account gratuito per usare MoneySplit. Questo ti permette di sincronizzare i dati su più dispositivi, mantenere uno storico permanente e condividere i gruppi con gli amici. La registrazione richiede meno di 30 secondi.",
    },
    {
      q: "L'account è davvero gratuito per sempre?",
      a: "Assolutamente sì. MoneySplit è un progetto open-source senza piani premium, pubblicità o funzioni nascoste a pagamento. Gratuito oggi, gratuito domani.",
    },
    {
      q: "Come funziona la condivisione dei gruppi?",
      a: "Una volta creato un gruppo, puoi invitare gli altri partecipanti tramite link. Anche loro dovranno avere un account (gratuito) per unirsi e aggiungere spese. Chi ha solo il link può visualizzare i saldi senza modificarli.",
    },
    {
      q: 'Cosa significa "rimborsi ottimizzati"?',
      a: "Con 5 persone e 20 spese, potresti avere dozzine di debiti incrociati. MoneySplit li semplifica al minimo numero possibile di pagamenti — di solito bastano 3-4 bonifici per pareggiare un intero viaggio.",
    },
    {
      q: "Posso usarlo da mobile?",
      a: "Sì, MoneySplit è ottimizzato per mobile. Puoi anche aggiungere l'icona alla schermata home del tuo smartphone per un'esperienza simile a un'app nativa.",
    },
  ];

  return (
    <div
      className="min-h-screen bg-background text-foreground overflow-x-hidden"
      style={{ fontFamily: "var(--font-body, system-ui)" }}
    >
      {/* ── NAV ── */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-4"
        style={{
          background: "var(--header-bg)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--card-border)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="h-8 w-8 rounded-xl flex items-center justify-center text-[#0a0a0b] font-bold text-sm"
            style={{
              background: "#22c55e",
              boxShadow: "0 0 16px rgba(34,197,94,0.3)",
            }}
          >
            M
          </div>
          <span className="text-sm font-bold text-foreground">MoneySplit</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openLogin}
            className="px-4 py-2 text-sm font-medium text-[#70707a] hover:text-[#f0f0ee] transition-colors rounded-xl"
          >
            Accedi
          </button>
          <button
            onClick={openSignup}
            className="px-4 py-2 rounded-xl text-sm font-bold text-[#0a0a0b] btn-glow"
            style={{ background: "#22c55e" }}
          >
            Crea account gratis
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative flex flex-col items-center text-center px-4 pt-16 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
          style={{
            width: 700,
            height: 400,
            background:
              "radial-gradient(ellipse at top, rgba(34,197,94,0.13) 0%, transparent 65%)",
          }}
        />

        <div className="relative z-10 max-w-2xl mx-auto animate-fade-in">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
            style={{
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.22)",
              color: "#22c55e",
            }}
          >
            ✨ Gratuito per sempre · Account in 30 secondi
          </div>

          <h1
            className="font-bold leading-tight mb-5 text-foreground"
            style={{
              fontSize: "clamp(2rem,6vw,3.5rem)",
              fontFamily: "var(--font-display-var, inherit)",
              letterSpacing: "-0.02em",
            }}
          >
            Spese di gruppo,<br />
            <span style={{ color: "#22c55e" }}>finalmente semplici.</span>
          </h1>

          <p className="text-base text-[var(--text-dim)] mb-8 max-w-xl mx-auto leading-relaxed">
            Crea un account gratuito, aggiungi le tue spese e lascia che
            MoneySplit calcoli chi deve quanto — in pochi secondi.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={openSignup}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl text-base font-bold text-[#0a0a0b] btn-glow"
              style={{ background: "#22c55e" }}
            >
              Crea account gratis →
            </button>
            <a href="#come-funziona">
              <button
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl text-sm font-semibold text-[#a0a0a8] hover:text-[#f0f0ee] transition-colors"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                Come funziona
              </button>
            </a>
          </div>
        </div>

        {/* App preview cards */}
        <div className="relative z-10 mt-12 w-full max-w-md mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: "✈️ Grecia 2025", sub: "5 persone · €915", color: "#22c55e" },
            { title: "🏠 Casa Milano", sub: "4 persone · €340/mese", color: "#3b82f6" },
            { title: "🎉 Festa Marco", sub: "8 persone · €280", color: "#f59e0b" },
          ].map((g, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl text-left"
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
              }}
            >
              <p className="text-sm font-bold text-foreground">{g.title}</p>
              <p className="text-xs text-[var(--text-dim)] mt-1">{g.sub}</p>
            </div>
          ))}
        </div>

        {/* Badges */}
        <div className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-[#70707a]">
          {[
            "Nessun abbonamento",
            "Setup in 30 secondi",
            "Gruppi illimitati",
            "Multi-valuta",
            "Mobile-first",
            "Saldi ottimizzati",
          ].map((b, i) => (
            <span
              key={i}
              className="px-3 py-1.5 rounded-full"
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
              }}
            >
              ✓ {b}
            </span>
          ))}
        </div>
      </section>

      {/* ── COME FUNZIONA ── */}
      <section id="come-funziona" className="px-4 py-16 max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <p
            className="text-xs font-bold uppercase tracking-widest mb-2"
            style={{ color: "#22c55e" }}
          >
            Come funziona
          </p>
          <h2
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "var(--font-display-var, inherit)" }}
          >
            Tre passi verso la pace finanziaria
          </h2>
          <p className="text-sm text-[#70707a] mt-2">
            Senza complicazioni. Registrati, crea un gruppo, aggiungi le spese —
            MoneySplit fa il resto.
          </p>
        </div>
        <div className="space-y-3">
          {[
            {
              n: "01",
              e: "👤",
              t: "Crea il tuo account",
              d: "Registrati gratis in 30 secondi con email o Google. I tuoi dati sono al sicuro e sempre accessibili da qualsiasi dispositivo.",
            },
            {
              n: "02",
              e: "👥",
              t: "Crea un gruppo e aggiungi spese",
              d: "Dai un nome al gruppo, invita i partecipanti e inizia ad aggiungere le spese. Puoi dividere in parti uguali o personalizzare.",
            },
            {
              n: "03",
              e: "✅",
              t: "Scopri i saldi e pareggia",
              d: "MoneySplit calcola automaticamente i debiti ottimizzati, minimizzando il numero di trasferimenti. Segna i pagamenti come saldati.",
            },
          ].map((s, i) => (
            <div
              key={i}
              className="flex items-start gap-4 p-5 rounded-2xl"
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
              }}
            >
              <div
                className="h-11 w-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{
                  background: "rgba(34,197,94,0.08)",
                  border: "1px solid rgba(34,197,94,0.15)",
                }}
              >
                {s.e}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-[10px] font-bold tabular"
                    style={{ color: "#22c55e" }}
                  >
                    {s.n}
                  </span>
                  <p className="text-sm font-bold text-foreground">{s.t}</p>
                </div>
                <p className="text-sm text-[var(--text-dim)] leading-relaxed">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="px-4 py-16 max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <p
            className="text-xs font-bold uppercase tracking-widest mb-2"
            style={{ color: "#22c55e" }}
          >
            Funzionalità
          </p>
          <h2
            className="text-2xl font-bold text-[#f0f0ee]"
            style={{ fontFamily: "var(--font-display-var, inherit)" }}
          >
            Tutto quello che ti serve
          </h2>
          <p className="text-sm text-[#70707a] mt-2">
            Progettato per essere semplice ma potente. Gestisce le situazioni più
            complesse senza farti impazzire.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              e: "⚡",
              t: "Saldi in tempo reale",
              d: "Ogni spesa aggiornata istantaneamente. Vedi sempre chi è in credito e chi è in debito, con grafici chiari.",
            },
            {
              e: "⚖️",
              t: "Divisione flessibile",
              d: "Uguale, personalizzata o per percentuale. Decidi chi partecipa a quale spesa.",
            },
            {
              e: "🌍",
              t: "Multi-valuta",
              d: "Viaggi internazionali senza problemi. EUR €, USD $, GBP £, JPY ¥, CHF e altri.",
            },
            {
              e: "♾️",
              t: "Gruppi illimitati",
              d: "Un gruppo per ogni occasione. Vacanze, casa, cene, eventi — tutti organizzati.",
            },
            {
              e: "🔗",
              t: "Invita con un link",
              d: "Condividi il gruppo. I tuoi amici entrano direttamente senza confusione.",
            },
            {
              e: "🧮",
              t: "Rimborsi ottimizzati",
              d: "L'algoritmo di MoneySplit minimizza il numero di trasferimenti necessari. Da 20 possibili pagamenti a 3.",
            },
            {
              e: "📋",
              t: "Storico e cronologia",
              d: "Tutte le spese con data, categoria e chi ha pagato. Modifica o elimina in qualsiasi momento.",
            },
            {
              e: "🔐",
              t: "Account sicuro",
              d: "I tuoi dati sono protetti e sincronizzati nel cloud. Accesso da qualsiasi dispositivo.",
            },
          ].map((f, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl"
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
              }}
            >
              <span className="text-2xl block mb-3">{f.e}</span>
              <p className="text-sm font-bold text-foreground mb-1">{f.t}</p>
              <p className="text-xs text-[var(--text-dim)] leading-relaxed">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── DIVISIONE FLESSIBILE highlight ── */}
      <section className="px-4 py-4 max-w-2xl mx-auto">
        <div
          className="relative overflow-hidden rounded-3xl p-6 sm:p-8"
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
          }}
        >
          <div
            className="absolute -top-10 -right-10 w-48 h-48 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 70%)",
            }}
          />
          <div className="relative z-10">
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-4"
              style={{
                background: "rgba(34,197,94,0.1)",
                border: "1px solid rgba(34,197,94,0.2)",
                color: "#22c55e",
              }}
            >
              ⚖️ Divisione flessibile
            </div>
            <h2
              className="text-xl font-bold text-foreground mb-2"
              style={{ fontFamily: "var(--font-display-var, inherit)" }}
            >
              Dividi come vuoi tu
            </h2>
            <p className="text-sm text-[var(--text-dim)] mb-6 leading-relaxed">
              Ogni spesa è diversa. MoneySplit supporta tutti i tipi di
              divisione — scegli quello che si adatta alla situazione.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  icon: "🟰",
                  t: "Uguale",
                  d: "Tutti pagano la stessa quota. Ideale per cene e spese condivise standard.",
                },
                {
                  icon: "✏️",
                  t: "Personalizzata",
                  d: "Inserisci l'importo esatto per ogni persona. Per quando le quote non sono uguali.",
                },
                {
                  icon: "%",
                  t: "Percentuale",
                  d: "Assegna una percentuale a ciascun partecipante. Il totale deve fare 100%.",
                },
                {
                  icon: "👤",
                  t: "Selezione",
                  d: "Scegli esattamente chi partecipa a questa spesa. Gli altri non vengono inclusi.",
                },
              ].map((m, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl"
                  style={{
                    background: "var(--nav-active-bg)",
                    border: "1px solid var(--card-border)",
                  }}
                >
                  <div
                    className="h-9 w-9 rounded-xl flex items-center justify-center text-base font-bold mb-3"
                    style={{
                      background: "rgba(34,197,94,0.1)",
                      border: "1px solid rgba(34,197,94,0.2)",
                      color: "#22c55e",
                    }}
                  >
                    {m.icon}
                  </div>
                  <p className="text-sm font-bold text-foreground mb-1">{m.t}</p>
                  <p className="text-xs text-[var(--text-dim)] leading-relaxed">{m.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SALDI OTTIMIZZATI preview ── */}
      <section className="px-4 py-8 max-w-2xl mx-auto">
        <div
          className="rounded-3xl p-6"
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: "#22c55e" }}
              >
                Saldi ottimizzati
              </p>
              <p className="text-sm font-bold text-foreground mt-1">
                Solo 3 pagamenti per pareggiare tutto
              </p>
            </div>
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                background: "rgba(34,197,94,0.1)",
                border: "1px solid rgba(34,197,94,0.2)",
                color: "#22c55e",
              }}
            >
              ✓ Algoritmo ottimizzato
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { n: "Marco", a: "€96", to: "Luca" },
              { n: "Anna", a: "€58", to: "Sara" },
              { n: "Giu", a: "€26", to: "Luca" },
            ].map((p, i) => (
              <div key={i} className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                <p className="text-sm font-bold text-[#f0f0ee]">{p.n}</p>
                <p className="text-lg font-bold tabular" style={{ color: "#22c55e" }}>{p.a}</p>
                <p className="text-[10px] text-[#70707a]">→ {p.to}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#70707a] text-center mt-4">
            Da 20 possibili pagamenti → solo 3 necessari
          </p>
        </div>
      </section>

      {/* ── ACCOUNT GRATUITO ── */}
      <section id="account" className="px-4 py-16 max-w-2xl mx-auto">
        <div
          className="rounded-3xl p-6 sm:p-8"
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
          }}
        >
          <p
            className="text-xs font-bold uppercase tracking-widest mb-2"
            style={{ color: "#22c55e" }}
          >
            Account gratuito
          </p>
          <h2
            className="text-xl font-bold text-[#f0f0ee] mb-2"
            style={{ fontFamily: "var(--font-display-var, inherit)" }}
          >
            Registrati in 30 secondi
          </h2>
          <p className="text-sm text-[#70707a] mb-6 leading-relaxed">
            Un account gratuito ti permette di sincronizzare i gruppi su tutti i
            tuoi dispositivi, ritrovare le spese passate e condividere facilmente
            con gli amici.
          </p>
          <div className="space-y-2.5 mb-6">
            {[
              "Apri MoneySplit dal telefono, dal computer o dal tablet — i tuoi gruppi sono sempre aggiornati.",
              "Le tue spese sono salvate nel cloud, non nel browser. Cambio telefono? Nessun problema.",
              "100% gratuito, per sempre. Nessun piano a pagamento, nessuna funzione premium nascosta.",
            ].map((t, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: "rgba(34,197,94,0.15)" }}
                >
                  <svg
                    width="10"
                    height="8"
                    viewBox="0 0 10 8"
                    fill="none"
                  >
                    <path
                      d="M1 4L3.5 6.5L9 1"
                      stroke="#22c55e"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <p className="text-sm text-[#a0a0a8] leading-relaxed">{t}</p>
              </div>
            ))}
          </div>
          <button
            onClick={openSignup}
            className="w-full py-3 rounded-xl text-sm font-bold text-[#0a0a0b] btn-glow"
            style={{ background: "#22c55e" }}
          >
            Crea account gratis
          </button>
          <p className="text-xs text-[#505058] text-center mt-3">
            Registrandoti accetti i Termini di servizio. Nessuna carta richiesta.
          </p>
        </div>
      </section>

      {/* ── CASI D'USO ── */}
      <section className="px-4 py-16 max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <p
            className="text-xs font-bold uppercase tracking-widest mb-2"
            style={{ color: "#22c55e" }}
          >
            Per ogni occasione
          </p>
          <h2
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "var(--font-display-var, inherit)" }}
          >
            Un gruppo per ogni momento
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              e: "✈️",
              t: "Viaggi di gruppo",
              d: "Voli, hotel, cene, escursioni — traccia tutto e scopri i saldi finali prima di tornare a casa.",
            },
            {
              e: "🏠",
              t: "Casa condivisa",
              d: "Affitto, bollette, spesa: un gruppo permanente per i coinquilini, aggiornato ogni mese.",
            },
            {
              e: "🍽️",
              t: "Cene e uscite",
              d: "Niente calcoli alla cassa. Aggiungi il conto e scopri chi deve quanto in secondi.",
            },
            {
              e: "🎉",
              t: "Feste ed eventi",
              d: "Organizza regali collettivi, feste di compleanno e costi condivisi per eventi speciali.",
            },
          ].map((o, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl"
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
              }}
            >
              <span className="text-3xl block mb-3">{o.e}</span>
              <p className="text-sm font-bold text-foreground mb-1">{o.t}</p>
              <p className="text-xs text-[var(--text-dim)] leading-relaxed">{o.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="px-4 py-16 max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h2
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "var(--font-display-var, inherit)" }}
          >
            Domande frequenti
          </h2>
        </div>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div
              key={i}
              className="rounded-2xl overflow-hidden"
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
              }}
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-semibold text-foreground hover:text-[#22c55e] transition-colors"
              >
                {f.q}
                <ChevronDown
                  className={`h-4 w-4 text-[#505058] flex-shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""
                    }`}
                />
              </button>
              {openFaq === i && (
                <div
                  className="px-5 pb-4 text-sm text-[var(--text-dim)] leading-relaxed"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <p className="pt-3">{f.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="px-4 py-20 text-center relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(34,197,94,0.1) 0%, transparent 65%)",
          }}
        />
        <div className="relative z-10 max-w-lg mx-auto">
          <h2
            className="text-3xl font-bold text-foreground mb-4 leading-tight"
            style={{ fontFamily: "var(--font-display-var, inherit)" }}
          >
            Pronto a smettere di<br />fare i conti a mano?
          </h2>
          <p className="text-sm text-[#70707a] mb-8">
            Crea il tuo account gratuito in 30 secondi. Nessuna carta di credito,
            nessun piano premium, nessuna sorpresa.
          </p>
          <button
            onClick={openSignup}
            className="px-10 py-4 rounded-2xl text-base font-bold text-[#0a0a0b] btn-glow"
            style={{ background: "#22c55e" }}
          >
            Crea account gratis
          </button>
          <p className="text-xs text-[#505058] mt-4">
            ✓ Gratuito · ✓ Nessuna carta · ✓ 30 secondi
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer
        className="px-6 py-8 text-center"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <div
            className="h-6 w-6 rounded-lg flex items-center justify-center text-[#0a0a0b] text-xs font-bold"
            style={{ background: "#22c55e" }}
          >
            M
          </div>
          <span className="text-sm font-bold text-foreground">MoneySplit</span>
        </div>
        <p className="text-xs text-[#505058]">
          © 2025 · Fatto con ❤️ ·{" "}
          <a
            href="https://moneyspliit.vercel.app/"
            className="text-[#22c55e] hover:underline"
          >
          </a>
        </p>
      </footer>

      {/* ── AUTH MODAL ── */}
      {modalOpen && (
        <AuthModal onClose={() => setModalOpen(false)} defaultMode={modalMode} />
      )}
    </div>
  );
}