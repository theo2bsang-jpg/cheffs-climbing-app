import React, { useState } from 'react';
// import { Boulder, ContiBoucle } from "@/api/entities";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Search, User, AlertTriangle, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import LevelBadge from '../components/shared/LevelBadge';
// import { User } from "@/api/entities"; // Removed duplicate import

/** Search blocks and conti loops within a spray wall. */
export default function BoulderSearch() {
  const urlParams = new URLSearchParams(window.location.search);
  const sprayWallId = urlParams.get('spraywall');
  const [searchTerm, setSearchTerm] = useState("");

  const { data: boulders = [] } = useQuery({
    queryKey: ['boulders', sprayWallId],
    queryFn: async () => {
      const { Boulder } = await import("@/api/entities");
      return Boulder.filter({ spray_wall_id: sprayWallId });
    },
    enabled: !!sprayWallId,
  });

  const { data: boucles = [] } = useQuery({
    queryKey: ['contiBoucles', sprayWallId],
    queryFn: async () => {
      const { ContiBoucle } = await import("@/api/entities");
      return ContiBoucle.filter({ spray_wall_id: sprayWallId });
    },
    enabled: !!sprayWallId,
  });

  const filteredBoulders = boulders
    .filter(b => b.nom.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const filteredBoucles = boucles
    .filter(b => b.nom.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const totalResults = filteredBoulders.length + filteredBoucles.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-2xl mx-auto pt-6 pb-20">
        <Link to={createPageUrl("SprayWallDashboard") + `?id=${sprayWallId}`}>
          <Button variant="outline" className="mb-4 bg-purple-900 text-white border-purple-700 hover:bg-purple-800">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </Link>

        <h1 className="text-3xl font-black text-slate-900 mb-6">
          🔍 Rechercher un bloc
        </h1>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Nom du bloc ou de la boucle..."
            className="pl-12 text-lg h-14 border-2 border-blue-300 focus:border-blue-500"
          />
        </div>

        <p className="text-gray-600 mb-4">
          {searchTerm ? `${totalResults} résultat${totalResults > 1 ? 's' : ''}` : `${totalResults} bloc${totalResults > 1 ? 's' : ''} disponible${totalResults > 1 ? 's' : ''}`}
        </p>

        <div className="space-y-3">
          {filteredBoulders.map(boulder => (
            <Card key={boulder.id} className="hover:shadow-lg transition-all border-2">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link 
                    to={createPageUrl("BoulderView") + `?id=${boulder.id}`}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-slate-900">
                        {boulder.nom}
                      </h3>
                      {boulder.prise_remplacee && (
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <LevelBadge niveau={boulder.niveau} />
                      <Badge className="bg-blue-100 text-blue-800">
                        Bloc
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {boulder.ouvreur}
                    </p>
                  </Link>
                  <Link to={createPageUrl("BoulderEdit") + `?id=${boulder.id}`}>
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredBoucles.map(boucle => (
            <Card key={boucle.id} className="hover:shadow-lg transition-all border-2 border-yellow-200 bg-yellow-50/30">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link 
                    to={createPageUrl("ContiBoucleView") + `?id=${boucle.id}`}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-slate-900">
                        {boucle.nom}
                      </h3>
                      {boucle.prise_remplacee && (
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <LevelBadge niveau={boucle.niveau} />
                      <Badge className="bg-yellow-100 text-yellow-800">
                        Boucle
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {boucle.ouvreur}
                    </p>
                  </Link>
                  <Link to={createPageUrl("ContiBoucleEdit") + `?id=${boucle.id}`}>
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}

          {totalResults === 0 && (
            <Card className="text-center p-8">
              <CardContent>
                <Search className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">
                  {searchTerm ? `Aucun résultat pour "${searchTerm}"` : 'Aucun bloc disponible'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}