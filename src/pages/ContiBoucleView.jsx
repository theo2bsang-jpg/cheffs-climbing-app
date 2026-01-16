import React from 'react';
// import { ContiBoucle, SprayWall, Hold } from "@/api/entities";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Home, Edit, Trash2, AlertTriangle, Dices, ChevronLeft, ChevronRight, CircleCheckBig, CircleX } from "lucide-react";
import LevelBadge from '../components/shared/LevelBadge';
import { Button } from "@/components/ui/button";
import BoulderPreview from '../components/spraywall/BoulderPreview';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { User } from "@/api/entities";

/** Play a conti loop with random traversal support and holds preview. */
export default function ContiBoucleView() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const boucleId = urlParams.get('id');
  const fromRandom = urlParams.get('fromRandom') === 'true';
  const [showExhaustedDialog, setShowExhaustedDialog] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Random mode state stored in sessionStorage
  const history = fromRandom ? JSON.parse(sessionStorage.getItem('randomHistory') || '[]') : [];
  const currentIndex = fromRandom ? parseInt(sessionStorage.getItem('randomCurrentIndex') || '0') : 0;
  const allIds = fromRandom ? JSON.parse(sessionStorage.getItem('randomAllIds') || '[]') : [];

  const canGoPrevious = fromRandom && currentIndex > 0;
  const canGoNext = fromRandom && currentIndex < history.length - 1;

  // Fetch current conti boucle
  const { data: boucle } = useQuery({
    queryKey: ['contiBoucle', boucleId],
    queryFn: async () => {
      const { ContiBoucle } = await import("@/api/entities");
      return ContiBoucle.get(boucleId);
    },
    enabled: !!boucleId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch sprayWall using the spray_wall_id from boucle
  const { data: sprayWall } = useQuery({
    queryKey: ['sprayWall', boucle?.spray_wall_id],
    queryFn: async () => {
      if (!boucle?.spray_wall_id) return null;
      const { SprayWall } = await import("@/api/entities");
      return SprayWall.get(boucle.spray_wall_id);
    },
    enabled: !!boucle?.spray_wall_id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch holds to render annotated preview
  const { data: holds = [] } = useQuery({
    queryKey: ['holds', boucle?.spray_wall_id],
    queryFn: async () => {
      const { Hold } = await import("@/api/entities");
      return Hold.filter({ spray_wall_id: boucle.spray_wall_id });
    },
    enabled: !!boucle?.spray_wall_id,
    staleTime: 5 * 60 * 1000,
  });
    React.useEffect(() => {
      if (fromRandom && history.length > 0 && !boucleId) {
        const currentId = history[currentIndex];
        if (currentId) {
          const params = new URLSearchParams(window.location.search);
          params.set('id', currentId);
          navigate(`${createPageUrl("ContiBoucleView")}?${params.toString()}`, { replace: true });
          window.location.reload();
        }
      }
    }, [fromRandom, history, currentIndex, boucleId, navigate]);

  /** Go to previous random selection in history. */
  const handlePrevious = () => {
    if (canGoPrevious) {
      const newIndex = currentIndex - 1;
      sessionStorage.setItem('randomCurrentIndex', newIndex.toString());
      const prevId = history[newIndex];
      const params = new URLSearchParams(window.location.search);
      params.set('id', prevId);
      navigate(`${createPageUrl("ContiBoucleView")}?${params.toString()}`, { replace: true });
      window.location.reload();
    }
  };

  /** Advance to next random selection in history. */
  const handleNext = () => {
    if (canGoNext) {
      const newIndex = currentIndex + 1;
      sessionStorage.setItem('randomCurrentIndex', newIndex.toString());
      const nextId = history[newIndex];
      const params = new URLSearchParams(window.location.search);
      params.set('id', nextId);
      navigate(`${createPageUrl("ContiBoucleView")}?${params.toString()}`, { replace: true });
      window.location.reload();
    }
  };

  /** Pick a new unseen boucle from cached ids. */
  const handleRelaunch = () => {
    const unseenIds = allIds.filter(id => !history.includes(id));

    if (unseenIds.length === 0) {
      setShowExhaustedDialog(true);
      return;
    }

    const randomId = unseenIds[Math.floor(Math.random() * unseenIds.length)];
    const newHistory = [...history.slice(0, currentIndex + 1), randomId];
    const newIndex = currentIndex + 1;

    sessionStorage.setItem('randomHistory', JSON.stringify(newHistory));
    sessionStorage.setItem('randomCurrentIndex', newIndex.toString());

    const params = new URLSearchParams(window.location.search);
    params.set('id', randomId);
    navigate(`${createPageUrl("ContiBoucleView")}?${params.toString()}`, { replace: true });
    window.location.reload();
  };

  /** Handle user choice after exhausting random pool. */
  const handleExhaustedOption = (option) => {
    const sprayWallIdFromUrl = urlParams.get('sprayWallId');
    if (option === 'selection') {
      sessionStorage.removeItem('randomHistory');
      sessionStorage.removeItem('randomCurrentIndex');
      sessionStorage.removeItem('randomAllIds');
      navigate(createPageUrl("BoulderRandom") + `?spraywall=${sprayWallIdFromUrl}`);
    } else if (option === 'stay') {
      setShowExhaustedDialog(false);
    } else if (option === 'dashboard') {
      sessionStorage.removeItem('randomHistory');
      sessionStorage.removeItem('randomCurrentIndex');
      sessionStorage.removeItem('randomAllIds');
      navigate(createPageUrl("SprayWallDashboard") + `?id=${sprayWallIdFromUrl}`);
    }
  };

  const deleteBoucle = async () => {
    setIsDeleting(true);
    await ContiBoucle.delete(boucleId);
    navigate(createPageUrl("SprayWallDashboard") + `?id=${sprayWall?.id || ''}`);
  };

  if (!boucle) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-violet-600" />
      </div>
    );
  }

  if (boucle && !sprayWall) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-2">Lieu manquant</h2>
          <p className="text-sm text-gray-700 mb-4">Cette boucle n'est associée à aucun lieu (spray wall). Assignez un lieu pour voir la vue complète et créer des boucles associées.</p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate(createPageUrl("ContiBoucleEdit") + `?id=${boucleId}`)}>
              Modifier la boucle
            </Button>
            <Button onClick={() => navigate(createPageUrl("SprayWallSelect"))}>
              Sélectionner un lieu
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-yellow-50 p-4">
      <div className="max-w-4xl mx-auto pt-6 pb-20">
        <Button
          variant="ghost"
          onClick={() => {
            const catalogUrl = fromRandom
              ? createPageUrl("BoulderRandom") + `?spraywall=${sprayWall.id}`
              : createPageUrl("BoulderCatalog") + `?spraywall=${sprayWall.id}`;
            navigate(catalogUrl);
          }}
          className="mb-4 bg-purple-900 text-white border-purple-700 hover:bg-purple-800"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>

        <h1 className="text-3xl font-black text-slate-900 mb-2">
          🔁 {boucle.nom}
        </h1>
        <p className="text-gray-600 mb-6">{sprayWall.nom}</p>

        {(() => {
          const missingCount = boucle.holds && holds ? boucle.holds.filter(h => !holds.find(ah => ah.id === h.hold_id)).length : 0;
          const shouldShow = Boolean(boucle.prise_remplacee) || missingCount > 0;
          return shouldShow ? (
            <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-semibold text-yellow-900">
                  {missingCount > 0
                    ? `${missingCount} prise${missingCount > 1 ? 's' : ''} à remplacer`
                    : 'Une ou plusieurs prises ont été remplacées'}
                </p>
                <p className="text-sm text-yellow-800 mt-1">
                  Cette boucle nécessite une mise à jour
                </p>
              </div>
            </div>
          ) : null;
        })()}

        {/* BoulderPreview renders the preview and metadata. If a stray value is rendered here, remove it. */}
        <BoulderPreview
          photoUrl={sprayWall.photo_url}
          holds={boucle.holds}
          allHolds={holds}
          boulderData={boucle}
          showOrder={true}
        />

        <div className="mb-6 bg-white rounded-lg p-4 shadow-md">
          <h2 className="font-bold text-lg mb-3 text-slate-900">Liste des prises</h2>
          <div className="space-y-2">
            {boucle.holds.sort((a, b) => a.ordre - b.ordre).map((hold, idx) => {
              const holdData = holds.find(h => h.id === hold.hold_id);
              const typeColors = {
                depart: "bg-red-500",
                fin: "bg-red-500",
                main: "bg-green-500",
                pied: "bg-yellow-500"
              };

              if (!holdData) {
                return (
                  <div key={idx} className="flex items-center gap-3 p-2 bg-red-700 rounded border-2 border-red-800">
                    <div className="w-6 h-6 rounded-full bg-red-600 border-2 border-white shadow-md flex items-center justify-center text-white text-xs font-bold">
                      ❌
                    </div>
                    <span className="font-semibold text-white line-through">{hold.nom || hold.hold_nom || 'Prise inconnue'}</span>
                  </div>
                );
              }

              return (
                <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50 rounded">
                  <span className="text-sm font-bold text-slate-600 min-w-[24px]">{hold.ordre}</span>
                  <div className={`w-6 h-6 rounded-full ${typeColors[hold.type]} border-2 border-white shadow-md`} style={{ opacity: 0.8 }} />
                  <span className="font-semibold text-slate-900">{holdData.nom}</span>
                </div>
              );
            })}
          </div>
        </div>

        {fromRandom && (
          <div className="flex gap-2 mb-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={!canGoPrevious}
              className="flex-1"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Précédent
            </Button>
            <Button
              variant="outline"
              onClick={handleNext}
              disabled={!canGoNext}
              className="flex-1"
            >
              Suivant
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              sessionStorage.removeItem('randomHistory');
              sessionStorage.removeItem('randomCurrentIndex');
              sessionStorage.removeItem('randomAllIds');
              navigate(createPageUrl("SprayWallDashboard") + `?id=${sprayWall.id}`);
            }}
            className="flex-1 border-slate-800 text-slate-900 bg-white hover:bg-slate-100"
          >
            <Home className="w-4 h-4 mr-2" />
            Accueil
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl("ContiBoucleEdit") + `?id=${boucleId}`)}
            className="flex-1 border-slate-800 text-slate-900 bg-white hover:bg-slate-100"
          >
            <Edit className="w-4 h-4 mr-2" />
            Modifier
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            className="flex-1 w-full bg-red-600 hover:bg-red-700 text-white"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Supprimer
          </Button>
          {fromRandom && (
            <Button
              variant="outline"
              onClick={handleRelaunch}
              className="flex-1 border-slate-800 text-slate-900 bg-white hover:bg-slate-100"
            >
              <Dices className="w-4 h-4 mr-2" />
              Relancer
            </Button>
          )}
        </div>

        <AlertDialog open={showExhaustedDialog} onOpenChange={setShowExhaustedDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Toutes les boucles ont été vues ! </AlertDialogTitle>
              <AlertDialogDescription>
                Vous avez parcouru toutes les boucles de cette plage de niveaux. Que voulez-vous faire ?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="!flex !flex-col gap-2 !items-stretch !space-x-0">
              <AlertDialogAction onClick={() => handleExhaustedOption('selection')} className="w-full !m-0">
                Retour à la sélection des niveaux
              </AlertDialogAction>
              <AlertDialogAction onClick={() => handleExhaustedOption('stay')} className="w-full bg-gray-500 hover:bg-gray-600 !m-0">
                Rester sur cette boucle
              </AlertDialogAction>
              <AlertDialogAction onClick={() => handleExhaustedOption('dashboard')} className="w-full bg-violet-500 hover:bg-violet-600 !m-0">
                Retour au Spray Wall Dashboard
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cette boucle ?</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer "{boucle.nom}" ?
                Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction 
                onClick={deleteBoucle}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? "Suppression..." : "Supprimer"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
