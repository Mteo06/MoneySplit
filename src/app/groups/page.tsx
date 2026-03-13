"use client";

import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Plus, Users, ArrowUpRight, LogOut } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, updateDoc, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from "@/components/ui/dialog";

const GROUP_GRADIENTS = [
  "from-violet-500 to-indigo-600",
  "from-indigo-500 to-blue-600",
  "from-fuchsia-500 to-pink-600",
  "from-orange-500 to-rose-500",
  "from-emerald-500 to-teal-600",
  "from-cyan-500 to-blue-600",
];

export default function GroupsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupToLeave, setGroupToLeave] = useState<any>(null);
  const [leaveLoading, setLeaveLoading] = useState(false);

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

  const handleLeaveGroup = async () => {
    if (!groupToLeave || !user) return;
    setLeaveLoading(true);
    try {
      await updateDoc(doc(db, "groups", groupToLeave.id), {
        members: arrayRemove(user.uid),
      });
      setGroups(prev => prev.filter(g => g.id !== groupToLeave.id));
      setGroupToLeave(null);
    } catch (error) {
      console.error("Error leaving group:", error);
    } finally {
      setLeaveLoading(false);
    }
  };

  const isAdmin = (group: any) => group.created_by === user?.uid;

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="container mx-auto max-w-3xl px-4 py-6 pb-32 md:pb-10 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">I tuoi Gruppi</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {groups.length} gruppo{groups.length !== 1 ? "i" : ""} attivo{groups.length !== 1 ? "i" : ""}
            </p>
          </div>
          <Link href="/groups/new">
            <Button className="gap-2 rounded-xl shadow-md shadow-primary/20">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nuovo Gruppo</span>
              <span className="sm:hidden">Nuovo</span>
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-36 rounded-3xl bg-gradient-to-br from-muted via-muted/60 to-muted animate-pulse" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="bg-card border border-border/60 rounded-3xl p-10 flex flex-col items-center text-center gap-4 shadow-sm mt-4">
            <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center">
              <Users className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1">Nessun gruppo ancora</h2>
              <p className="text-muted-foreground text-sm max-w-xs">
                I gruppi ti permettono di tracciare le spese condivise. Creane uno per il tuo appartamento, viaggio o amici.
              </p>
            </div>
            <Link href="/groups/new">
              <Button size="lg" className="rounded-2xl px-8 shadow-md shadow-primary/20">
                Crea un Gruppo
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {groups.map((group, idx) => {
              const gradient = GROUP_GRADIENTS[idx % GROUP_GRADIENTS.length];
              const canLeave = !isAdmin(group);
              return (
                <div key={group.id} className="relative group">
                  <Link href={`/groups/${group.id}`}>
                    <div className="relative overflow-hidden bg-card border border-border/60 rounded-3xl p-6 cursor-pointer card-hover transition-all duration-200 shadow-sm hover:shadow-xl h-full">
                      {/* Gradient decoration */}
                      <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br ${gradient} opacity-15 blur-xl`} />

                      <div className="relative z-10">
                        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-lg shadow-lg mb-4`}>
                          {group.name.substring(0, 2).toUpperCase()}
                        </div>
                        <h3 className="font-bold text-foreground text-lg leading-tight pr-8">{group.name}</h3>
                        <p className="text-muted-foreground text-sm mt-1">
                          {group.members?.length || 1} membro{(group.members?.length || 1) !== 1 ? "i" : ""}
                        </p>

                        <div className="mt-4 pt-4 border-t border-border/60 flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Valuta</span>
                          <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                            {group.currency}
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* Quick Leave button – only for non-admin members */}
                  {canLeave && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setGroupToLeave(group);
                      }}
                      className="absolute top-3 right-3 z-20 h-8 w-8 rounded-xl bg-background/80 backdrop-blur-sm border border-border/60 flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30 transition-all opacity-0 group-hover:opacity-100"
                      title="Abbandona gruppo"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Confirm Leave Dialog */}
      <Dialog open={!!groupToLeave} onOpenChange={(o) => !o && setGroupToLeave(null)}>
        <DialogContent className="rounded-3xl sm:max-w-sm">
          <DialogHeader>
            <div className="h-12 w-12 rounded-2xl bg-red-500/10 flex items-center justify-center mb-3">
              <LogOut className="h-6 w-6 text-red-500" />
            </div>
            <DialogTitle>Abbandona gruppo</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler abbandonare <strong>"{groupToLeave?.name}"</strong>?
              Dovrai essere reinvitato per rientrare.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-2">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => setGroupToLeave(null)}
              disabled={leaveLoading}
            >
              Annulla
            </Button>
            <Button
              className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 text-white"
              onClick={handleLeaveGroup}
              disabled={leaveLoading}
            >
              {leaveLoading && <span className="mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />}
              Abbandona
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}
