import React, { useEffect, useState } from 'react';
import { User, SprayWall, Boulder, ContiBoucle } from "@/api/entities";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Grid3x3, Dices, Plus, Edit, Mountain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

/** Hub page for a spray wall: links to catalog, random, creation, and admin actions. */
export default function SprayWallDashboard() {
  const [user, setUser] = useState(null);
  const urlParams = new URLSearchParams(window.location.search);
  const sprayWallId = urlParams.get('id');

  /** Load current user to compute admin permissions; redirect if unauthenticated. */
  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
      } catch (error) {
        User.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  // Fetch spray wall details to render name/location
  const { data: sprayWall } = useQuery({
    queryKey: ['sprayWall', sprayWallId],
    queryFn: () => SprayWall.get(sprayWallId),
    enabled: !!sprayWallId,
  });

  // Load boulders scoped to wall for warning badge and links
  const { data: boulders = [] } = useQuery({
    queryKey: ['boulders', sprayWallId],
    queryFn: () => Boulder.filter({ spray_wall_id: sprayWallId }),
    enabled: !!sprayWallId,
  });

  // Load conti boucles scoped to wall for warning badge and links
  const { data: boucles = [] } = useQuery({
    queryKey: ['contiBoucles', sprayWallId],
    queryFn: () => ContiBoucle.filter({ spray_wall_id: sprayWallId }),
    enabled: !!sprayWallId,
  });

  // Flag if any route references replaced holds
  const hasReplacedHolds = [...boulders, ...boucles].some(item => item.prise_remplacee);

  const isAdmin = user?.is_global_admin;
  const isSubAdmin = user?.email === sprayWall?.sous_admin_email;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-violet-500 to-purple-600 p-4">
      <div className="max-w-2xl mx-auto pt-6 pb-20">
        <Link to={createPageUrl("Home")}>
          <Button variant="outline" className="mb-4 bg-purple-900 text-white border-purple-700 hover:bg-purple-800">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Accueil
          </Button>
        </Link>

        <div className="text-center mb-8">
          <Mountain className="w-12 h-12 mx-auto mb-3 text-white" />
          <h1 className="text-3xl font-black text-white mb-2 flex items-center justify-center gap-3">
            {sprayWall?.nom || "Spray Wall"}
            {hasReplacedHolds && <span className="text-red-500 text-4xl">⚠️</span>}
          </h1>
          <p className="text-blue-100">
            {sprayWall?.lieu}
          </p>
          {hasReplacedHolds && (
            <div className="mt-3 bg-red-500/20 border-2 border-red-500 rounded-lg px-4 py-2 inline-block">
              <p className="text-red-100 font-semibold text-sm">
                ⚠️ Des prises ont été supprimées - Vérifiez les blocs
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Link to={createPageUrl("BoulderCatalog") + `?spraywall=${sprayWallId}`}>
            <Card className="hover:shadow-2xl transition-all hover:scale-105 cursor-pointer border-4 border-violet-400 bg-transparent backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-violet-500 p-4 rounded-xl">
                    <Grid3x3 className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-white">
                      Catalogue
                    </h2>
                    <p className="text-gray-300 text-sm">
                      Recherche et catalogue par niveau
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("BoulderRandom") + `?spraywall=${sprayWallId}`}>
            <Card className="hover:shadow-2xl transition-all hover:scale-105 cursor-pointer border-4 border-purple-400 bg-transparent backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-purple-500 p-4 rounded-xl">
                    <Dices className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-white">
                      Bloc aléatoire
                    </h2>
                    <p className="text-gray-300 text-sm">
                      Niveau min → max
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("BoulderCreate") + `?spraywall=${sprayWallId}`}>
            <Card className="hover:shadow-2xl transition-all hover:scale-105 cursor-pointer border-4 border-green-400 bg-transparent backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-green-600 p-4 rounded-xl">
                    <Plus className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-green-400">
                      Ajouter un bloc
                    </h2>
                    <p className="text-green-300 text-sm">
                      Créer un nouveau bloc
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("ContiBoucleCreate") + `?spraywall=${sprayWallId}`}>
            <Card className="hover:shadow-2xl transition-all hover:scale-105 cursor-pointer border-4 border-yellow-400 bg-transparent backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-yellow-600 p-4 rounded-xl">
                    <Plus className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-yellow-400">
                      Ajouter une boucle de conti
                    </h2>
                    <p className="text-yellow-300 text-sm">
                      Créer un enchaînement
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("BelleOuvertureCatalog") + `?spraywall=${sprayWallId}`}>
            <Card className="hover:shadow-2xl transition-all hover:scale-105 cursor-pointer border-4 border-pink-400 bg-transparent backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-pink-500 p-4 rounded-xl">
                    <Mountain className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-white">
                      Belles Ouvertures
                    </h2>
                    <p className="text-gray-300 text-sm">
                      Catalogue des belles ouvertures
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          {isAdmin && (
            <Link to={createPageUrl("SprayWallEdit") + `?id=${sprayWallId}`}>
              <Card className="hover:shadow-2xl transition-all hover:scale-105 cursor-pointer border-4 border-orange-400 bg-transparent backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-orange-600 p-4 rounded-xl">
                      <Edit className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-orange-400">
                        Modifier le spray wall
                      </h2>
                      <p className="text-orange-300 text-sm">
                        Admin seulement
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}