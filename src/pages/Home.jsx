import React, { useEffect, useState } from 'react';
import { User, SprayWall } from "@/api/entities";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Mountain, TrendingUp, Settings, LogOut, MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

/** Landing page that routes to the user's default spray wall or selection. */
export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /** Load authenticated user; if no default wall, send to selection, otherwise show dashboard. */
  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await User.me();
        if (!currentUser.spray_wall_par_defaut) {
          navigate(createPageUrl("SprayWallSelect"));
          return;
        }
        setUser(currentUser);
      } catch (error) {
        User.redirectToLogin();
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [navigate]);

  // Fetch selected spray wall once user default is known
  const { data: sprayWall } = useQuery({
    queryKey: ['sprayWall', user?.spray_wall_par_defaut],
    queryFn: () => SprayWall.get(user.spray_wall_par_defaut),
    enabled: !!user?.spray_wall_par_defaut,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-violet-500 to-purple-600">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-violet-500 to-purple-600 p-4">
      <div className="max-w-md mx-auto pt-8 pb-20">
        <div className="text-center mb-12">
          <div className="inline-block bg-transparent border-4 border-orange-400 rounded-full p-6 mb-4 shadow-2xl backdrop-blur-sm">
            <Mountain className="w-16 h-16 text-orange-400" />
          </div>
          <h1 className="text-5xl font-black text-white mb-2 tracking-tight">
            CHEFFS!
          </h1>
          {sprayWall && (
            <div className="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border-2 border-white">
              <MapPin className="w-4 h-4 text-white" />
              <span className="text-white font-semibold">{sprayWall.nom}</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Link to={createPageUrl("SprayWallDashboard") + `?id=${user?.spray_wall_par_defaut}`}>
            <Card className="hover:shadow-2xl transition-all hover:scale-105 cursor-pointer border-4 border-violet-400 bg-transparent backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <Mountain className="w-16 h-16 mx-auto mb-4 text-violet-400" />
                <h2 className="text-3xl font-black text-white mb-2">
                  Spray Wall
                </h2>
                <p className="text-gray-300">
                  Catalogue de blocs et boucles
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("Performance")}>
            <Card className="hover:shadow-2xl transition-all hover:scale-105 cursor-pointer border-4 border-orange-400 bg-transparent backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <TrendingUp className="w-16 h-16 mx-auto mb-4 text-orange-400" />
                <h2 className="text-3xl font-black text-white mb-2">
                  Performance
                </h2>
                <p className="text-gray-300">
                  Vos statistiques
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="mt-8 space-y-3">
          <Link to={createPageUrl("SprayWallSelect")} className="w-full">
            <Button variant="outline" className="w-full bg-white/20 border-white text-white hover:bg-white hover:text-violet-600">
              <MapPin className="w-4 h-4 mr-2" />
              Changer de lieu
            </Button>
          </Link>
          {user?.is_global_admin && (
            <Link to={createPageUrl("UserManagement")} className="w-full">
              <Button variant="outline" className="w-full bg-white/20 border-white text-white hover:bg-white hover:text-violet-600">
                <Plus className="w-4 h-4 mr-2" />
                Gestion des utilisateurs
              </Button>
            </Link>
          )}
          
          <div className="flex gap-3">
            <Link to={createPageUrl("Settings")} className="flex-1">
              <Button variant="outline" className="w-full bg-white/20 border-white text-white hover:bg-white hover:text-violet-600">
                <Settings className="w-4 h-4 mr-2" />
                Paramètres
              </Button>
            </Link>
            <Button 
              variant="outline" 
              onClick={() => User.logout()}
              className="flex-1 bg-white/20 border-white text-white hover:bg-white hover:text-red-600"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}