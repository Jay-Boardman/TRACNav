import React from 'react';
import {
  Map,
  FileText,
  Package,
  KeyRound,
  Building,
} from 'lucide-react';

export type AppTab = 'map' | 'forms' | 'bags' | 'codes';

interface BottomNavBarProps {
  activeTab: AppTab;
  onChangeTab: (tab: AppTab) => void;
  onOpenEditor: () => void;
  pendingFormsCount: number;
  readyBagsCount: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onChangeTab,
  onOpenEditor,
  pendingFormsCount,
  readyBagsCount,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 text-slate-400 select-none pb-safe">
      <div className="max-w-md mx-auto grid grid-cols-5 items-center h-16 px-2">
        {/* Tab 1: Map / Wayfinder */}
        <button
          onClick={() => onChangeTab('map')}
          className={`min-h-[44px] flex flex-col items-center justify-center transition-colors ${
            activeTab === 'map' ? 'text-blue-400' : 'hover:text-slate-200'
          }`}
        >
          <Map className={`w-5 h-5 ${activeTab === 'map' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[10px] font-medium tracking-tight mt-1">Wayfinder</span>
        </button>

        {/* Tab 2: Transfusion Paperwork Runner */}
        <button
          onClick={() => onChangeTab('forms')}
          className={`relative min-h-[44px] flex flex-col items-center justify-center transition-colors ${
            activeTab === 'forms' ? 'text-orange-400' : 'hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <FileText className={`w-5 h-5 ${activeTab === 'forms' ? 'stroke-[2.5]' : ''}`} />
            {pendingFormsCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-orange-500 text-white font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow-md">
                {pendingFormsCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium tracking-tight mt-1">Paperwork</span>
        </button>

        {/* Tab 3: Red Blood Bags */}
        <button
          onClick={() => onChangeTab('bags')}
          className={`relative min-h-[44px] flex flex-col items-center justify-center transition-colors ${
            activeTab === 'bags' ? 'text-red-400' : 'hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Package className={`w-5 h-5 ${activeTab === 'bags' ? 'stroke-[2.5]' : ''}`} />
            {readyBagsCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-red-600 text-white font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow-md">
                {readyBagsCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium tracking-tight mt-1">Blood Bags</span>
        </button>

        {/* Tab 4: Door Keypads */}
        <button
          onClick={() => onChangeTab('codes')}
          className={`min-h-[44px] flex flex-col items-center justify-center transition-colors ${
            activeTab === 'codes' ? 'text-amber-400' : 'hover:text-slate-200'
          }`}
        >
          <KeyRound className={`w-5 h-5 ${activeTab === 'codes' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[10px] font-medium tracking-tight mt-1">Door Codes</span>
        </button>

        {/* Tab 5: Hospital Layout & Settings */}
        <button
          onClick={onOpenEditor}
          className="min-h-[44px] flex flex-col items-center justify-center hover:text-slate-200 transition-colors"
        >
          <Building className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight mt-1">Facility</span>
        </button>
      </div>
    </nav>
  );
};
