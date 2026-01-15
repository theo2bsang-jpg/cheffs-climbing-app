import React, { useState, useEffect } from 'react';
import { SprayWall, Hold, Boulder, User } from "@/api/entities";
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

const niveaux = ["4a", "4b", "4c", "5a", "5b", "5c", "6a", "6a+", "6b", "6b+", "6c", "6c+", "7a", "7a+", "7b", "7b+", "7c", "7c+", "8a", "8a+", "8b", "8b+", "8c", "8c+", "9a", "9a+", "9b", "9b+", "9c"];

/** Three-step wizard to create a boulder tied to a spray wall. */
export default function BoulderCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const sprayWallId = urlParams.get('spraywall');

  const [step, setStep] = useState(1);
  const [nom, setNom] = useState("");
  const [ouvreur, setOuvreur] = useState("");
  const [niveau, setNiveau] = useState("6a");
  const [matchAutorise, setMatchAutorise] = useState(false);
  const [piedSurMainAutorise, setPiedSurMainAutorise] = useState(false);
  const [selectedHolds, setSelectedHolds] = useState([]);
  const [user, setUser] = useState(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  /** Load user and redirect if not authenticated. */
  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await User.me();
        if (!currentUser) {
          User.redirectToLogin();
          return;
        }
        setUser(currentUser);
      } catch (error) {
        User.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  // Fetch spray wall context to display photo and name
  const { data: sprayWall } = useQuery({
    queryKey: ['sprayWall', sprayWallId],
    queryFn: () => SprayWall.get(sprayWallId),
    enabled: !!sprayWallId,
    staleTime: 5 * 60 * 1000,
  });

  // Load holds for selector; cached briefly
  const { data: holds = [] } = useQuery({
    queryKey: ['holds', sprayWallId],
    queryFn: () => Hold.filter({ spray_wall_id: sprayWallId }),
    enabled: !!sprayWallId,
    staleTime: 5 * 60 * 1000,
  });

  // Persist new boulder to server/local and redirect
  const createMutation = useMutation({
    mutationFn: async () => {
      return await Boulder.create({
        nom,
        ouvreur,
        niveau,
        spray_wall_id: sprayWallId,
        match_autorise: matchAutorise,
        pied_sur_main_autorise: piedSurMainAutorise,
        holds: selectedHolds,
        created_by: user.email
      });
    },
    onSuccess: (boulder) => {
      queryClient.invalidateQueries({ queryKey: ['boulders', sprayWallId] });
      toast.success("Bloc créé avec succès");
      // support different shapes returned by server/local fallback
      const createdId = boulder?.id ?? boulder?.boulder?.id ?? (boulder && boulder.lastInsertRowid) ?? null;
      if (createdId) {
        navigate(createPageUrl("BoulderView") + `?id=${createdId}`);
      } else {
        console.warn('Could not find created boulder id in response:', boulder);
        // fallback: refresh list and go to spray wall dashboard
        navigate(createPageUrl("SprayWallDashboard") + `?id=${sprayWallId}`);
      }
    },    onError: (error) => {
      toast.error("Erreur lors de la création du bloc");
      console.error("Boulder creation error:", error);
    }  });

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
    navigate(createPageUrl("SprayWallDashboard") + `?id=${sprayWallId}`);
  };

  if (!sprayWall) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 p-4">
      <div className="max-w-4xl mx-auto pt-6 pb-20">
        <Button 
          variant="outline" 
          onClick={handleCancel}
          className="mb-4 bg-purple-900 !text-white border-purple-700 hover:bg-purple-800"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Annuler
        </Button>

        <h1 className="text-3xl font-black text-slate-900 mb-2">
          ➕ Créer un Bloc
        </h1>
        <p className="text-gray-600 mb-6">{sprayWall.nom}</p>

        <div className="mb-6">
          <div className="flex gap-2">
            <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-green-600' : 'bg-gray-200'}`} />
            <div className={`flex-1 h-2 rounded-full ${step >= 2 ? 'bg-green-600' : 'bg-gray-200'}`} />
            <div className={`flex-1 h-2 rounded-full ${step >= 3 ? 'bg-green-600' : 'bg-gray-200'}`} />
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
                  <SelectTrigger aria-label="Niveau du bloc">
                    <SelectValue placeholder="Choisir un niveau" />
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
              <Button onClick={handleStepOne} className="w-full bg-green-600 hover:bg-green-700">
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
                <Button onClick={() => setStep(1)} variant="outline" className="flex-1 border-slate-300 text-slate-900">
                  Retour
                </Button>
                <Button onClick={handleStepTwo} className="flex-1 bg-green-600 hover:bg-green-700">
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
                <Button onClick={() => setStep(2)} variant="outline" className="flex-1 border-slate-300 text-slate-900">
                  Retour
                </Button>
                <Button 
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {createMutation.isLoading ? "Création..." : "Créer le bloc"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-slate-900">Abandonner la création ?</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir abandonner la création du bloc ? Toutes les modifications seront perdues.
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