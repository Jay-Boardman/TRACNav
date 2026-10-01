import React, { useState, useMemo } from 'react';
import { HospitalData, BloodTransportBag, FloorId, Room } from '../types/hospital';
import {
  Package,
  Search,
  Plus,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Trash2,
  Edit2,
  X,
  MapPin,
  Thermometer,
} from 'lucide-react';

interface BloodBagsTrackerProps {
  data: HospitalData;
  onUpdateBags: (bags: BloodTransportBag[]) => void;
  onNavigateToRoom: (room: Room) => void;
  onSelectFloor: (floorId: FloorId) => void;
}

export const BloodBagsTracker: React.FC<BloodBagsTrackerProps> = ({
  data,
  onUpdateBags,
  onNavigateToRoom,
  onSelectFloor,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFloor, setSelectedFloor] = useState<FloorId | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingBag, setEditingBag] = useState<BloodTransportBag | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form state for Add/Edit
  const [formData, setFormData] = useState<{
    serialCode: string;
    model: string;
    roomId: string;
    locationDetails: string;
    status: BloodTransportBag['status'];
    capacityUnits: number;
    notes: string;
  }>({
    serialCode: '',
    model: 'Validated Cold-Chain Porter 2-6°C',
    roomId: data.rooms[0]?.id || '',
    locationDetails: '',
    status: 'ready',
    capacityUnits: 4,
    notes: '',
  });

  const filteredBags = useMemo(() => {
    return data.bloodBags.filter((bag) => {
      const matchesSearch =
        bag.serialCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bag.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bag.locationDetails.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (bag.notes && bag.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesFloor = selectedFloor === 'ALL' || bag.floorId === selectedFloor;
      const matchesStatus = selectedStatus === 'ALL' || bag.status === selectedStatus;

      return matchesSearch && matchesFloor && matchesStatus;
    });
  }, [data.bloodBags, searchQuery, selectedFloor, selectedStatus]);

  const handleOpenAdd = () => {
    setEditingBag(null);
    setFormData({
      serialCode: `RBTB-${Math.floor(1000 + Math.random() * 9000)}-${['A', 'B', 'C'][Math.floor(Math.random() * 3)]}`,
      model: 'Validated Cold-Chain Porter 2-6°C',
      roomId: data.rooms.find((r) => r.department === 'blood-bank')?.id || data.rooms[0].id,
      locationDetails: 'Blood Bank Shelf 1',
      status: 'ready',
      capacityUnits: 4,
      notes: '',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (bag: BloodTransportBag) => {
    setEditingBag(bag);
    setFormData({
      serialCode: bag.serialCode,
      model: bag.model,
      roomId: bag.roomId,
      locationDetails: bag.locationDetails,
      status: bag.status,
      capacityUnits: bag.capacityUnits,
      notes: bag.notes || '',
    });
    setIsAddModalOpen(true);
  };

  const handleSaveBag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.serialCode.trim() || !formData.roomId) return;

    const targetRoom = data.rooms.find((r) => r.id === formData.roomId);
    if (!targetRoom) return;

    if (editingBag) {
      const updated = data.bloodBags.map((b) =>
        b.id === editingBag.id
          ? {
              ...b,
              ...formData,
              floorId: targetRoom.floorId,
              lastInspectedDate: new Date().toISOString().slice(0, 10),
            }
          : b
      );
      onUpdateBags(updated);
    } else {
      const newBag: BloodTransportBag = {
        id: `bag-${Date.now()}`,
        ...formData,
        floorId: targetRoom.floorId,
        lastInspectedDate: new Date().toISOString().slice(0, 10),
      };
      onUpdateBags([...data.bloodBags, newBag]);
    }

    setIsAddModalOpen(false);
  };

  const handleDeleteBag = (id: string) => {
    onUpdateBags(data.bloodBags.filter((b) => b.id !== id));
    setConfirmDeleteId(null);
  };

  const handleNavigateToBag = (bag: BloodTransportBag) => {
    const room = data.rooms.find((r) => r.id === bag.roomId);
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
          <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider">
            <Package className="w-4 h-4" />
            <span>Blood Cold Chain Inventory</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">
            Red Blood Transport Bags
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage validated blood transport boxes, individual serial numbers, and storage fridges.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-900/40 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Transport Bag</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 my-4">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by serial code, fridge, room, or notes..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-red-500"
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
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {floor === 'ALL' ? 'All Floors' : floor === 'F1' ? 'First Floor' : floor}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:border-red-500 w-full sm:w-auto"
        >
          <option value="ALL">All Statuses</option>
          <option value="ready">Ready for Dispatch</option>
          <option value="in-transit">In Transit</option>
          <option value="cleaning">Needs Sanitization</option>
          <option value="inspection-due">Inspection Due</option>
        </select>
      </div>

      {/* Bag Cards Grid */}
      {filteredBags.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800/60 mt-4">
          <Package className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <div className="text-sm font-semibold text-slate-300">No transport bags found</div>
          <p className="text-xs text-slate-500 mt-1">
            Try adjusting your search query or add a new blood transport bag.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
          {filteredBags.map((bag) => {
            const room = data.rooms.find((r) => r.id === bag.roomId);

            return (
              <div
                key={bag.id}
                className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between transition-all shadow-md group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    {/* Serial Code Highlight */}
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-red-400 bg-red-950/80 px-2.5 py-1 rounded-lg border border-red-800/80">
                        {bag.serialCode}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {bag.floorId}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        bag.status === 'ready'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : bag.status === 'in-transit'
                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {bag.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-white mt-2.5">
                    {bag.model}
                  </div>

                  {/* Location Info */}
                  <div className="mt-2 text-xs text-slate-300 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-200">
                        {room?.name || 'Assigned Room'}
                      </span>
                      <div className="text-slate-400 text-[11px] mt-0.5">
                        {bag.locationDetails}
                      </div>
                    </div>
                  </div>

                  {/* Notes / Specs */}
                  <div className="mt-3 p-2 rounded-xl bg-slate-950/60 border border-slate-800/60 text-[11px] text-slate-400 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Thermometer className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Capacity: {bag.capacityUnits} PRBC Units</span>
                    </div>
                    <span>Inspected: {bag.lastInspectedDate}</span>
                  </div>

                  {bag.notes && (
                    <div className="text-[11px] text-slate-400 italic mt-2">
                      "{bag.notes}"
                    </div>
                  )}
                </div>

                {/* Card Bottom Actions */}
                <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-800/80">
                  <button
                    onClick={() => handleNavigateToBag(bag)}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-blue-900/30 transition-colors"
                  >
                    <Navigation className="w-3.5 h-3.5 fill-white" />
                    <span>Navigate to Bag</span>
                  </button>

                  {confirmDeleteId === bag.id ? (
                    <div className="flex items-center gap-1.5 bg-red-950/80 px-2 py-1 rounded-lg border border-red-800">
                      <span className="text-[11px] text-red-200">Delete?</span>
                      <button
                        onClick={() => handleDeleteBag(bag.id)}
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
                        onClick={() => handleOpenEdit(bag)}
                        className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Edit Bag Info"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(bag.id)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Delete Record"
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
      )}

      {/* Add / Edit Bag Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white">
                {editingBag ? 'Edit Blood Transport Bag' : 'Add Blood Transport Bag'}
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBag} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Serial Number / Barcode
                </label>
                <input
                  type="text"
                  required
                  value={formData.serialCode}
                  onChange={(e) => setFormData({ ...formData, serialCode: e.target.value })}
                  placeholder="e.g. RBTB-7401-A"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Bag Model / Specification
                </label>
                <input
                  type="text"
                  required
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="e.g. Validated Cold-Chain Porter 2-6°C"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Assigned Room / Ward Location
                </label>
                <select
                  value={formData.roomId}
                  onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-red-500"
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
                  Specific Shelf / Storage Spot Details
                </label>
                <input
                  type="text"
                  required
                  value={formData.locationDetails}
                  onChange={(e) => setFormData({ ...formData, locationDetails: e.target.value })}
                  placeholder="e.g. Top shelf of Red Fridge, Bay 2"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as any })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-red-500"
                  >
                    <option value="ready">Ready for Use</option>
                    <option value="in-transit">In Transit</option>
                    <option value="cleaning">Needs Sanitization</option>
                    <option value="inspection-due">Inspection Due</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    PRBC Capacity Units
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={formData.capacityUnits}
                    onChange={(e) =>
                      setFormData({ ...formData, capacityUnits: parseInt(e.target.value) || 4 })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Additional Notes (Ice packs, loggers)
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notes on digital logger calibration, seals, or emergency pack..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-red-500"
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
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-red-900/40"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
