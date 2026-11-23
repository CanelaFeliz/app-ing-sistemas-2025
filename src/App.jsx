import { useState } from 'react';
import { useProgress } from './context/ProgressContext';
import Navbar from './components/Navbar';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Pensum from './pages/Pensum';

export default function App() {
  const { progress } = useProgress();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!progress) {
    return <Onboarding />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar activeTab={activeTab} onChangeTab={setActiveTab} />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {activeTab === 'dashboard' ? <Dashboard /> : <Pensum />}
      </main>
    </div>
  );
}
