import React, { useEffect, useState } from 'react';
// import { User, SprayWall, Boulder, ContiBoucle } from "@/api/entities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Mountain, MapPin, Plus, Eye, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
// user management moved to dedicated page; Input/Label not needed here
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { User } from "@/api/entities";

/** Select and manage spray walls, including default selection and deletion. */
export default function SprayWallSelect() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, wall: null });
  // user management moved to dedicated page

  /** Load current user to show admin controls; redirect unauthenticated users. */
  useEffect(() => {
    const loadUser = async () => {
      try {
        const { User } = await import("@/api/entities");
        const currentUser = await User.me();
        setUser(currentUser);
      } catch (error) {
        const { User } = await import("@/api/entities");
        User.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  // Load all walls for selection cards
  const { data: sprayWalls = [], isLoading } = useQuery({
    queryKey: ['sprayWalls'],
    queryFn: async () => {
      const { SprayWall } = await import("@/api/entities");
      return SprayWall.list();
    },
  });

  // Load boulders for replaced holds warnings
  const { data: allBoulders = [] } = useQuery({
    queryKey: ['allBoulders'],
    queryFn: async () => {
      const { Boulder } = await import("@/api/entities");
      return Boulder.list();
    },
  });

  // Load boucles for replaced holds warnings
  const { data: allBoucles = [] } = useQuery({
    queryKey: ['allContiBoucles'],
    queryFn: async () => {
      const { ContiBoucle } = await import("@/api/entities");
      return ContiBoucle.list();
    },
  });

  const hasReplacedHolds = (sprayWallId) => {
    const items = [...allBoulders, ...allBoucles].filter(item => item.spray_wall_id === sprayWallId);
    return items.some(item => item.prise_remplacee);
  };

  // Set selected spray wall as current user's default
  const updateDefaultMutation = useMutation({
    mutationFn: async (sprayWallId) => {
      const { User } = await import("@/api/entities");
      await User.updateMe({ spray_wall_par_defaut: sprayWallId });
    },
    onSuccess: (_, sprayWallId) => {
      queryClient.invalidateQueries(['user']);
      setUser(prev => ({ ...prev, spray_wall_par_defaut: sprayWallId }));
      toast.success("Lieu de grimpe sélectionné");
      navigate(createPageUrl("Home"));
    },
  });

  const handleSelect = (sprayWallId) => {
    updateDefaultMutation.mutate(sprayWallId);
  };

  // Delete a spray wall (admin-only)
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { SprayWall } = await import("@/api/entities");
      return SprayWall.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprayWalls'] });
      toast.success('Lieu supprimé');
      setDeleteDialog({ open: false, wall: null });
    },
    onError: (err) => {
      console.error('Delete spraywall error:', err);
      toast.error('Erreur lors de la suppression');
    }
  });

  const handleDelete = (wall) => {
    setDeleteDialog({ open: true, wall });
  };

  const confirmDelete = () => {
    if (deleteDialog.wall) deleteMutation.mutate(deleteDialog.wall.id);
  };

  

  const canManage = (wall) => {
    return user?.is_global_admin || user?.username === wall.sous_admin_username;
  };

  const isAdmin = user?.is_global_admin;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-violet-50 to-purple-50 p-4">
      <div className="max-w-2xl mx-auto pt-6 pb-20">
        {user?.spray_wall_par_defaut && (
          <Link to={createPageUrl("Home")}>
            <Button variant="outline" className="mb-4 bg-purple-900 text-white border-purple-700 hover:bg-purple-800">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          </Link>
        )}

        <div className="text-center mb-8">
          <Mountain className="w-12 h-12 mx-auto mb-3 text-violet-600" />
          <h1 className="text-3xl font-black text-slate-900 mb-2">
            Sélectionner votre lieu
          </h1>
          <p className="text-gray-600">
            Choisissez votre salle de grimpe
          </p>
        </div>

        {isAdmin && (
          <Link to={createPageUrl("SprayWallCreate")}>
            <Button className="w-full mb-6 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg">
              <Plus className="w-5 h-5 mr-2" />
              Ajouter un nouveau lieu
            </Button>
          </Link>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-violet-600" />
          </div>
        ) : sprayWalls.length === 0 ? (
          <Card className="text-center p-8">
            <CardContent>
              <Mountain className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 mb-4">
                Aucun spray wall disponible
              </p>
              {isAdmin && (
                <Link to={createPageUrl("SprayWallCreate")}>
                  <Button className="bg-violet-600 hover:bg-violet-700">
                    Créer le premier
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sprayWalls.map((wall) => {
              const isDefault = user?.spray_wall_par_defaut === wall.id;
              const isSubAdmin = user?.username === wall.sous_admin_username;
              
              return (
                <Card 
                  key={wall.id}
                  className={`overflow-hidden hover:shadow-xl transition-all cursor-pointer ${
                    isDefault ? 'border-4 border-violet-500' : 'border-2 border-gray-200'
                  }`}
                  onClick={() => handleSelect(wall.id)}
                >
                  <CardContent className="p-0">
                    <div className="flex items-center">
                      {wall.photo_url ? (
                        <img 
                          src={wall.photo_url} 
                          alt={wall.nom}
                          className="w-32 h-32 object-cover"
                        />
                      ) : (
                        <div className="w-32 h-32 bg-gradient-to-br from-blue-400 to-violet-400 flex items-center justify-center">
                          <Mountain className="w-12 h-12 text-white" />
                        </div>
                      )}
                      <div className="flex-1 p-4">
                       <div className="flex items-start justify-between">
                         <div>
                           <h2 className="text-xl font-bold mb-1 flex items-center gap-2" style={{color: '#1a1a1a'}}>
                             {wall.nom}
                             {hasReplacedHolds(wall.id) && <span className="text-red-600 text-xl">⚠️</span>}
                           </h2>
                           <p className="text-sm flex items-center gap-1" style={{color: '#2a2a2a'}}>
                             <MapPin className="w-3 h-3" />
                             {wall.lieu}
                           </p>
                         </div>
                         <div className="flex items-center gap-2">
                           {isDefault && (
                             <Star className="w-6 h-6 text-violet-600 fill-violet-600" />
                           )}
                           {isAdmin && (
                             <Button
                               variant="ghost"
                               size="sm"
                                  aria-label={`Supprimer le lieu ${wall.nom}`}
                               onClick={(e) => {
                                 e.preventDefault();
                                 e.stopPropagation();
                                 handleDelete(wall);
                               }}
                               className="text-red-600 hover:bg-red-50 ml-2"
                             >
                               <Trash2 className="w-4 h-4" />
                             </Button>
                           )}
                         </div>
                       </div>
                       <div className="mt-2 flex gap-2 flex-wrap">
                         {hasReplacedHolds(wall.id) && (
                           <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                             ⚠️ Prises supprimées
                           </span>
                         )}
                         {isSubAdmin && (
                           <span className="text-xs bg-violet-100 text-violet-800 px-2 py-1 rounded">
                             Sous-admin
                           </span>
                         )}
                       </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        {/* User management moved to dedicated page */}
      
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, wall: deleteDialog.wall })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce lieu ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer "{deleteDialog.wall?.nom}" ? Cette action supprimera les données associées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* user delete dialog removed (moved to dedicated page) */}
      </div>
    </div>
  );
}