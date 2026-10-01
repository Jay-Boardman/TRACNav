import React, { useState, useEffect } from 'react';
import { RouteResult, TurnStep, FloorId } from '../types/hospital';
import {
  ArrowUp,
  ArrowUpRight,
  ArrowRight,
  ArrowDownRight,
  ArrowUpLeft,
  ArrowLeft,
  ArrowDownLeft,
  Building2,
  KeyRound,
  CheckCircle2,
  X,
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  Footprints,
  Clock,
  Navigation,
} from 'lucide-react';

interface TurnByTurnHUDProps {
  currentRoute: RouteResult;
  activeStepIndex: number;
  onStepChange: (index: number | ((prev: number) => number)) => void;
  onExitNavigation: () => void;
  onFloorChange: (floorId: FloorId) => void;
  activeFloorId: FloorId;
}

export const TurnByTurnHUD: React.FC<TurnByTurnHUDProps> = ({
  currentRoute,
  activeStepIndex,
  onStepChange,
  onExitNavigation,
  onFloorChange,
  activeFloorId,
}) => {
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const currentStep = currentRoute.steps[activeStepIndex] || currentRoute.steps[0];
  const nextStep = currentRoute.steps[activeStepIndex + 1];

  // Auto floor switch when stepping into a step on a different floor
  useEffect(() => {
    if (currentStep && currentStep.floorId !== activeFloorId) {
      onFloorChange(currentStep.floorId);
    }
  }, [currentStep, activeFloorId, onFloorChange]);

  // Simulation timer
  useEffect(() => {
    let interval: any = null;
    if (isSimulating) {
      interval = setInterval(() => {
        onStepChange((prev) => {
          if (prev >= currentRoute.steps.length - 1) {
            setIsSimulating(false);
            return prev;
          }
          return prev + 1;
        });
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [isSimulating, currentRoute.steps.length, onStepChange]);

  const renderTurnIcon = (type: TurnStep['turnType']) => {
    const iconClass = 'w-7 h-7 text-white stroke-[2.5]';
    switch (type) {
      case 'straight':
        return <ArrowUp className={iconClass} />;
      case 'slight-right':
        return <ArrowUpRight className={iconClass} />;
      case 'right':
        return <ArrowRight className={iconClass} />;
      case 'sharp-right':
        return <ArrowDownRight className={iconClass} />;
      case 'slight-left':
        return <ArrowUpLeft className={iconClass} />;
      case 'left':
        return <ArrowLeft className={iconClass} />;
      case 'sharp-left':
        return <ArrowDownLeft className={iconClass} />;
      case 'elevator':
      case 'stairs':
        return <Building2 className={iconClass} />;
      case 'door-code':
        return <KeyRound className={iconClass} />;
      case 'arrive':
        return <CheckCircle2 className={iconClass} />;
      default:
        return <ArrowUp className={iconClass} />;
    }
  };

  const remainingMeters = currentRoute.steps
    .slice(activeStepIndex)
    .reduce((acc, s) => acc + s.distanceMeters, 0);

  const remainingMinutes = Math.ceil(remainingMeters / 60);

  return (
    <div className="absolute top-3 left-3 right-3 sm:left-4 sm:right-auto sm:w-[460px] z-30 flex flex-col gap-2 pointer-events-auto">
      {/* Primary Google Maps Navigation Banner (Green/Emerald Theme) */}
      <div className="bg-emerald-700 text-white rounded-2xl shadow-2xl border border-emerald-500/40 p-4 transition-all">
        <div className="flex items-start justify-between gap-3">
          {/* Turn Direction Icon */}
          <div className="w-12 h-12 rounded-xl bg-emerald-800/80 border border-emerald-400/40 flex items-center justify-center shrink-0 shadow-inner">
            {renderTurnIcon(currentStep.turnType)}
          </div>

          {/* Primary Instruction & Distance */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tracking-tight">
                {currentStep.distanceMeters > 0 ? `${currentStep.distanceMeters} m` : 'Here'}
              </span>
              <span className="text-xs text-emerald-200 uppercase tracking-wider font-semibold">
                Step {activeStepIndex + 1} of {currentRoute.steps.length}
              </span>
            </div>

            <div className="text-sm font-semibold text-white mt-1 leading-snug">
              {currentStep.instruction}
            </div>

            {/* Coded Door Highlight Card inside instruction */}
            {currentStep.doorCode && (
              <div className="mt-2.5 bg-amber-950/80 border border-amber-500/80 rounded-xl p-2.5 flex items-center justify-between text-amber-200 shadow-md">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="text-xs">
                    <span className="font-semibold">{currentStep.doorCode.doorName}</span>
                  </div>
                </div>
                <div className="bg-amber-400 text-slate-950 font-mono font-bold text-sm px-2.5 py-1 rounded-lg">
                  {currentStep.doorCode.code}
                </div>
              </div>
            )}
          </div>

          {/* Close / Exit Nav */}
          <button
            onClick={onExitNavigation}
            className="p-2 text-emerald-200 hover:text-white rounded-xl hover:bg-emerald-600 transition-colors"
            title="Exit Navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Next Step Preview */}
        {nextStep && (
          <div className="mt-3 pt-3 border-t border-emerald-600/70 flex items-center justify-between text-xs text-emerald-100">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-emerald-300 font-semibold uppercase text-[10px]">Next:</span>
              <span className="truncate">{nextStep.instruction}</span>
            </div>
            <span className="font-mono text-emerald-200 shrink-0 ml-2">
              {nextStep.distanceMeters}m
            </span>
          </div>
        )}
      </div>

      {/* Navigation Controls Bar (Google Maps bottom pill) */}
      <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-xl px-4 py-2.5 flex items-center justify-between text-xs">
        {/* Remaining Trip Stats */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>~{remainingMinutes} min</span>
          </div>
          <span className="text-slate-600">·</span>
          <div className="flex items-center gap-1 text-slate-400">
            <Footprints className="w-4 h-4 text-slate-400" />
            <span>{remainingMeters} m left</span>
          </div>
        </div>

        {/* Step Progression Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onStepChange(Math.max(0, activeStepIndex - 1))}
            disabled={activeStepIndex === 0}
            className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Previous Step"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Simulate Walking Button */}
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`px-3 py-1.5 rounded-xl font-medium text-xs flex items-center gap-1.5 transition-colors ${
              isSimulating
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-blue-600 text-white hover:bg-blue-500'
            }`}
          >
            {isSimulating ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Simulating...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Simulate Walk</span>
              </>
            )}
          </button>

          <button
            onClick={() =>
              onStepChange(Math.min(currentRoute.steps.length - 1, activeStepIndex + 1))
            }
            disabled={activeStepIndex === currentRoute.steps.length - 1}
            className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Next Step"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
