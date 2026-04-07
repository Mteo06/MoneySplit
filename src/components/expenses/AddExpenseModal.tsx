"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import { compressImageToBase64 } from "@/utils/imageUtils";
import { Loader2, Receipt, Users, User, Camera, X, AlertCircle, Equal, Sliders, Percent, UserCheck } from "lucide-react";

interface AddExpenseModalProps {
  groupId: string;
  groupCurrency: string;
  isOpen: boolean;
  onClose: () => void;
  members: string[];
  usersMap: Record<string, any>;
}

type SplitMode = "equal" | "custom" | "percentage" | "select";

const CATEGORIES = [
  { value: "Cibo", emoji: "🍔" }, { value: "Viaggio", emoji: "✈️" },
  { value: "Trasporto", emoji: "🚗" }, { value: "Alloggio", emoji: "🏨" },
  { value: "Shopping", emoji: "🛍️" }, { value: "Intrattenimento", emoji: "🎬" },
  { value: "Altro", emoji: "💸" },
];

const SPLIT_MODES: { value: SplitMode; label: string; icon: any; desc: string }[] = [
  { value: "equal",      label: "Uguale",        icon: Equal,     desc: "Quota uguale per tutti" },
  { value: "select",     label: "Partecipanti",  icon: UserCheck, desc: "Scegli chi partecipa" },
  { value: "custom",     label: "Personalizzata",icon: Sliders,   desc: "Importo esatto per ognuno" },
  { value: "percentage", label: "Percentuale",   icon: Percent,   desc: "% per ogni persona" },
];

const inputClass = `w-full h-11 px-4 rounded-xl text-sm text-[#f0f0ee] placeholder:text-[#505058] outline-none transition-all
  bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)]
  focus:border-[#22c55e] focus:bg-[rgba(34,197,94,0.04)] focus:shadow-[0_0_0_3px_rgba(34,197,94,0.1)]`;
const labelClass = "block text-xs font-semibold text-[#a0a0a8] uppercase tracking-wider mb-1.5";

