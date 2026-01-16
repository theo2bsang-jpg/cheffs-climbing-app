import React, { useState, useEffect } from 'react';
// import { Boulder, ContiBoucle, Hold, User } from "@/api/entities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, User as UserIcon, AlertTriangle, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import LevelBadge from '../components/shared/LevelBadge';
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { User } from "@/api/entities";

/** Show boulders/boucles for a wall at a given grade with admin delete actions. */
export default function BoulderList() {
  const urlParams = new URLSearchParams(window.location.search);
  const sprayWallId = urlParams.get('spraywall');
  const niveau = urlParams.get('niveau');
  const type = urlParams.get('type');

  // Query boulders scoped by wall and grade
  const { data: boulders = [] } = useQuery({
    queryKey: ['boulders', sprayWallId, niveau],
    queryFn: async () => {
      const { Boulder } = await import("@/api/entities");
      return Boulder.filter({ spray_wall_id: sprayWallId, niveau });
    },
    enabled: !!sprayWallId && !!niveau && (!type || type === 'boulder'),
  });

  // Query conti boucles scoped by wall and grade
  const { data: boucles = [] } = useQuery({
    queryKey: ['contiBoucles', sprayWallId, niveau],
    queryFn: async () => {
      const { ContiBoucle } = await import("@/api/entities");
      return ContiBoucle.filter({ spray_wall_id: sprayWallId, niveau });
    },
    enabled: !!sprayWallId && !!niveau && (!type || type === 'boucle'),
  });

  // Load holds to flag missing/replaced holds
  const { data: allHolds = [] } = useQuery({
    queryKey: ['holds', sprayWallId],
    queryFn: async () => {
      const { Hold } = await import("@/api/entities");
      return Hold.filter({ spray_wall_id: sprayWallId });
    },
    enabled: !!sprayWallId,
  });

  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, label: null, type: null });

  /** Load user to gate admin-only delete actions. */
  useEffect(() => {
    const loadUser = async () => {
      try {
        const { User } = await import("@/api/entities");
        const current = await User.me();
        if (!current) {
          User.redirectToLogin();
          return;
        }
        setUser(current);
      } catch {
        const { User } = await import("@/api/entities");
        User.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  // Admin-only boulder deletion
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { Boulder } = await import("@/api/entities");
      await Boulder.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['boulders']);
      toast.success('Bloc supprimé');
      setDeleteDialog({ open: false, id: null, label: null });
    },
    onError: (err) => {
      toast.error('Erreur lors de la suppression');
      setDeleteDialog({ open: false, id: null, label: null });
    }
  });

  // Admin-only conti boucle deletion
  const deleteBoucleMutation = useMutation({
    mutationFn: async (id) => {
      const { ContiBoucle } = await import("@/api/entities");
      await ContiBoucle.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['contiBoucles']);
      toast.success('Boucle supprimée');
      setDeleteDialog({ open: false, id: null, label: null });
    },
    onError: (err) => {
      toast.error('Erreur lors de la suppression');
      setDeleteDialog({ open: false, id: null, label: null });
    }
  });

  const canDelete = user && user.is_global_admin;

  const hasDeletedHolds = (item) => {
    return item.holds.some(hold => !allHolds.find(h => h.id === hold.hold_id));
  };

  // If user is not loaded (null), block rendering (avoid navigation flicker)
  if (user === null) {
    return null;
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-2xl mx-auto pt-6 pb-20">
        <Link to={createPageUrl("BoulderCatalog") + `?spraywall=${sprayWallId}`}>
          <Button variant="outline" className="mb-4 bg-purple-900 text-white border-purple-700 hover:bg-purple-800">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour au catalogue
          </Button>
        </Link>

        <div className="mb-6">
          <h1 className="sr-only">Liste des blocs et boucles</h1>
          <div className="flex items-center gap-2 mb-2">
            {type === 'boucle' ? '🔁' : type === 'boulder' ? '🧗' : ''}
            <LevelBadge niveau={niveau} className="text-2xl px-4 py-2" />
          </div>
          <p className="text-gray-600 mt-2">
            {type === 'boucle' 
              ? `${boucles.length} boucle${boucles.length > 1 ? 's' : ''}`
              : type === 'boulder'
              ? `${boulders.length} bloc${boulders.length > 1 ? 's' : ''}`
              : `${boulders.length + boucles.length} résultat${boulders.length + boucles.length > 1 ? 's' : ''}`
            }
          </p>
        </div>

        <div className="space-y-3">
          {(!type || type === 'boulder') && boulders.map(boulder => (
            <Card key={boulder.id} className="hover:shadow-lg transition-all border-2">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link 
                    to={createPageUrl("BoulderView") + `?id=${boulder.id}`}
                    className="flex-1 cursor-pointer"
                    aria-label={`Voir le bloc ${boulder.nom}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="text-lg font-bold text-black">
                        {boulder.nom}
                      </h2>
                      {(boulder.prise_remplacee || hasDeletedHolds(boulder)) && (
                        <span className="text-red-600 text-xl">⚠️</span>
                      )}
                    </div>
                    <p className="text-sm text-black flex items-center gap-1">
                      <UserIcon className="w-3 h-3" />
                      {boulder.ouvreur}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {!!boulder.match_autorise && (
                        <Badge variant="outline" className="text-xs">
                          Match OK
                        </Badge>
                      )}
                      {!!boulder.pied_sur_main_autorise && (
                        <Badge variant="outline" className="text-xs">
                          Pied/Main OK
                        </Badge>
                      )}
                    </div>
                  </Link>
                  <div className="flex flex-col gap-2 items-end">
                    <Badge className="bg-blue-100 text-blue-800">
                      Bloc
                    </Badge>
                    <div className="flex gap-2">
                      <Link 
                        to={createPageUrl("BoulderEdit") + `?id=${boulder.id}`}
                        aria-label={`Modifier le bloc ${boulder.nom}`}
                      >
                        <Button variant="outline" size="sm" aria-label={`Modifier le bloc ${boulder.nom}`}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                      {canDelete && (
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          aria-label={`Supprimer le bloc ${boulder.nom}`}
                          onClick={() => setDeleteDialog({ open: true, id: boulder.id, label: boulder.nom, type: 'boulder' })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {(!type || type === 'boucle') && boucles.map(boucle => (
            <Card key={boucle.id} className="hover:shadow-lg transition-all border-4 border-yellow-300 bg-card text-card-foreground rounded-xl">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link 
                    to={createPageUrl("ContiBoucleView") + `?id=${boucle.id}`}
                    className="flex-1 cursor-pointer"
                    aria-label={`Voir la boucle ${boucle.nom}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="text-lg font-bold text-black">
                        {boucle.nom}
                      </h2>
                      {(boucle.prise_remplacee || hasDeletedHolds(boucle)) && (
                        <span className="text-red-600 text-xl">⚠️</span>
                      )}
                    </div>
                    <p className="text-sm text-black flex items-center gap-1">
                      <UserIcon className="w-3 h-3" />
                      {boucle.ouvreur}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {!!boucle.match_autorise && (
                        <Badge variant="outline" className="text-xs">
                          Match OK
                        </Badge>
                      )}
                      {!!boucle.pied_sur_main_autorise && (
                        <Badge variant="outline" className="text-xs">
                          Pied/Main OK
                        </Badge>
                      )}
                    </div>
                  </Link>
                  <div className="flex flex-col gap-2 items-end">
                    <Badge className="bg-yellow-100 text-yellow-800">
                      Boucle
                    </Badge>
                    <div className="flex gap-2">
                      <Link 
                        to={createPageUrl("ContiBoucleEdit") + `?id=${boucle.id}`}
                        aria-label={`Modifier la boucle ${boucle.nom}`}
                      >
                        <Button variant="outline" size="sm" aria-label={`Modifier la boucle ${boucle.nom}`}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                      {canDelete && (
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          aria-label={`Supprimer la boucle ${boucle.nom}`}
                          onClick={() => setDeleteDialog({ open: true, id: boucle.id, label: boucle.nom, type: 'boucle' })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog(d => ({ ...d, open }))}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {deleteDialog.type === 'boucle' ? 'Supprimer la boucle ?' : 'Supprimer le bloc ?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                Voulez-vous vraiment supprimer "{deleteDialog.label}" ? Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => deleteDialog.type === 'boucle' ? deleteBoucleMutation.mutate(deleteDialog.id) : deleteMutation.mutate(deleteDialog.id)} 
                className="bg-red-600 hover:bg-red-700"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}