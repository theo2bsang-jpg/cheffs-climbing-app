import React, { useState } from 'react';
import { Boulder, ContiBoucle, Hold } from "@/api/entities";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Mountain, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import LevelBadge from '../components/shared/LevelBadge';

const niveaux = ["4a", "4b", "4c", "5a", "5b", "5c", "6a", "6a+", "6b", "6b+", "6c", "6c+", "7a", "7a+", "7b", "7b+", "7c", "7c+", "8a", "8a+", "8b", "8b+", "8c", "8c+", "9a", "9a+", "9b", "9b+", "9c"];

/** Catalog of boulders/boucles by grade with search and warnings. */
export default function BoulderCatalog() {
  const urlParams = new URLSearchParams(window.location.search);
  const sprayWallId = urlParams.get('spraywall');
  const [searchTerm, setSearchTerm] = useState("");

  // Load boulders for the wall
  const { data: boulders = [] } = useQuery({
    queryKey: ['boulders', sprayWallId],
    queryFn: () => Boulder.filter({ spray_wall_id: sprayWallId }),
    enabled: !!sprayWallId,
  });

  // Load conti boucles for the wall
  const { data: boucles = [] } = useQuery({
    queryKey: ['contiBoucles', sprayWallId],
    queryFn: () => ContiBoucle.filter({ spray_wall_id: sprayWallId }),
    enabled: !!sprayWallId,
  });

  // Holds needed to flag missing/replaced items
  const { data: allHolds = [] } = useQuery({
    queryKey: ['holds', sprayWallId],
    queryFn: () => Hold.filter({ spray_wall_id: sprayWallId }),
    enabled: !!sprayWallId,
  });

  const hasDeletedHolds = (item) => {
    return item.holds.some(hold => !allHolds.find(h => h.id === hold.hold_id));
  };

  const getBouldersByLevel = (niveau) => {
    return boulders.filter(b => b.niveau === niveau);
  };

  const getBouclesByLevel = (niveau) => {
    return boucles.filter(b => b.niveau === niveau);
  };

  const filteredBoulders = searchTerm
    ? boulders.filter(b => b.nom.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];

  const filteredBoucles = searchTerm
    ? boucles.filter(b => b.nom.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50 p-4">
      <div className="max-w-2xl mx-auto pt-6 pb-20">
        <Link to={createPageUrl("SprayWallDashboard") + `?id=${sprayWallId}`}>
          <Button
            variant="outline"
            className="mb-4 bg-purple-900 text-white border-purple-700 hover:bg-purple-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </Link>

        <h1 className="text-3xl font-black text-slate-900 mb-6">
          📚 Catalogue
        </h1>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un bloc ou une boucle..."
            className="pl-12 text-lg h-14 border-2 border-violet-300 focus:border-violet-500 text-slate-900"
          />
        </div>

        {searchTerm && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-700 mb-3">
              Résultats de recherche : {filteredBoulders.length + filteredBoucles.length}
            </h2>
            <div className="space-y-4">
              {filteredBoulders.map(boulder => (
                <Link key={boulder.id} to={createPageUrl("BoulderView") + `?id=${boulder.id}`}>
                  <Card className="hover:shadow-lg transition-all border-4">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-purple-900">{boulder.nom}</h3>
                            {(boulder.prise_remplacee || hasDeletedHolds(boulder)) && (
                              <span className="text-red-600 text-xl">⚠️</span>
                            )}
                          </div>
                          <LevelBadge niveau={boulder.niveau} className="mt-1" />
                        </div>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Bloc</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
              {filteredBoucles.map(boucle => (
                <Link key={boucle.id} to={createPageUrl("ContiBoucleView") + `?id=${boucle.id}`}>
                  <Card className="rounded-xl bg-card text-card-foreground shadow hover:shadow-lg transition-all border-4 border-yellow-300">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-purple-900">{boucle.nom}</h3>
                            {(boucle.prise_remplacee || hasDeletedHolds(boucle)) && (
                              <span className="text-red-600 text-xl">⚠️</span>
                            )}
                          </div>
                          <LevelBadge niveau={boucle.niveau} className="mt-1" />
                        </div>
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Boucle</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
              {filteredBoulders.length === 0 && filteredBoucles.length === 0 && (
                <Card className="text-center p-6">
                  <CardContent>
                    <p className="text-slate-800">Aucun résultat pour "{searchTerm}"</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {!searchTerm && (
          <>
            <div className="mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-3 flex items-center gap-2">
                🧗 Blocs
              </h2>
              <div className="space-y-3">
                {niveaux.map(niveau => {
                  const levelBoulders = getBouldersByLevel(niveau);
                  const bouldersCount = levelBoulders.length;
                  const hasReplacedHolds = levelBoulders.some(b => b.prise_remplacee || hasDeletedHolds(b));

                  if (bouldersCount === 0) return null;

                  return (
                    <Link 
                      key={niveau}
                      to={createPageUrl("BoulderList") + `?spraywall=${sprayWallId}&niveau=${encodeURIComponent(niveau)}&type=boulder`}
                    >
                      <Card className="hover:shadow-lg transition-all hover:scale-102 cursor-pointer border-4 border-blue-200">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Mountain className="w-6 h-6 text-blue-600" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <LevelBadge niveau={niveau} className="text-base" />
                                  {hasReplacedHolds && <span className="text-red-600 text-lg">⚠️</span>}
                                </div>
                                <p className="text-sm text-[#0b1220] font-semibold mt-1">
                                  {bouldersCount} bloc{bouldersCount > 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                            <div className="text-2xl font-black text-blue-600">
                              {bouldersCount}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
                {boulders.length === 0 && (
                  <Card className="text-center p-6 bg-white">
                    <CardContent>
                        <p style={{color: '#0f172a'}} className="text-sm font-semibold">
                        Aucun bloc dans ce spray wall
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-3 flex items-center gap-2">
                🔁 Boucles de conti
              </h2>
              <div className="space-y-3">
                {niveaux.map(niveau => {
                  const levelBoucles = getBouclesByLevel(niveau);
                  const bouclesCount = levelBoucles.length;
                  const hasReplacedHolds = levelBoucles.some(b => b.prise_remplacee || hasDeletedHolds(b));

                  if (bouclesCount === 0) return null;

                  return (
                    <Link 
                      key={niveau}
                      to={createPageUrl("BoulderList") + `?spraywall=${sprayWallId}&niveau=${encodeURIComponent(niveau)}&type=boucle`}
                    >
                      <Card className="hover:shadow-lg transition-all hover:scale-102 cursor-pointer border-4 border-yellow-200">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Mountain className="w-6 h-6 text-yellow-600" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <LevelBadge niveau={niveau} className="text-base" />
                                  {hasReplacedHolds && <span className="text-red-600 text-lg">⚠️</span>}
                                </div>
                                <p className="text-sm text-[#0b1220] font-semibold mt-1">
                                  {bouclesCount} boucle{bouclesCount > 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                            <div className="text-2xl font-black text-yellow-600">
                              {bouclesCount}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
                {boucles.length === 0 && (
                  <Card className="text-center p-6 bg-yellow-50">
                    <CardContent>
                        <p className="text-[#0b1220] text-sm font-semibold">
                          Aucune boucle dans ce spray wall
                        </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}