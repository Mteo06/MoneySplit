"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, getDocs, collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArrowLeft, Plus, Receipt, Info, Users, Link as LinkIcon } from "lucide-react";
import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AddExpenseModal } from "@/components/expenses/AddExpenseModal";
import { simplifyDebts, SettlementTransaction } from "@/utils/settlementAlgorithm";

export default function GroupDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [group, setGroup] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  useEffect(() => {
    if (!user || !id) return;

    const fetchGroup = async () => {
      try {
        const docRef = doc(db, "groups", id as string);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const groupData = docSnap.data();
          // Check if user is a member
          if (!groupData.members.includes(user.uid)) {
            router.push("/groups");
            return;
          }
          setGroup({ id: docSnap.id, ...groupData });
        } else {
          router.push("/groups");
          return;
        }
      } catch (error) {
        console.error("Error fetching group details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();

    // Listen to expenses for this group
    const q = query(
      collection(db, "expenses"),
      where("group_id", "==", id),
      orderBy("created_at", "desc")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const expensesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExpenses(expensesList);

      // Fetch participants for these expenses
      if (expensesList.length > 0) {
        const expenseIds = expensesList.map(e => e.id);
        
        // Firestore 'in' has a 10 item limit. In production, we'd batch queries.
        const chunkedExpenseIds = [];
        for (let i = 0; i < expenseIds.length; i += 10) {
          chunkedExpenseIds.push(expenseIds.slice(i, i + 10));
        }

        let allParticipants: any[] = [];
        for (const chunk of chunkedExpenseIds) {
          const qPart = query(collection(db, "expense_participants"), where("expense_id", "in", chunk));
          const pSnap = await getDoc(collection(db, "expense_participants") as any).catch(() => null); // Dummy catch
          // We can't use onSnapshot in a loop elegantly here, so we'll just fetch once per update
          const pSnapshot = await getDocs(qPart);
          allParticipants = [...allParticipants, ...pSnapshot.docs.map((doc: any) => doc.data())];
        }
        setParticipants(allParticipants);
      }
    });

    // Also fetch basic user details to display names
    const fetchUsers = async () => {
      // In a real app we would cache this or query by member IDs
      const qUsers = query(collection(db, "users"));
      const uSnap = await getDocs(qUsers);
      const uMap: Record<string, any> = {};
      uSnap.docs.forEach((doc: any) => { uMap[doc.id] = doc.data(); });
      setUsersMap(uMap);
    };
    fetchUsers();

    return () => unsubscribe();
  }, [id, user, router]);

  if (loading) {
    return (
      <ProtectedRoute>
        <Navbar />
        <div className="flex h-[calc(100vh-64px)] items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!group) return null;

  const totalGroupExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Calculate balances
  const balancesMap: Record<string, number> = {};
  group.members.forEach((uid: string) => { balancesMap[uid] = 0; });

  expenses.forEach(exp => {
    if (balancesMap[exp.paid_by] !== undefined) {
      balancesMap[exp.paid_by] += exp.amount;
    }
  });

  participants.forEach(p => {
    if (balancesMap[p.user_id] !== undefined) {
      balancesMap[p.user_id] -= p.share_amount;
    }
  });

  const balancesArray = Object.keys(balancesMap).map(uid => ({
    userId: uid,
    amount: balancesMap[uid]
  }));

  const settlements = simplifyDebts(balancesArray);

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="container mx-auto max-w-4xl px-4 py-6 pb-24 md:pb-8 space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/groups" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
          <div className="flex space-x-2">
            <Dialog>
              <DialogTrigger>
                <div className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-3 text-xs hidden sm:flex">
                  <LinkIcon className="h-4 w-4" />
                  Invite friends
                </div>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite to {group.name}</DialogTitle>
                  <DialogDescription>
                    Share this link with your friends to let them join the group.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex items-center space-x-2 mt-4">
                  <Input 
                    readOnly 
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/groups/join/${group.id}`} 
                  />
                  <Button onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/groups/join/${group.id}`);
                    alert("Copied to clipboard!");
                  }}>Copy</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button className="gap-2" onClick={() => setIsAddExpenseOpen(true)}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Expense</span>
            </Button>
          </div>
        </div>

        <section className="bg-white rounded-2xl p-6 shadow-sm border flex flex-col items-center text-center space-y-2">
          <div className="h-16 w-16 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-2xl shadow-inner mb-2">
            {group.name.substring(0, 2).toUpperCase()}
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{group.name}</h1>
          <p className="text-gray-500">{group.members.length} members &middot; Total spent: {(totalGroupExpenses).toFixed(2)} {group.currency}</p>
        </section>

        <Tabs defaultValue="expenses" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-sm mx-auto mb-6">
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="balances">Balances</TabsTrigger>
            <TabsTrigger value="settle">Settle Up</TabsTrigger>
          </TabsList>

          <TabsContent value="expenses" className="space-y-4">
            {expenses.length === 0 ? (
              <Card className="border-dashed shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <Receipt className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1">No expenses yet</h3>
                  <p className="text-sm text-gray-500 mb-4 max-w-xs">
                    Start tracking your shared purchases by adding an expense.
                  </p>
                  <Button>Add your first expense</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {expenses.map((expense) => (
                  <Card key={expense.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex gap-4 items-center">
                        <div className="h-10 w-10 min-w-10 rounded-full bg-slate-100 flex items-center justify-center text-xl">
                          {expense.category === 'Food' ? '🍔' : '💸'}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 leading-none mb-1">{expense.description}</h4>
                          <div className="flex items-center text-xs text-gray-500 gap-2">
                            <span>{new Date(expense.created_at?.toDate() || Date.now()).toLocaleDateString()}</span>
                            <span>&middot;</span>
                            <span>Paid by {expense.paid_by === user?.uid ? 'you' : 'someone'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-lg">{Number(expense.amount).toFixed(2)}</span>
                        <span className="text-xs text-gray-500 ml-1 block">{expense.currency}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="balances" className="space-y-4">
            {balancesArray.map((balance) => {
              const userName = usersMap[balance.userId]?.name || "Unknown User";
              const isUser = balance.userId === user?.uid;
              const isOwed = balance.amount > 0.01;
              const owes = balance.amount < -0.01;
              
              if (Math.abs(balance.amount) < 0.01) return null;

              return (
                <Card key={balance.userId}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-gray-500">
                        {userName.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">
                        {isUser ? "You" : userName}
                      </span>
                    </div>
                    <div className={`text-right ${isOwed ? 'text-green-600' : 'text-red-600'}`}>
                      <span className="font-semibold text-sm block">
                        {isOwed ? "gets back" : "owes"}
                      </span>
                      <span className="font-bold text-lg">
                        {Math.abs(balance.amount).toFixed(2)} {group.currency}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            
            {balancesArray.every(b => Math.abs(b.amount) < 0.01) && (
              <Card>
                <CardContent className="py-12 flex flex-col items-center justify-center text-center text-gray-500">
                  <Users className="h-12 w-12 text-gray-300 mb-4" />
                  <p>Everyone is settled up.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="settle" className="space-y-4">
            {settlements.map((tx, idx) => {
              const fromName = usersMap[tx.from]?.name || "Unknown User";
              const toName = usersMap[tx.to]?.name || "Unknown User";
              const isFromMe = tx.from === user?.uid;
              const isToMe = tx.to === user?.uid;

              return (
                <Card key={idx}>
                  <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center text-center sm:text-left gap-2 w-full">
                      <span className={`font-semibold ${isFromMe ? 'text-red-600' : 'text-gray-900'}`}>
                        {isFromMe ? "You" : fromName}
                      </span>
                      <span className="text-gray-500">pays</span>
                      <span className={`font-semibold ${isToMe ? 'text-green-600' : 'text-gray-900'}`}>
                        {isToMe ? "you" : toName}
                      </span>
                    </div>
                    <div className="font-bold text-xl bg-gray-100 px-4 py-2 rounded-lg">
                      {tx.amount.toFixed(2)} {group.currency}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {settlements.length === 0 && (
              <Card>
                <CardContent className="py-12 flex flex-col items-center justify-center text-center text-gray-500">
                  <Info className="h-12 w-12 text-gray-300 mb-4" />
                  <p>No settlements needed right now.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
        
        {group && (
          <AddExpenseModal
            groupId={group.id}
            groupCurrency={group.currency}
            members={group.members}
            isOpen={isAddExpenseOpen}
            onClose={() => setIsAddExpenseOpen(false)}
          />
        )}
      </main>
    </ProtectedRoute>
  );
}