export function AddExpenseModal({ groupId, groupCurrency, isOpen, onClose, members, usersMap }: AddExpenseModalProps) {
  const { user } = useAuth();

  // Base fields
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Altro");
  const [paidBy, setPaidBy] = useState(user?.uid || "");

  // Split
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(members);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});

  // Receipt
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Init custom/percentage maps when members change
  useEffect(() => {
    const initMap: Record<string, string> = {};
    members.forEach(uid => { initMap[uid] = ""; });
    setCustomAmounts(initMap);
    setPercentages(initMap);
    setSelectedParticipants(members);
    setPaidBy(user?.uid || members[0] || "");
  }, [members, user?.uid]);

  if (!isOpen) return null;

  const getUserName = (uid: string) => {
    if (uid === user?.uid) return "Tu";
    return usersMap[uid]?.name || usersMap[uid]?.email?.split("@")[0] || "Utente";
  };
  const getInitials = (uid: string) => {
    const n = getUserName(uid); return n === "Tu" ? "T" : n.charAt(0).toUpperCase();
  };

  const toggleParticipant = (uid: string) => {
    setSelectedParticipants(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  // ── Validation helpers ──
  const totalAmount = parseFloat(amount || "0");

  const customTotal = Object.values(customAmounts).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const customValid = Math.abs(customTotal - totalAmount) < 0.01;

  const percentTotal = Object.values(percentages).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const percentValid = Math.abs(percentTotal - 100) < 0.01;

  const isFormValid = (() => {
    if (!description || totalAmount <= 0) return false;
    if (splitMode === "equal") return true;
    if (splitMode === "select") return selectedParticipants.length > 0;
    if (splitMode === "custom") return customValid;
    if (splitMode === "percentage") return percentValid;
    return false;
  })();

  // ── Preview calculation ──
  const getPreviewShares = (): { uid: string; amount: number }[] => {
    if (!totalAmount) return [];
    if (splitMode === "equal") {
      const share = totalAmount / members.length;
      return members.map(uid => ({ uid, amount: share }));
    }
    if (splitMode === "select") {
      if (selectedParticipants.length === 0) return [];
      const share = totalAmount / selectedParticipants.length;
      return selectedParticipants.map(uid => ({ uid, amount: share }));
    }
    if (splitMode === "custom") {
      return members.map(uid => ({ uid, amount: parseFloat(customAmounts[uid] || "0") }));
    }
    if (splitMode === "percentage") {
      return members.map(uid => ({
        uid, amount: totalAmount * (parseFloat(percentages[uid] || "0") / 100),
      }));
    }
    return [];
  };

  const handleReceiptChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) { setError("File troppo grande. Max 15 MB."); return; }
    setReceiptLoading(true); setError("");
    try {
      const base64 = await compressImageToBase64(file, 800, 800, 0.75);
      setReceiptBase64(base64); setReceiptPreview(base64);
    } catch { setError("Errore nel caricamento. Riprova."); } finally { setReceiptLoading(false); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !user) return;
    setLoading(true); setError("");

    try {
      const shares = getPreviewShares();
      if (shares.length === 0) { setError("Nessun partecipante selezionato."); setLoading(false); return; }

      const docRef = await addDoc(collection(db, "expenses"), {
        group_id: groupId, description, amount: totalAmount,
        currency: groupCurrency, category,
        paid_by: paidBy || user.uid,
        split_mode: splitMode,
        receipt_base64: receiptBase64 || null,
        created_at: serverTimestamp(),
      });

      await Promise.all(shares.map(({ uid, amount: shareAmount }) =>
        addDoc(collection(db, "expense_participants"), {
          expense_id: docRef.id, user_id: uid, share_amount: shareAmount,
        })
      ));

      // Reset
      setDescription(""); setAmount(""); setCategory("Altro");
      setPaidBy(user.uid); setSplitMode("equal");
      setSelectedParticipants(members);
      const reset: Record<string, string> = {};
      members.forEach(uid => { reset[uid] = ""; });
      setCustomAmounts(reset); setPercentages(reset);
      setReceiptBase64(null); setReceiptPreview(null);
      onClose();
    } catch (err: any) {
      setError(`Errore: ${err?.message || "Riprova."}`);
    } finally { setLoading(false); }
  };

  const currSym = { EUR:"€", USD:"$", GBP:"£", CHF:"Fr" }[groupCurrency] || "€";
  const previews = getPreviewShares();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl overflow-hidden animate-fade-in"
        style={{ background:"#111114", border:"1px solid rgba(255,255,255,0.08)", maxHeight:"92dvh", display:"flex", flexDirection:"column" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center"
              style={{ background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.2)" }}>
              <Receipt className="h-4 w-4 text-[#22c55e]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#f0f0ee]">Aggiungi Spesa</h2>
              <p className="text-xs text-[#70707a]">Registra una spesa condivisa</p>
            </div>
          </div>
          <button onClick={onClose}
            className="h-8 w-8 rounded-xl flex items-center justify-center text-[#505058] hover:text-[#f0f0ee] hover:bg-[rgba(255,255,255,0.06)] transition-all">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleAdd} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

            {error && (
              <div className="flex items-center gap-2 text-sm text-[#f97316] p-3 rounded-xl"
                style={{ background:"rgba(249,115,22,0.08)", border:"1px solid rgba(249,115,22,0.2)" }}>
                <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
              </div>
            )}

            {/* Description */}
            <div>
              <label className={labelClass}>Descrizione</label>
              <input type="text" placeholder="Cena, Taxi, Supermercato…" value={description}
                onChange={e => setDescription(e.target.value)} disabled={loading} required className={inputClass} />
            </div>

            {/* Amount + Category */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Importo ({groupCurrency})</label>
                <input type="number" step="0.01" min="0.01" placeholder="0.00" value={amount}
                  onChange={e => setAmount(e.target.value)} disabled={loading} required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Categoria</label>
                <select value={category} onChange={e => setCategory(e.target.value)} disabled={loading}
                  className={inputClass} style={{ appearance:"none", cursor:"pointer" }}>
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value} style={{ background:"#18181c" }}>
                      {c.emoji} {c.value}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Who paid */}
            <div>
              <label className={labelClass}><User className="h-3.5 w-3.5 inline mr-1" />Chi ha pagato</label>
              <div className="grid grid-cols-2 gap-2">
                {members.map(uid => (
                  <button key={uid} type="button" onClick={() => setPaidBy(uid)} disabled={loading}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={paidBy === uid
                      ? { background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.25)", color:"#22c55e" }
                      : { background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", color:"#a0a0a8" }}>
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={paidBy === uid ? { background:"#22c55e", color:"#0a0a0b" } : { background:"rgba(255,255,255,0.06)", color:"#a0a0a8" }}>
                      {getInitials(uid)}
                    </div>
                    <span className="truncate">{getUserName(uid)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Split Mode selector ── */}
            <div>
              <label className={labelClass}><Users className="h-3.5 w-3.5 inline mr-1" />Modalità divisione</label>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {SPLIT_MODES.map(({ value, label, icon: Icon, desc }) => (
                  <button key={value} type="button" onClick={() => setSplitMode(value)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all"
                    style={splitMode === value
                      ? { background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.25)" }
                      : { background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)" }}>
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={splitMode === value
                        ? { background:"rgba(34,197,94,0.15)", color:"#22c55e" }
                        : { background:"rgba(255,255,255,0.05)", color:"#70707a" }}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: splitMode === value ? "#22c55e" : "#f0f0ee" }}>{label}</p>
                      <p className="text-[10px] truncate" style={{ color:"#70707a" }}>{desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* ── EQUAL: just show info ── */}
              {splitMode === "equal" && totalAmount > 0 && (
                <div className="p-3 rounded-xl space-y-1" style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)" }}>
                  {members.map(uid => (
                    <div key={uid} className="flex items-center justify-between">
                      <span className="text-xs text-[#a0a0a8]">{getUserName(uid)}</span>
                      <span className="text-xs font-bold tabular text-[#22c55e]">
                        {currSym}{(totalAmount / members.length).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* ── SELECT PARTICIPANTS ── */}
              {splitMode === "select" && (
                <div className="space-y-2">
                  <p className="text-xs text-[#70707a] mb-2">Seleziona chi partecipa a questa spesa:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {members.map(uid => (
                      <button key={uid} type="button" onClick={() => toggleParticipant(uid)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all"
                        style={selectedParticipants.includes(uid)
                          ? { background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.25)" }
                          : { background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)" }}>
                        <div className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={selectedParticipants.includes(uid) ? { background:"#22c55e", color:"#0a0a0b" } : { background:"rgba(255,255,255,0.06)", color:"#70707a" }}>
                          {getInitials(uid)}
                        </div>
                        <span className="text-sm truncate" style={{ color: selectedParticipants.includes(uid) ? "#22c55e" : "#a0a0a8" }}>
                          {getUserName(uid)}
                        </span>
                      </button>
                    ))}
                  </div>
                  {selectedParticipants.length > 0 && totalAmount > 0 && (
                    <div className="flex items-center justify-between px-4 py-2.5 rounded-xl mt-2"
                      style={{ background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.15)" }}>
                      <span className="text-xs text-[#70707a]">{selectedParticipants.length} persone · ciascuno</span>
                      <span className="text-sm font-bold tabular text-[#22c55e]">
                        {currSym}{(totalAmount / selectedParticipants.length).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* ── CUSTOM AMOUNTS ── */}
              {splitMode === "custom" && (
                <div className="space-y-2">
                  <p className="text-xs text-[#70707a] mb-2">Inserisci l'importo esatto per ogni persona:</p>
                  {members.map(uid => (
                    <div key={uid} className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background:"rgba(34,197,94,0.1)", color:"#22c55e" }}>
                        {getInitials(uid)}
                      </div>
                      <span className="text-sm text-[#a0a0a8] flex-1 truncate">{getUserName(uid)}</span>
                      <div className="relative w-28">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#505058]">{currSym}</span>
                        <input type="number" step="0.01" min="0" placeholder="0.00"
                          value={customAmounts[uid] || ""}
                          onChange={e => setCustomAmounts(prev => ({ ...prev, [uid]: e.target.value }))}
                          className="w-full h-9 pl-7 pr-3 rounded-xl text-sm text-[#f0f0ee] outline-none transition-all tabular
                            bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)]
                            focus:border-[#22c55e] focus:shadow-[0_0_0_2px_rgba(34,197,94,0.1)]"
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-4 py-2.5 rounded-xl mt-1"
                    style={customValid
                      ? { background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.15)" }
                      : { background:"rgba(249,115,22,0.06)", border:"1px solid rgba(249,115,22,0.2)" }}>
                    <span className="text-xs" style={{ color: customValid ? "#22c55e" : "#f97316" }}>
                      Totale inserito:
                    </span>
                    <span className="text-sm font-bold tabular" style={{ color: customValid ? "#22c55e" : "#f97316" }}>
                      {currSym}{customTotal.toFixed(2)} {!customValid && totalAmount > 0 && `/ ${currSym}${totalAmount.toFixed(2)}`}
                    </span>
                  </div>
                </div>
              )}

              {/* ── PERCENTAGE ── */}
              {splitMode === "percentage" && (
                <div className="space-y-2">
                  <p className="text-xs text-[#70707a] mb-2">Assegna la percentuale per ogni persona (totale 100%):</p>
                  {members.map(uid => (
                    <div key={uid} className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background:"rgba(34,197,94,0.1)", color:"#22c55e" }}>
                        {getInitials(uid)}
                      </div>
                      <span className="text-sm text-[#a0a0a8] flex-1 truncate">{getUserName(uid)}</span>
                      <div className="flex items-center gap-2">
                        {totalAmount > 0 && (parseFloat(percentages[uid] || "0") > 0) && (
                          <span className="text-xs tabular text-[#70707a] w-16 text-right">
                            {currSym}{(totalAmount * (parseFloat(percentages[uid]) / 100)).toFixed(2)}
                          </span>
                        )}
                        <div className="relative w-24">
                          <input type="number" step="0.1" min="0" max="100" placeholder="0"
                            value={percentages[uid] || ""}
                            onChange={e => setPercentages(prev => ({ ...prev, [uid]: e.target.value }))}
                            className="w-full h-9 pl-3 pr-7 rounded-xl text-sm text-[#f0f0ee] outline-none transition-all tabular
                              bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)]
                              focus:border-[#22c55e] focus:shadow-[0_0_0_2px_rgba(34,197,94,0.1)]"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#505058]">%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-4 py-2.5 rounded-xl mt-1"
                    style={percentValid
                      ? { background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.15)" }
                      : { background:"rgba(249,115,22,0.06)", border:"1px solid rgba(249,115,22,0.2)" }}>
                    <span className="text-xs" style={{ color: percentValid ? "#22c55e" : "#f97316" }}>
                      Totale percentuale:
                    </span>
                    <span className="text-sm font-bold tabular" style={{ color: percentValid ? "#22c55e" : "#f97316" }}>
                      {percentTotal.toFixed(1)}% {!percentValid && "/ 100%"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Receipt */}
            <div>
              <label className={labelClass}><Camera className="h-3.5 w-3.5 inline mr-1" />Scontrino (opzionale)</label>
              {receiptPreview ? (
                <div className="relative rounded-xl overflow-hidden" style={{ border:"1px solid rgba(255,255,255,0.08)" }}>
                  <img src={receiptPreview} alt="Scontrino" className="w-full max-h-32 object-cover" />
                  <button type="button" onClick={() => { setReceiptBase64(null); setReceiptPreview(null); }}
                    className="absolute top-2 right-2 h-7 w-7 rounded-lg flex items-center justify-center"
                    style={{ background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)", color:"#f0f0ee" }}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 h-12 rounded-xl cursor-pointer transition-all hover:border-[rgba(34,197,94,0.3)] hover:bg-[rgba(34,197,94,0.03)]"
                  style={{ background:"rgba(255,255,255,0.02)", border:"1px dashed rgba(255,255,255,0.12)" }}>
                  {receiptLoading ? <Loader2 className="h-4 w-4 animate-spin text-[#70707a]" /> : <Camera className="h-4 w-4 text-[#505058]" />}
                  <span className="text-sm text-[#505058]">{receiptLoading ? "Caricamento…" : "Carica foto scontrino"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleReceiptChange} disabled={receiptLoading} />
                </label>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 flex gap-3" style={{ borderTop:"1px solid rgba(255,255,255,0.07)" }}>
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[#a0a0a8] hover:text-[#f0f0ee] transition-all"
              style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}>
              Annulla
            </button>
            <button type="submit" disabled={loading || !isFormValid}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-[#0a0a0b] flex items-center justify-center gap-2 btn-glow disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              style={{ background:"#22c55e" }}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Receipt className="h-4 w-4" />Aggiungi</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
