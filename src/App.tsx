import { useState } from 'react';
import { FrameBroker } from './components/FrameBroker';
import { EditorFrame } from './components/EditorFrame';

function App() {
  const [route] = useState<{ mode: string; id: string }>(() => {
    if (typeof window === 'undefined') return { mode: 'host', id: '' };
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode') || 'host';
    const id = params.get('id') || '';
    return { mode, id };
  });

  // Renders Editor page if embedded inside iframe, otherwise renders Host Dashboard
  if (route.mode === 'frame' && route.id) {
    return (
      <main className="w-screen h-screen p-2 overflow-hidden bg-slate-950">
        <EditorFrame selfId={route.id} />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 pb-12">
      {/* Top Banner / Navbar */}
      <header className="border-b border-slate-900 bg-slate-950/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 font-bold text-white text-sm select-none">
              EC
            </div>
            <div>
              <h1 className="font-extrabold text-sm text-slate-100 tracking-wide">EduChunks</h1>
              <p className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase">Sync Protocol Bench</p>
            </div>
          </div>
          <div className="text-xs text-slate-500 font-medium select-none">
            v1.0.0 (React 19 + Vite + Tailwind v4)
          </div>
        </div>
      </header>

      {/* Main Dashboard Panel */}
      <main className="pt-6">
        <FrameBroker />
      </main>
    </div>
  );
}

export default App;
