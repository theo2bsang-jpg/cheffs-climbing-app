import React, { useState } from 'react';
// import { Boulder, ContiBoucle } from "@/api/entities";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Dices, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { User } from "@/api/entities";

const niveaux = ["4a", "4b", "4c", "5a", "5b", "5c", "6a", "6a+", "6b", "6b+", "6c", "6c+", "7a", "7a+", "7b", "7b+", "7c", "7c+", "8a", "8a+", "8b", "8b+", "8c", "8c+", "9a", "9a+", "9b", "9b+", "9c"];

/** Random picker for boulders or conti boucles within a grade range. */
export default function BoulderRandom() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const sprayWallId = urlParams.get('spraywall');
  const autoLaunch = urlParams.get('autoLaunch');
  const urlNiveauMin = urlParams.get('niveauMin');
  const urlNiveauMax = urlParams.get('niveauMax');
  const urlType = urlParams.get('type');
  
  const [niveauMin, setNiveauMin] = useState(urlNiveauMin || "6a");
  const [niveauMax, setNiveauMax] = useState(urlNiveauMax || "7a");
  const [selectedType, setSelectedType] = useState(urlType || "boulder");
  const [noResultsInfo, setNoResultsInfo] = useState(null);

  // Scope to selected spray wall
  const { data: boulders = [] } = useQuery({
    queryKey: ['boulders', sprayWallId],
    queryFn: async () => {
      const { Boulder } = await import("@/api/entities");
      return Boulder.filter({ spray_wall_id: sprayWallId });
    },
    enabled: !!sprayWallId,
  });

  // Scope to selected spray wall
  const { data: boucles = [] } = useQuery({
    queryKey: ['contiBoucles', sprayWallId],
    queryFn: async () => {
      const { ContiBoucle } = await import("@/api/entities");
      return ContiBoucle.filter({ spray_wall_id: sprayWallId });
    },
    enabled: !!sprayWallId,
  });

  // Auto-launch if URL flag present and data loaded
  React.useEffect(() => {
    if (autoLaunch === 'true' && boulders.length > 0 && boucles.length > 0) {
      getRandomBoulder();
    }
  }, [autoLaunch, boulders.length, boucles.length]);

  /** Pick a random item in the selected grade range and route to its view. */
  const getRandomBoulder = () => {
    const minIndex = niveaux.indexOf(niveauMin);
    const maxIndex = niveaux.indexOf(niveauMax);
    
    if (minIndex > maxIndex) {
      toast.error("Le niveau minimum doit être inférieur au maximum");
      setNoResultsInfo(null);
      return;
    }

    const allowedNiveaux = niveaux.slice(minIndex, maxIndex + 1);
    
    const filteredBoulders = boulders.filter(b => allowedNiveaux.includes(b.niveau));
    const filteredBoucles = boucles.filter(b => allowedNiveaux.includes(b.niveau));
    
    const allItems = selectedType === 'boulder' 
      ? filteredBoulders 
      : filteredBoucles;

    if (allItems.length === 0) {
      // Find available level range for selected type
      const dataSource = selectedType === 'boulder' ? boulders : boucles;
      const availableLevels = [...new Set(dataSource.map(item => item.niveau))].sort((a, b) => {
        return niveaux.indexOf(a) - niveaux.indexOf(b);
      });
      
      const typeText = selectedType === 'boulder' ? 'bloc' : 'boucle';
      const minLevel = availableLevels.length > 0 ? availableLevels[0] : 'N/A';
      const maxLevel = availableLevels.length > 0 ? availableLevels[availableLevels.length - 1] : 'N/A';
      
      setNoResultsInfo({
        type: typeText,
        selectedMin: niveauMin,
        selectedMax: niveauMax,
        availableMin: minLevel,
        availableMax: maxLevel
      });
      return;
    }
    
    setNoResultsInfo(null);

    // Reset session storage for new random session
    sessionStorage.removeItem('randomHistory');
    sessionStorage.removeItem('randomCurrentIndex');
    
    const randomItem = allItems[Math.floor(Math.random() * allItems.length)];
    const sessionKey = `random_${sprayWallId}_${niveauMin}_${niveauMax}_${selectedType}`;
    const history = [randomItem.id];
    sessionStorage.setItem('randomHistory', JSON.stringify(history));
    sessionStorage.setItem('randomCurrentIndex', '0');
    sessionStorage.setItem('randomSessionKey', sessionKey);
    sessionStorage.setItem('randomAllIds', JSON.stringify(allItems.map(i => i.id)));
    
    if (selectedType === 'boulder') {
      navigate(createPageUrl("BoulderView") + `?id=${randomItem.id}&fromRandom=true&niveauMin=${niveauMin}&niveauMax=${niveauMax}&type=boulder&sprayWallId=${sprayWallId}`);
    } else {
      navigate(createPageUrl("ContiBoucleView") + `?id=${randomItem.id}&fromRandom=true&niveauMin=${niveauMin}&niveauMax=${niveauMax}&type=boucle&sprayWallId=${sprayWallId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-2xl mx-auto pt-6 pb-20">
        <Link to={createPageUrl("SprayWallDashboard") + `?id=${sprayWallId}`}>
          <Button variant="outline" className="mb-4 bg-purple-900 text-white border-purple-700 hover:bg-purple-800">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </Link>

        <div className="text-center mb-8">
          <div className="inline-block bg-gradient-to-br from-purple-500 to-pink-500 p-6 rounded-full mb-4 shadow-xl">
            <Dices className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">
            Bloc Aléatoire
          </h1>
          <p className="text-gray-600">
            Laissez le hasard décider !
          </p>
        </div>

        <Card className="shadow-xl border-4 border-purple-300">
          <CardHeader className="bg-gradient-to-r from-purple-100 to-pink-100">
            <CardTitle>Choisissez votre plage de niveaux</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {noResultsInfo && (
              <Alert className="border-amber-300 bg-amber-50 text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="ml-2">
                  <p className="font-semibold">Aucun {noResultsInfo.type} trouvé</p>
                  <p className="text-sm mt-1">
                    Vous avez sélectionné {noResultsInfo.selectedMin} - {noResultsInfo.selectedMax}, mais les {noResultsInfo.type}s disponibles se situent entre <strong>{noResultsInfo.availableMin}</strong> et <strong>{noResultsInfo.availableMax}</strong>.
                  </p>
                </AlertDescription>
              </Alert>
            )}
            
            <div>
              <Label>Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="boulder">🧗 Blocs</SelectItem>
                  <SelectItem value="boucle">🔁 Boucles de conti</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="niveauMin">Niveau minimum</Label>
              <Select value={niveauMin} onValueChange={setNiveauMin}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {niveaux.map(n => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="niveauMax">Niveau maximum</Label>
              <Select value={niveauMax} onValueChange={setNiveauMax}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {niveaux.map(n => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={getRandomBoulder}
              className="w-full h-14 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg"
            >
              <Shuffle className="w-6 h-6 mr-2" />
              {selectedType === 'boulder' ? 'Tirer un bloc au hasard' : 'Tirer une boucle au hasard'}
            </Button>

            <div className="text-center text-sm text-gray-600 pt-4 border-t">
              <p>
                {selectedType === 'boulder' ? `${boulders.length} blocs disponibles` : `${boucles.length} boucles disponibles`}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}