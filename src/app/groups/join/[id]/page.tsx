"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function JoinGroupPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  
  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || !id) return;

    const fetchGroup = async () => {
      try {
        const docRef = doc(db, "groups", id as string);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const groupData = docSnap.data();
          if (groupData.members.includes(user.uid)) {
            // Already a member, redirect
            router.push(`/groups/${id}`);
            return;
          }
          setGroup({ id: docSnap.id, ...groupData });
        } else {
          setError("Group not found");
        }
      } catch (err) {
        console.error("Error fetching group:", err);
        setError("Failed to fetch group details.");
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
  }, [id, user, router]);

  const handleJoin = async () => {
    if (!user || !group) return;
    setJoining(true);
    try {
      const groupRef = doc(db, "groups", group.id);
      await updateDoc(groupRef, {
        members: arrayUnion(user.uid)
      });
      router.push(`/groups/${group.id}`);
    } catch (err) {
      console.error("Error joining group:", err);
      setError("Failed to join group. Please try again.");
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Navbar />
        <div className="flex h-[calc(100vh-64px)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="container mx-auto max-w-md px-4 py-16">
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto h-16 w-16 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-2xl mb-4">
              {group?.name?.substring(0, 2).toUpperCase() || "?"}
            </div>
            <CardTitle className="text-2xl">Join {group?.name}</CardTitle>
            <CardDescription>
              You've been invited to join this group to split expenses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {error}
              </div>
            ) : (
              <p className="text-gray-600">
                Click below to join and start adding expenses.
              </p>
            )}
          </CardContent>
          <CardFooter className="flex justify-center pb-8">
            <Button 
              size="lg" 
              className="w-full sm:w-auto" 
              onClick={handleJoin} 
              disabled={joining || !!error}
            >
              {joining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {joining ? "Joining..." : "Join Group"}
            </Button>
          </CardFooter>
        </Card>
      </main>
    </ProtectedRoute>
  );
}
