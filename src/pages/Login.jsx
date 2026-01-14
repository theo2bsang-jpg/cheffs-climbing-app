import React, { useState } from 'react';
import { User } from "@/api/entities";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { LogIn, Mountain } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

/** Auth form for email/password login with failure dialog. */
export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginFailedOpen, setLoginFailedOpen] = useState(false);

  /** Submit credentials, set cookies via API, and redirect to home. */
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await User.login(email, password);
      toast.success("Connexion réussie");
      navigate(createPageUrl("Home"));
    } catch (error) {
      // show in-app notification dialog + toast for visibility
      setLoginFailedOpen(true);
      toast.error("Email ou mot de passe incorrect");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-violet-500 to-purple-600 flex items-center justify-center p-4">
      <h1 className="sr-only">Connexion</h1>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Mountain className="w-12 h-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Connexion</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="mot de passe"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white" />
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Se connecter
                </>
              )}
            </Button>
          </form>
          
        </CardContent>
      </Card>
    </div>
    <AlertDialog open={loginFailedOpen} onOpenChange={(open) => setLoginFailedOpen(open)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Échec de la connexion</AlertDialogTitle>
          <AlertDialogDescription>Vérifiez votre email et mot de passe, puis réessayez.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={() => setLoginFailedOpen(false)}>Fermer</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}