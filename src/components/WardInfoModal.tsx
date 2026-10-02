import React, { useState, useMemo, useRef } from 'react';
import {
  Room,
  HospitalData,
  BloodTransportBag,
  TransfusionFormLocation,
  DoorCode,
} from '../types/hospital';
import {
  X,
  Package,
  FileText,
  KeyRound,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Check,
  Building2,
  MapPin,
  Shield,
  Clock,
  AlertTriangle,
  Info,
  Calendar,
} from 'lucide-react';

interface WardInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room | null;
  isEditMode: boolean;
  data: HospitalData;
  onUpdateBags: (bags: BloodTransportBag[]) => void;
  onUpdateForms: (forms: TransfusionFormLocation[]) => void;
  onUpdateDoorCodes: (doorCodes: DoorCode[]) => void;
  onUpdateRoom: (room: Room) => void;
}

export const WardInfoModal: React.FC<WardInfoModalProps> = ({
  isOpen,
  onClose,
  room,
  isEditMode,
  data,
  onUpdateBags,
  onUpdateForms,
  onUpdateDoorCodes,
  onUpdateRoom,
}) => {
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [showQuickAddMenu, setShowQuickAddMenu] = useState<boolean>(false);

  // Section anchor refs for smooth auto-scrolling
  const redBoxRef = useRef<HTMLDivElement>(null);
  const paperworkRef = useRef<HTMLDivElement>(null);
  const doorRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLDivElement>(null);

  // Form states for adding/editing items
  const [showAddBag, setShowAddBag] = useState<boolean>(false);
  const [editingBagId, setEditingBagId] = useState<string | null>(null);
  const [bagLocation, setBagLocation] = useState<string>('');
  const [bagModel, setBagModel] = useState<string>('Validated Cold-Chain Porter 2-6°C');
  const [bagSerial, setBagSerial] = useState<string>('');
  const [bagCapacity, setBagCapacity] = useState<number>(4);
  const [bagNotes, setBagNotes] = useState<string>('');

  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [formTrayLabel, setFormTrayLabel] = useState<string>('Transfusion Request In-Tray #1');
  const [formExactSpot, setFormExactSpot] = useState<string>('');
  const [formUrgency, setFormUrgency] = useState<'stat' | 'urgent' | 'routine'>('routine');
  const [formNotes, setFormNotes] = useState<string>('');

  const [showAddDoor, setShowAddDoor] = useState<boolean>(false);
  const [editingDoorId, setEditingDoorId] = useState<string | null>(null);
  const [doorName, setDoorName] = useState<string>('');
  const [doorCode, setDoorCode] = useState<string>('');
  const [doorClearance, setDoorClearance] = useState<DoorCode['clearanceLevel']>('Clinical Only');
  const [doorLocationDesc, setDoorLocationDesc] = useState<string>('');

  const [wardNotes, setWardNotes] = useState<string>('');
  const [isEditingWardNotes, setIsEditingWardNotes] = useState<boolean>(false);

  // Update local notes when room changes
  React.useEffect(() => {
    if (room) {
      setWardNotes(room.description || '');
      setIsEditingWardNotes(false);
      setShowAddBag(false);
      setShowAddForm(false);
      setShowAddDoor(false);
      setShowQuickAddMenu(false);
      setEditingBagId(null);
      setEditingFormId(null);
      setEditingDoorId(null);
    }
  }, [room]);

  // Filter items for this specific room
  const roomBags = useMemo(() => {
    if (!room) return [];
    return data.bloodBags.filter((b) => b.roomId === room.id);
  }, [data.bloodBags, room]);

  const roomForms = useMemo(() => {
    if (!room) return [];
    return data.transfusionForms.filter((f) => f.roomId === room.id);
  }, [data.transfusionForms, room]);

  const roomDoorCodes = useMemo(() => {
    if (!room) return [];
    return data.doorCodes.filter(
      (d) => d.roomId === room.id || (room.doorCodeId && d.id === room.doorCodeId)
    );
  }, [data.doorCodes, room]);

  if (!isOpen || !room) return null;

  // Copy door code helper
  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // ==========================================
  // RED BOX (BLOOD BAG) HANDLERS
  // ==========================================
  const handleSaveBag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bagLocation.trim()) return;

    if (editingBagId) {
      const updated = data.bloodBags.map((b) =>
        b.id === editingBagId
          ? {
              ...b,
              locationDetails: bagLocation.trim(),
              model: bagModel.trim() || 'Validated Cold-Chain Porter',
              serialCode: bagSerial.trim() || `RBTB-${Math.floor(1000 + Math.random() * 9000)}`,
              capacityUnits: Number(bagCapacity) || 4,
              notes: bagNotes.trim(),
            }
          : b
      );
      onUpdateBags(updated);
    } else {
      const newBag: BloodTransportBag = {
        id: `bag-${Date.now()}`,
        roomId: room.id,
        floorId: room.floorId,
        locationDetails: bagLocation.trim(),
        model: bagModel.trim() || 'Validated Cold-Chain Porter 2-6°C',
        serialCode: bagSerial.trim() || `RBTB-${Math.floor(1000 + Math.random() * 9000)}`,
        capacityUnits: Number(bagCapacity) || 4,
        status: 'ready',
        lastInspectedDate: new Date().toISOString().slice(0, 10),
        notes: bagNotes.trim(),
      };
      onUpdateBags([...data.bloodBags, newBag]);
    }

    setEditingBagId(null);
    setShowAddBag(false);
    setBagLocation('');
    setBagSerial('');
    setBagNotes('');
  };

  const handleStartEditBag = (bag: BloodTransportBag) => {
    setEditingBagId(bag.id);
    setBagLocation(bag.locationDetails);
    setBagModel(bag.model);
    setBagSerial(bag.serialCode);
    setBagCapacity(bag.capacityUnits);
    setBagNotes(bag.notes || '');
    setShowAddBag(true);
  };

  const handleDeleteBag = (id: string) => {
    onUpdateBags(data.bloodBags.filter((b) => b.id !== id));
  };

  // ==========================================
  // PAPERWORK LOCATION HANDLERS
  // ==========================================
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formExactSpot.trim()) return;

    if (editingFormId) {
      const updated = data.transfusionForms.map((f) =>
        f.id === editingFormId
          ? {
              ...f,
              trayLabel: formTrayLabel.trim() || 'Transfusion Request In-Tray',
              exactSpot: formExactSpot.trim(),
              urgency: formUrgency,
              notes: formNotes.trim(),
            }
          : f
      );
      onUpdateForms(updated);
    } else {
      const newForm: TransfusionFormLocation = {
        id: `form-${Date.now()}`,
        roomId: room.id,
        floorId: room.floorId,
        trayLabel: formTrayLabel.trim() || 'Transfusion Request In-Tray',
        exactSpot: formExactSpot.trim(),
        urgency: formUrgency,
        status: 'pending',
        estimatedFormsCount: 1,
        notes: formNotes.trim(),
      };
      onUpdateForms([...data.transfusionForms, newForm]);
    }

    setEditingFormId(null);
    setShowAddForm(false);
    setFormExactSpot('');
    setFormNotes('');
  };

  const handleStartEditForm = (form: TransfusionFormLocation) => {
    setEditingFormId(form.id);
    setFormTrayLabel(form.trayLabel);
    setFormExactSpot(form.exactSpot);
    setFormUrgency(form.urgency);
    setFormNotes(form.notes || '');
    setShowAddForm(true);
  };

  const handleDeleteForm = (id: string) => {
    onUpdateForms(data.transfusionForms.filter((f) => f.id !== id));
  };

  // ==========================================
  // DOOR CODE HANDLERS
  // ==========================================
  const handleSaveDoor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!doorName.trim() || !doorCode.trim()) return;

    if (editingDoorId) {
      const updated = data.doorCodes.map((d) =>
        d.id === editingDoorId
          ? {
              ...d,
              doorName: doorName.trim(),
              code: doorCode.trim(),
              clearanceLevel: doorClearance,
              locationDescription: doorLocationDesc.trim(),
              updatedAt: new Date().toISOString().slice(0, 10),
            }
          : d
      );
      onUpdateDoorCodes(updated);
    } else {
      const newDoor: DoorCode = {
        id: `dc-${Date.now()}`,
        roomId: room.id,
        floorId: room.floorId,
        doorName: doorName.trim(),
        code: doorCode.trim(),
        clearanceLevel: doorClearance,
        locationDescription: doorLocationDesc.trim() || `Entrance to ${room.name}`,
        updatedAt: new Date().toISOString().slice(0, 10),
      };
      onUpdateDoorCodes([...data.doorCodes, newDoor]);
    }

    setEditingDoorId(null);
    setShowAddDoor(false);
    setDoorName('');
    setDoorCode('');
    setDoorLocationDesc('');
  };

  const handleStartEditDoor = (door: DoorCode) => {
    setEditingDoorId(door.id);
    setDoorName(door.doorName);
    setDoorCode(door.code);
    setDoorClearance(door.clearanceLevel);
    setDoorLocationDesc(door.locationDescription);
    setShowAddDoor(true);
  };

  const handleDeleteDoor = (id: string) => {
    onUpdateDoorCodes(data.doorCodes.filter((d) => d.id !== id));
  };

  // Save ward notes
  const handleSaveWardNotes = () => {
    onUpdateRoom({
      ...room,
      description: wardNotes.trim(),
    });
    setIsEditingWardNotes(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: room.color || '#2563eb' }}
            />
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {room.name}
              </h2>
              {isEditMode && (
                <p className="text-xs text-amber-300 font-semibold flex items-center gap-1 mt-0.5">
                  <Edit2 className="w-3 h-3" /> Layout Edit Mode — Add or modify ward information below
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Add Menu / Plus Button */}
            <div className="relative">
              <button
                onClick={() => setShowQuickAddMenu((prev) => !prev)}
                className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                title="Add information to this ward"
                aria-label="Add information to this ward"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Info</span>
              </button>

              {showQuickAddMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    onClick={() => {
                      setShowQuickAddMenu(false);
                      setEditingBagId(null);
                      setBagLocation('');
                      setBagSerial(`RBTB-${Math.floor(1000 + Math.random() * 9000)}`);
                      setBagNotes('');
                      setShowAddBag(true);
                      setTimeout(() => redBoxRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-red-200 hover:bg-red-950/60 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Package className="w-4 h-4 text-red-400 shrink-0" />
                    <span>+ Add Red Box</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowQuickAddMenu(false);
                      setEditingFormId(null);
                      setFormExactSpot('');
                      setFormNotes('');
                      setShowAddForm(true);
                      setTimeout(() => paperworkRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-orange-200 hover:bg-orange-950/60 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-orange-400 shrink-0" />
                    <span>+ Add Paperwork Spot</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowQuickAddMenu(false);
                      setEditingDoorId(null);
                      setDoorName(`${room.name} Access Keypad`);
                      setDoorCode('');
                      setDoorLocationDesc(`Corridor entrance to ${room.name}`);
                      setShowAddDoor(true);
                      setTimeout(() => doorRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-amber-200 hover:bg-amber-950/60 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>+ Add Door Code</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowQuickAddMenu(false);
                      setIsEditingWardNotes(true);
                      setTimeout(() => notesRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-blue-200 hover:bg-blue-950/60 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>+ Edit / Add Ward Notes</span>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* ========================================================
              SECTION 1: RED BOX (BLOOD TRANSPORT BAG) LOCATIONS
             ======================================================== */}
          <div ref={redBoxRef} className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                  <div className="p-1 rounded-lg bg-red-950 text-red-400 border border-red-800">
                    <Package className="w-4 h-4" />
                  </div>
                  <span>Red Box Locations (Blood Transport Bags)</span>
                </div>
              </div>

              {/* Add / Edit Red Box Form */}
              {showAddBag && (
                <form
                  onSubmit={handleSaveBag}
                  className="p-4 rounded-2xl bg-red-950/30 border border-red-800/80 space-y-3 animate-in fade-in duration-150"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-red-200">
                      {editingBagId ? 'Edit Red Box Location' : 'Register New Red Box Location'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddBag(false);
                        setEditingBagId(null);
                      }}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Exact Location in Ward *
                    </label>
                    <input
                      type="text"
                      required
                      value={bagLocation}
                      onChange={(e) => setBagLocation(e.target.value)}
                      placeholder="e.g. Top shelf of Red Fridge Bay 2, Wall bracket next to Resus Trolley"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Box Model / Type
                      </label>
                      <input
                        type="text"
                        value={bagModel}
                        onChange={(e) => setBagModel(e.target.value)}
                        placeholder="e.g. Validated Cold-Chain Porter 2-6°C"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-red-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Serial / Identifier
                      </label>
                      <input
                        type="text"
                        value={bagSerial}
                        onChange={(e) => setBagSerial(e.target.value)}
                        placeholder="e.g. RBTB-7049-A"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={bagNotes}
                      onChange={(e) => setBagNotes(e.target.value)}
                      placeholder="e.g. Designated for emergency O-Negative transfusion backup"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddBag(false);
                        setEditingBagId(null);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md"
                    >
                      Save Red Box
                    </button>
                  </div>
                </form>
              )}

              {/* Red Boxes List */}
              {roomBags.length === 0 && !showAddBag ? (
                <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 text-center text-xs text-slate-400">
                  <span>No red box locations registered for this ward yet.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {roomBags.map((bag) => (
                    <div
                      key={bag.id}
                      className="p-3.5 rounded-2xl bg-red-950/20 border border-red-900/50 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-red-200">
                            {bag.model}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-900/60 text-red-200 border border-red-800">
                            {bag.serialCode}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-white font-medium">
                          <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                          <span>{bag.locationDetails}</span>
                        </div>

                        {bag.notes && (
                          <p className="text-[11px] text-slate-300 italic pt-0.5">
                            "{bag.notes}"
                          </p>
                        )}
                      </div>

                      {/* Edit actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleStartEditBag(bag)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                          title="Edit Location"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteBag(bag.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-300 hover:text-red-300"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>

          {/* ========================================================
              SECTION 2: PAPERWORK (TRANSFUSION FORMS) LOCATIONS
             ======================================================== */}
          <div ref={paperworkRef} className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <div className="flex items-center gap-2 text-orange-400 font-bold text-sm">
                  <div className="p-1 rounded-lg bg-orange-950 text-orange-400 border border-orange-800">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span>Paperwork Locations (Transfusion Request Trays)</span>
                </div>
              </div>

              {/* Add / Edit Paperwork Form */}
              {showAddForm && (
                <form
                  onSubmit={handleSaveForm}
                  className="p-4 rounded-2xl bg-orange-950/30 border border-orange-800/80 space-y-3 animate-in fade-in duration-150"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-orange-200">
                      {editingFormId ? 'Edit Paperwork Tray' : 'Register New Paperwork Drop Spot'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingFormId(null);
                      }}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Tray Label *
                    </label>
                    <input
                      type="text"
                      required
                      value={formTrayLabel}
                      onChange={(e) => setFormTrayLabel(e.target.value)}
                      placeholder="e.g. Transfusion Request In-Tray #1"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Exact Spot / Desk Location *
                    </label>
                    <input
                      type="text"
                      required
                      value={formExactSpot}
                      onChange={(e) => setFormExactSpot(e.target.value)}
                      placeholder="e.g. Main nursing station desk behind barcode scanner"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Urgency Level
                      </label>
                      <select
                        value={formUrgency}
                        onChange={(e) => setFormUrgency(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-orange-500"
                      >
                        <option value="routine">Routine Round</option>
                        <option value="urgent">Urgent</option>
                        <option value="stat">STAT Priority</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Notes (Optional)
                      </label>
                      <input
                        type="text"
                        value={formNotes}
                        onChange={(e) => setFormNotes(e.target.value)}
                        placeholder="e.g. Checked hourly by porter"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingFormId(null);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-md"
                    >
                      Save Paperwork Spot
                    </button>
                  </div>
                </form>
              )}

              {/* Paperwork Spots List */}
              {roomForms.length === 0 && !showAddForm ? (
                <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 text-center text-xs text-slate-400">
                  <span>No paperwork drop locations registered for this ward yet.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {roomForms.map((form) => (
                    <div
                      key={form.id}
                      className="p-3.5 rounded-2xl bg-orange-950/20 border border-orange-900/50 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-orange-200">
                            {form.trayLabel}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                              form.urgency === 'stat'
                                ? 'bg-red-950 text-red-300 border border-red-800'
                                : form.urgency === 'urgent'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {form.urgency}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-white font-medium">
                          <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                          <span>{form.exactSpot}</span>
                        </div>

                        {form.notes && (
                          <p className="text-[11px] text-slate-300 italic pt-0.5">
                            "{form.notes}"
                          </p>
                        )}
                      </div>

                      {/* Edit actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleStartEditForm(form)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                          title="Edit Spot"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteForm(form.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-300 hover:text-red-300"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>

          {/* ========================================================
              SECTION 3: DOOR SECURITY CODES
             ======================================================== */}
          <div ref={doorRef} className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <div className="p-1 rounded-lg bg-amber-950 text-amber-400 border border-amber-800">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <span>Door Access & Security Codes</span>
                </div>
              </div>

              {/* Add / Edit Door Code Form */}
              {showAddDoor && (
                <form
                  onSubmit={handleSaveDoor}
                  className="p-4 rounded-2xl bg-amber-950/30 border border-amber-800/80 space-y-3 animate-in fade-in duration-150"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-amber-200">
                      {editingDoorId ? 'Edit Door Code Record' : 'Register New Door Code'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddDoor(false);
                        setEditingDoorId(null);
                      }}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Door / Keypad Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={doorName}
                        onChange={(e) => setDoorName(e.target.value)}
                        placeholder="e.g. Ward Entry Airlock Keypad"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Security Code *
                      </label>
                      <input
                        type="text"
                        required
                        value={doorCode}
                        onChange={(e) => setDoorCode(e.target.value)}
                        placeholder="e.g. *4921#, C7731, 3318#"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-mono font-bold tracking-wider focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Clearance Level
                      </label>
                      <select
                        value={doorClearance}
                        onChange={(e) => setDoorClearance(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                      >
                        <option value="Clinical Only">Clinical Only</option>
                        <option value="Standard Staff">Standard Staff</option>
                        <option value="Restricted Biohazard">Restricted Biohazard</option>
                        <option value="Security / Charge Nurse">Security / Charge Nurse</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Location Description
                      </label>
                      <input
                        type="text"
                        value={doorLocationDesc}
                        onChange={(e) => setDoorLocationDesc(e.target.value)}
                        placeholder="e.g. East wing corridor doors into ward"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddDoor(false);
                        setEditingDoorId(null);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md"
                    >
                      Save Door Code
                    </button>
                  </div>
                </form>
              )}

              {/* Door Codes List */}
              {roomDoorCodes.length === 0 && !showAddDoor ? (
                <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 text-center text-xs text-slate-400">
                  <span>No door security codes recorded for this ward yet.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {roomDoorCodes.map((door) => (
                    <div
                      key={door.id}
                      className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-900/50 flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-amber-200">
                            {door.doorName}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-amber-950 text-amber-300 border border-amber-800">
                            {door.clearanceLevel}
                          </span>
                        </div>

                        {door.locationDescription && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-300">
                            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>{door.locationDescription}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Security Code Pill with Copy Action */}
                        <button
                          onClick={() => handleCopyCode(door.id, door.code)}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 border border-amber-500/80 text-amber-300 font-mono font-bold text-sm flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-sm"
                          title="Click to copy code"
                        >
                          <span>{door.code}</span>
                          {copiedCodeId === door.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 opacity-60" />
                          )}
                        </button>

                        {/* Edit actions */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleStartEditDoor(door)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                            title="Edit Door Code"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDoor(door.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-300 hover:text-red-300"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>

          {/* ========================================================
              SECTION 4: GENERAL WARD NOTES
             ======================================================== */}
          <div ref={notesRef} className="space-y-2.5">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-300">
                  Ward Information & Clinical Notes
                </span>
                {!isEditingWardNotes && (
                  <button
                    onClick={() => setIsEditingWardNotes(true)}
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit Notes</span>
                  </button>
                )}
              </div>

              {isEditingWardNotes ? (
                <div className="space-y-2">
                  <textarea
                    rows={3}
                    value={wardNotes}
                    onChange={(e) => setWardNotes(e.target.value)}
                    placeholder="Enter ward access notes, key contacts, operating hours, or special instructions..."
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs leading-relaxed focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsEditingWardNotes(false)}
                      className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveWardNotes}
                      className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
                    >
                      Save Notes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                  {room.description ? (
                    <p>{room.description}</p>
                  ) : (
                    <p className="text-slate-500 italic">
                      No general clinical notes added for this ward yet.
                    </p>
                  )}
                </div>
              )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div>
            {isEditMode && (
              <span className="text-[11px] text-amber-300 font-medium">
                Changes to red boxes, paperwork, and door codes are saved immediately.
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
