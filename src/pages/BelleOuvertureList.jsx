import React from 'react';
import { BelleOuverture } from "@/api/entities";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import LevelBadge from '../components/shared/LevelBadge';

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-pink-50 p-4">
      <div className="max-w-2xl mx-auto pt-6 pb-20">
        <Link to={createPageUrl("BelleOuvertureCatalog") + (sprayWallId ? `?spraywall=${sprayWallId}` : '')}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour au catalogue
          </Button>
        </Link>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            🌟
            <LevelBadge niveau={niveau} className="text-2xl px-4 py-2" />
          </div>
          <p className="text-gray-600 mt-2">
            {filtered.length} belle{filtered.length > 1 ? 's' : ''} ouverture{filtered.length > 1 ? 's' : ''}
          </p>
        </div>

        <div className="space-y-3">
          {filtered.map(ouverture => (
            <Card key={ouverture.id} className="hover:shadow-lg transition-all border-2 border-pink-200">
              <CardContent className="p-4">
                <Link 
                  to={createPageUrl("BelleOuvertureView") + `?id=${ouverture.id}` + (sprayWallId ? `&spraywall=${sprayWallId}` : '')}
                  className="flex items-start gap-3"
                >
                  {ouverture.photo_url && (
                    <img 
                      src={ouverture.photo_url} 
                      alt={ouverture.nom}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900 mb-1">
                      {ouverture.nom}
                    </h3>
                    <p className="text-sm text-gray-600 flex items-center gap-1 mb-2">
                      <User className="w-3 h-3" />
                      {ouverture.ouvreur}
                    </p>
                    {ouverture.description && (
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {ouverture.description}
                      </p>
                    )}
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}