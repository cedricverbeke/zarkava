import { useEffect, useState } from 'react';
import { AppProvider, useApp } from '@/store';
import type { SupabaseProblem } from '@/supabaseClient';
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

const COLLECTION_LABELS: Record<string, string> = {
  horses: 'chevaux', employees: 'employés', trainings: 'entraînements', planning: 'planning', soins: 'soins',
  routines: 'routines', tarifGrids: 'grilles tarifaires', douches: 'douches', elevageHorses: 'élevage',
  saillies: 'saillies', weekSchedules: 'programmes de semaines', ferrage: 'bons de ferrage', profil: 'profil et logo',
};

// Affiche une seule fois chaque problème de lecture/écriture signalé par reportSupabaseProblem().
function PersistenceNotice() {
  const [problems, setProblems] = useState<SupabaseProblem[]>([]);

  useEffect(() => {
    const onProblem = (event: Event) => {
      const problem = (event as CustomEvent<SupabaseProblem>).detail;
      setProblems((prev) => (prev.some((p) => p.collection === problem.collection && p.operation === problem.operation) ? prev : [...prev, problem]));
    };
    window.addEventListener('zarkava:persistence-error', onProblem);
    return () => window.removeEventListener('zarkava:persistence-error', onProblem);
  }, []);

  if (problems.length === 0) return null;
  const reading = problems.every((p) => p.operation === 'read');
  const writing = problems.every((p) => p.operation === 'write');
  const action = reading ? 'chargement' : writing ? 'enregistrement' : 'synchronisation';
  const names = [...new Set(problems.map((p) => COLLECTION_LABELS[p.collection] ?? p.collection))].join(', ');
  const messages = [...new Set(problems.map((p) => p.message))];
  const details = [...new Set(problems.map((p) => p.detail))];

  return (
    <div role="alert" className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-2xl rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 shadow-lg">
      <div className="font-semibold">Le {action} des données Supabase a échoué ({names}).</div>
      {messages.map((m) => <div key={m} className="mt-1 break-words">{m}</div>)}
      {details.some((d) => !messages.includes(d)) && (
        <details className="mt-2 text-xs text-red-800">
          <summary className="cursor-pointer">Détail technique</summary>
          {details.map((d) => <div key={d} className="mt-1 break-words font-mono">{d}</div>)}
        </details>
      )}
      <div className="mt-2 flex gap-4">
        <button className="font-semibold underline" onClick={() => window.location.reload()}>Réessayer</button>
        <button className="font-semibold underline" onClick={() => setProblems([])}>Fermer</button>
      </div>
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
