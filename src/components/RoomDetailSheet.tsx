import React, { useState } from 'react';
import {
  Room,
  BloodTransportBag,
  TransfusionFormLocation,
  DoorCode,
} from '../types/hospital';
import {
  Navigation,
  MapPin,
  Package,
  FileText,
  KeyRound,
  X,
  Eye,
  EyeOff,
  CheckCircle2,
  Clock,
  Compass,
  AlertCircle,
} from 'lucide-react';

interface RoomDetailSheetProps {
  room: Room;
  bags: BloodTransportBag[];
  forms: TransfusionFormLocation[];
  doorCode?: DoorCode;
  isUserHere: boolean;
  onSetUserLocation: (roomId: string) => void;
  onSetAsOrigin: (room: Room) => void;
  onSetAsDestination: (room: Room) => void;
  onClose: () => void;
  onToggleFormStatus?: (formId: string) => void;
}

export const RoomDetailSheet: React.FC<RoomDetailSheetProps> = ({
  room,
  bags,
  forms,
  doorCode,
  isUserHere,
  onSetUserLocation,
  onSetAsOrigin,
  onSetAsDestination,
  onClose,
  onToggleFormStatus,
}) => {
  const [showDoorCode, setShowDoorCode] = useState<boolean>(false);

  return (
    <div className="absolute bottom-20 left-3 right-3 sm:left-4 sm:right-auto sm:w-[440px] z-30 pointer-events-auto">
      <div className="bg-slate-900/95 backdrop-blur-md rounded-3xl border border-slate-700/80 shadow-2xl p-4 sm:p-5 text-slate-100 max-h-[70vh] overflow-y-auto">
        {/* Grab Handle */}
        <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-3" />

        {/* Header: Room Name, Code, and Close */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/60">
                {room.code}
              </span>
              <span className="text-xs text-slate-400 capitalize">{room.department}</span>
              <span className="text-xs text-slate-600">·</span>
              <span className="text-xs font-semibold text-slate-300">Floor {room.floorId}</span>
            </div>
            <h2 className="text-lg font-bold text-white mt-1 leading-snug">
              {room.name}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Room Description */}
        {room.description && (
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            {room.description}
          </p>
        )}

        {/* Action Buttons (Directions / Set Start / I am here) */}
        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-800">
          <button
            onClick={() => onSetAsDestination(room)}
            className="min-h-[44px] px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30 transition-colors"
          >
            <Navigation className="w-4 h-4 fill-white" />
            <span>Directions Here</span>
          </button>

          <button
            onClick={() => onSetAsOrigin(room)}
            className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-colors"
          >
            <Compass className="w-4 h-4 text-emerald-400" />
            <span>Start Route Here</span>
          </button>
        </div>

        {/* Set as My Location Button */}
        {!isUserHere && (
          <button
            onClick={() => onSetUserLocation(room.id)}
            className="w-full mt-2 min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white font-medium text-xs flex items-center justify-center gap-2 border border-slate-700/50 transition-colors"
          >
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            <span>Set as My Current Location</span>
          </button>
        )}

        {/* Door Access Keypad Info */}
        {doorCode && (
          <div className="mt-4 p-3 rounded-2xl bg-amber-950/40 border border-amber-800/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-xs font-bold text-amber-200">{doorCode.doorName}</div>
                  <div className="text-[10px] text-amber-400/80">{doorCode.clearanceLevel}</div>
                </div>
              </div>

              {/* Reveal Code Toggle */}
              <div className="flex items-center gap-2">
                <div className="font-mono text-sm font-bold tracking-wider px-2.5 py-1 rounded-lg bg-amber-900/60 text-amber-100 border border-amber-700/60">
                  {showDoorCode ? doorCode.code : '••••••'}
                </div>
                <button
                  onClick={() => setShowDoorCode(!showDoorCode)}
                  className="p-1.5 text-amber-300 hover:text-amber-100 transition-colors"
                  title={showDoorCode ? 'Hide Code' : 'Reveal Code'}
                >
                  {showDoorCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="text-[11px] text-slate-300 mt-2">
              {doorCode.locationDescription}
            </div>
          </div>
        )}

        {/* Red Blood Transport Bags Stored Here */}
        {bags.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-red-400">
                <Package className="w-4 h-4" />
                <span>Red Blood Transport Bags ({bags.length})</span>
              </div>
            </div>

            <div className="space-y-2">
              {bags.map((bag) => (
                <div
                  key={bag.id}
                  className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/70"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-red-300 bg-red-950/60 px-2 py-0.5 rounded border border-red-800/60">
                      {bag.serialCode}
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      {bag.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-200 mt-1">{bag.model}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{bag.locationDetails}</div>
                  {bag.notes && (
                    <div className="text-[10px] text-slate-400 mt-1 italic">{bag.notes}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Transfusion Request Paperwork In-Trays */}
        {forms.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-orange-400">
                <FileText className="w-4 h-4" />
                <span>Transfusion Request Forms</span>
              </div>
            </div>

            <div className="space-y-2">
              {forms.map((form) => (
                <div
                  key={form.id}
                  className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/70"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-100">
                      {form.trayLabel}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        form.status === 'collected'
                          ? 'bg-slate-700 text-slate-300'
                          : form.urgency === 'stat'
                          ? 'bg-red-950 text-red-300 border border-red-800'
                          : 'bg-orange-950 text-orange-300 border border-orange-800'
                      }`}
                    >
                      {form.status === 'collected' ? 'COLLECTED' : `${form.urgency.toUpperCase()} PENDING`}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1 font-medium">
                    📍 {form.exactSpot}
                  </div>
                  {form.notes && (
                    <div className="text-[11px] text-slate-400 mt-1">{form.notes}</div>
                  )}

                  {onToggleFormStatus && (
                    <button
                      onClick={() => onToggleFormStatus(form.id)}
                      className="mt-2 text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {form.status === 'collected'
                          ? 'Mark as Uncollected'
                          : 'Check off as Collected'}
                      </span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
