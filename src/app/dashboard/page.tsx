"use client";

import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, ArrowUpRight, ArrowDownRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const [totalBalance, setTotalBalance] = useState(0);
  const [groups, setGroups] = useState<any[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // In a real app, we'd fetch actual calculated balances from a subcollection or Cloud Function
  // For the MVP, we'll fetch groups the user belongs to and expenses to mock up the UI first.

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      try {
        // Fetch groups where user is a member
        const qGroups = query(collection(db, "groups"), where("members", "array-contains", user.uid));
        const groupsSnapshot = await getDocs(qGroups);
        const userGroups = groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setGroups(userGroups);

        // Fetch recent expenses in those groups
        if (userGroups.length > 0) {
          const groupIds = userGroups.map(g => g.id);
          const qExpenses = query(
            collection(db, "expenses"),
            where("group_id", "in", groupIds.slice(0, 10)), // Firestore limits 'in' to 10
            orderBy("created_at", "desc"),
            limit(5)
          );
          const expensesSnap = await getDocs(qExpenses);
          setRecentExpenses(expensesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }

        // Mock balance calculation for now
        setTotalBalance(125.50);
      } catch (error) {
        console.error("Error fetching dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="container mx-auto max-w-4xl px-4 py-8 pb-24 md:pb-8 space-y-8">
        {/* Total Balance Overview */}
        <section>
          <Card className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg border-0">
            <CardHeader className="pb-2">
              <CardDescription className="text-indigo-100 uppercase tracking-wider text-xs font-semibold">
                Total Balance
              </CardDescription>
              <div className="flex items-center justify-between">
                <CardTitle className="text-4xl font-bold">
                  {totalBalance >= 0 ? "+" : "-"}&euro;{Math.abs(totalBalance).toFixed(2)}
                </CardTitle>
                <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
                  {totalBalance >= 0 ? (
                    <ArrowUpRight className="h-6 w-6 text-green-300" />
                  ) : (
                    <ArrowDownRight className="h-6 w-6 text-red-300" />
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-indigo-100 mt-2">
                {totalBalance >= 0 ? "You are owed in total" : "You owe in total"}
              </p>
            </CardContent>
          </Card>
        </section>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Groups List */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Your Groups</h2>
              <Link href="/groups/new">
                <Button variant="outline" size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Group
                </Button>
              </Link>
            </div>
            
            {loading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-gray-200 rounded-xl"></div>
                ))}
              </div>
            ) : groups.length === 0 ? (
              <Card className="border-dashed shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
                    <Users className="h-6 w-6 text-indigo-500" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1">No groups yet</h3>
                  <p className="text-sm text-gray-500 mb-4">Create a group to start splitting expenses</p>
                  <Link href="/groups/new">
                    <Button>Create your first group</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {groups.map(group => (
                  <Link key={group.id} href={`/groups/${group.id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
                            {group.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{group.name}</h3>
                            <p className="text-sm text-gray-500">{group.members?.length || 1} members</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Recent Activity */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Recent Expenses</h2>
            {loading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-gray-200 rounded-xl"></div>
                ))}
              </div>
            ) : recentExpenses.length === 0 ? (
              <Card className="bg-gray-50 border-0 shadow-none">
                <CardContent className="py-8 text-center">
                  <p className="text-sm text-gray-500">No recent expenses found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {recentExpenses.map((expense) => (
                  <Card key={expense.id} className="shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <span className="text-lg">🍽️</span> {/* Replace with real category icon mapping later */}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{expense.description}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(expense.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">&euro;{expense.amount.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">paid by someone</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {groups.length > 0 && (
              <Button className="w-full mt-4" size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Add new expense
              </Button>
            )}
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
}
