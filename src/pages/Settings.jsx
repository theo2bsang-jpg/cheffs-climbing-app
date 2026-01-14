import React, { useEffect, useState } from 'react';
import { User } from "@/api/entities";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, User as UserIcon, Lock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

/** Profile settings for name and password; includes admin-only password reset. */
export default function Settings() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [saveConfirmed, setSaveConfirmed] = useState(false);
  const [passwordConfirmed, setPasswordConfirmed] = useState(false);

  const [adminTargetEmail, setAdminTargetEmail] = useState("");
  const [adminNewPassword, setAdminNewPassword] = useState("");
  const [adminConfirmPassword, setAdminConfirmPassword] = useState("");
  const [settingAdminPassword, setSettingAdminPassword] = useState(false);

  /** Load current user profile to prefill settings; logout if session invalid. */
  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
        setFullName(currentUser.full_name || "");
      } catch (error) {
        User.logout();
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const handleSave = async () => {
    try {
      await User.updateMe({ full_name: fullName });
      toast.success("Profil mis à jour");
      setSaveConfirmed(true);
      setTimeout(() => setSaveConfirmed(false), 3000);
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) return toast.error("Veuillez remplir les champs");
    if (newPassword !== confirmPassword) return toast.error("Les nouveaux mots de passe ne correspondent pas");
    setChangingPassword(true);
    try {
      await User.changePassword(currentPassword, newPassword);
      toast.success("Mot de passe mis à jour");
      setPasswordConfirmed(true);
      setTimeout(() => setPasswordConfirmed(false), 3000);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err?.message || "Impossible de changer le mot de passe");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleAdminSetPassword = async () => {
    if (!adminTargetEmail || !adminNewPassword) return toast.error("Veuillez remplir les champs");
    if (adminNewPassword !== adminConfirmPassword) return toast.error("Les nouveaux mots de passe ne correspondent pas");
    setSettingAdminPassword(true);
    try {
      await User.setPasswordByEmail(adminTargetEmail, adminNewPassword);
      toast.success("Mot de passe défini pour l'utilisateur");
      setAdminTargetEmail("");
      setAdminNewPassword("");
      setAdminConfirmPassword("");
    } catch (err) {
      toast.error(err?.message || "Impossible de définir le mot de passe");
    } finally {
      setSettingAdminPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-2xl mx-auto pt-6 pb-20">
        <Link to={createPageUrl("Home")}>
          <Button variant="outline" className="mb-4 bg-purple-900 text-white border-purple-700 hover:bg-purple-800">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </Link>

        <h1 className="text-3xl font-black text-slate-900 mb-6">
          ⚙️ Paramètres
        </h1>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="w-5 h-5" />
                Informations personnelles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="settings-email">Email</Label>
                <Input id="settings-email" value={user?.email} disabled className="bg-gray-50" />
              </div>
              <div>
                <Label htmlFor="settings-full-name">Nom complet</Label>
                <Input 
                  id="settings-full-name"
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Votre nom"
                />
              </div>
              <Button onClick={handleSave} className="bg-violet-600 hover:bg-violet-700">
                Enregistrer
              </Button>
              {saveConfirmed && <div className="text-sm text-green-700 mt-2">Enregistré</div>}
            </CardContent>
          </Card>

          {user?.is_global_admin && (
            <Card className="border-violet-200 bg-violet-50">
              <CardHeader className="bg-violet-100 rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-violet-900">
                  <Shield className="w-5 h-5" />
                  Administrateur global
                </CardTitle>
              </CardHeader>
              <CardContent className="bg-violet-100 rounded-b-lg">
                <p className="text-sm text-violet-900">
                  Vous avez accès à toutes les fonctionnalités d'administration.
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Mot de passe
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="settings-password-current">Mot de passe actuel</Label>
                  <Input 
                    id="settings-password-current"
                    type="password" 
                    value={currentPassword} 
                    onChange={(e) => setCurrentPassword(e.target.value)} 
                  />
                </div>
                <div>
                  <Label htmlFor="settings-password-new">Nouveau mot de passe</Label>
                  <Input 
                    id="settings-password-new"
                    type="password" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                  />
                </div>
                <div>
                  <Label htmlFor="settings-password-confirm">Confirmer le nouveau mot de passe</Label>
                  <Input 
                    id="settings-password-confirm"
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                  />
                </div>
                <Button onClick={handleChangePassword} disabled={changingPassword} className="bg-violet-600 hover:bg-violet-700">
                  {changingPassword ? 'En cours...' : 'Changer mon mot de passe'}
                </Button>
                {passwordConfirmed && <div className="text-sm text-green-700 mt-2">Mot de passe mis à jour</div>}
              </div>
            </CardContent>
          </Card>

          
        </div>
      </div>
    </div>
  );
}
