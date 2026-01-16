import React, { useState, useEffect } from 'react';
// import { User, Ascension, Test, BlocMax, VoieMax, Boulder, ContiBoucle } from "@/api/entities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, TrendingUp, Target, Award, Calendar, Plus, Search, Activity, Mountain, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
} from '@/components/ui/alert-dialog';
import LevelBadge from '../components/shared/LevelBadge';
import TestForm from '../components/performance/TestForm';
import TestHistory from '../components/performance/TestHistory';
import TestChart from '../components/performance/TestChart';
import { User } from "@/api/entities";

/** Track ascensions, tests, and maxes with logging flows and charts. */
export default function Performance() {
  const [user, setUser] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [essais, setEssais] = useState(1);
  const [notes, setNotes] = useState('');
  const [style, setStyle] = useState('flash');
  
  // États pour Blocs Max
  const [blocMaxNom, setBlocMaxNom] = useState('');
  const [blocMaxLieu, setBlocMaxLieu] = useState('');
  const [blocMaxNiveau, setBlocMaxNiveau] = useState('6a');
  const [blocMaxStyle, setBlocMaxStyle] = useState('flash');
  const [blocMaxEssais, setBlocMaxEssais] = useState(1);
  const [blocMaxNotes, setBlocMaxNotes] = useState('');
  const [blocMaxDate, setBlocMaxDate] = useState(new Date().toISOString().split('T')[0]);

  // États pour Voies Max
  const [voieMaxNom, setVoieMaxNom] = useState('');
  const [voieMaxLieu, setVoieMaxLieu] = useState('');
  const [voieMaxNiveau, setVoieMaxNiveau] = useState('6a');
  const [voieMaxStyle, setVoieMaxStyle] = useState('flash');
  const [voieMaxEssais, setVoieMaxEssais] = useState(1);
  const [voieMaxNotes, setVoieMaxNotes] = useState('');
  const [voieMaxDate, setVoieMaxDate] = useState(new Date().toISOString().split('T')[0]);

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const { User } = await import("@/api/entities");
        const currentUser = await User.me();
        setUser(currentUser);
      } catch (error) {
        const { User } = await import("@/api/entities");
        User.logout();
      }
    };
    loadUser();
  }, []);

  const { data: ascensions = [] } = useQuery({
    queryKey: ['ascensions', user?.email],
    queryFn: async () => {
      const { Ascension } = await import("@/api/entities");
      return Ascension.filter({ user_email: user.email }, '-date');
    },
    enabled: !!user?.email,
  });

  const { data: tests = [] } = useQuery({
    queryKey: ['tests', user?.email],
    queryFn: async () => {
      const { Test } = await import("@/api/entities");
      return Test.filter({ user_email: user.email }, '-date');
    },
    enabled: !!user?.email,
  });

  const { data: blocsMax = [] } = useQuery({
    queryKey: ['blocsMax'],
    queryFn: async () => {
      const { BlocMax } = await import("@/api/entities");
      return BlocMax.list('-date');
    },
    enabled: !!user,
  });

  const { data: voiesMax = [] } = useQuery({
    queryKey: ['voiesMax'],
    queryFn: async () => {
      const { VoieMax } = await import("@/api/entities");
      return VoieMax.list('-date');
    },
    enabled: !!user,
  });

  const { data: boulders = [] } = useQuery({
    queryKey: ['boulders', user?.spray_wall_par_defaut],
    queryFn: async () => {
      const { Boulder } = await import("@/api/entities");
      return Boulder.filter({ spray_wall_id: user.spray_wall_par_defaut });
    },
    enabled: !!user?.spray_wall_par_defaut && showDialog,
  });

  const { data: boucles = [] } = useQuery({
    queryKey: ['boucles', user?.spray_wall_par_defaut],
    queryFn: async () => {
      const { ContiBoucle } = await import("@/api/entities");
      return ContiBoucle.filter({ spray_wall_id: user.spray_wall_par_defaut });
    },
    enabled: !!user?.spray_wall_par_defaut && showDialog,
  });

  const logAscensionMutation = useMutation({
    mutationFn: async (data) => {
      const { Ascension } = await import("@/api/entities");
      await Ascension.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ascensions'] });
      toast.success('✅ Ascension enregistrée !');
      setShowDialog(false);
      setSearchTerm('');
      setSelectedItem(null);
      setEssais(1);
      setNotes('');
      setStyle('flash');
    },
  });

  const deleteAscensionMutation = useMutation({
    mutationFn: async (id) => {
      const { Ascension } = await import("@/api/entities");
      return Ascension.delete(id);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ascensions'] }); toast.success('Ascension supprimée'); },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const deleteTestMutation = useMutation({
    mutationFn: async (id) => {
      const { Test } = await import("@/api/entities");
      return Test.delete(id);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tests'] }); toast.success('Test supprimé'); },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const deleteBlocMaxMutation = useMutation({
    mutationFn: async (id) => {
      const { BlocMax } = await import("@/api/entities");
      return BlocMax.delete(id);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['blocsMax'] }); toast.success('Bloc max supprimé'); },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const deleteVoieMaxMutation = useMutation({
    mutationFn: async (id) => {
      const { VoieMax } = await import("@/api/entities");
      return VoieMax.delete(id);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['voiesMax'] }); toast.success('Voie max supprimée'); },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, type: null, label: null });

  const handleLogAscension = () => {
    if (!selectedItem) {
      toast.error('Sélectionnez un bloc ou une boucle');
      return;
    }
    logAscensionMutation.mutate({
      boulder_id: selectedItem.id,
      boulder_nom: selectedItem.nom,
      boulder_niveau: selectedItem.niveau,
      type: selectedItem.type,
      style,
      spray_wall_id: selectedItem.spray_wall_id,
      user_email: user?.email,
      date: new Date().toISOString().split('T')[0],
      essais,
      notes,
    });
  };

  const confirmDelete = () => {
    const { id, type } = deleteDialog;
    if (!id || !type) return setDeleteDialog({ open: false, id: null, type: null, label: null });
    if (type === 'ascension') deleteAscensionMutation.mutate(id);
    if (type === 'test') deleteTestMutation.mutate(id);
    if (type === 'bloc') deleteBlocMaxMutation.mutate(id);
    if (type === 'voie') deleteVoieMaxMutation.mutate(id);
    setDeleteDialog({ open: false, id: null, type: null, label: null });
  };

  const logTestMutation = useMutation({
    mutationFn: async (data) => {
      const { Test } = await import("@/api/entities");
      await Test.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests'] });
      toast.success('✅ Test enregistré !');
      setShowTestDialog(false);
    },
  });

  const handleLogTest = (testData) => {
    logTestMutation.mutate({ ...testData, user_email: user?.email });
  };

  const createBlocMaxMutation = useMutation({
    mutationFn: async (data) => {
      const { BlocMax } = await import("@/api/entities");
      return BlocMax.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocsMax'] });
      toast.success('Bloc max enregistré');
      setBlocMaxNom('');
      setBlocMaxLieu('');
      setBlocMaxNiveau('6a');
      setBlocMaxStyle('flash');
      setBlocMaxEssais(1);
      setBlocMaxNotes('');
      setBlocMaxDate(new Date().toISOString().split('T')[0]);
    },
  });

  const createVoieMaxMutation = useMutation({
    mutationFn: async (data) => {
      const { VoieMax } = await import("@/api/entities");
      return VoieMax.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voiesMax'] });
      toast.success('Voie max enregistrée');
      setVoieMaxNom('');
      setVoieMaxLieu('');
      setVoieMaxNiveau('6a');
      setVoieMaxStyle('flash');
      setVoieMaxEssais(1);
      setVoieMaxNotes('');
      setVoieMaxDate(new Date().toISOString().split('T')[0]);
    },
  });

  const handleBlocMaxSubmit = () => {
    if (!blocMaxNom || !blocMaxLieu) {
      toast.error('Nom et lieu requis');
      return;
    }
    createBlocMaxMutation.mutate({
      nom: blocMaxNom,
      lieu: blocMaxLieu,
      niveau: blocMaxNiveau,
      style: blocMaxStyle,
      date: blocMaxDate,
      essais: blocMaxStyle === 'apres_travail' ? blocMaxEssais : undefined,
      notes: blocMaxNotes,
      user_email: user?.email,
    });
  };

  const handleVoieMaxSubmit = () => {
    if (!voieMaxNom || !voieMaxLieu) {
      toast.error('Nom et lieu requis');
      return;
    }
    createVoieMaxMutation.mutate({
      nom: voieMaxNom,
      lieu: voieMaxLieu,
      niveau: voieMaxNiveau,
      style: voieMaxStyle,
      date: voieMaxDate,
      essais: voieMaxStyle === 'apres_travail' ? voieMaxEssais : undefined,
      notes: voieMaxNotes,
      user_email: user?.email,
    });
  };

  const stats = {
    total: ascensions.length,
    boulders: ascensions.filter(a => a.type === 'boulder').length,
    boucles: ascensions.filter(a => a.type === 'boucle').length,
    thisMonth: ascensions.filter(a => {
      const date = new Date(a.date);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length,
  };

  const niveaux = ["4a", "4b", "4c", "5a", "5b", "5c", "6a", "6a+", "6b", "6b+", "6c", "6c+", "7a", "7a+", "7b", "7b+", "7c", "7c+", "8a", "8a+", "8b", "8b+", "8c", "8c+", "9a", "9a+", "9b", "9b+", "9c"];
  
  const maxNiveauThisMonth = ascensions
    .filter(a => {
      const date = new Date(a.date);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    })
    .reduce((max, a) => {
      const currentIndex = niveaux.indexOf(a.boulder_niveau);
      const maxIndex = niveaux.indexOf(max);
      return currentIndex > maxIndex ? a.boulder_niveau : max;
    }, "4a");

  const maxBlocMaxThisMonth = blocsMax
    .filter(b => {
      const date = new Date(b.date);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    })
    .reduce((max, b) => {
      const currentIndex = niveaux.indexOf(b.niveau);
      const maxIndex = niveaux.indexOf(max);
      return currentIndex > maxIndex ? b.niveau : max;
    }, "4a");

  const maxVoieMaxThisMonth = voiesMax
    .filter(v => {
      const date = new Date(v.date);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    })
    .reduce((max, v) => {
      const currentIndex = niveaux.indexOf(v.niveau);
      const maxIndex = niveaux.indexOf(max);
      return currentIndex > maxIndex ? v.niveau : max;
    }, "4a");

  const recentAscensions = ascensions.slice(0, 10);

  const allItems = [
    ...boulders.map(b => ({ ...b, type: 'boulder' })),
    ...boucles.map(b => ({ ...b, type: 'boucle' }))
  ];

  const filteredItems = searchTerm
    ? allItems.filter(item => 
        item.nom.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : allItems;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-[#A4B89A]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-4xl mx-auto pt-6 pb-20">
        <Link to={createPageUrl("Home")}>
          <Button variant="outline" className="mb-4 bg-purple-900 text-white border-purple-700 hover:bg-purple-800">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Accueil
          </Button>
        </Link>

        <div className="text-center mb-8">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 text-[#A4B89A]" />
          <h1 className="text-3xl font-black text-white mb-2">
            Performances
          </h1>
          <p className="text-gray-400">
            Suivez votre progression
          </p>
        </div>

        <div className="space-y-8">
          <Card className="bg-[#F8F6F4] border-2 border-[#A4B89A]">
            <CardHeader>
              <CardTitle className="text-[#1E2827] flex items-center gap-2">
                <Mountain className="w-5 h-5 text-[#A4B89A]" />
                Blocs du spray wall
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button className="w-full mb-6 bg-[#A4B89A] hover:bg-[#7A8E72] text-white">
              <Plus className="w-4 h-4 mr-2" />
              Enregistrer une ascension
            </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#F8F6F4] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-[#1E2827]">Nouvelle ascension</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Rechercher un bloc ou boucle</label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Nom du bloc..."
                    className="pl-10"
                  />
                </div>
              </div>

              {!selectedItem && (
                <div className="max-h-[200px] overflow-y-auto space-y-2">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className="p-3 bg-white rounded-lg border border-gray-200 hover:border-[#A4B89A] cursor-pointer transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-[#1E2827]">
                            {item.type === 'boulder' ? '🧗' : '🔁'} {item.nom}
                          </p>
                          <p className="text-xs text-gray-500">{item.ouvreur}</p>
                        </div>
                        <LevelBadge niveau={item.niveau} />
                      </div>
                    </div>
                  ))}
                  {filteredItems.length === 0 && (
                    <p className="text-center text-gray-500 py-4">Aucun résultat</p>
                  )}
                </div>
              )}

              {selectedItem && (
                <div className="p-3 bg-[#A4B89A]/10 rounded-lg border-2 border-[#A4B89A]">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-[#1E2827]">
                        {selectedItem.type === 'boulder' ? '🧗' : '🔁'} {selectedItem.nom}
                      </p>
                      <p className="text-xs text-gray-500">{selectedItem.ouvreur}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setSelectedItem(null)}
                    >
                      Changer
                    </Button>
                  </div>
                  <LevelBadge niveau={selectedItem.niveau} />
                </div>
              )}

              {selectedItem && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Style de réalisation</label>
                    <RadioGroup value={style} onValueChange={setStyle}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="flash" id="flash" />
                        <Label htmlFor="flash" className="cursor-pointer">⚡ Flash</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="a_vue" id="a_vue" />
                        <Label htmlFor="a_vue" className="cursor-pointer">👁️ À vue</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="apres_travail" id="apres_travail" />
                        <Label htmlFor="apres_travail" className="cursor-pointer">🔨 Après travail</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  {style === 'apres_travail' && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Nombre d'essais</label>
                      <Input
                        type="number"
                        min="1"
                        value={essais}
                        onChange={(e) => setEssais(parseInt(e.target.value) || 1)}
                        className="mt-1"
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Notes (optionnel)</label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Remarques..."
                      className="mt-1"
                    />
                  </div>
                  <Button 
                    onClick={handleLogAscension}
                    className="w-full bg-[#A4B89A] hover:bg-[#7A8E72]"
                    disabled={logAscensionMutation.isPending}
                  >
                    Enregistrer
                  </Button>
                </>
              )}
              </div>
              </DialogContent>
            </Dialog>

            <div className="grid grid-cols-2 gap-3 mb-6">
            <Card className="bg-white border border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black text-[#1E2827]">{stats.total}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.boulders} blocs • {stats.boucles} boucles
              </p>
            </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
                <Award className="w-4 h-4" />
                Niveau max ce mois
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LevelBadge niveau={maxNiveauThisMonth} />
            </CardContent>
            </Card>
            </div>

          {recentAscensions.length > 0 ? (
            <Card className="bg-white border border-gray-200">
            <CardHeader>
              <CardTitle className="text-[#1E2827]">Historique récent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentAscensions.map((ascension) => {
                  const styleEmoji = ascension.style === 'flash' ? '⚡' : ascension.style === 'a_vue' ? '👁️' : '🔨';
                  return (
                    <div 
                      key={ascension.id}
                      className="p-3 bg-[#F8F6F4] rounded-lg border border-gray-200 flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-[#1E2827]">
                          {ascension.type === 'boulder' ? '🧗' : '🔁'} {ascension.boulder_nom} {styleEmoji}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(ascension.date).toLocaleDateString('fr-FR')}
                          {ascension.essais > 1 && ` • ${ascension.essais} essais`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <LevelBadge niveau={ascension.boulder_niveau} />
                        <Button size="sm" variant="destructive" onClick={() => setDeleteDialog({ open: true, id: ascension.id, type: 'ascension', label: ascension.boulder_nom })}>Supprimer</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          ) : (
            <Card className="bg-white border border-gray-200 text-center p-8">
              <CardContent>
                <Award className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 mb-4">
                  Aucune ascension enregistrée
                </p>
                <p className="text-sm text-gray-500">
              Cliquez sur "Enregistrer une ascension" ci-dessus
                </p>
              </CardContent>
            </Card>
          )}
            </CardContent>
          </Card>

          <Card className="bg-[#F8F6F4] border-2 border-[#A4B89A]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#1E2827] flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-[#A4B89A]" />
                  Blocs max
                </CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="bg-[#A4B89A] hover:bg-[#7A8E72]">
                      <Plus className="w-4 h-4 mr-2" />
                      Enregistrer
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#F8F6F4] max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Enregistrer un bloc max</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Nom du bloc</Label>
                        <Input value={blocMaxNom} onChange={(e) => setBlocMaxNom(e.target.value)} placeholder="Ex: La Marie-Rose" />
                      </div>
                      <div>
                        <Label>Lieu</Label>
                        <Input value={blocMaxLieu} onChange={(e) => setBlocMaxLieu(e.target.value)} placeholder="Ex: Fontainebleau" />
                      </div>
                      <div>
                        <Label>Niveau</Label>
                        <Select value={blocMaxNiveau} onValueChange={setBlocMaxNiveau}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {niveaux.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="mb-2 block">Style</Label>
                        <RadioGroup value={blocMaxStyle} onValueChange={setBlocMaxStyle}>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="flash" id="bm-flash" />
                            <Label htmlFor="bm-flash" className="cursor-pointer">⚡ Flash</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="a_vue" id="bm-a_vue" />
                            <Label htmlFor="bm-a_vue" className="cursor-pointer">👁️ À vue</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="apres_travail" id="bm-apres_travail" />
                            <Label htmlFor="bm-apres_travail" className="cursor-pointer">🔨 Après travail</Label>
                          </div>
                        </RadioGroup>
                      </div>
                      {blocMaxStyle === 'apres_travail' && (
                        <div>
                          <Label>Nombre d'essais</Label>
                          <Input type="number" min="1" value={blocMaxEssais} onChange={(e) => setBlocMaxEssais(parseInt(e.target.value) || 1)} />
                        </div>
                      )}
                      <div>
                        <Label>Date</Label>
                        <Input type="date" value={blocMaxDate} onChange={(e) => setBlocMaxDate(e.target.value)} />
                      </div>
                      <div>
                        <Label>Notes (optionnel)</Label>
                        <Textarea value={blocMaxNotes} onChange={(e) => setBlocMaxNotes(e.target.value)} placeholder="Remarques..." />
                      </div>
                      <Button onClick={handleBlocMaxSubmit} className="w-full bg-[#A4B89A] hover:bg-[#7A8E72]" disabled={createBlocMaxMutation.isPending}>
                        Enregistrer
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-white border border-gray-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Total
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-black text-[#1E2827]">{blocsMax.length}</p>
                    <p className="text-xs text-gray-500 mt-1">blocs</p>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-gray-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      Niveau max ce mois
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <LevelBadge niveau={maxBlocMaxThisMonth} />
                  </CardContent>
                </Card>
              </div>

              {blocsMax.length > 0 ? (
                <Card className="bg-white border border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-[#1E2827]">Historique récent</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {blocsMax.slice(0, 10).map((bloc) => {
                        const styleEmoji = bloc.style === 'flash' ? '⚡' : bloc.style === 'a_vue' ? '👁️' : '🔨';
                        return (
                          <div key={bloc.id} className="p-3 bg-[#F8F6F4] rounded-lg border border-gray-200 flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-[#1E2827]">
                                🪨 {bloc.nom} {styleEmoji}
                              </p>
                              <p className="text-xs text-gray-500">
                                {bloc.lieu} • {new Date(bloc.date).toLocaleDateString('fr-FR')}
                                {bloc.essais && bloc.essais > 1 && ` • ${bloc.essais} essais`}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <LevelBadge niveau={bloc.niveau} />
                              <Button size="sm" variant="destructive" onClick={() => setDeleteDialog({ open: true, id: bloc.id, type: 'bloc', label: bloc.nom })}>Supprimer</Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-white border border-gray-200 text-center p-8">
                  <CardContent>
                    <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 mb-4">Aucun bloc max enregistré</p>
                    <p className="text-sm text-gray-500">Cliquez sur "Enregistrer" ci-dessus</p>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          <Card className="bg-[#F8F6F4] border-2 border-[#A4B89A]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#1E2827] flex items-center gap-2">
                  <Mountain className="w-5 h-5 text-[#A4B89A]" />
                  Voies max
                </CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="bg-[#A4B89A] hover:bg-[#7A8E72]">
                      <Plus className="w-4 h-4 mr-2" />
                      Enregistrer
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#F8F6F4] max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Enregistrer une voie max</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Nom de la voie</Label>
                        <Input value={voieMaxNom} onChange={(e) => setVoieMaxNom(e.target.value)} placeholder="Ex: La Rage de Vivre" />
                      </div>
                      <div>
                        <Label>Lieu</Label>
                        <Input value={voieMaxLieu} onChange={(e) => setVoieMaxLieu(e.target.value)} placeholder="Ex: Céüse" />
                      </div>
                      <div>
                        <Label>Niveau</Label>
                        <Select value={voieMaxNiveau} onValueChange={setVoieMaxNiveau}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {niveaux.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="mb-2 block">Style</Label>
                        <RadioGroup value={voieMaxStyle} onValueChange={setVoieMaxStyle}>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="flash" id="vm-flash" />
                            <Label htmlFor="vm-flash" className="cursor-pointer">⚡ Flash</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="a_vue" id="vm-a_vue" />
                            <Label htmlFor="vm-a_vue" className="cursor-pointer">👁️ À vue</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="apres_travail" id="vm-apres_travail" />
                            <Label htmlFor="vm-apres_travail" className="cursor-pointer">🔨 Après travail</Label>
                          </div>
                        </RadioGroup>
                      </div>
                      {voieMaxStyle === 'apres_travail' && (
                        <div>
                          <Label>Nombre d'essais</Label>
                          <Input type="number" min="1" value={voieMaxEssais} onChange={(e) => setVoieMaxEssais(parseInt(e.target.value) || 1)} />
                        </div>
                      )}
                      <div>
                        <Label>Date</Label>
                        <Input type="date" value={voieMaxDate} onChange={(e) => setVoieMaxDate(e.target.value)} />
                      </div>
                      <div>
                        <Label>Notes (optionnel)</Label>
                        <Textarea value={voieMaxNotes} onChange={(e) => setVoieMaxNotes(e.target.value)} placeholder="Remarques..." />
                      </div>
                      <Button onClick={handleVoieMaxSubmit} className="w-full bg-[#A4B89A] hover:bg-[#7A8E72]" disabled={createVoieMaxMutation.isPending}>
                        Enregistrer
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-white border border-gray-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Total
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-black text-[#1E2827]">{voiesMax.length}</p>
                    <p className="text-xs text-gray-500 mt-1">voies</p>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-gray-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      Niveau max ce mois
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <LevelBadge niveau={maxVoieMaxThisMonth} />
                  </CardContent>
                </Card>
              </div>

              {voiesMax.length > 0 ? (
                <Card className="bg-white border border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-[#1E2827]">Historique récent</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {voiesMax.slice(0, 10).map((voie) => {
                        const styleEmoji = voie.style === 'flash' ? '⚡' : voie.style === 'a_vue' ? '👁️' : '🔨';
                        return (
                          <div key={voie.id} className="p-3 bg-[#F8F6F4] rounded-lg border border-gray-200 flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-[#1E2827]">
                                🧗‍♂️ {voie.nom} {styleEmoji}
                              </p>
                              <p className="text-xs text-gray-500">
                                {voie.lieu} • {new Date(voie.date).toLocaleDateString('fr-FR')}
                                {voie.essais && voie.essais > 1 && ` • ${voie.essais} essais`}
                              </p>
                            </div>
                                    <div className="flex items-center gap-2">
                                      <LevelBadge niveau={voie.niveau} />
                                      <Button size="sm" variant="destructive" onClick={() => setDeleteDialog({ open: true, id: voie.id, type: 'voie', label: voie.nom })}>Supprimer</Button>
                                    </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-white border border-gray-200 text-center p-8">
                  <CardContent>
                    <Mountain className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 mb-4">Aucune voie max enregistrée</p>
                    <p className="text-sm text-gray-500">Cliquez sur "Enregistrer" ci-dessus</p>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          <Card className="bg-[#F8F6F4] border-2 border-[#A4B89A]">
            <CardHeader>
              <CardTitle className="text-[#1E2827] flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#A4B89A]" />
                Tests physiques
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
            <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
              <DialogTrigger asChild>
                <Button className="w-full bg-[#A4B89A] hover:bg-[#7A8E72] text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Enregistrer un test
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#F8F6F4]">
                <DialogHeader>
                  <DialogTitle className="text-[#1E2827]">Nouveau test physique</DialogTitle>
                </DialogHeader>
                <TestForm 
                  onSubmit={handleLogTest} 
                  onCancel={() => setShowTestDialog(false)}
                />
              </DialogContent>
            </Dialog>

            <TestChart tests={tests} />

              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-[#1E2827] text-base">
                    Historique des tests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TestHistory tests={tests} onDelete={(test) => setDeleteDialog({ open: true, id: test.id, type: 'test', label: `${test.type_test} ${test.date}` })} />
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </div>

        <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog(d => ({ ...d, open }))}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ?</AlertDialogTitle>
              <AlertDialogDescription>Voulez-vous vraiment supprimer "{deleteDialog.label}" ? Cette action est irréversible.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </div>
  );
}