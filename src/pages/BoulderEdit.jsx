import React, { useState, useEffect } from 'react';
// import { Boulder, SprayWall, Hold, User } from "@/api/entities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
import HoldSelector from '../components/spraywall/HoldSelector';
import BoulderPreview from '../components/spraywall/BoulderPreview';
import { User } from "@/api/entities";

const niveaux = ["4a", "4b", "4c", "5a", "5b", "5c", "6a", "6a+", "6b", "6b+", "6c", "6c+", "7a", "7a+", "7b", "7b+", "7c", "7c+", "8a", "8a+", "8b", "8b+", "8c", "8c+", "9a", "9a+", "9b", "9b+", "9c"];

/** Edit an existing boulder with 3-step wizard and delete option. */
export default function BoulderEdit() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const boulderId = urlParams.get('id');

  const [step, setStep] = useState(1);
  const [nom, setNom] = useState("");
  const [ouvreur, setOuvreur] = useState("");
  const [niveau, setNiveau] = useState("6a");
  const [matchAutorise, setMatchAutorise] = useState(false);
  const [piedSurMainAutorise, setPiedSurMainAutorise] = useState(false);
  const [selectedHolds, setSelectedHolds] = useState([]);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [user, setUser] = useState(null);

  const { data: boulder } = useQuery({
    queryKey: ['boulder', boulderId],
    queryFn: async () => {
      const { Boulder } = await import("@/api/entities");
      return Boulder.get(boulderId);
    },
    enabled: !!boulderId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: sprayWall } = useQuery({
    queryKey: ['sprayWall', boulder?.spray_wall_id],
    queryFn: async () => {
      const { SprayWall } = await import("@/api/entities");
      return SprayWall.get(boulder.spray_wall_id);
    },
    enabled: !!boulder?.spray_wall_id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: holds = [] } = useQuery({
    queryKey: ['holds', boulder?.spray_wall_id],
    queryFn: async () => {
      const { Hold } = await import("@/api/entities");
      return Hold.filter({ spray_wall_id: boulder.spray_wall_id });
    },
    enabled: !!boulder?.spray_wall_id,
    staleTime: 5 * 60 * 1000,
  });

  /** Prefill form from fetched boulder. */
  useEffect(() => {
    if (boulder) {
      setNom(boulder.nom);
      setOuvreur(boulder.ouvreur);
      setNiveau(boulder.niveau);
      setMatchAutorise(boulder.match_autorise || false);
      setPiedSurMainAutorise(boulder.pied_sur_main_autorise || false);
      setSelectedHolds(boulder.holds || []);
    }
  }, [boulder]);

  /** Load user to gate delete permissions. */
  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
      } catch (error) {
        console.error(error);
      }
    };
    loadUser();
  }, []);

  // Save edits and clear replaced flag
  const updateMutation = useMutation({
    mutationFn: async () => {
      return await Boulder.update(boulderId, {
        nom,
        ouvreur,
        niveau,
        match_autorise: matchAutorise,
        pied_sur_main_autorise: piedSurMainAutorise,
        holds: selectedHolds,
        prise_remplacee: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['boulder']);
      queryClient.invalidateQueries(['boulders']);
      toast.success("Bloc modifié avec succès");
      navigate(createPageUrl("BoulderView") + `?id=${boulderId}`);
    },
  });

  const handleStepOne = () => {
    if (!nom || !ouvreur) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    setStep(2);
  };

  const handleStepTwo = () => {
    if (selectedHolds.length === 0) {
      toast.error("Sélectionnez au moins une prise");
      return;
    }
    setStep(3);
  };

  const handleCancel = () => {
    setShowCancelDialog(true);
  };

  const confirmCancel = () => {
    navigate(createPageUrl("BoulderView") + `?id=${boulderId}`);
  };

  // Admin/sub-admin delete
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await Boulder.delete(boulderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['boulders']);
      toast.success("Bloc supprimé avec succès");
      navigate(createPageUrl("BoulderCatalog") + `?spraywall=${boulder.spray_wall_id}`);
    },
  });

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate();
  };

  const canDelete = user && (user.is_global_admin || user.email === sprayWall?.sous_admin_email);

  if (!boulder || !sprayWall) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
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
          ✏️ Modifier le Bloc
        </h1>
        <p className="text-gray-600 mb-6">{sprayWall.nom}</p>

        <div className="mb-6">
          <div className="flex gap-2">
            <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <div className={`flex-1 h-2 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <div className={`flex-1 h-2 rounded-full ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`} />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span>Infos</span>
            <span>Prises</span>
            <span>Validation</span>
          </div>
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Informations du bloc</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="nom">Nom du bloc</Label>
                <Input
                  id="nom"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Ex: Le surplomb bleu"
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
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="match" 
                  checked={matchAutorise}
                  onCheckedChange={setMatchAutorise}
                />
                <label htmlFor="match" className="text-sm cursor-pointer">
                  Match autorisé
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="pied" 
                  checked={piedSurMainAutorise}
                  onCheckedChange={setPiedSurMainAutorise}
                />
                <label htmlFor="pied" className="text-sm cursor-pointer">
                  Pied sur main autorisé
                </label>
              </div>
              <Button onClick={handleStepOne} className="w-full bg-blue-600 hover:bg-blue-700">
                Suivant
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Sélection des prises</CardTitle>
            </CardHeader>
            <CardContent>
              <HoldSelector
                photoUrl={sprayWall.photo_url}
                availableHolds={holds}
                selectedHolds={selectedHolds}
                onHoldsChange={setSelectedHolds}
              />
              <div className="flex gap-3 mt-6">
                <Button onClick={() => setStep(1)} variant="outline" className="flex-1">
                  Retour
                </Button>
                <Button onClick={handleStepTwo} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  Suivant
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Prévisualisation du bloc</CardTitle>
            </CardHeader>
            <CardContent>
              <BoulderPreview
                photoUrl={sprayWall.photo_url}
                holds={selectedHolds}
                allHolds={holds}
                boulderData={{
                  nom,
                  ouvreur,
                  niveau,
                  match_autorise: matchAutorise,
                  pied_sur_main_autorise: piedSurMainAutorise
                }}
              />
              <div className="flex gap-3 mt-6">
                <Button onClick={() => setStep(2)} variant="outline" className="flex-1">
                  Retour
                </Button>
                <Button 
                  onClick={() => updateMutation.mutate()}
                  disabled={updateMutation.isLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateMutation.isLoading ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>

              {canDelete && (
                <div className="mt-6 pt-6 border-t">
                  <Button 
                    onClick={handleDelete}
                    variant="destructive"
                    className="w-full bg-red-700 hover:bg-red-800 text-white"
                  >
                    🗑️ Supprimer ce bloc
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Abandonner les modifications ?</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir abandonner les modifications ? Toutes les modifications seront perdues.
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

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce bloc ?</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer définitivement ce bloc ? Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDelete}
                disabled={deleteMutation.isLoading}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleteMutation.isLoading ? "Suppression..." : "Oui, supprimer"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}