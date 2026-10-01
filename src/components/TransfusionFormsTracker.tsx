import React, { useState, useMemo } from 'react';
import {
  HospitalData,
  TransfusionFormLocation,
  FloorId,
  Room,
  FormUrgency,
  RouteResult,
} from '../types/hospital';
import {
  FileText,
  Search,
  Plus,
  Navigation,
  CheckCircle2,
  Clock,
  AlertCircle,
  RotateCcw,
  Sparkles,
  MapPin,
  Trash2,
  Edit2,
  X,
  Compass,
} from 'lucide-react';
import { calculateOptimalCourierRoute } from '../utils/pathfinding';

interface TransfusionFormsTrackerProps {
  data: HospitalData;
  onUpdateForms: (forms: TransfusionFormLocation[]) => void;
  onNavigateToRoom: (room: Room) => void;
  onStartMultiStopRoute: (orderedRooms: Room[]) => void;
  userCurrentRoomId: string;
  onSelectFloor: (floorId: FloorId) => void;
}

export const TransfusionFormsTracker: React.FC<TransfusionFormsTrackerProps> = ({
  data,
  onUpdateForms,
  onNavigateToRoom,
  onStartMultiStopRoute,
  userCurrentRoomId,
  onSelectFloor,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFloor, setSelectedFloor] = useState<FloorId | 'ALL'>('ALL');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingForm, setEditingForm] = useState<TransfusionFormLocation | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [runnerMessage, setRunnerMessage] = useState<string | null>(null);

  // Form input state
  const [formData, setFormData] = useState<{
    roomId: string;
    trayLabel: string;
    exactSpot: string;
    urgency: FormUrgency;
    estimatedFormsCount: number;
    notes: string;
  }>({
    roomId: data.rooms[0]?.id || '',
    trayLabel: '',
    exactSpot: '',
    urgency: 'urgent',
    estimatedFormsCount: 2,
    notes: '',
  });

  const filteredForms = useMemo(() => {
    return data.transfusionForms.filter((f) => {
      const matchesSearch =
        f.trayLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.exactSpot.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.notes && f.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesFloor = selectedFloor === 'ALL' || f.floorId === selectedFloor;
      const matchesUrgency = selectedUrgency === 'ALL' || f.urgency === selectedUrgency;

      return matchesSearch && matchesFloor && matchesUrgency;
    });
  }, [data.transfusionForms, searchQuery, selectedFloor, selectedUrgency]);

  // Statistics
  const pendingForms = data.transfusionForms.filter((f) => f.status === 'pending');
  const collectedForms = data.transfusionForms.filter((f) => f.status === 'collected');
  const totalPendingSheets = pendingForms.reduce((acc, f) => acc + (f.estimatedFormsCount || 1), 0);
  const percentCollected =
    data.transfusionForms.length > 0
      ? Math.round((collectedForms.length / data.transfusionForms.length) * 100)
      : 100;

  // Toggle single form status
  const handleToggleStatus = (formId: string) => {
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const updated: TransfusionFormLocation[] = data.transfusionForms.map((f) => {
      if (f.id === formId) {
        const newStatus: TransfusionFormLocation['status'] = f.status === 'collected' ? 'pending' : 'collected';
        return {
          ...f,
          status: newStatus,
          lastCollectedAt: newStatus === 'collected' ? `${timeNow} Today` : undefined,
        };
      }
      return f;
    });
    onUpdateForms(updated);
  };

  // Reset all for a new collection round
  const handleResetRun = () => {
    const updated = data.transfusionForms.map((f) => ({
      ...f,
      status: 'pending' as const,
      lastCollectedAt: undefined,
    }));
    onUpdateForms(updated);
    setRunnerMessage('New paperwork round started! All drop trays reset to pending.');
    setTimeout(() => setRunnerMessage(null), 3500);
  };

  // Add / Edit handlers
  const handleOpenAdd = () => {
    setEditingForm(null);
    setFormData({
      roomId: data.rooms[0]?.id || '',
      trayLabel: 'Ward Transfusion Request In-Tray',
      exactSpot: 'Central nursing station desk next to phone',
      urgency: 'routine',
      estimatedFormsCount: 2,
      notes: '',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (form: TransfusionFormLocation) => {
    setEditingForm(form);
    setFormData({
      roomId: form.roomId,
      trayLabel: form.trayLabel,
      exactSpot: form.exactSpot,
      urgency: form.urgency,
      estimatedFormsCount: form.estimatedFormsCount,
      notes: form.notes || '',
    });
    setIsAddModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.trayLabel.trim() || !formData.roomId) return;

    const targetRoom = data.rooms.find((r) => r.id === formData.roomId);
    if (!targetRoom) return;

    if (editingForm) {
      const updated = data.transfusionForms.map((f) =>
        f.id === editingForm.id
          ? {
              ...f,
              ...formData,
              floorId: targetRoom.floorId,
            }
          : f
      );
      onUpdateForms(updated);
    } else {
      const newFormLoc: TransfusionFormLocation = {
        id: `form-${Date.now()}`,
        ...formData,
        floorId: targetRoom.floorId,
        status: 'pending',
      };
      onUpdateForms([...data.transfusionForms, newFormLoc]);
    }

    setIsAddModalOpen(false);
  };

  const handleDeleteForm = (id: string) => {
    onUpdateForms(data.transfusionForms.filter((f) => f.id !== id));
    setConfirmDeleteId(null);
  };

  // Optimize multi-stop route
  const handleOptimizeRoute = () => {
    const uncollectedRoomIds = pendingForms.map((f) => f.roomId);
    if (uncollectedRoomIds.length === 0) {
      setRunnerMessage('All transfusion request forms have already been collected!');
      setTimeout(() => setRunnerMessage(null), 3500);
      return;
    }

    const { orderedRoomIds } = calculateOptimalCourierRoute(
      data,
      userCurrentRoomId,
      uncollectedRoomIds,
      true // return to Blood Bank
    );

    const roomMap = new Map(data.rooms.map((r) => [r.id, r]));
    const orderedRooms = orderedRoomIds
      .map((id) => roomMap.get(id))
      .filter((r): r is Room => Boolean(r));

    if (orderedRooms.length > 0) {
      onStartMultiStopRoute(orderedRooms);
    }
  };

  const handleNavigateToForm = (form: TransfusionFormLocation) => {
    const room = data.rooms.find((r) => r.id === form.roomId);
    if (room) {
      onSelectFloor(room.floorId);
      onNavigateToRoom(room);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto p-4 sm:p-6 pb-24">
      {/* Top Header & Paperwork Courier Mode */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-orange-400 font-bold text-xs uppercase tracking-wider">
            <FileText className="w-4 h-4" />
            <span>Hospital Transfusion Paperwork Runner</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">
            Transfusion Request Drop Trays
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track completed crossmatch requests, patient observation sheets, and execute collection rounds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetRun}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-2 border border-slate-700 transition-colors"
            title="Reset All Trays to Pending"
          >
            <RotateCcw className="w-4 h-4 text-slate-400" />
            <span>Reset Round</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-orange-900/40 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Drop Tray</span>
          </button>
        </div>
      </div>

        {/* Runner Message Toast / Banner */}
        {runnerMessage && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-600 rounded-xl text-emerald-200 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{runnerMessage}</span>
          </div>
        )}

        {/* Courier Route Optimization Banner */}
      <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-blue-950/80 via-slate-900/90 to-orange-950/70 border border-blue-800/60 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-600/30 text-blue-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="text-sm font-bold text-white">
              Smart Courier Collection Route
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            {pendingForms.length > 0 ? (
              <>
                You have <strong className="text-orange-300">{pendingForms.length} drop trays</strong> ({totalPendingSheets} total forms) pending pickup.
              </>
            ) : (
              'All transfusion paperwork drop trays have been collected for this round!'
            )}
          </p>
        </div>

        {pendingForms.length > 0 && (
          <button
            onClick={handleOptimizeRoute}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40 transition-all shrink-0 active:scale-95"
          >
            <Compass className="w-4 h-4" />
            <span>Start Optimized Walking Route</span>
          </button>
        )}
      </div>

      {/* Progress Metric Bar */}
      <div className="mt-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="text-2xl font-bold font-mono text-white">
            {collectedForms.length} / {data.transfusionForms.length}
          </div>
          <div className="text-xs text-slate-400">
            <div>Trays Collected ({percentCollected}%)</div>
            <div className="text-orange-400 font-semibold">{totalPendingSheets} forms awaiting courier</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex-1 max-w-xs h-2.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
            style={{ width: `${percentCollected}%` }}
          />
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3 my-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by tray label, desk spot, room, or notes..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-orange-500"
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
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {floor === 'ALL' ? 'All Floors' : floor === 'F1' ? 'First Floor' : floor}
            </button>
          ))}
        </div>

        {/* Urgency Filter */}
        <select
          value={selectedUrgency}
          onChange={(e) => setSelectedUrgency(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:border-orange-500 w-full sm:w-auto"
        >
          <option value="ALL">All Priorities</option>
          <option value="stat">STAT Immediate</option>
          <option value="urgent">Urgent</option>
          <option value="routine">Routine</option>
        </select>
      </div>

      {/* Form Trays List */}
      <div className="space-y-3 mt-2">
        {filteredForms.map((form) => {
          const room = data.rooms.find((r) => r.id === form.roomId);
          const isCollected = form.status === 'collected';

          return (
            <div
              key={form.id}
              className={`border rounded-2xl p-4 transition-all shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                isCollected
                  ? 'bg-slate-900/40 border-slate-800/60 opacity-70'
                  : form.urgency === 'stat'
                  ? 'bg-red-950/20 border-red-800/60'
                  : 'bg-slate-900/90 border-slate-800'
              }`}
            >
              <div className="flex items-start gap-3.5 min-w-0">
                {/* Checkbox toggle */}
                <button
                  onClick={() => handleToggleStatus(form.id)}
                  className={`min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center transition-all shrink-0 ${
                    isCollected
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                  }`}
                  title={isCollected ? 'Mark as Uncollected' : 'Mark as Collected'}
                >
                  <CheckCircle2 className="w-5 h-5" />
                </button>

                {/* Information */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white truncate">
                      {form.trayLabel}
                    </span>

                    {/* Urgency Badge */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        form.urgency === 'stat'
                          ? 'bg-red-950 text-red-300 border border-red-800'
                          : form.urgency === 'urgent'
                          ? 'bg-orange-950 text-orange-300 border border-orange-800'
                          : 'bg-blue-950 text-blue-300 border border-blue-800'
                      }`}
                    >
                      {form.urgency.toUpperCase()}
                    </span>

                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      Floor {form.floorId}
                    </span>

                    <span className="text-xs text-orange-300 font-semibold">
                      ~{form.estimatedFormsCount} forms
                    </span>
                  </div>

                  {/* Exact Desk / Tray Location */}
                  <div className="text-xs text-slate-300 mt-1 flex items-start gap-1.5 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">{room?.name}</strong> · {form.exactSpot}
                    </span>
                  </div>

                  {form.notes && (
                    <div className="text-[11px] text-slate-400 mt-1 italic">
                      "{form.notes}"
                    </div>
                  )}

                  {form.lastCollectedAt && (
                    <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      <span>Collected at {form.lastCollectedAt}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                <button
                  onClick={() => handleNavigateToForm(form)}
                  className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-blue-900/30 transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5 fill-white" />
                  <span>Navigate</span>
                </button>

                {confirmDeleteId === form.id ? (
                  <div className="flex items-center gap-1.5 bg-red-950/80 px-2 py-1 rounded-lg border border-red-800">
                    <span className="text-[11px] text-red-200">Delete?</span>
                    <button
                      onClick={() => handleDeleteForm(form.id)}
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
                      onClick={() => handleOpenEdit(form)}
                      className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Edit Tray Spot"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(form.id)}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Delete Location"
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

      {/* Add / Edit Form Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white">
                {editingForm ? 'Edit Transfusion Drop Tray' : 'Add Transfusion Drop Tray'}
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tray / Folder Label
                </label>
                <input
                  type="text"
                  required
                  value={formData.trayLabel}
                  onChange={(e) => setFormData({ ...formData, trayLabel: e.target.value })}
                  placeholder="e.g. Ward 2B In-Tray #1"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Hospital Ward / Room Location
                </label>
                <select
                  value={formData.roomId}
                  onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-orange-500"
                >
                  {data.rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      [{room.floorId}] {room.name} ({room.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Exact Spot Description (Desk, Shelf, Color)
                </label>
                <input
                  type="text"
                  required
                  value={formData.exactSpot}
                  onChange={(e) => setFormData({ ...formData, exactSpot: e.target.value })}
                  placeholder="e.g. Top tier red acrylic in-tray beside telephone"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Priority / Urgency
                  </label>
                  <select
                    value={formData.urgency}
                    onChange={(e) =>
                      setFormData({ ...formData, urgency: e.target.value as any })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-orange-500"
                  >
                    <option value="stat">STAT Immediate</option>
                    <option value="urgent">Urgent</option>
                    <option value="routine">Routine</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Est. Forms Batch Count
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={formData.estimatedFormsCount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        estimatedFormsCount: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Special Instructions / Content Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Pre-transfusion crossmatch requests, post-infusion forms..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-orange-500"
                />
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
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-orange-900/40"
                >
                  Save Drop Tray
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
