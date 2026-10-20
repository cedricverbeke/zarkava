import { useState } from 'react';
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
import { SubscriptionGate } from '@/components/SubscriptionGate';

function Router() {
  const { session } = useApp();
  const [page, setPage] = useState<TrainerPage>('dashboard');

  if (!session) return <LoginScreen />;

  if (session.kind === 'farrier') return <FarrierSession initialOrder={session.order} />;
  if (session.kind === 'field') return <FieldView />;

  // trainer
  const isDemo = session.kind === 'trainer' && session.user.isDemo;
  const userId = session.kind === 'trainer' ? session.user.id : null;
  if (isDemo) {
    return (
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
    );
  }
  return (
    <SubscriptionGate userId={userId!}>
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
    </SubscriptionGate>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Router />
    </AppProvider>
  );
}
