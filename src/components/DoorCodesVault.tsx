import React, { useState, useMemo } from 'react';
import { HospitalData, DoorCode, FloorId, Room } from '../types/hospital';
import {
  KeyRound,
  Search,
  Plus,
  Eye,
  EyeOff,
  Copy,
  Check,
  Navigation,
  Shield,
  Edit2,
  Trash2,
  X,
  MapPin,
} from 'lucide-react';

interface DoorCodesVaultProps {
  data: HospitalData;
  onUpdateDoorCodes: (doorCodes: DoorCode[]) => void;
  onNavigateToRoom: (room: Room) => void;
  onSelectFloor: (floorId: FloorId) => void;
}

export const DoorCodesVault: React.FC<DoorCodesVaultProps> = ({
  data,
  onUpdateDoorCodes,
  onNavigateToRoom,
  onSelectFloor,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFloor, setSelectedFloor] = useState<FloorId | 'ALL'>('ALL');
  const [revealAll, setRevealAll] = useState<boolean>(false);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingDoor, setEditingDoor] = useState<DoorCode | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    doorName: string;
    code: string;
    floorId: FloorId;
    roomId?: string;
    locationDescription: string;
    clearanceLevel: DoorCode['clearanceLevel'];
  }>({
    doorName: '',
    code: '',
    floorId: 'F1',
    roomId: '',
    locationDescription: '',
    clearanceLevel: 'Clinical Only',
  });

  const filteredDoorCodes = useMemo(() => {
    return data.doorCodes.filter((d) => {
      const matchesSearch =
        d.doorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.locationDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.clearanceLevel.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFloor = selectedFloor === 'ALL' || d.floorId === selectedFloor;

      return matchesSearch && matchesFloor;
    });
  }, [data.doorCodes, searchQuery, selectedFloor]);

  const toggleReveal = (id: string) => {
    const next = new Set(revealedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setRevealedIds(next);
  };

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenAdd = () => {
    setEditingDoor(null);
    setFormData({
      doorName: '',
      code: '',
      floorId: 'F1',
      roomId: data.rooms[0]?.id || '',
      locationDescription: '',
      clearanceLevel: 'Clinical Only',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (door: DoorCode) => {
    setEditingDoor(door);
    setFormData({
      doorName: door.doorName,
      code: door.code,
      floorId: door.floorId,
      roomId: door.roomId || '',
      locationDescription: door.locationDescription,
      clearanceLevel: door.clearanceLevel,
    });
    setIsAddModalOpen(true);
  };

  const handleSaveDoor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.doorName.trim() || !formData.code.trim()) return;

    if (editingDoor) {
      const updated = data.doorCodes.map((d) =>
        d.id === editingDoor.id
          ? {
              ...d,
              ...formData,
              updatedAt: new Date().toISOString().slice(0, 10),
            }
          : d
      );
      onUpdateDoorCodes(updated);
    } else {
      const newDoor: DoorCode = {
        id: `dc-${Date.now()}`,
        ...formData,
        updatedAt: new Date().toISOString().slice(0, 10),
      };
      onUpdateDoorCodes([...data.doorCodes, newDoor]);
    }

    setIsAddModalOpen(false);
  };

  const handleDeleteDoor = (id: string) => {
    onUpdateDoorCodes(data.doorCodes.filter((d) => d.id !== id));
    setConfirmDeleteId(null);
  };

  const handleNavigateToDoor = (door: DoorCode) => {
    let room = data.rooms.find((r) => r.id === door.roomId);
    if (!room) {
      room = data.rooms.find((r) => r.floorId === door.floorId);
    }
    if (room) {
      onSelectFloor(room.floorId);
      onNavigateToRoom(room);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto p-4 sm:p-6 pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
            <KeyRound className="w-4 h-4" />
            <span>Secure Access Codes</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">
            Door Keypads & Airlock Codes
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Quick-reference offline vault for Blood Bank, Trauma, Theatres, and Restricted Ward pin codes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Privacy Toggle */}
          <button
            onClick={() => setRevealAll(!revealAll)}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-2 border border-slate-700 transition-colors"
            title={revealAll ? 'Hide All Codes' : 'Reveal All Codes'}
          >
            {revealAll ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4" />}
            <span>{revealAll ? 'Hide Codes' : 'Reveal All'}</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-amber-900/40 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Door Code</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 my-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by door name, clearance, location, or code..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Floor Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 w-full sm:w-auto overflow-x-auto">
          {['ALL', 'F1', 'F2', 'F3'].map((floor) => (
            <button
              key={floor}
              onClick={() => setSelectedFloor(floor as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                selectedFloor === floor
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {floor === 'ALL' ? 'All Floors' : floor === 'F1' ? 'First Floor' : floor}
            </button>
          ))}
        </div>
      </div>

      {/* Door Codes Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
        {filteredDoorCodes.map((door) => {
          const isVisible = revealAll || revealedIds.has(door.id);
          const room = data.rooms.find((r) => r.id === door.roomId);

          return (
            <div
              key={door.id}
              className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between transition-all shadow-md group"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-amber-950/80 border border-amber-800/80 text-amber-400">
                      <KeyRound className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      Floor {door.floorId}
                    </span>
                  </div>

                  <span className="text-[10px] font-semibold text-amber-400/90 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/50">
                    {door.clearanceLevel}
                  </span>
                </div>

                <div className="text-sm font-bold text-white mt-3">
                  {door.doorName}
                </div>

                {/* Location text */}
                <div className="text-xs text-slate-400 mt-1 flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                  <span>{door.locationDescription}</span>
                </div>

                {/* Big Code Pill with Eye Toggle and Copy */}
                <div className="mt-4 p-3 rounded-2xl bg-amber-950/30 border border-amber-800/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-amber-400/80 uppercase font-semibold">
                      Pin:
                    </span>
                    <span className="font-mono text-lg font-bold tracking-wider text-amber-200">
                      {isVisible ? door.code : '••••••'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Toggle visible */}
                    <button
                      onClick={() => toggleReveal(door.id)}
                      className="p-1.5 text-slate-400 hover:text-amber-300 transition-colors"
                      title={isVisible ? 'Hide' : 'Reveal'}
                    >
                      {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>

                    {/* Copy button */}
                    <button
                      onClick={() => handleCopyCode(door.id, door.code)}
                      className="p-1.5 text-slate-400 hover:text-white transition-colors"
                      title="Copy Code"
                    >
                      {copiedId === door.id ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Card Bottom Actions */}
              <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-800/80">
                <button
                  onClick={() => handleNavigateToDoor(door)}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-blue-900/30 transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5 fill-white" />
                  <span>Navigate to Door</span>
                </button>

                {confirmDeleteId === door.id ? (
                  <div className="flex items-center gap-1.5 bg-red-950/80 px-2 py-1 rounded-lg border border-red-800">
                    <span className="text-[11px] text-red-200">Delete?</span>
                    <button
                      onClick={() => handleDeleteDoor(door.id)}
                      className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded text-[11px] font-bold transition-colors"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition-colors"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(door)}
                      className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Edit Door Code"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(door.id)}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Delete Code"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Door Code Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white">
                {editingDoor ? 'Edit Door Code' : 'Add Door Keypad Code'}
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDoor} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Door / Entryway Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.doorName}
                  onChange={(e) => setFormData({ ...formData, doorName: e.target.value })}
                  placeholder="e.g. Blood Bank Airlock Keypad"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Keypad Code / Combination
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. *4921# or 8842"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono tracking-wider focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Floor
                  </label>
                  <select
                    value={formData.floorId}
                    onChange={(e) =>
                      setFormData({ ...formData, floorId: e.target.value as FloorId })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="F1">First Floor (Main Floor)</option>
                    <option value="F2">Floor 2 (Upper Wards)</option>
                    <option value="F3">Floor 3 (Specialty Wards)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Clearance Required
                  </label>
                  <select
                    value={formData.clearanceLevel}
                    onChange={(e) =>
                      setFormData({ ...formData, clearanceLevel: e.target.value as any })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Clinical Only">Clinical Only</option>
                    <option value="Standard Staff">Standard Staff</option>
                    <option value="Restricted Biohazard">Restricted Biohazard</option>
                    <option value="Security / Charge Nurse">Security / Charge Nurse</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Location Description (Corridor, landmarks)
                </label>
                <input
                  type="text"
                  required
                  value={formData.locationDescription}
                  onChange={(e) =>
                    setFormData({ ...formData, locationDescription: e.target.value })
                  }
                  placeholder="e.g. West hallway double doors outside Blood Bank"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Associated Room (Optional)
                </label>
                <select
                  value={formData.roomId}
                  onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="">None (Corridor intersection)</option>
                  {data.rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      [{room.floorId}] {room.name} ({room.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-amber-900/40"
                >
                  Save Door Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
