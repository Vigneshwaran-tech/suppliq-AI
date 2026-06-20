import { useState } from 'react';
import ProjectPredictionSystem from './components/ProjectPredictionSystem';
import PredictionSystem from './components/PredictionSystem';

export default function App() {
  const [activeTab, setActiveTab] = useState('supplier'); // Default to supplier since they are uploading supplier logs

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col">
      {/* Sleek Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#070b14]/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-cyan-400 to-indigo-500 flex items-center justify-between p-1.5 shadow-[0_0_15px_rgba(34,211,238,0.3)]">
              <div className="w-full h-full rounded bg-[#070b14]" />
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-white text-lg">Antigravity Risk AI</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-400/20">v2.1</span>
            </div>
          </div>
          <nav className="flex items-center gap-2 bg-white/5 p-1 rounded-full border border-white/10">
            <button
              onClick={() => setActiveTab('supplier')}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                activeTab === 'supplier'
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-500 text-white shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Supplier Intelligence
            </button>
            <button
              onClick={() => setActiveTab('project')}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                activeTab === 'project'
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-500 text-white shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Project Intelligence
            </button>
          </nav>
        </div>
      </header>

      {/* App Dashboards */}
      <div className="flex-1">
        {activeTab === 'supplier' ? <PredictionSystem /> : <ProjectPredictionSystem />}
      </div>
    </div>
  );
}
