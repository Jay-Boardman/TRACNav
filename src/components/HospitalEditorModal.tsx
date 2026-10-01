import React, { useState } from 'react';
import { HospitalData, Room, FloorId, DepartmentType } from '../types/hospital';
import {
  Download,
  Upload,
  RotateCcw,
  Plus,
  X,
  FileJson,
  Building,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { exportDataAsJson, resetHospitalDataToDefault } from '../services/storage';

interface HospitalEditorModalProps {
  data: HospitalData;
  onUpdateData: (newData: HospitalData) => void;
  onClose: () => void;
}

export const HospitalEditorModal: React.FC<HospitalEditorModalProps> = ({
  data,
  onUpdateData,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'rooms' | 'backup'>('rooms');
  const [isAddRoomOpen, setIsAddRoomOpen] = useState<boolean>(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  // New Room Form state
  const [roomForm, setRoomForm] = useState<{
    name: string;
    code: string;
    floorId: FloorId;
    department: DepartmentType;
    description: string;
    color: string;
  }>({
    name: '',
    code: '',
    floorId: 'F1',
    department: 'ward',
    description: '',
    color: '#3b82f6',
  });

  const handleExport = () => {
    exportDataAsJson(data);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.floors && parsed.rooms && parsed.nodes) {
          onUpdateData(parsed);
          setImportStatus('Hospital layout successfully imported!');
          setTimeout(() => setImportStatus(null), 3000);
        } else {
          setErrorMessage('Invalid hospital map format. Must include floors, rooms, and nodes.');
        }
      } catch (err) {
        setErrorMessage('Could not parse JSON file. Please ensure it is valid.');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmReset = () => {
    const def = resetHospitalDataToDefault();
    onUpdateData(def);
    setShowResetConfirm(false);
    setImportStatus('Reset back to official Warrington Hospital layout.');
    setTimeout(() => setImportStatus(null), 3000);
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomForm.name.trim() || !roomForm.code.trim()) return;

    // Pick a door node on the selected floor
    const floorNodes = data.nodes.filter((n) => n.floorId === roomForm.floorId);
    const doorNode = floorNodes[0] || data.nodes[0];

    // Compute coordinates placed safely on the grid
    const existingOnFloor = data.rooms.filter((r) => r.floorId === roomForm.floorId);
    const offsetX = 120 + (existingOnFloor.length % 3) * 240;
    const offsetY = 140 + Math.floor(existingOnFloor.length / 3) * 160;

    const newRoom: Room = {
      id: `r-custom-${Date.now()}`,
      name: roomForm.name,
      code: roomForm.code,
      wing: (roomForm.floorId === 'F1' ? 'appleton' : 'appleton') as any,
      department: roomForm.department,
      floorId: roomForm.floorId,
      x: offsetX,
      y: offsetY,
      width: 120,
      height: 60,
      doorNodeId: doorNode.id,
      color: roomForm.color,
      description: roomForm.description,
    };

    onUpdateData({
      ...data,
      rooms: [...data.rooms, newRoom],
    });

    setIsAddRoomOpen(false);
    setRoomForm({
      name: '',
      code: '',
      floorId: 'F1',
      department: 'ward',
      description: '',
      color: '#3b82f6',
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-950 text-blue-400 border border-blue-800">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                Hospital Map & Offline Data Manager
              </h2>
              <p className="text-xs text-slate-400">
                Customize facility rooms, import your hospital's layout, or export offline backups.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('rooms')}
            className={`pb-2.5 px-1 border-b-2 transition-colors ${
              activeTab === 'rooms'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Hospital Rooms & Wards ({data.rooms.length})
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`pb-2.5 px-1 border-b-2 transition-colors ${
              activeTab === 'backup'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Backup & JSON Layout
          </button>
        </div>

        {/* Status notification */}
        {importStatus && (
          <div className="mx-6 mt-3 p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{importStatus}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'rooms' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-slate-400">
                  Manage medical wings, departments, and custom room pins on each floor.
                </span>
                <button
                  onClick={() => setIsAddRoomOpen(true)}
                  className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-blue-900/30"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Room</span>
                </button>
              </div>

              {/* Room Cards List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.rooms.map((room) => (
                  <div
                    key={room.id}
                    className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-200">
                          {room.code}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700">
                          {room.floorId}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-white truncate mt-1">
                        {room.name}
                      </div>
                      <div className="text-[11px] text-slate-400 capitalize">
                        {room.department}
                      </div>
                    </div>

                    <div
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: room.color || '#3b82f6' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700/70">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <FileJson className="w-5 h-5 text-blue-400" />
                  <span>Offline Export & Share</span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Export all hospital layout data, walkable corridor graphs, blood transport bags, door codes, and transfusion request locations into a single offline JSON file.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={handleExport}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-blue-900/40 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download JSON Backup</span>
                  </button>

                  <label className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-2 border border-slate-700 transition-colors cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span>Import JSON Map File</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportFile}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Status / Error feedback */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Reset to Default */}
              <div className="p-4 rounded-2xl bg-red-950/20 border border-red-900/50">
                <div className="flex items-center gap-2 text-red-300 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span>Reset Hospital Layout</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Restores the Warrington Hospital map layout (Appleton Wing, Burtonwood Wing, Croft Wing, and Entrance/Reception with all clinical wards).
                </p>

                {showResetConfirm ? (
                  <div className="mt-3 p-3 bg-red-950/60 border border-red-700 rounded-xl flex items-center justify-between gap-3">
                    <span className="text-xs text-red-200">Are you sure? Custom changes will be reset.</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleConfirmReset}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors"
                      >
                        Yes, Reset
                      </button>
                      <button
                        onClick={() => setShowResetConfirm(false)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    className="mt-3 min-h-[40px] px-3.5 py-1.5 rounded-xl bg-red-900/40 hover:bg-red-900/60 text-red-200 border border-red-800/60 text-xs font-semibold flex items-center gap-2 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset to Warrington Hospital Layout</span>
                  </button>
                )}
              </div>

              {/* Data Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800">
                  <div className="text-xl font-bold font-mono text-white">
                    {data.floors.length}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase mt-0.5">Floors</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800">
                  <div className="text-xl font-bold font-mono text-white">
                    {data.rooms.length}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase mt-0.5">Rooms & Wards</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800">
                  <div className="text-xl font-bold font-mono text-red-400">
                    {data.bloodBags.length}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase mt-0.5">Blood Bags</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800">
                  <div className="text-xl font-bold font-mono text-amber-400">
                    {data.doorCodes.length}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase mt-0.5">Door Codes</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="min-h-[44px] px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Add Custom Room Sub-Modal */}
      {isAddRoomOpen && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Add Custom Hospital Room</h3>
              <button
                onClick={() => setIsAddRoomOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-3 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Room Name
                </label>
                <input
                  type="text"
                  required
                  value={roomForm.name}
                  onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                  placeholder="e.g. Ward 2C Renal Clinic"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Room Code
                  </label>
                  <input
                    type="text"
                    required
                    value={roomForm.code}
                    onChange={(e) => setRoomForm({ ...roomForm, code: e.target.value })}
                    placeholder="e.g. W2C-01"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Floor
                  </label>
                  <select
                    value={roomForm.floorId}
                    onChange={(e) =>
                      setRoomForm({ ...roomForm, floorId: e.target.value as FloorId })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="F1">Floor 1 (Ground)</option>
                    <option value="F2">Floor 2 (Surgical/Wards)</option>
                    <option value="F3">Floor 3 (ICU/Critical)</option>
                    <option value="B1">Basement (Logistics)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Department Type
                </label>
                <select
                  value={roomForm.department}
                  onChange={(e) =>
                    setRoomForm({ ...roomForm, department: e.target.value as DepartmentType })
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="ward">Inpatient Ward</option>
                  <option value="blood-bank">Blood Bank / Transfusion</option>
                  <option value="pathology">Pathology & Lab</option>
                  <option value="emergency">Emergency / Trauma</option>
                  <option value="icu">Intensive Care Unit</option>
                  <option value="surgery">Operating Surgery</option>
                  <option value="pharmacy">Pharmacy</option>
                  <option value="logistics">Logistics / Porters</option>
                  <option value="staff">Staff Lounge / Office</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description / Instructions
                </label>
                <textarea
                  rows={2}
                  value={roomForm.description}
                  onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })}
                  placeholder="Notes on equipment, paperwork trays, or staff..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddRoomOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs"
                >
                  Add to Map
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
