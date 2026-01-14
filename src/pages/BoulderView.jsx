import React from 'react';
import { Boulder, SprayWall, Hold } from "@/api/entities";
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

/** Show a boulder with hold visualization; supports random traversal navigation. */
export default function BoulderView() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const boulderId = urlParams.get('id');
  const fromRandom = urlParams.get('fromRandom') === 'true';
  const [showExhaustedDialog, setShowExhaustedDialog] = React.useState(false);
  
  // Random mode state from sessionStorage to enable previous/next
  const history = fromRandom ? JSON.parse(sessionStorage.getItem('randomHistory') || '[]') : [];
  const currentIndex = fromRandom ? parseInt(sessionStorage.getItem('randomCurrentIndex') || '0') : 0;
  const allIds = fromRandom ? JSON.parse(sessionStorage.getItem('randomAllIds') || '[]') : [];
  
  const canGoPrevious = fromRandom && currentIndex > 0;
  const canGoNext = fromRandom && currentIndex < history.length - 1;

  // Fetch current boulder
  const { data: boulder } = useQuery({
    queryKey: ['boulder', boulderId],
    queryFn: () => Boulder.get(boulderId),
    enabled: !!boulderId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch spray wall for context and photo
  const { data: sprayWall } = useQuery({
    queryKey: ['sprayWall', boulder?.spray_wall_id],
    queryFn: () => SprayWall.get(boulder.spray_wall_id),
    enabled: !!boulder?.spray_wall_id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch holds to render annotated preview
  const { data: holds = [] } = useQuery({
    queryKey: ['holds', boulder?.spray_wall_id],
    queryFn: () => Hold.filter({ spray_wall_id: boulder.spray_wall_id }),
    enabled: !!boulder?.spray_wall_id,
    staleTime: 5 * 60 * 1000,
  });

  // Preload other boulders in random mode to know remaining ids
  const { data: allBoulders = [] } = useQuery({
    queryKey: ['boulders', boulder?.spray_wall_id],
    queryFn: () => Boulder.filter({ spray_wall_id: boulder.spray_wall_id }),
    enabled: fromRandom && !!boulder?.spray_wall_id,
  });

  /** Go to previous random selection in history. */
  const handlePrevious = () => {
    if (canGoPrevious) {
      const newIndex = currentIndex - 1;
      sessionStorage.setItem('randomCurrentIndex', newIndex.toString());
      const prevId = history[newIndex];
      const params = new URLSearchParams(window.location.search);
      params.set('id', prevId);
      navigate(`${createPageUrl("BoulderView")}?${params.toString()}`, { replace: true });
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
      navigate(`${createPageUrl("BoulderView")}?${params.toString()}`, { replace: true });
      window.location.reload();
    }
  };

  /** Pick a new unseen random boulder from cached ids. */
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
    navigate(`${createPageUrl("BoulderView")}?${params.toString()}`, { replace: true });
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

  if (!boulder) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-violet-600" />
      </div>
    );
  }

  if (boulder && !sprayWall) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-2">Lieu manquant</h2>
          <p className="text-sm text-gray-700 mb-4">Ce bloc n'est associé à aucun lieu (spray wall). Assignez un lieu pour voir la vue complète et créer des blocs associés.</p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate(createPageUrl("BoulderEdit") + `?id=${boulderId}`)}>
              Modifier le bloc
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto pt-6 pb-20">
        <Button 
          variant="outline" 
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
          🧗 {boulder.nom}
        </h1>
        <p className="text-gray-600 mb-6">{sprayWall.nom}</p>

        {boulder.prise_remplacee && (
          <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-900">
                ⚠️ Une ou plusieurs prises ont été remplacées
              </p>
              <p className="text-sm text-yellow-800 mt-1">
                Ce bloc nécessite une mise à jour
              </p>
            </div>
          </div>
        )}

        <BoulderPreview
          photoUrl={sprayWall.photo_url}
          holds={boulder.holds}
          allHolds={holds}
          boulderData={boulder}
        />

        <div className="mb-6 bg-white rounded-lg p-4 shadow-md">
          <h2 className="font-bold text-lg mb-3 text-slate-900">Liste des prises</h2>
          <div className="space-y-2">
            {boulder.holds.map((hold, idx) => {
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
                    <div className="w-7 h-7 rounded-full bg-red-600 border-2 border-white shadow-md flex items-center justify-center text-white text-xs font-bold">
                      ❌
                    </div>
                    <span className="font-semibold text-slate-900 line-through">[SUPPR] {hold.hold_nom || 'Prise inconnue'}</span>
                    <span className="text-red-700 text-sm font-bold">Supprimée</span>
                  </div>
                );
              }

              return (
                <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50 rounded">
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
              className="flex-1 border-slate-800 text-slate-900 bg-white hover:bg-slate-100"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Précédent
            </Button>
            <Button 
              variant="outline"
              onClick={handleNext}
              disabled={!canGoNext}
              className="flex-1 border-slate-800 text-slate-900 bg-white hover:bg-slate-100"
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
            onClick={() => navigate(createPageUrl("BoulderEdit") + `?id=${boulderId}`)}
            className="flex-1 border-slate-800 text-slate-900 bg-white hover:bg-slate-100"
          >
            <Edit className="w-4 h-4 mr-2" />
            Modifier
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
              <AlertDialogTitle>Tous les blocs ont été vus ! 🎉</AlertDialogTitle>
              <AlertDialogDescription>
                Vous avez parcouru tous les blocs de cette plage de niveaux. Que voulez-vous faire ?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="!flex !flex-col gap-2 !items-stretch !space-x-0">
              <AlertDialogAction onClick={() => handleExhaustedOption('selection')} className="w-full !m-0">
                Retour à la sélection des niveaux
              </AlertDialogAction>
              <AlertDialogAction onClick={() => handleExhaustedOption('stay')} className="w-full bg-gray-500 hover:bg-gray-600 !m-0">
                Rester sur ce bloc
              </AlertDialogAction>
              <AlertDialogAction onClick={() => handleExhaustedOption('dashboard')} className="w-full bg-violet-500 hover:bg-violet-600 !m-0">
                Retour au Spray Wall Dashboard
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}