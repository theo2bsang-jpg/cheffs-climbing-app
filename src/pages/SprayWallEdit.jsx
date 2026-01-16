import React, { useEffect, useMemo, useState } from 'react';
// import { User, SprayWall, Hold, Boulder, ContiBoucle } from "@/api/entities";
import { UploadFile } from "@/api/integrations";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Save, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import PhotoAnnotator from '../components/spraywall/PhotoAnnotator';
import { User } from "@/api/entities";

/** Admin/sub-admin tool to update wall info, photo, and holds. */
export default function SprayWallEdit() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const sprayWallId = urlParams.get('id');

  const dashboardUrl = useMemo(
    () => createPageUrl("SprayWallDashboard") + `?id=${sprayWallId}`,
    [sprayWallId]
  );
  const sprayWallQueryKey = useMemo(() => ['sprayWall', sprayWallId], [sprayWallId]);
  const holdsQueryKey = useMemo(() => ['holds', sprayWallId], [sprayWallId]);

  const [user, setUser] = useState(null);
  const [nom, setNom] = useState("");
  const [lieu, setLieu] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [holds, setHolds] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [editingHolds, setEditingHolds] = useState(false);
  const fileInputRef = React.useRef();

  // Export spray wall and holds as JSON
  const handleExport = () => {
    if (!sprayWall) return;
    const exportData = {
      sprayWall: {
        id: sprayWall.id,
        nom: sprayWall.nom,
        lieu: sprayWall.lieu,
        photo_url: sprayWall.photo_url,
      },
      holds: holds,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spraywall-${sprayWall.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import spray wall and holds from JSON
  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.sprayWall) {
        setNom(data.sprayWall.nom || "");
        setLieu(data.sprayWall.lieu || "");
        setPhotoUrl(data.sprayWall.photo_url || "");
      }
      if (Array.isArray(data.holds)) {
        // Remove id from imported holds so they are created
        const holdsToImport = data.holds.map(h => {
          const { id, ...rest } = h;
          return rest;
        });
        setHolds(holdsToImport);
      }
      toast.success("Import JSON réussi, sauvegarde en cours...");
      // Close editing holds if open to prevent override
      setEditingHolds(false);
      // Wait for state to update, then persist
      setTimeout(() => {
        updateMutation.mutate({ redirect: false });
      }, 100);
    } catch (err) {
      toast.error("Erreur import JSON");
    }
  };

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

  const { data: sprayWall } = useQuery({
    queryKey: sprayWallQueryKey,
    queryFn: async () => {
      const { SprayWall } = await import("@/api/entities");
      return SprayWall.get(sprayWallId);
    },
    enabled: !!sprayWallId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: existingHolds = [] } = useQuery({
    queryKey: holdsQueryKey,
    queryFn: async () => {
      const { Hold } = await import("@/api/entities");
      return Hold.filter({ spray_wall_id: sprayWallId });
    },
    enabled: !!sprayWallId,
    staleTime: 5 * 60 * 1000,
  });

  /** Mirror fetched holds into local editable state once loaded. */
  useEffect(() => {
    if (existingHolds.length > 0 && holds.length === 0) {
      setHolds(existingHolds);
    }
  }, [existingHolds, holds.length]);

  /** Hydrate inputs from spray wall once fetched. */
  useEffect(() => {
    if (sprayWall) {
      setNom(sprayWall.nom);
      setLieu(sprayWall.lieu);
      setPhotoUrl(sprayWall.photo_url);
    }
  }, [sprayWall]);

  const isAdmin = user?.is_global_admin;
  const isSubAdmin = user?.email === sprayWall?.sous_admin_email;
  const isUnauthorized = user && sprayWall && !isAdmin && !isSubAdmin;

  /** Block access if user lacks admin/sub-admin rights. */
  useEffect(() => {
    if (isUnauthorized) {
      toast.error("Accès non autorisé");
      navigate(dashboardUrl);
    }
  }, [isUnauthorized, navigate, dashboardUrl]);

  /** Upload wall photo to storage and store returned URL. */
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      setPhotoUrl(file_url);
      toast.success("Photo uploadée");
    } catch (error) {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  // Save wall + holds; mark dependent routes when holds removed
  const updateMutation = useMutation({
    mutationFn: async ({ redirect } = {}) => {
      const { SprayWall, Hold } = await import("@/api/entities");
      await SprayWall.update(sprayWallId, {
        nom,
        lieu,
        photo_url: photoUrl
      });

      // Overwrite or create all imported holds
      const importedIds = holds.map(h => h.id).filter(Boolean);
      // Delete holds not present in import
      const holdsToDelete = existingHolds.filter(h => !importedIds.includes(h.id));
      await Promise.all(
        holdsToDelete.map(hold => Hold.delete(hold.id))
      );
      for (const hold of holds) {
        if (hold.id) {
          // Try to update, if fails, create
          try {
            await Hold.update(hold.id, {
              nom: hold.nom,
              spray_wall_id: sprayWallId,
              x: hold.x,
              y: hold.y
            });
          } catch (e) {
            await Hold.create({
              id: hold.id,
              nom: hold.nom,
              spray_wall_id: sprayWallId,
              x: hold.x,
              y: hold.y
            });
          }
        } else {
          await Hold.create({
            nom: hold.nom,
            spray_wall_id: sprayWallId,
            x: hold.x,
            y: hold.y
          });
        }
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries(sprayWallQueryKey);
      queryClient.invalidateQueries(holdsQueryKey);
      queryClient.invalidateQueries({ queryKey: ['boulders', sprayWallId] });
      queryClient.invalidateQueries({ queryKey: ['contiBoucles', sprayWallId] });
      toast.success("Spray wall mis à jour");
      if (variables?.redirect) {
        navigate(dashboardUrl);
      }
    },
  });

  if (!user || !sprayWall) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 p-4">
      <div className="max-w-4xl mx-auto pt-6 pb-20">
        <Button 
          variant="outline" 
          onClick={() => navigate(dashboardUrl)}
          className="mb-4 bg-purple-900 text-white border-purple-700 hover:bg-purple-800"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>

        <h1 className="text-3xl font-black text-slate-900 mb-6">
          ✏️ Modifier le Spray Wall
        </h1>

        <div className="flex gap-3 mb-6">
          <Button variant="secondary" onClick={handleExport}>
            Exporter en JSON
          </Button>
          <input
            type="file"
            accept="application/json"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleImport}
          />
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            Importer depuis JSON
          </Button>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="nom">Nom du Spray Wall</Label>
                <Input
                  id="nom"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="lieu">Lieu</Label>
                <Input
                  id="lieu"
                  value={lieu}
                  onChange={(e) => setLieu(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="photo">Changer la photo</Label>
                <div className="mt-2">
                  <input
                    id="photo"
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <label htmlFor="photo">
                    <Button 
                      type="button"
                      disabled={uploading}
                      className="bg-blue-600 hover:bg-blue-700 cursor-pointer"
                      onClick={() => document.getElementById('photo').click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? "Upload en cours..." : "Uploader une nouvelle photo"}
                    </Button>
                  </label>
                </div>
                {photoUrl && (
                  <p className="text-sm text-green-600 mt-2">✓ Photo chargée</p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold holds-heading">Prises ({holds.length})</h3>
                </div>
                {photoUrl ? (
                  !editingHolds ? (
                    <div>
                      <p className="text-sm text-gray-600 mb-4">
                        {holds.length} prises actuellement placées
                      </p>
                      <Button 
                        onClick={() => setEditingHolds(true)}
                        className="w-full bg-violet-600 hover:bg-violet-700"
                      >
                        Modifier l'emplacement des prises
                      </Button>
                    </div>
                  ) : (
                    <PhotoAnnotator
                      photoUrl={photoUrl}
                      existingHolds={holds}
                      onSave={(newHolds) => {
                        setHolds(newHolds);
                        setEditingHolds(false);
                      }}
                      onCancel={() => setEditingHolds(false)}
                    />
                  )
                ) : (
                  <p className="text-sm text-gray-500">Ajoutez une photo pour gérer les prises.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {!editingHolds && (
            <Button
              onClick={() => updateMutation.mutate({ redirect: true })}
              disabled={updateMutation.isLoading}
              className="w-full bg-orange-600 hover:bg-orange-700 h-14 text-lg"
            >
              <Save className="w-5 h-5 mr-2" />
              {updateMutation.isLoading ? "Enregistrement..." : "Enregistrer les modifications"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}