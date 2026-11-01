import { useState } from 'react';
import { Lock, User as UserIcon, Mail, Check, LogOut, Shield, KeyRound, Info, Camera, Image as ImageIcon } from 'lucide-react';
import { useApp, trainerUser } from '@/store';
import { compressImage } from '@/imageUtils';

export function ProfilePage() {
  const { session, setSession, authMode, authUser, signOut, updateLogo } = useApp();
  const user = session?.kind === 'trainer' ? session.user : { ...trainerUser, isDemo: true };
  const isDemo = user.isDemo === true || authMode === 'demo';
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [logoLoading, setLogoLoading] = useState(false);

  function changePassword() {
    if (newPwd.length < 6) { setMsg({ type: 'error', text: 'Le nouveau mot de passe doit faire au moins 6 caractères.' }); return; }
    if (newPwd !== confirmPwd) { setMsg({ type: 'error', text: 'Les mots de passe ne correspondent pas.' }); return; }
    setMsg({ type: 'success', text: 'Mot de passe modifié avec succès.' });
    setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
  }

  async function handleSignOut() {
    if (isDemo) {
      setSession(null);
    } else {
      await signOut();
    }
  }

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoLoading(true);
    try {
      const dataUrl = await compressImage(file, 200, 0.8);
      await updateLogo(dataUrl);
      setMsg({ type: 'success', text: 'Logo mis à jour. Il apparaît en haut à droite dans l\'application.' });
    } catch {
      setMsg({ type: 'error', text: 'Erreur lors du chargement du logo.' });
    }
    setLogoLoading(false);
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-3xl">
      {/* Profile header */}
      <div className="card p-6">
        <div className="flex items-center gap-4">
          {authUser?.logoUrl ? (
            <img src={authUser.logoUrl} alt="Logo écurie" className="w-16 h-16 rounded-2xl object-contain bg-stable-50 border border-stable-200" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-stable-700 to-stable-900 text-white flex items-center justify-center font-display font-bold text-2xl">{user.name[0]}</div>
          )}
          <div>
            <h2 className="font-display font-bold text-stable-900 text-xl">{user.name}</h2>
            <p className="text-sm text-stable-500">{user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="chip bg-gold-100 text-gold-700"><Shield size={11} /> Entraîneur · Admin</span>
              {isDemo && <span className="chip bg-stable-100 text-stable-600"><Info size={11} /> Mode démo</span>}
            </div>
          </div>
        </div>
      </div>

      {isDemo && (
        <div className="rounded-xl bg-gold-50 border border-gold-200 p-4 text-sm text-stable-700">
          Vous êtes en mode démo : vos données (chevaux, employés, planning…) ne sont pas sauvegardées et seront perdues à la fermeture. Créez un compte depuis l'écran de connexion pour tout sauvegarder automatiquement.
        </div>
      )}

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm ${msg.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>{msg.text}</div>
      )}

      {/* Stable logo */}
      <div className="card p-6">
        <h3 className="font-display font-bold text-stable-900 mb-4 flex items-center gap-2"><ImageIcon size={18} /> Logo de l'écurie</h3>
        <p className="text-sm text-stable-600 mb-4">Le logo apparaît en haut à droite dans l'en-tête de l'application et sur les PDF générés.</p>
        <div className="flex items-center gap-4">
          {authUser?.logoUrl ? (
            <img src={authUser.logoUrl} alt="Logo" className="w-20 h-20 rounded-xl object-contain bg-stable-50 border border-stable-200" />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-stable-100 flex items-center justify-center text-stable-400"><ImageIcon size={28} /></div>
          )}
          <div className="flex flex-col gap-2">
            <label className="btn-outline cursor-pointer">
              <Camera size={15} /> {logoLoading ? 'Chargement…' : authUser?.logoUrl ? 'Changer le logo' : 'Charger un logo'}
              <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleLogo} />
            </label>
            {authUser?.logoUrl && <button className="text-xs text-red-500 hover:text-red-700" onClick={async () => { await updateLogo(''); setMsg({ type: 'success', text: 'Logo retiré.' }); }}>Supprimer le logo</button>}
          </div>
        </div>
      </div>

      {/* Personal info */}
      <div className="card p-6">
        <h3 className="font-display font-bold text-stable-900 mb-4 flex items-center gap-2"><UserIcon size={18} /> Informations personnelles</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="label">Nom complet</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><label className="label">E-mail</label><div className="relative"><Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stable-400" /><input className="input pl-9" value={email} onChange={(e) => setEmail(e.target.value)} /></div></div>
        </div>
        <div className="mt-4 flex justify-end"><button className="btn-primary" onClick={() => setMsg({ type: 'success', text: 'Profil mis à jour.' })}><Check size={15} /> Enregistrer</button></div>
      </div>

      {/* Password */}
      <div className="card p-6">
        <h3 className="font-display font-bold text-stable-900 mb-4 flex items-center gap-2"><KeyRound size={18} /> Changer le mot de passe</h3>
        <div className="space-y-4">
          <div><label className="label">Mot de passe actuel</label><div className="relative"><Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stable-400" /><input type="password" className="input pl-9" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} /></div></div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="label">Nouveau mot de passe</label><input type="password" className="input" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} /></div>
            <div><label className="label">Confirmer</label><input type="password" className="input" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} /></div>
          </div>
          <div className="flex justify-end"><button className="btn-primary" onClick={changePassword}><Check size={15} /> Modifier</button></div>
        </div>
      </div>

      {/* Cross-device access */}
      <div className="card p-6">
        <h3 className="font-display font-bold text-stable-900 mb-2 flex items-center gap-2"><KeyRound size={18} /> Connexion sur vos appareils</h3>
        <p className="text-sm text-stable-600">Connectez-vous avec la même adresse e-mail et le même mot de passe pour retrouver vos données. La connexion biométrique n'est pas encore disponible.</p>
      </div>

      <div className="flex justify-end">
        <button className="btn-danger" onClick={handleSignOut}><LogOut size={15} /> Se déconnecter</button>
      </div>
    </div>
  );
}
