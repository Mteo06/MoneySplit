"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import { compressImageToBase64 } from "@/utils/imageUtils";
import { Loader2, Receipt, Users, User, Camera, X, ImageIcon } from "lucide-react";

interface AddExpenseModalProps {
  groupId: string;
  groupCurrency: string;
  isOpen: boolean;
  onClose: () => void;
  members: string[];
  usersMap: Record<string, any>;
}

const CATEGORIES = [
  { value: "Cibo", emoji: "🍔" },
  { value: "Viaggio", emoji: "✈️" },
  { value: "Trasporto", emoji: "🚗" },
  { value: "Alloggio", emoji: "🏨" },
  { value: "Shopping", emoji: "🛍️" },
  { value: "Intrattenimento", emoji: "🎬" },
  { value: "Altro", emoji: "💸" },
];

export function AddExpenseModal({
  groupId, groupCurrency, isOpen, onClose, members, usersMap
}: AddExpenseModalProps) {
  const { user } = useAuth();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Altro");
  const [paidBy, setPaidBy] = useState(user?.uid || "");
  const [splitMode, setSplitMode] = useState<"all" | "custom">("all");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(members);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getUserName = (uid: string) => {
    if (uid === user?.uid) return "Tu";
    return usersMap[uid]?.name || usersMap[uid]?.email?.split("@")[0] || "Utente";
  };

  const getInitials = (uid: string) => {
    const name = getUserName(uid);
    return name === "Tu" ? "T" : name.charAt(0).toUpperCase();
  };

  const toggleParticipant = (uid: string) => {
    setSelectedParticipants(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleReceiptChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      setError("Il file è troppo grande. Massimo 15 MB.");
      return;
    }
    setReceiptLoading(true);
    setError("");
    try {
      const base64 = await compressImageToBase64(file, 800, 800, 0.75);
      setReceiptBase64(base64);
      setReceiptPreview(base64);
    } catch {
      setError("Errore nel caricamento dell'immagine. Riprova.");
    } finally {
      setReceiptLoading(false);
    }
  };

  const removeReceipt = () => {
    setReceiptBase64(null);
    setReceiptPreview(null);
  };

  const activeParticipants = splitMode === "all" ? members : selectedParticipants;
  const splitAmount = activeParticipants.length > 0
    ? parseFloat(amount || "0") / activeParticipants.length
    : 0;

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || parseFloat(amount) <= 0 || !user) return;
    if (activeParticipants.length === 0) {
      setError("Seleziona almeno un partecipante.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const expenseAmount = parseFloat(amount);
      const shareAmount = expenseAmount / activeParticipants.length;

      const docRef = await addDoc(collection(db, "expenses"), {
        group_id: groupId,
        description,
        amount: expenseAmount,
        currency: groupCurrency,
        category,
        paid_by: paidBy || user.uid,
        receipt_base64: receiptBase64 || null,
        created_at: serverTimestamp(),
      });

      const participantsPromises = activeParticipants.map((memberId) =>
        addDoc(collection(db, "expense_participants"), {
          expense_id: docRef.id,
          user_id: memberId,
          share_amount: shareAmount,
        })
      );
      await Promise.all(participantsPromises);

      // Reset
      setDescription("");
      setAmount("");
      setCategory("Altro");
      setPaidBy(user.uid);
      setSplitMode("all");
      setSelectedParticipants(members);
      setReceiptBase64(null);
      setReceiptPreview(null);
      onClose();
    } catch (err: any) {
      console.error("Error adding expense:", err);
      setError(`Errore durante il salvataggio: ${err?.message || "Riprova."}`);
    } finally {
      setLoading(false);
    }
  };

  const selectedCategory = CATEGORIES.find(c => c.value === category);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] rounded-3xl p-0 overflow-hidden gap-0">
        {/* Header */}
        <div className="gradient-hero px-6 pt-6 pb-8 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
          <DialogHeader className="relative z-10">
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-white text-lg font-bold">Aggiungi Spesa</DialogTitle>
                <DialogDescription className="text-white/70 text-xs mt-0">
                  Registra una spesa condivisa nel gruppo
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <form onSubmit={handleAddExpense}>
          <div className="px-6 py-5 space-y-4 max-h-[62vh] overflow-y-auto">
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-xl">
                {error}
              </div>
            )}

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-sm font-semibold">Descrizione</Label>
              <Input
                id="description"
                placeholder="Cena, Taxi, Spesa al supermercato..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                required
                className="h-11 rounded-xl border-border/60"
              />
            </div>

            {/* Amount + Category */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="amount" className="text-sm font-semibold">Importo ({groupCurrency})</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={loading}
                  required
                  className="h-11 rounded-xl border-border/60"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-sm font-semibold">Categoria</Label>
                <Select value={category} onValueChange={(val) => val && setCategory(val)} disabled={loading}>
                  <SelectTrigger id="category" className="h-11 rounded-xl border-border/60">
                    <SelectValue>
                      <span>{selectedCategory?.emoji} {category}</span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value} className="rounded-xl">
                        <span className="mr-2">{cat.emoji}</span>{cat.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Who paid */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                <User className="h-4 w-4 text-muted-foreground" />
                Chi ha pagato
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {members.map((uid) => (
                  <button
                    key={uid}
                    type="button"
                    onClick={() => setPaidBy(uid)}
                    disabled={loading}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      paidBy === uid
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 bg-background hover:bg-muted text-foreground"
                    }`}
                  >
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      paidBy === uid ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      {getInitials(uid)}
                    </div>
                    <span className="truncate">{getUserName(uid)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Split with */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                <Users className="h-4 w-4 text-muted-foreground" />
                Dividi con
              </Label>
              <div className="flex gap-2 p-1 bg-muted/60 rounded-xl">
                <button
                  type="button"
                  onClick={() => { setSplitMode("all"); setSelectedParticipants(members); }}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${
                    splitMode === "all"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Tutti ({members.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSplitMode("custom")}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${
                    splitMode === "custom"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Personalizzato
                </button>
              </div>

              {splitMode === "custom" && (
                <div className="grid grid-cols-2 gap-2">
                  {members.map((uid) => {
                    const isSelected = selectedParticipants.includes(uid);
                    return (
                      <button
                        key={uid}
                        type="button"
                        onClick={() => toggleParticipant(uid)}
                        disabled={loading}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/60 bg-background text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected ? "border-primary bg-primary" : "border-border"
                        }`}>
                          {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                        </div>
                        <div className="h-6 w-6 rounded-lg bg-muted flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {getInitials(uid)}
                        </div>
                        <span className="truncate">{getUserName(uid)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {splitMode === "custom" && selectedParticipants.length === 0 && (
                <p className="text-xs text-destructive">Seleziona almeno un partecipante.</p>
              )}
            </div>

            {/* Receipt photo */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                <Camera className="h-4 w-4 text-muted-foreground" />
                Foto scontrino <span className="text-muted-foreground font-normal">(opzionale)</span>
              </Label>

              {receiptPreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={receiptPreview}
                    alt="Anteprima scontrino"
                    className="w-full max-h-48 object-contain"
                  />
                  <button
                    type="button"
                    onClick={removeReceipt}
                    className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="receipt-upload"
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                    receiptLoading
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/60 hover:border-primary/40 hover:bg-primary/5"
                  }`}
                >
                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                    {receiptLoading
                      ? <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                      : <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    }
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">
                      {receiptLoading ? "Elaborazione..." : "Carica foto scontrino"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, HEIC · Compressa automaticamente</p>
                  </div>
                  <input
                    id="receipt-upload"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    onChange={handleReceiptChange}
                    disabled={loading || receiptLoading}
                  />
                </label>
              )}
            </div>

            {/* Split preview */}
            {amount && parseFloat(amount) > 0 && activeParticipants.length > 0 && (
              <div className="bg-primary/5 border border-primary/15 rounded-xl p-3 text-sm">
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide mb-1">Riepilogo</p>
                <p className="text-foreground font-medium">
                  Ciascuno dei {activeParticipants.length} partecipanti paga{" "}
                  <span className="font-bold text-primary">
                    {splitAmount.toFixed(2)} {groupCurrency}
                  </span>
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 pb-6 flex gap-3 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading || receiptLoading}
              className="flex-1 rounded-xl"
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={loading || receiptLoading || !description || !amount || (splitMode === "custom" && selectedParticipants.length === 0)}
              className="flex-1 rounded-xl shadow-md shadow-primary/20"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Salvataggio..." : "Salva Spesa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
