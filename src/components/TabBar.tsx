import React from 'react';
import { Pencil, Check, Share2 } from 'lucide-react';

interface TabBarProps {
  isEditMode: boolean;
  onToggleEditMode: () => void;
  onOpenSyncModal: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  isEditMode,
  onToggleEditMode,
  onOpenSyncModal,
}) => {
  return (
    <header className="absolute top-[max(0.875rem,env(safe-area-inset-top))] left-[max(0.875rem,env(safe-area-inset-left))] right-[max(0.875rem,env(safe-area-inset-right))] sm:right-auto z-30 pointer-events-auto flex items-center justify-between sm:justify-start gap-2 bg-slate-900/90 border border-slate-800 backdrop-blur-md rounded-2xl px-3 py-2 shadow-xl select-none">
      {/* Left: App Icon & Title */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-5 h-5 rounded-md overflow-hidden border border-blue-800/80 shadow-sm shrink-0 flex items-center justify-center bg-slate-950">
          <img src="/apple-touch-icon.png" alt="App Icon" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate max-w-[240px] sm:max-w-none">
          Transfusion Records and Compliance
        </h1>
      </div>

      <div className="h-4 w-px bg-slate-800 mx-0.5 shrink-0" />

      {/* Right Controls: Sync & Edit Mode Toggle */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onOpenSyncModal}
          className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition-all shadow-sm"
          title="Transfer to Phone / Sync & Backup"
          aria-label="Transfer to Phone / Sync & Backup"
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onToggleEditMode}
          className={`p-1.5 rounded-xl transition-all shadow-sm ${
            isEditMode
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 ring-2 ring-amber-300'
              : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80'
          }`}
          title={isEditMode ? 'Exit Edit Mode' : 'Edit Layout'}
          aria-label={isEditMode ? 'Exit Edit Mode' : 'Edit Layout'}
        >
          {isEditMode ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
        </button>
      </div>
    </header>
  );
};
