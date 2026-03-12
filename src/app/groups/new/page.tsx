"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

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
        members: [user.uid], // The creator is obviously a member
        created_at: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "groups"), groupData);
      
      // Redirect to the newly created group's page
      router.push(`/groups/${docRef.id}`);
    } catch (err: any) {
      console.error("Error creating group:", err);
      setError("Failed to create group. Please try again.");
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="container mx-auto max-w-lg px-4 py-8 pb-24 md:pb-8">
        <div className="mb-6">
          <Link href="/groups" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Groups
          </Link>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Create a New Group</CardTitle>
            <CardDescription>
              Set up a group for your trip, apartment, or event to start tracking shared expenses.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleCreateGroup}>
            <CardContent className="space-y-6">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">Group Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Weekend in Paris, Apartment"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Default Currency</Label>
                <Select value={currency} onValueChange={(val) => val && setCurrency(val)} disabled={loading}>
                  <SelectTrigger id="currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">€ Euro (EUR)</SelectItem>
                    <SelectItem value="USD">$ US Dollar (USD)</SelectItem>
                    <SelectItem value="GBP">£ British Pound (GBP)</SelectItem>
                    <SelectItem value="CHF">Fr Swiss Franc (CHF)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  This will be the default currency for new expenses in this group.
                </p>
              </div>
            </CardContent>
            <CardFooter className="bg-gray-50 px-6 py-4 rounded-b-xl flex justify-end">
              <div className="flex gap-3 w-full sm:w-auto">
                <Link href="/groups" className="w-full sm:w-auto">
                  <Button type="button" variant="outline" className="w-full" disabled={loading}>
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" className="w-full sm:w-auto" disabled={loading || !name.trim()}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Group
                </Button>
              </div>
            </CardFooter>
          </form>
        </Card>
      </main>
    </ProtectedRoute>
  );
}
