import React, { useState, useEffect } from 'react';
import { BelleOuverture, SprayWall, User } from "@/api/entities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Edit, Trash2, Home } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import LevelBadge from '../components/shared/LevelBadge';

/** View details of a belle ouverture and navigate back to its spray wall. */
export default function BelleOuvertureView() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const ouvertureId = urlParams.get('id');
  const sprayWallFromQuery = urlParams.get('spraywall');
  const [backUrl, setBackUrl] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
      } catch (error) {
        // User not logged in
      }
    };
    loadUser();
  }, []);

  const isAdmin = user?.is_global_admin;
  const queryClient = useQueryClient();
  const [deleteDialog, setDeleteDialog] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => BelleOuverture.delete(ouvertureId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bellesOuvertures'] });
      toast.success("Belle ouverture supprimée");
      navigate(createPageUrl("BelleOuvertureCatalog") + (sprayWallFromQuery ? `?spraywall=${sprayWallFromQuery}` : ''));
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
      setDeleteDialog(false);
    },
  });

  const { data: ouverture } = useQuery({
    queryKey: ['belleOuverture', ouvertureId],
    queryFn: () => BelleOuverture.get(ouvertureId),
    enabled: !!ouvertureId,
    onSuccess: (data) => {
      // Prefer the spray wall from the record; fallback to query param; otherwise go to catalog root
      const wallId = data?.spray_wall_id || sprayWallFromQuery;
      if (wallId) {
        setBackUrl(createPageUrl("SprayWallDashboard") + `?id=${wallId}`);
      } else {
        setBackUrl(createPageUrl("BelleOuvertureCatalog"));
      }
    },
  });

  // Fetch spray wall for context
  const { data: sprayWall } = useQuery({
    queryKey: ['sprayWall', ouverture?.spray_wall_id],
    queryFn: () => SprayWall.get(ouverture.spray_wall_id),
    enabled: !!ouverture?.spray_wall_id,
    staleTime: 5 * 60 * 1000,
  });

  if (!ouverture) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-pink-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-pink-50 p-4">
      <div className="max-w-4xl mx-auto pt-6 pb-20">
        <Button 
          variant="outline" 
          onClick={() => navigate(createPageUrl("BelleOuvertureCatalog") + (sprayWallFromQuery ? `?spraywall=${sprayWallFromQuery}` : ''))}
          className="mb-4 bg-purple-900 text-white border-purple-700 hover:bg-purple-800"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>

        <h1 className="text-3xl font-black text-slate-900 mb-2">
          🌟 {ouverture.nom}
        </h1>
        <p className="text-gray-600 mb-6">{sprayWall?.nom || ouverture.description}</p>

        {ouverture.photo_url && (
          <div className="mb-6 relative border-4 border-pink-600 rounded-lg overflow-hidden bg-slate-900 shadow-2xl">
            <img 
              src={ouverture.photo_url} 
              alt={ouverture.nom}
              className="w-full h-auto"
            />
          </div>
        )}

        <div className="mb-6 bg-white rounded-lg p-4 shadow-md">
          <h2 className="font-bold text-lg mb-3 text-slate-900">Informations</h2>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Ouvreur :</span>
              <p className="font-semibold text-slate-900">{ouverture.ouvreur}</p>
            </div>
            <div>
              <span className="text-gray-600">Niveau :</span>
              <div className="mt-1">
                <LevelBadge niveau={ouverture.niveau} />
              </div>
            </div>
            <div>
              <span className="text-gray-600">Lieu :</span>
              <p className="font-semibold text-slate-900">{sprayWall?.nom || '-'}</p>
            </div>
          </div>
        </div>

        {ouverture.description && (
          <div className="mb-6 bg-white rounded-lg p-4 shadow-md">
            <h3 className="font-semibold text-slate-900 mb-2">Description</h3>
            <p className="text-gray-700">{ouverture.description}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button 
            variant="outline"
            onClick={() => navigate(createPageUrl("SprayWallDashboard") + `?id=${ouverture.spray_wall_id}`)}
            className="flex-1 border-slate-800 text-slate-900 bg-white hover:bg-slate-100"
          >
            <Home className="w-4 h-4 mr-2" />
            Accueil
          </Button>
          {isAdmin && (
            <>
              <Link to={createPageUrl("BelleOuvertureEdit") + `?id=${ouvertureId}` + (sprayWallFromQuery ? `&spraywall=${sprayWallFromQuery}` : '')} className="flex-1">
                <Button 
                  variant="outline"
                  className="flex-1 border-slate-800 text-slate-900 bg-white hover:bg-slate-100 w-full"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Modifier
                </Button>
              </Link>
              <Button 
                variant="destructive"
                onClick={() => setDeleteDialog(true)}
                className="flex-1"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </Button>
            </>
          )}
        </div>

        <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cette belle ouverture ?</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer "{ouverture.nom}" ?
                Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isLoading}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleteMutation.isLoading ? "Suppression..." : "Supprimer"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}