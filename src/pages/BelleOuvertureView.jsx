import React, { useState } from 'react';
import { BelleOuverture } from "@/api/entities";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, User } from "lucide-react";
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
          variant="ghost" 
          onClick={() => navigate(backUrl || -1)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>

        <h1 className="text-3xl font-black text-slate-900 mb-2">
          🌟 {ouverture.nom}
        </h1>
        <p className="text-gray-600 mb-6">{ouverture.description}</p>

        <div className="space-y-4">
          <Card className="p-4 bg-gradient-to-r from-pink-50 to-purple-50 border-pink-200">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Nom :</span>
                <p className="font-bold text-pink-900">{ouverture.nom}</p>
              </div>
              <div>
                <span className="text-gray-600">Ouvreur :</span>
                <p className="font-semibold flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {ouverture.ouvreur}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Niveau :</span>
                <div className="mt-1">
                  <LevelBadge niveau={ouverture.niveau} />
                </div>
              </div>
            </div>
          </Card>

          {ouverture.photo_url && (
            <div className="relative border-4 border-pink-600 rounded-lg overflow-hidden bg-slate-900 shadow-2xl">
              <img 
                src={ouverture.photo_url} 
                alt={ouverture.nom}
                className="w-full h-auto"
              />
            </div>
          )}

          {ouverture.description && (
            <Card className="p-4">
              <h3 className="font-semibold text-slate-900 mb-2">Description</h3>
              <p className="text-gray-700">{ouverture.description}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}