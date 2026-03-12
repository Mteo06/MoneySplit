"use client";

import { useAuth } from "@/lib/AuthContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProfilePage() {
  const { user, profile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
    }
  }, [profile]);

  const handleUpdate = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { name });
      setIsEditing(false);
      // To strictly follow React state, ideally AuthContext reloads, 
      // but for MVP we rely on re-mount or manual refresh.
    } catch (error) {
      console.error("Error updating profile", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="container mx-auto max-w-2xl px-4 py-8 pb-24 md:pb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Profile</h1>
        
        <Card>
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="text-2xl bg-indigo-100 text-indigo-700">
                {profile?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">{profile?.name || "User"}</CardTitle>
              <CardDescription>{user?.email}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {isEditing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Display Name</Label>
                  <Input 
                    id="name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleUpdate} disabled={loading}>
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setIsEditing(false);
                    setName(profile?.name || "");
                  }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={() => setIsEditing(true)} variant="outline">
                Edit Profile
              </Button>
            )}
          </CardContent>
        </Card>
      </main>
    </ProtectedRoute>
  );
}
