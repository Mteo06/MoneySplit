"use client";

import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";

export default function GroupsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGroups = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, "groups"), where("members", "array-contains", user.uid));
        const querySnapshot = await getDocs(q);
        const userGroups = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setGroups(userGroups);
      } catch (error) {
        console.error("Error fetching groups", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, [user]);

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="container mx-auto max-w-3xl px-4 py-8 pb-24 md:pb-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Your Groups</h1>
          <Link href="/groups/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Group</span>
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <Card className="border-dashed shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-indigo-500" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No groups yet</h2>
              <p className="text-gray-500 mb-6 max-w-sm">
                Groups are where you track shared expenses. Create one for your apartment, a trip, or friends.
              </p>
              <Link href="/groups/new">
                <Button size="lg">Create a Group</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {groups.map(group => (
              <Link key={group.id} href={`/groups/${group.id}`}>
                <Card className="hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="h-14 w-14 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xl">
                        {group.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">{group.name}</h3>
                        <p className="text-sm text-gray-500">{group.members?.length || 1} members</p>
                      </div>
                    </div>
                    <div className="pt-4 border-t flex justify-between items-center">
                      <span className="text-sm text-gray-500">Group balance</span>
                      {/* Temporary mock balance display */}
                      <span className="text-sm font-medium text-gray-900">Settled up</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </ProtectedRoute>
  );
}
