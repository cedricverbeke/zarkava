import { useEffect, useState } from 'react';
import { AppProvider, useApp } from '@/store';
import { LoginScreen } from '@/components/Login';
import { TrainerShell, type TrainerPage } from '@/components/TrainerShell';
import { Dashboard } from '@/components/Dashboard';
import { HorsesPage } from '@/components/Horses';
import { PlanningPage } from '@/components/Planning';
import { TrainingsPage } from '@/components/Trainings';
import { SoinsPage } from '@/components/Soins';
import { DouchesPage } from '@/components/Douches';
import { FerragePage } from '@/components/Ferrage';
import { ElevagePage } from '@/components/Elevage';
import { TeamPage } from '@/components/Team';
import { FacturationPage } from '@/components/Facturation';
import { RecapPage } from '@/components/Recap';
import { ProfilePage } from '@/components/Profile';
import { FarrierSession } from '@/components/FarrierSession';
import { FieldView } from '@/components/FieldView';

function Router() {
  const { session } = useApp();
  const [page, setPage] = useState<TrainerPage>('dashboard');

  if (!session) return <><PersistenceNotice /><LoginScreen /></>;

  if (session.kind === 'farrier') return <><PersistenceNotice /><FarrierSession initialOrder={session.order} /></>;
  if (session.kind === 'field') return <><PersistenceNotice /><FieldView /></>;

  return (
    <>
      <PersistenceNotice />
      <TrainerShell page={page} setPage={setPage}>
        {page === 'dashboard' && <Dashboard setPage={setPage} />}
        {page === 'horses' && <HorsesPage />}
        {page === 'planning' && <PlanningPage />}
        {page === 'trainings' && <TrainingsPage />}
        {page === 'soins' && <SoinsPage />}
        {page === 'douches' && <DouchesPage />}
        {page === 'ferrage' && <FerragePage />}
        {page === 'elevage' && <ElevagePage />}
        {page === 'team' && <TeamPage />}
        {page === 'recap' && <RecapPage />}
        {page === 'facturation' && <FacturationPage />}
        {page === 'profile' && <ProfilePage />}
      </TrainerShell>
    </>
  );
}

function PersistenceNotice() {
  const [error, setError] = useState<{ collection: string; operation: 'read' | 'write'; message: string } | null>(null);

  useEffect(() => {
    const onPersistenceError = (event: Event) => {
      const detail = (event as CustomEvent<{ collection: string; operation: 'read' | 'write'; message: string }>).detail;
      setError(detail);
    };
    window.addEventListener('zarkava:persistence-error', onPersistenceError);
    return () => window.removeEventListener('zarkava:persistence-error', onPersistenceError);
  }, []);

  if (!error) return null;
  const collection = error.collection === 'horses' ? 'chevaux' : error.collection;
  const action = error.operation === 'read' ? 'chargement' : 'enregistrement';

  return (
    <div role="alert" className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-2xl rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 shadow-lg">
      <div className="font-semibold">Le {action} des données Supabase a échoué ({collection}).</div>
      <div className="mt-1 break-words">{error.message}</div>
      <button className="mt-2 font-semibold underline" onClick={() => setError(null)}>Fermer</button>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Router />
    </AppProvider>
  );
}
