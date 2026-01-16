import React, { useState, useEffect } from 'react';
// import { BelleOuverture, User } from "@/api/entities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Mountain, Search, Plus, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import LevelBadge from '../components/shared/LevelBadge';
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

const niveaux = ["4a", "4b", "4c", "5a", "5b", "5c", "6a", "6a+", "6b", "6b+", "6c", "6c+", "7a", "7a+", "7b", "7b+", "7c", "7c+", "8a", "8a+", "8b", "8b+", "8c", "8c+", "9a", "9a+", "9b", "9b+", "9c"];

/** Catalog of belles ouvertures by spray wall with search and admin delete. */
export default function BelleOuvertureCatalog() {
  const urlParams = new URLSearchParams(window.location.search);
  const sprayWallId = urlParams.get('spraywall');
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, ouverture: null });
  const queryClient = useQueryClient();

  /** Fetch current user to enable admin-only controls. */
  useEffect(() => {
    const loadUser = async () => {
      try {
        const { User } = await import("@/api/entities");
        const currentUser = await User.me();
        setUser(currentUser);
      } catch (error) {
        // User not logged in
      }
    };
    loadUser();
  }, []);

  const isAdmin = user?.is_global_admin;

  const { data: bellesOuvertures = [] } = useQuery({
    queryKey: ['bellesOuvertures', sprayWallId],
    queryFn: async () => {
      const { BelleOuverture } = await import("@/api/entities");
      return sprayWallId 
        ? BelleOuverture.filter({ spray_wall_id: parseInt(sprayWallId) })
        : BelleOuverture.list();
    },
  });

  console.log('Belle Ouvertures data:', bellesOuvertures);
  console.log('Spray Wall ID:', sprayWallId);

  const filteredByWall = bellesOuvertures;

  // Admin delete entry and refresh list
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { BelleOuverture } = await import("@/api/entities");
      return BelleOuverture.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bellesOuvertures'] });
      toast.success("Belle ouverture supprimée");
      setDeleteDialog({ open: false, ouverture: null });
    },
    onError: (error) => {
      toast.error("Erreur lors de la suppression");
      console.error("Delete error:", error);
    },
  });

  const handleDelete = (ouverture) => {
    setDeleteDialog({ open: true, ouverture });
  };

  const confirmDelete = () => {
    if (deleteDialog.ouverture) {
      deleteMutation.mutate(deleteDialog.ouverture.id);
    }
  };

  const getByLevel = (niveau) => {
    return filteredByWall.filter(b => b.niveau === niveau);
  };

  const filteredOuvertures = searchTerm
    ? filteredByWall.filter(b => b.nom.toLowerCase().includes(searchTerm.toLowerCase()))
    : filteredByWall;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-pink-50 p-4">
      <style>{`
        .belle-ouverture-search h3 {
          color: #000000 !important;
        }
      `}</style>
      <div className="max-w-2xl mx-auto pt-6 pb-20">
          <Link to={createPageUrl("SprayWallDashboard") + (sprayWallId ? `?id=${sprayWallId}` : '')}>
          <Button variant="outline" className="mb-4 bg-purple-900 text-white border-purple-700 hover:bg-purple-800">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </Link>

        <h1 className="text-3xl font-black text-slate-900 mb-6">
          🌟 Belles Ouvertures
        </h1>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher une belle ouverture..."
            className="pl-12 text-lg h-14 border-2 border-pink-300 focus:border-pink-500 text-slate-900"
          />
        </div>

        {isAdmin && (
          <Link to={createPageUrl("BelleOuvertureCreate") + `?spraywall=${sprayWallId}`}>
            <Button className="w-full mb-6 bg-pink-600 hover:bg-pink-700 h-12">
              <Plus className="w-5 h-5 mr-2" />
              Ajouter une belle ouverture
            </Button>
          </Link>
        )}

        {searchTerm && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-700 mb-3">
              Résultats de recherche : {filteredOuvertures.length}
            </h2>
            <div className="space-y-3">
              {filteredOuvertures.map(ouverture => (
                <Card key={ouverture.id} className="hover:shadow-lg transition-all border-2 border-pink-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <Link 
                        to={createPageUrl("BelleOuvertureView") + `?id=${ouverture.id}` + (sprayWallId ? `&spraywall=${sprayWallId}` : '')}
                        className="flex-1"
                      >
                        <div className="belle-ouverture-search" style={{ color: '#000000' }}>
                          <h3 className="font-bold">{ouverture.nom}</h3>
                          <p className="text-sm" style={{ color: '#000000' }}>{ouverture.ouvreur}</p>
                          <LevelBadge niveau={ouverture.niveau} className="mt-1" />
                        </div>
                      </Link>
                      {isAdmin && (
                        <div className="flex gap-2">
                          <Link to={createPageUrl("BelleOuvertureEdit") + `?id=${ouverture.id}` + (sprayWallId ? `&spraywall=${sprayWallId}` : '')}>
                            <Button variant="outline" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDelete(ouverture);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredOuvertures.length === 0 && (
              <Card className="text-center p-6">
                <CardContent>
                  <p className="text-gray-600">Aucun résultat pour "{searchTerm}"</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {!searchTerm && (
          <div className="space-y-3">
            {niveaux.map(niveau => {
              const count = getByLevel(niveau).length;
              if (count === 0) return null;

              return (
                <Link 
                  key={niveau}
                  to={createPageUrl("BelleOuvertureList") + `?spraywall=${sprayWallId}&niveau=${encodeURIComponent(niveau)}`}
                >
                  <Card className="hover:shadow-lg transition-all hover:scale-102 cursor-pointer border-2 border-pink-200 mb-4">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Mountain className="w-6 h-6 text-pink-600" />
                          <div>
                            <LevelBadge niveau={niveau} className="text-base" />
                            <p className="text-sm text-gray-600 mt-1">
                              {count} belle{count > 1 ? 's' : ''} ouverture{count > 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-2xl font-black text-pink-600">
                          {count}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
            {filteredByWall.length === 0 && (
              <Card className="text-center p-6 bg-pink-50">
                <CardContent>
                  <Mountain className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 text-sm mb-4">
                    Aucune belle ouverture dans ce spray wall
                  </p>
                  <Link to={createPageUrl("BelleOuvertureCreate") + `?spraywall=${sprayWallId}`}>
                    <Button className="bg-pink-600 hover:bg-pink-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter la première
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, ouverture: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette belle ouverture ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer "{deleteDialog.ouverture?.nom}" ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={deleteMutation.isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isLoading ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}