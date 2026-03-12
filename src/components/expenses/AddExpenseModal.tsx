"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import { Loader2 } from "lucide-react";

interface AddExpenseModalProps {
  groupId: string;
  groupCurrency: string;
  isOpen: boolean;
  onClose: () => void;
  members: string[]; // List of user IDs in the group (for participants)
}

export function AddExpenseModal({ groupId, groupCurrency, isOpen, onClose, members }: AddExpenseModalProps) {
  const { user } = useAuth();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Other");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const categories = ["Food", "Travel", "Transport", "Accommodation", "Shopping", "Entertainment", "Other"];

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || parseFloat(amount) <= 0 || !user) return;

    setLoading(true);
    setError("");

    try {
      const expenseAmount = parseFloat(amount);
      const splitAmount = expenseAmount / members.length; // Default to equal split for MVP

      // Create the expense document
      const docRef = await addDoc(collection(db, "expenses"), {
        group_id: groupId,
        description,
        amount: expenseAmount,
        currency: groupCurrency,
        category,
        paid_by: user.uid,
        created_at: serverTimestamp(),
      });

      // Create participant shares (equal split)
      const participantsPromises = members.map((memberId) => 
        addDoc(collection(db, "expense_participants"), {
          expense_id: docRef.id,
          user_id: memberId,
          share_amount: splitAmount,
        })
      );

      await Promise.all(participantsPromises);

      // Reset & Close
      setDescription("");
      setAmount("");
      setCategory("Other");
      onClose();
    } catch (err) {
      console.error("Error adding expense:", err);
      setError("Failed to add expense.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add an Expense</DialogTitle>
          <DialogDescription>
            Enter the details of the expense. Currently defaults to an equal split among all members.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleAddExpense} className="space-y-4 py-4">
          {error && <div className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</div>}
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Dinner, Taxi, Groceries..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount taking {groupCurrency}</Label>
              <div className="relative">
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
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={(val) => val && setCategory(val)} disabled={loading}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !description || !amount}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Expense
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
