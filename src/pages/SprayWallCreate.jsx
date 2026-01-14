import React, { useState, useEffect } from 'react';
import { User, SprayWall, Hold } from "@/api/entities";
import { UploadFile } from "@/api/integrations";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Upload, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import PhotoAnnotator from '../components/spraywall/PhotoAnnotator';

/** Admin-only wizard to create a spray wall with photo + holds. */
export default function SprayWallCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [nom, setNom] = useState("");
  const [lieu, setLieu] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [holds, setHolds] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState(1);

  /** Require admin and redirect otherwise. */
  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await User.me();
        if (!currentUser.is_global_admin) {
          toast.error("Accès non autorisé");
          navigate(createPageUrl("Home"));
          return;
        }
        setUser(currentUser);
      } catch (error) {
        User.redirectToLogin();
      }
    };
    loadUser();
  }, [navigate]);

  /** Upload wall photo then advance to hold placement. */
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      setPhotoUrl(file_url);
      toast.success("Photo uploadée");
      setStep(2);
    } catch (error) {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  // Persist wall then bulk-create holds; set as user's default
  const createMutation = useMutation({
    mutationFn: async () => {
      const sprayWall = await SprayWall.create({
        nom,
        lieu,
        photo_url: photoUrl
      });

      const holdPromises = holds.map(hold =>
        Hold.create({
          nom: hold.nom,
          spray_wall_id: sprayWall.id,
          x: hold.x,
          y: hold.y
        })
      );

      await Promise.all(holdPromises);
      return sprayWall;
    },
    onSuccess: async (sprayWall) => {
      queryClient.invalidateQueries(['sprayWalls']);
      await User.updateMe({ spray_wall_par_defaut: sprayWall.id });
      toast.success("Lieu créé avec succès");
      navigate(createPageUrl("Home"));
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50 p-4">
      <div className="max-w-4xl mx-auto pt-6 pb-20">
        <Button 
          variant="outline" 
          onClick={() => navigate(createPageUrl("SprayWallSelect"))}
          className="mb-4 bg-purple-900 text-white border-purple-700 hover:bg-purple-800"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>

        <h1 className="text-3xl font-black text-slate-900 mb-6">
          ➕ Ajouter un nouveau lieu
        </h1>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Étape 1 : Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="nom">Nom du lieu de grimpe</Label>
                <Input
                  id="nom"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Ex: Salle Boulder Factory"
                  className="text-slate-900"
                />
              </div>
              <div>
                <Label htmlFor="lieu">Ville / Adresse</Label>
                <Input
                  id="lieu"
                  value={lieu}
                  onChange={(e) => setLieu(e.target.value)}
                  placeholder="Ex: Paris 11ème"
                  className="text-slate-900"
                />
              </div>
              <div>
                <Label htmlFor="photo">Photo du mur</Label>
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
                      disabled={uploading || !nom || !lieu}
                      className="bg-blue-600 hover:bg-blue-700 cursor-pointer"
                      onClick={() => document.getElementById('photo').click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? "Upload en cours..." : "Uploader une photo"}
                    </Button>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {photoUrl && step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Étape 2 : Placer les prises</CardTitle>
              </CardHeader>
              <CardContent>
                <PhotoAnnotator
                  photoUrl={photoUrl}
                  existingHolds={holds}
                  onSave={(newHolds) => {
                    setHolds(newHolds);
                    setStep(3);
                  }}
                  onCancel={() => navigate(createPageUrl("SprayWallSelect"))}
                />
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center mb-4">
                  <p className="text-lg font-semibold" style={{color: '#0f172a'}}>
                    ✅ Lieu prêt à être créé
                  </p>
                  <p className="text-sm" style={{color: '#334155'}}>
                    {holds.length} prises placées
                  </p>
                </div>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isLoading}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {createMutation.isLoading ? "Création..." : "Créer le lieu"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}