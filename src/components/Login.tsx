import { useState } from 'react';
import { Fingerprint, Lock, Phone, ShieldCheck, User as UserIcon, Eye, EyeOff, Sparkles, MessageCircle, UserPlus, LogIn } from 'lucide-react';
import { useApp, trainerUser, supabase } from '@/store';
import type { Session } from '@/types';

type Tab = 'signin' | 'signup' | 'field' | 'farrier';

export function LoginScreen() {
  const { setSession, employees, ferrageOrders, biometricEnabled, setBiometricEnabled, signIn, signUp, authLoading } = useApp();
  const [tab, setTab] = useState<Tab>('signin');

  // signin
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  // signup
  const [suName, setSuName] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suPassword, setSuPassword] = useState('');
  const [suShowPwd, setSuShowPwd] = useState(false);

  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // field
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');

  // farrier
  const [tokenInput, setTokenInput] = useState('');

  async function handleSignIn() {
    setErr(''); setBusy(true);
    const { error } = await signIn(email.trim(), password);
    setBusy(false);
    if (error) setErr(error);
  }

  async function handleSignUp() {
    setErr(''); setBusy(true);
    if (suPassword.length < 6) { setErr('Le mot de passe doit faire au moins 6 caractères.'); setBusy(false); return; }
    if (!suName.trim()) { setErr('Veuillez saisir votre nom.'); setBusy(false); return; }
    const { error } = await signUp(suEmail.trim(), suPassword, suName.trim());
    setBusy(false);
    if (error) setErr(error);
  }

  function loginDemo() {
    setErr('');
    setSession({ kind: 'trainer', user: { ...trainerUser, isDemo: true } });
  }

  function loginBiometric() {
    if (biometricEnabled) {
      setSession({ kind: 'trainer', user: { ...trainerUser, isDemo: true } });
    } else {
      setErr('Activez d\'abord la biométrie depuis votre profil après connexion.');
    }
  }

  function loginField() {
    const emp = employees.find((e) => e.phone.replace(/\s/g, '') === phone.replace(/\s/g, '') && e.pin === pin && e.role !== 'marechal');
    if (emp) {
      setSession({ kind: 'field', employeeId: emp.id });
    } else {
      setErr('Numéro ou code PIN incorrect.');
    }
  }

  async function loginFarrier() {
    setErr('');
    const token = tokenInput.trim().toLowerCase();
    const local = ferrageOrders.find((o) => o.token === token);
    if (local) { setSession({ kind: 'farrier', order: local }); return; }
    const { data, error } = await supabase.from('ferrage_orders').select('*').eq('token', token).maybeSingle();
    if (error || !data) { setErr('Lien invalide ou expiré.'); return; }
    const row = data as Record<string, unknown>;
    let horses = row.horses as unknown;
    if (typeof horses === 'string') { try { horses = JSON.parse(horses); } catch { horses = []; } }
    setSession({ kind: 'farrier', order: {
      id: row.id as string, token: row.token as string, createdAt: row.created_at as string, expiresAt: row.expires_at as string,
      status: row.status as 'pending' | 'completed', completedAt: (row.completed_at as string) ?? undefined,
      marechalId: (row.marechal_id as string) ?? undefined, marechalName: (row.marechal_name as string) ?? undefined,
      appliedAt: (row.applied_at as string) ?? undefined,
      horses: (horses as import('@/types').FerrageOrderHorse[]) ?? [],
    }});
  }

  function resetErr() { setErr(''); }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-stable-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gold-400 text-stable-950 flex items-center justify-center font-display font-bold text-xl mx-auto mb-3 animate-pulse">Z</div>
          <p className="text-stable-400 text-sm">Chargement…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left hero */}
      <div className="relative lg:w-1/2 bg-stable-950 text-white overflow-hidden flex flex-col justify-between p-8 lg:p-12">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #d6a23c 0, transparent 40%), radial-gradient(circle at 80% 70%, #2c4a47 0, transparent 50%)' }} />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gold-400 text-stable-950 flex items-center justify-center font-display font-bold text-xl">Z</div>
          <div>
            <div className="font-display text-xl font-bold">Zarkava</div>
            <div className="text-xs text-stable-300">Gestion d'écurie de course</div>
          </div>
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="font-display text-3xl lg:text-4xl font-bold leading-tight">
            La gestion de votre écurie,<br /><span className="text-gold-400">au creux de la main.</span>
          </h1>
          <p className="mt-4 text-stable-300 leading-relaxed">
            Planning d'entraînement, suivi de ferrage, soins, équipe et facturation —
            une plateforme unique pour l'entraîneur et le travail de terrain.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 text-sm">
            <Feature icon={<ShieldCheck size={16} />} text="Compte sécurisé" />
            <Feature icon={<Fingerprint size={16} />} text="Connexion biométrique" />
            <Feature icon={<MessageCircle size={16} />} text="Bon de ferrage WhatsApp" />
            <Feature icon={<Sparkles size={16} />} text="Vue terrain optimisée gants" />
          </div>
        </div>
        <div className="relative z-10 text-xs text-stable-400">Créez votre compte pour sauvegarder vos données, ou essayez la démo.</div>
      </div>

      {/* Right login */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-stable-50">
        <div className="w-full max-w-md">
          <div className="flex bg-stable-100 rounded-xl p-1 mb-6 overflow-x-auto no-scrollbar">
            <TabBtn active={tab === 'signin'} onClick={() => { setTab('signin'); resetErr(); }} icon={<LogIn size={15} />}>Connexion</TabBtn>
            <TabBtn active={tab === 'signup'} onClick={() => { setTab('signup'); resetErr(); }} icon={<UserPlus size={15} />}>Créer un compte</TabBtn>
            <TabBtn active={tab === 'field'} onClick={() => { setTab('field'); resetErr(); }} icon={<Phone size={15} />}>Terrain</TabBtn>
            <TabBtn active={tab === 'farrier'} onClick={() => { setTab('farrier'); resetErr(); }} icon={<MessageCircle size={15} />}>Maréchal</TabBtn>
          </div>

          {err && <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{err}</div>}

          {tab === 'signin' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="label">E-mail</label>
                <div className="relative">
                  <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stable-400" />
                  <input className="input pl-9" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@email.fr" />
                </div>
              </div>
              <div>
                <label className="label">Mot de passe</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stable-400" />
                  <input className="input pl-9 pr-9" type={showPwd ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSignIn()} />
                  <button onClick={() => setShowPwd((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stable-400 hover:text-stable-700">
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button className="btn-primary w-full btn-lg" onClick={handleSignIn} disabled={busy}>{busy ? 'Connexion…' : 'Se connecter'}</button>

              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 h-px bg-stable-200" />
                <span className="text-xs text-stable-400 uppercase tracking-wide">ou</span>
                <div className="flex-1 h-px bg-stable-200" />
              </div>

              <button className="btn-outline w-full" onClick={loginBiometric} disabled={!biometricEnabled}>
                <Fingerprint size={18} /> {biometricEnabled ? 'Connexion Face ID / Touch ID' : 'Biométrie non activée'}
              </button>
              <button className="btn-ghost w-full text-sm" onClick={loginDemo}>
                Essayer la démo (données fictives, non sauvegardées)
              </button>
            </div>
          )}

          {tab === 'signup' && (
            <div className="space-y-4 animate-fade-in">
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
                Créez votre compte pour sauvegarder toute votre écurie : chevaux, employés, planning, facturation, soins. Les données sont protégées et accessibles depuis n'importe quel appareil.
              </div>
              <div>
                <label className="label">Nom complet</label>
                <input className="input" value={suName} onChange={(e) => setSuName(e.target.value)} placeholder="M. Antoine Lemaire" />
              </div>
              <div>
                <label className="label">E-mail</label>
                <div className="relative">
                  <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stable-400" />
                  <input className="input pl-9" value={suEmail} onChange={(e) => setSuEmail(e.target.value)} placeholder="vous@email.fr" />
                </div>
              </div>
              <div>
                <label className="label">Mot de passe (min. 6 caractères)</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stable-400" />
                  <input className="input pl-9 pr-9" type={suShowPwd ? 'text' : 'password'} value={suPassword} onChange={(e) => setSuPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSignUp()} />
                  <button onClick={() => setSuShowPwd((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stable-400 hover:text-stable-700">
                    {suShowPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button className="btn-gold w-full btn-lg" onClick={handleSignUp} disabled={busy}>{busy ? 'Création…' : 'Créer mon compte'}</button>
              <p className="text-center text-xs text-stable-400 pt-1">
                En créant un compte, vous acceptez que vos données soient stockées de façon sécurisée.
              </p>
            </div>
          )}

          {tab === 'field' && (
            <div className="space-y-4 animate-fade-in">
              <div className="rounded-xl bg-stable-100 border border-stable-200 p-3 text-sm text-stable-700">
                Accès équipe terrain (cavaliers, lads, palefreniers). Saisissez votre numéro et code PIN fournis par l'entraîneur.
              </div>
              <div>
                <label className="label">Numéro de téléphone</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stable-400" />
                  <input className="input pl-9" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+33 6 11 11 11 11" />
                </div>
              </div>
              <div>
                <label className="label">Code PIN (4 chiffres)</label>
                <input className="input tracking-[0.5em] text-center text-lg" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder="••••" onKeyDown={(e) => e.key === 'Enter' && loginField()} inputMode="numeric" />
              </div>
              <button className="btn-primary w-full btn-lg" onClick={loginField}>Entrer sur le terrain</button>
              <p className="text-center text-xs text-stable-400 pt-2">
                Démo cavalier : <span className="font-medium text-stable-600">+33 6 11 11 11 11</span> / PIN <span className="font-medium text-stable-600">1234</span>
              </p>
              <p className="text-center text-xs text-stable-400">
                Démo palefrenier : <span className="font-medium text-stable-600">+33 6 44 44 44 44</span> / PIN <span className="font-medium text-stable-600">4567</span>
              </p>
            </div>
          )}

          {tab === 'farrier' && (
            <div className="space-y-4 animate-fade-in">
              <div className="rounded-xl bg-gold-50 border border-gold-200 p-4 text-sm text-stable-700">
                <p className="font-semibold text-stable-900 mb-1">Accès maréchal-ferrant</p>
                Les liens magiques sont générés par l'entraîneur depuis le module « Bon de ferrage WhatsApp ». Collez un token ci-dessous ou ouvrez le lien qui vous a été envoyé.
              </div>
              <div>
                <label className="label">Token du lien magique</label>
                <input className="input font-mono text-sm" value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} placeholder="abc123xyz..." onKeyDown={(e) => e.key === 'Enter' && loginFarrier()} />
              </div>
              <button className="btn-gold w-full btn-lg" onClick={loginFarrier}>
                <MessageCircle size={18} /> Ouvrir la session
              </button>
              <p className="text-center text-xs text-stable-400 pt-2">
                Astuce : demandez à l'entraîneur de vous envoyer le lien par WhatsApp, puis ouvrez-le directement.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-stable-200">
      <span className="text-gold-400">{icon}</span>
      {text}
    </div>
  );
}

function TabBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold whitespace-nowrap transition ${active ? 'bg-white text-stable-900 shadow-sm' : 'text-stable-500 hover:text-stable-700'}`}>
      {icon}{children}
    </button>
  );
}

export type { Session };
