import React, { useEffect, useState } from 'react';
import { User } from "@/api/entities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { toast } from 'sonner';

/** Admin-only user CRUD: create, promote, set password, delete, paginate. */
export default function UserManagement() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const current = await User.me();
        setUser(current);
      } catch (err) {
        User.redirectToLogin();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => User.list(),
    enabled: !!user?.is_global_admin,
  });

  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newIsAdmin, setNewIsAdmin] = useState(false);

  const [userDeleteDialog, setUserDeleteDialog] = useState({ open: false, user: null });
  const [passwordDialog, setPasswordDialog] = useState({ open: false, user: null, newPassword: '', confirm: '' });
  const [adminConfirm, setAdminConfirm] = useState({ open: false, user: null, action: null });
  const [passwordSuccessDialog, setPasswordSuccessDialog] = useState({ open: false, email: null });
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(0);
  const USERS_PAGE_SIZE = 8;

  const createUserMutation = useMutation({
    mutationFn: (data) => User.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Utilisateur créé');
      setNewEmail(''); setNewFullName(''); setNewPassword(''); setNewIsAdmin(false);
    },
    onError: (err) => toast.error(err?.message || 'Erreur création utilisateur'),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ email, patch }) => User.updateByEmail(email, patch),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success('Utilisateur mis à jour'); },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (email) => User.deleteByEmail(email),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success('Utilisateur supprimé'); },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const setPasswordMutation = useMutation({
    mutationFn: ({ email, newPassword }) => User.setPasswordByEmail(email, newPassword),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Mot de passe défini');
      const targetEmail = variables?.email || passwordDialog.user?.email || 'utilisateur';
      setPasswordDialog({ open: false, user: null, newPassword: '', confirm: '' });
      setPasswordSuccessDialog({ open: true, email: targetEmail });
    },
    onError: (err) => toast.error(err?.message || 'Erreur lors du changement de mot de passe'),
  });

  const handleCreate = () => {
    if (!newEmail || !newPassword) return toast.error('Email et mot de passe requis');
    createUserMutation.mutate({ email: newEmail, password: newPassword, full_name: newFullName, is_global_admin: newIsAdmin });
  };

  const handleToggleAdmin = (u) => updateUserMutation.mutate({ email: u.email, patch: { is_global_admin: !u.is_global_admin } });
  const confirmAdminToggle = () => {
    if (!adminConfirm.user || !adminConfirm.action) return setAdminConfirm({ open: false, user: null, action: null });
    const promote = adminConfirm.action === 'promote';
    updateUserMutation.mutate({ email: adminConfirm.user.email, patch: { is_global_admin: promote } });
    setAdminConfirm({ open: false, user: null, action: null });
  };
  const handleDelete = (u) => setUserDeleteDialog({ open: true, user: u });
  const confirmDelete = () => {
    if (userDeleteDialog.user) deleteUserMutation.mutate(userDeleteDialog.user.email);
    setUserDeleteDialog({ open: false, user: null });
  };

  if (loading) return null;
  if (!user?.is_global_admin) return (
    <div className="min-h-screen p-4 flex items-center justify-center">
      <Card>
        <CardContent className="p-8 text-center">
          <p>Accès refusé</p>
        </CardContent>
      </Card>
    </div>
  );

  const filtered = users.filter(u => {
    const q = userSearch.toLowerCase().trim();
    if (!q) return true;
    return (u.email || '').toLowerCase().includes(q) || (u.full_name || '').toLowerCase().includes(q);
  });
  const start = userPage * USERS_PAGE_SIZE;
  const pageItems = filtered.slice(start, start + USERS_PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-2xl mx-auto pt-6 pb-20">
        <Link to={createPageUrl('Home')}>
          <Button variant="outline" className="mb-4 bg-purple-900 text-white border-purple-700 hover:bg-purple-800">
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour
          </Button>
        </Link>

        <h1 className="text-3xl font-black mb-6">Gestion des utilisateurs</h1>

        <Card>
          <CardHeader>
            <CardTitle>Créer un utilisateur</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            <Input placeholder="Nom complet" value={newFullName} onChange={(e) => setNewFullName(e.target.value)} />
            <Input placeholder="Mot de passe" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <div className="flex items-center gap-3">
              <input id="isAdmin" type="checkbox" checked={newIsAdmin} onChange={(e) => setNewIsAdmin(e.target.checked)} />
              <Label htmlFor="isAdmin">Administrateur global</Label>
            </div>
            <Button onClick={handleCreate} className="bg-violet-600 hover:bg-violet-700">Créer</Button>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Liste des utilisateurs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3">
              <Input placeholder="Rechercher par email ou nom" value={userSearch} onChange={(e) => { setUserSearch(e.target.value); setUserPage(0); }} />
            </div>

            <div className="space-y-2">
              {usersLoading ? <p>Chargement...</p> : (
                <>
                  {pageItems.map(u => (
                    <div key={u.email} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <div className="font-medium">{u.email} {u.is_global_admin && <span className="text-xs text-violet-700 ml-2">(admin)</span>}</div>
                        <div className="text-sm text-gray-600">{u.full_name}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setAdminConfirm({ open: true, user: u, action: u.is_global_admin ? 'revoke' : 'promote' })}>
                          {u.is_global_admin ? 'Révoquer admin' : 'Promouvoir'}
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setPasswordDialog({ open: true, user: u, newPassword: '', confirm: '' })}>Définir mot de passe</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(u)}>Supprimer</Button>
                      </div>
                    </div>
                  ))}

                  <div className="flex items-center justify-between mt-2">
                    <div className="text-sm text-gray-600">{filtered.length} utilisateur(s)</div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" disabled={userPage === 0} onClick={() => setUserPage(p => Math.max(0, p - 1))}>Préc.</Button>
                      <Button size="sm" variant="ghost" disabled={(userPage + 1) * USERS_PAGE_SIZE >= filtered.length} onClick={() => setUserPage(p => p + 1)}>Suiv.</Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <AlertDialog open={userDeleteDialog.open} onOpenChange={(open) => setUserDeleteDialog({ open, user: userDeleteDialog.user })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cet utilisateur ?</AlertDialogTitle>
              <AlertDialogDescription>Êtes-vous sûr de vouloir supprimer "{userDeleteDialog.user?.email}" ? Cette action est irréversible.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={adminConfirm.open} onOpenChange={(open) => setAdminConfirm(d => ({ ...d, open }))}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{adminConfirm.action === 'promote' ? 'Promouvoir cet utilisateur ?' : 'Révoquer les droits d\'administrateur ?'}</AlertDialogTitle>
              <AlertDialogDescription>
                {adminConfirm.action === 'promote'
                  ? `Voulez-vous promouvoir "${adminConfirm.user?.email}" en administrateur global ?`
                  : `Voulez-vous révoquer les droits d'administrateur pour "${adminConfirm.user?.email}" ?`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={confirmAdminToggle} className="bg-violet-600 hover:bg-violet-700">
                {adminConfirm.action === 'promote' ? 'Promouvoir' : 'Révoquer'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={passwordDialog.open} onOpenChange={(open) => { if (!open) setPasswordDialog({ open: false, user: null, newPassword: '', confirm: '' }); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Définir mot de passe</AlertDialogTitle>
              <AlertDialogDescription>Définir un nouveau mot de passe pour "{passwordDialog.user?.email}".</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="p-4 space-y-3">
              <div>
                <Label>Nouveau mot de passe</Label>
                <Input type="password" value={passwordDialog.newPassword} onChange={(e) => setPasswordDialog(d => ({ ...d, newPassword: e.target.value }))} />
              </div>
              <div>
                <Label>Confirmer</Label>
                <Input type="password" value={passwordDialog.confirm} onChange={(e) => setPasswordDialog(d => ({ ...d, confirm: e.target.value }))} />
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                if (!passwordDialog.newPassword) { toast.error('Mot de passe requis'); return; }
                if (passwordDialog.newPassword !== passwordDialog.confirm) { toast.error('Les mots de passe ne correspondent pas'); return; }
                setPasswordMutation.mutate({ email: passwordDialog.user.email, newPassword: passwordDialog.newPassword });
              }}>Définir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={passwordSuccessDialog.open} onOpenChange={(open) => setPasswordSuccessDialog(d => ({ ...d, open }))}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mot de passe défini</AlertDialogTitle>
              <AlertDialogDescription>Le mot de passe pour "{passwordSuccessDialog.email}" a été mis à jour avec succès.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setPasswordSuccessDialog({ open: false, email: null })}>OK</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
