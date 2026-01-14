import React from 'react';
import { ContiBoucle, SprayWall, Hold } from "@/api/entities";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Home, Edit, AlertTriangle, Dices, ChevronLeft, ChevronRight } from "lucide-react";
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
} from "@/components/ui/alert-dialog";

/** Play a conti loop with random traversal support and holds preview. */
export default function ContiBoucleView() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const boucleId = urlParams.get('id');
  const fromRandom = urlParams.get('fromRandom') === 'true';
  const [showExhaustedDialog, setShowExhaustedDialog] = React.useState(false);
  
  const history = fromRandom ? JSON.parse(sessionStorage.getItem('randomHistory') || '[]') : [];
  const currentIndex = fromRandom ? parseInt(sessionStorage.getItem('randomCurrentIndex') || '0') : 0;
  const allIds = fromRandom ? JSON.parse(sessionStorage.getItem('randomAllIds') || '[]') : [];
  
  const canGoPrevious = fromRandom && currentIndex > 0;
  const canGoNext = fromRandom && currentIndex < history.length - 1;

  /** When in random mode with cached history, stay aligned to stored index. */
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
  }, []);

  const { data: boucle } = useQuery({
    queryKey: ['contiBoucle', boucleId],
    queryFn: () => ContiBoucle.get(boucleId),
    enabled: !!boucleId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: sprayWall } = useQuery({
    queryKey: ['sprayWall', boucle?.spray_wall_id],
    queryFn: () => SprayWall.get(boucle.spray_wall_id),
    enabled: !!boucle?.spray_wall_id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: holds = [] } = useQuery({
    queryKey: ['holds', boucle?.spray_wall_id],
    queryFn: () => Hold.filter({ spray_wall_id: boucle.spray_wall_id }),
    enabled: !!boucle?.spray_wall_id,
    staleTime: 5 * 60 * 1000,
  });

  // Needed only when coming from random flow to pick a new candidate
  const { data: allBoucles = [] } = useQuery({
    queryKey: ['contiBoucles', boucle?.spray_wall_id],
    queryFn: () => ContiBoucle.filter({ spray_wall_id: boucle.spray_wall_id }),
    enabled: fromRandom && !!boucle?.spray_wall_id,
  });

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

  // Pick a new unseen boucle when traversing randomly
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

  if (!boucle || !sprayWall) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-violet-600" />
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

        {boucle.prise_remplacee && (
          <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-900">
                ⚠️ Une ou plusieurs prises ont été remplacées
              </p>
              <p className="text-sm text-yellow-800 mt-1">
                Cette boucle nécessite une mise à jour
              </p>
            </div>
          </div>
        )}

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
                  <div key={idx} className="flex items-center gap-3 p-2 bg-red-50 rounded border-2 border-red-300">
                    <span className="text-sm font-bold text-slate-600 min-w-[24px]">{hold.ordre}</span>
                    <div className="w-6 h-6 rounded-full bg-red-600 border-2 border-white shadow-md flex items-center justify-center text-white text-xs font-bold">
                      ❌
                    </div>
                    <span className="font-semibold text-slate-900 line-through">[SUPPR] {hold.hold_nom || 'Prise inconnue'}</span>
                    <span className="text-red-600 text-sm font-bold">❌ Supprimée</span>
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
            className="flex-1"
          >
            <Home className="w-4 h-4 mr-2" />
            Accueil
          </Button>
          <Button 
            variant="outline"
            onClick={() => navigate(createPageUrl("ContiBoucleEdit") + `?id=${boucleId}`)}
            className="flex-1"
          >
            <Edit className="w-4 h-4 mr-2" />
            Modifier
          </Button>
          {fromRandom && (
            <Button 
              variant="outline"
              onClick={handleRelaunch}
              className="flex-1"
            >
              <Dices className="w-4 h-4 mr-2" />
              Relancer
            </Button>
          )}
        </div>

        <AlertDialog open={showExhaustedDialog} onOpenChange={setShowExhaustedDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Toutes les boucles ont été vues ! 🎉</AlertDialogTitle>
              <AlertDialogDescription>
                Vous avez parcouru toutes les boucles de cette plage de niveaux. Que voulez-vous faire ?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
              <AlertDialogAction onClick={() => handleExhaustedOption('selection')} className="w-full">
                Retour à la sélection des niveaux
              </AlertDialogAction>
              <AlertDialogAction onClick={() => handleExhaustedOption('stay')} className="w-full bg-gray-500 hover:bg-gray-600">
                Rester sur cette boucle
              </AlertDialogAction>
              <AlertDialogAction onClick={() => handleExhaustedOption('dashboard')} className="w-full bg-violet-500 hover:bg-violet-600">
                Retour au Spray Wall Dashboard
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}