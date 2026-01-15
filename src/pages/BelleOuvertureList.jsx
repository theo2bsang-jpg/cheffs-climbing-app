import React from 'react';
import { BelleOuverture } from "@/api/entities";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, User, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import LevelBadge from '../components/shared/LevelBadge';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

/** List belles ouvertures for a level within a spray wall. */
export default function BelleOuvertureList() {
  const urlParams = new URLSearchParams(window.location.search);
  const sprayWallId = urlParams.get('spraywall');
  const niveau = urlParams.get('niveau');

  const { data: bellesOuvertures = [] } = useQuery({
    queryKey: ['bellesOuvertures'],
    queryFn: () => BelleOuverture.list(),
  });

  const filtered = bellesOuvertures.filter((b) => {
    const matchesLevel = niveau ? String(b.niveau) === String(niveau) : true;
    const matchesWall = sprayWallId ? String(b.spray_wall_id) === String(sprayWallId) : true;
    return matchesLevel && matchesWall;
  });

  const [user, setUser] = React.useState(null);
  const [deleteDialog, setDeleteDialog] = React.useState({ open: false, ouverture: null });
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await import("@/api/entities").then(m => m.User.me());
        setUser(currentUser);
      } catch (e) {}
    };
    loadUser();
  }, []);

  const isAdmin = user?.is_global_admin;

  const deleteMutation = useMutation({
    mutationFn: (id) => BelleOuverture.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bellesOuvertures'] });
      toast.success("Belle ouverture supprimée");
      setDeleteDialog({ open: false, ouverture: null });
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
      setDeleteDialog({ open: false, ouverture: null });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-pink-50 p-4">
      <style>{`
        .belle-ouverture-list h3 {
          color: #000000 !important;
        }
      `}</style>
      <div className="max-w-2xl mx-auto pt-6 pb-20">
        <Link to={createPageUrl("BelleOuvertureCatalog") + (sprayWallId ? `?spraywall=${sprayWallId}` : '')}>
          <Button variant="outline" className="mb-4 bg-purple-900 text-white border-purple-700 hover:bg-purple-800">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour au catalogue
          </Button>
        </Link>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            🌟
            <LevelBadge niveau={niveau} className="text-2xl px-4 py-2" />
          </div>
          <p className="text-slate-900 font-semibold mt-2">
            {filtered.length} belle{filtered.length > 1 ? 's' : ''} ouverture{filtered.length > 1 ? 's' : ''}
          </p>
        </div>

        <div className="space-y-3">
          {filtered.map(ouverture => (
            <Card key={ouverture.id} className="hover:shadow-lg transition-all border-2 border-pink-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {ouverture.photo_url && (
                    <img 
                      src={ouverture.photo_url} 
                      alt={ouverture.nom}
                      className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                    />
                  )}
                  <Link 
                    to={createPageUrl("BelleOuvertureView") + `?id=${ouverture.id}` + (sprayWallId ? `&spraywall=${sprayWallId}` : '')}
                    className="flex-1 belle-ouverture-list"
                    style={{ color: 'inherit' }}
                  >
                    <div className="flex-1 belle-ouverture-list" style={{ color: '#000000' }}>
                      <h3 className="text-lg font-bold mb-1">
                        {ouverture.nom}
                      </h3>
                      <p className="text-sm flex items-center gap-1 mb-2" style={{ color: '#000000' }}>
                        <User className="w-3 h-3" />
                        {ouverture.ouvreur}
                      </p>
                      {ouverture.description && (
                        <p className="text-xs line-clamp-2" style={{ color: '#000000' }}>
                          {ouverture.description}
                        </p>
                      )}
                    </div>
                  </Link>
                  {isAdmin && (
                    <div className="flex gap-2 items-center ml-2">
                      <Link to={createPageUrl("BelleOuvertureEdit") + `?id=${ouverture.id}` + (sprayWallId ? `&spraywall=${sprayWallId}` : '')}>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(ouverture)}
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
    </div>
  );
}