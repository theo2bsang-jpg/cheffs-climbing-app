import React, { useState } from 'react';
// import { SprayWall, BelleOuverture } from "@/api/entities";
import { UploadFile } from "@/api/integrations";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Save, Upload, Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { User } from "@/api/entities";

const niveaux = ["4a", "4b", "4c", "5a", "5b", "5c", "6a", "6a+", "6b", "6b+", "6c", "6c+", "7a", "7a+", "7b", "7b+", "7c", "7c+", "8a", "8a+", "8b", "8b+", "8c", "8c+", "9a", "9a+", "9b", "9b+", "9c"];

/** Wizard to create a belle ouverture with photo upload/capture. */
export default function BelleOuvertureCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const sprayWallId = urlParams.get('spraywall');

  const [user] = useState(() => {
    try {
      const raw = localStorage.getItem('currentUser');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  });

  const [nom, setNom] = useState("");
  const [ouvreur, setOuvreur] = useState("");
  const [niveau, setNiveau] = useState("6a");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showCameraDialog, setShowCameraDialog] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);

  // Fetch spray wall context to display name and keep scope
  const { data: sprayWall } = useQuery({
    queryKey: ['sprayWall', sprayWallId],
    queryFn: async () => {
      const { SprayWall } = await import("@/api/entities");
      return SprayWall.get(sprayWallId);
    },
    enabled: !!sprayWallId,
  });

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

  const startCamera = async () => {
    try {
      setShowCameraDialog(true);
      setCapturedImage(null);
      
      setTimeout(async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (error) {
      toast.error("Impossible d'accéder à la caméra");
      setShowCameraDialog(false);
      document.getElementById('photo-camera').click();
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedImage(imageDataUrl);
  };

  const confirmPhoto = async () => {
    if (!capturedImage) return;

    setUploading(true);
    try {
      const blob = await fetch(capturedImage).then(r => r.blob());
      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
      const { file_url } = await UploadFile({ file });
      setPhotoUrl(file_url);
      toast.success("Photo enregistrée");
      closeCamera();
    } catch (error) {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  const closeCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
    setShowCameraDialog(false);
    setCapturedImage(null);
  };

  // Persist the new ouverture and refresh catalog
  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        nom,
        ouvreur,
        niveau,
        description,
        photo_url: photoUrl,
        spray_wall_id: sprayWallId ? Number(sprayWallId) : null,
        created_by: user?.username
      };
      console.log('Creating belle ouverture with:', payload);
      // Dynamic import must be inside the function to ensure BelleOuverture is defined in the right scope
      const entities = await import("@/api/entities");
      return await entities.BelleOuverture.create(payload);
    },
    onSuccess: (data) => {
      console.log('Belle ouverture created:', data);
      queryClient.invalidateQueries({ queryKey: ['bellesOuvertures'] });
      toast.success("Belle ouverture créée avec succès");
      navigate(createPageUrl("BelleOuvertureCatalog") + (sprayWallId ? `?spraywall=${sprayWallId}` : ''));
    },
    onError: (error) => {
      console.error('Error creating belle ouverture:', error);
      toast.error("Erreur lors de la création");
    },
  });

  const handleSubmit = () => {
    if (!user?.username) {
      toast.error("Connectez-vous pour créer une ouverture");
      return;
    }
    if (!nom || !ouvreur || !photoUrl) {
      toast.error("Veuillez remplir tous les champs obligatoires et ajouter une photo");
      return;
    }
    createMutation.mutate();
  };

  const handleCancel = () => {
    setShowCancelDialog(true);
  };

  const confirmCancel = () => {
    navigate(-1);
  };

  if (!sprayWall) {
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
          variant="outline" 
          onClick={handleCancel}
          className="mb-4 bg-purple-900 text-white border-purple-700 hover:bg-purple-800"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Annuler
        </Button>

        <h1 className="text-3xl font-black text-slate-900 mb-2">
          ➕ Créer une Belle Ouverture
        </h1>
        <p className="text-gray-600 mb-6">{sprayWall.nom}</p>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Photo de l'ouverture</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {photoUrl ? (
                <div className="space-y-4">
                  <img 
                    src={photoUrl} 
                    alt="Preview"
                    className="w-full rounded-lg border-4 border-pink-300 shadow-lg"
                  />
                  <div className="flex gap-3">
                    <Button 
                      type="button"
                      disabled={uploading}
                      className="flex-1 bg-pink-600 hover:bg-pink-700"
                      onClick={startCamera}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Prendre une autre photo
                    </Button>
                    <Button 
                      type="button"
                      variant="outline"
                      disabled={uploading}
                      className="flex-1"
                      onClick={() => document.getElementById('photo-upload').click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Choisir une photo
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <input
                    id="photo-camera"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="flex gap-3">
                    <Button 
                      type="button"
                      disabled={uploading}
                      className="flex-1 bg-pink-600 hover:bg-pink-700"
                      onClick={startCamera}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      {uploading ? "Upload en cours..." : "Prendre une photo"}
                    </Button>
                    <Button 
                      type="button"
                      variant="outline"
                      disabled={uploading}
                      className="flex-1"
                      onClick={() => document.getElementById('photo-upload').click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Choisir une photo
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="nom">Nom de l'ouverture</Label>
                <Input
                  id="nom"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Ex: Le toit parfait"
                />
              </div>
              <div>
                <Label htmlFor="ouvreur">Nom de l'ouvreur</Label>
                <Input
                  id="ouvreur"
                  value={ouvreur}
                  onChange={(e) => setOuvreur(e.target.value)}
                  placeholder="Ex: Jean Dupont"
                />
              </div>
              <div>
                <Label htmlFor="niveau">Niveau</Label>
                <Select value={niveau} onValueChange={setNiveau}>
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
                <Label htmlFor="description">Description (optionnelle)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez l'ouverture..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <Button 
            onClick={handleSubmit}
            disabled={createMutation.isLoading}
            className="w-full bg-pink-600 hover:bg-pink-700 h-14 text-lg"
          >
            <Save className="w-5 h-5 mr-2" />
            {createMutation.isLoading ? "Création..." : "Créer la belle ouverture"}
          </Button>
        </div>

        <Dialog open={showCameraDialog} onOpenChange={(open) => !open && closeCamera()}>
          <DialogContent className="max-w-4xl p-0">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="flex items-center justify-between">
                <span>📸 Prendre une photo</span>
                <Button variant="ghost" size="icon" onClick={closeCamera}>
                  <X className="w-5 h-5" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="p-6">
              {capturedImage ? (
                <div className="space-y-4">
                  <img 
                    src={capturedImage} 
                    alt="Captured"
                    className="w-full rounded-lg border-4 border-pink-300"
                  />
                  <div className="flex gap-3">
                    <Button 
                      type="button"
                      onClick={confirmPhoto}
                      disabled={uploading}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {uploading ? "Enregistrement..." : "Valider"}
                    </Button>
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={retakePhoto}
                      className="flex-1"
                    >
                      Reprendre
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline
                    className="w-full rounded-lg border-4 border-pink-300 bg-black"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="flex gap-3">
                    <Button 
                      type="button"
                      onClick={capturePhoto}
                      className="flex-1 bg-pink-600 hover:bg-pink-700"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Capturer
                    </Button>
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={closeCamera}
                      className="flex-1"
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-slate-900">Abandonner la création ?</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir abandonner la création de la belle ouverture ? Toutes les modifications seront perdues.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Non, continuer</AlertDialogCancel>
              <AlertDialogAction onClick={confirmCancel} className="bg-red-600 hover:bg-red-700">
                Oui, abandonner
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}