import React, { useState, useMemo, useRef } from 'react';
import {
  Room,
  HospitalData,
  WardSubItem,
  WardItemType,
  BloodTransportBag,
  TransfusionFormLocation,
  DoorCode,
} from '../types/hospital';
import { generateDefaultWardLayout } from '../utils/wardDefaults';
import {
  ArrowLeft,
  KeyRound,
  Package,
  FileText,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Check,
  CheckCircle2,
  Clock,
  Sparkles,
  Maximize2,
  Minus,
  Grid,
  ShieldCheck,
  Layers,
  X,
} from 'lucide-react';

interface WardViewProps {
  room: Room;
  data: HospitalData;
  isEditMode: boolean;
  onBackToMainMap: () => void;
  onUpdateRoom: (updatedRoom: Room) => void;
  onUpdateBags: (bags: BloodTransportBag[]) => void;
  onUpdateForms: (forms: TransfusionFormLocation[]) => void;
  onUpdateDoorCodes: (doorCodes: DoorCode[]) => void;
}

export const WardView: React.FC<WardViewProps> = ({
  room,
  data,
  isEditMode,
  onBackToMainMap,
  onUpdateRoom,
  onUpdateBags,
  onUpdateForms,
  onUpdateDoorCodes,
}) => {
  // Ensure the room has a wardLayout, or generate default
  const wardLayout = useMemo(() => {
    if (room.wardLayout && room.wardLayout.items.length > 0) {
      return room.wardLayout;
    }
    const matchingDoorCode = data.doorCodes.find((d) => d.roomId === room.id || d.id === room.doorCodeId);
    return generateDefaultWardLayout(room, data.bloodBags, data.transfusionForms, matchingDoorCode);
  }, [room, data.bloodBags, data.transfusionForms, data.doorCodes]);

  // Ward specific assets
  const wardBags = useMemo(() => {
    return data.bloodBags.filter((b) => b.roomId === room.id);
  }, [data.bloodBags, room.id]);

  const wardForms = useMemo(() => {
    return data.transfusionForms.filter((f) => f.roomId === room.id);
  }, [data.transfusionForms, room.id]);

  const wardDoorCodes = useMemo(() => {
    return data.doorCodes.filter(
      (d) => d.roomId === room.id || (room.doorCodeId && d.id === room.doorCodeId)
    );
  }, [data.doorCodes, room.id, room.doorCodeId]);

  // Selected sub-item on the ward map canvas
  const [selectedSubItemId, setSelectedSubItemId] = useState<string | null>(null);

  // Sub-item drag & resize state
  const [subDragAction, setSubDragAction] = useState<
    | { type: 'move'; itemId: string; startX: number; startY: number; mouseStartX: number; mouseStartY: number }
    | { type: 'resize'; itemId: string; startW: number; startH: number; mouseStartX: number; mouseStartY: number }
    | null
  >(null);

  // Canvas Pan & Zoom
  const [zoom, setZoom] = useState<number>(0.95);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 20, y: 10 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [revealedCodeIds, setRevealedCodeIds] = useState<Set<string>>(new Set());

  // Modals inside Ward View
  const [isAddSubItemModalOpen, setIsAddSubItemModalOpen] = useState<boolean>(false);
  const [isAddBagModalOpen, setIsAddBagModalOpen] = useState<boolean>(false);
  const [isAddFormModalOpen, setIsAddFormModalOpen] = useState<boolean>(false);
  const [isAddCodeModalOpen, setIsAddCodeModalOpen] = useState<boolean>(false);

  // Form states for adding items
  const [bagForm, setBagForm] = useState({
    serialCode: '',
    model: 'Validated Cold-Chain Porter 2-6°C',
    locationDetails: '',
    capacityUnits: 4,
    notes: '',
  });

  const [formTrayForm, setFormTrayForm] = useState({
    trayLabel: '',
    exactSpot: '',
    urgency: 'routine' as const,
    estimatedFormsCount: 2,
    notes: '',
  });

  const [codeForm, setCodeForm] = useState({
    doorName: '',
    code: '',
    locationDescription: '',
    clearanceLevel: 'Clinical Only' as const,
  });

  const [subItemForm, setSubItemForm] = useState<{
    name: string;
    type: WardItemType;
    width: number;
    height: number;
    color: string;
    notes: string;
  }>({
    name: '',
    type: 'patient-bay',
    width: 160,
    height: 100,
    color: '#3b82f6',
    notes: '',
  });

  const containerRef = useRef<HTMLDivElement>(null);

  // Screen to SVG coordinate helper
  const screenToSvg = (clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  };

  // Canvas Mouse Handlers
  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    if (!isEditMode) {
      setSelectedSubItemId(null);
    }
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    if (subDragAction?.type === 'move') {
      const cur = screenToSvg(e.clientX, e.clientY);
      const start = screenToSvg(subDragAction.mouseStartX, subDragAction.mouseStartY);
      const newX = Math.max(10, Math.min(wardLayout.width - 40, Math.round(subDragAction.startX + (cur.x - start.x))));
      const newY = Math.max(10, Math.min(wardLayout.height - 40, Math.round(subDragAction.startY + (cur.y - start.y))));

      const updatedItems = wardLayout.items.map((item) =>
        item.id === subDragAction.itemId ? { ...item, x: newX, y: newY } : item
      );
      onUpdateRoom({ ...room, wardLayout: { ...wardLayout, items: updatedItems } });
      return;
    }

    if (subDragAction?.type === 'resize') {
      const cur = screenToSvg(e.clientX, e.clientY);
      const start = screenToSvg(subDragAction.mouseStartX, subDragAction.mouseStartY);
      const newW = Math.max(50, Math.min(400, Math.round(subDragAction.startW + (cur.x - start.x))));
      const newH = Math.max(40, Math.min(300, Math.round(subDragAction.startH + (cur.y - start.y))));

      const updatedItems = wardLayout.items.map((item) =>
        item.id === subDragAction.itemId ? { ...item, width: newW, height: newH } : item
      );
      onUpdateRoom({ ...room, wardLayout: { ...wardLayout, items: updatedItems } });
    }
  };

  const handleMouseUpCanvas = () => {
    setIsPanning(false);
    setSubDragAction(null);
  };

  // Sub-item item interaction
  const handleSubItemMouseDown = (e: React.MouseEvent, item: WardSubItem) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setSelectedSubItemId(item.id);

    if (isEditMode) {
      setSubDragAction({
        type: 'move',
        itemId: item.id,
        startX: item.x,
        startY: item.y,
        mouseStartX: e.clientX,
        mouseStartY: e.clientY,
      });
    }
  };

  const handleSubItemResizeMouseDown = (e: React.MouseEvent, item: WardSubItem) => {
    e.stopPropagation();
    setSelectedSubItemId(item.id);
    setSubDragAction({
      type: 'resize',
      itemId: item.id,
      startW: item.width,
      startH: item.height,
      mouseStartX: e.clientX,
      mouseStartY: e.clientY,
    });
  };

  const handleDeleteSubItem = (itemId: string) => {
    const updated = wardLayout.items.filter((i) => i.id !== itemId);
    onUpdateRoom({ ...room, wardLayout: { ...wardLayout, items: updated } });
    setSelectedSubItemId(null);
  };

  // Add new sub item
  const handleSaveSubItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subItemForm.name.trim()) return;

    const newItem: WardSubItem = {
      id: `sub-${Date.now()}`,
      name: subItemForm.name.trim(),
      type: subItemForm.type,
      x: 100,
      y: 100,
      width: Number(subItemForm.width) || 140,
      height: Number(subItemForm.height) || 90,
      color: subItemForm.color,
      notes: subItemForm.notes.trim(),
    };

    const updated = [...wardLayout.items, newItem];
    onUpdateRoom({ ...room, wardLayout: { ...wardLayout, items: updated } });
    setIsAddSubItemModalOpen(false);
    setSubItemForm({
      name: '',
      type: 'patient-bay',
      width: 160,
      height: 100,
      color: '#3b82f6',
      notes: '',
    });
  };

  // Add bag directly to this ward
  const handleSaveBag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bagForm.serialCode.trim()) return;

    const newBag: BloodTransportBag = {
      id: `bag-${Date.now()}`,
      serialCode: bagForm.serialCode.trim(),
      model: bagForm.model,
      roomId: room.id,
      floorId: room.floorId,
      locationDetails: bagForm.locationDetails.trim() || `${room.name} Blood Storage`,
      status: 'ready',
      capacityUnits: Number(bagForm.capacityUnits) || 4,
      lastInspectedDate: new Date().toISOString().slice(0, 10),
      notes: bagForm.notes.trim(),
    };

    onUpdateBags([...data.bloodBags, newBag]);
    setIsAddBagModalOpen(false);
    setBagForm({
      serialCode: '',
      model: 'Validated Cold-Chain Porter 2-6°C',
      locationDetails: '',
      capacityUnits: 4,
      notes: '',
    });
  };

  // Add paperwork tray to this ward
  const handleSaveFormTray = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTrayForm.trayLabel.trim()) return;

    const newForm: TransfusionFormLocation = {
      id: `form-${Date.now()}`,
      roomId: room.id,
      floorId: room.floorId,
      trayLabel: formTrayForm.trayLabel.trim(),
      exactSpot: formTrayForm.exactSpot.trim() || 'Ward nursing station desk',
      urgency: formTrayForm.urgency,
      status: 'pending',
      estimatedFormsCount: Number(formTrayForm.estimatedFormsCount) || 2,
      notes: formTrayForm.notes.trim(),
    };

    onUpdateForms([...data.transfusionForms, newForm]);
    setIsAddFormModalOpen(false);
    setFormTrayForm({
      trayLabel: '',
      exactSpot: '',
      urgency: 'routine',
      estimatedFormsCount: 2,
      notes: '',
    });
  };

  // Add door code to this ward
  const handleSaveDoorCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeForm.doorName.trim() || !codeForm.code.trim()) return;

    const newCode: DoorCode = {
      id: `dc-${Date.now()}`,
      doorName: codeForm.doorName.trim(),
      code: codeForm.code.trim(),
      floorId: room.floorId,
      roomId: room.id,
      locationDescription: codeForm.locationDescription.trim() || `${room.name} Entrance`,
      clearanceLevel: codeForm.clearanceLevel,
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    onUpdateDoorCodes([...data.doorCodes, newCode]);
    setIsAddCodeModalOpen(false);
    setCodeForm({
      doorName: '',
      code: '',
      locationDescription: '',
      clearanceLevel: 'Clinical Only',
    });
  };

  // Toggle collection status
  const handleToggleFormStatus = (formId: string) => {
    const updated = data.transfusionForms.map((f) =>
      f.id === formId
        ? {
            ...f,
            status: (f.status === 'collected' ? 'pending' : 'collected') as 'pending' | 'collected',
            lastCollectedAt: f.status === 'pending' ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
          }
        : f
    );
    onUpdateForms(updated);
  };

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const toggleRevealCode = (id: string) => {
    const next = new Set(revealedCodeIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setRevealedCodeIds(next);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Ward Top Navigation Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToMainMap}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors border border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Main Hospital Map</span>
          </button>

          <div className="flex items-center gap-2">
            <div
              className="w-3.5 h-3.5 rounded-full"
              style={{ backgroundColor: room.color || '#3b82f6' }}
            />
            <h1 className="text-base sm:text-lg font-bold text-white leading-tight">
              {room.name}
            </h1>
            <span className="text-xs text-slate-400 capitalize hidden sm:inline">
              · {room.wing} Wing ({room.floorId})
            </span>
          </div>
        </div>

        {/* Quick summary count badges */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-red-950/70 border border-red-800/80 text-red-300 font-semibold">
            <Package className="w-3.5 h-3.5 text-red-400" />
            <span>{wardBags.length} Blood Bags</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-orange-950/70 border border-orange-800/80 text-orange-300 font-semibold">
            <FileText className="w-3.5 h-3.5 text-orange-400" />
            <span>{wardForms.length} Paperwork Trays</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-950/70 border border-amber-800/80 text-amber-300 font-semibold">
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            <span>{wardDoorCodes.length} Door Codes</span>
          </div>
        </div>
      </div>

      {/* Main Split Body: Left = Ward Interior Floor Plan, Right = Asset Information Dashboards */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT COLUMN: INTERACTIVE WARD MAP */}
        <div className="flex-1 relative bg-slate-950 border-r border-slate-800 flex flex-col overflow-hidden min-h-[360px]">
          {/* Ward Map Bar */}
          <div className="p-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">Ward Interior Map:</span>
              <span className="text-slate-400">
                {isEditMode ? 'Drag stations to move them, drag handles to resize' : 'Click any station to view info'}
              </span>
            </div>

            {isEditMode && (
              <button
                onClick={() => setIsAddSubItemModalOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>+ Add Ward Station / Zone</span>
              </button>
            )}
          </div>

          {/* Interactive Ward Canvas */}
          <div
            ref={containerRef}
            className={`relative flex-1 w-full h-full overflow-hidden ${
              isEditMode ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
            }`}
            onMouseDown={handleMouseDownCanvas}
            onMouseMove={handleMouseMoveCanvas}
            onMouseUp={handleMouseUpCanvas}
            onMouseLeave={handleMouseUpCanvas}
          >
            {/* Grid */}
            <div
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                backgroundImage: `linear-gradient(to right, #334155 1px, transparent 1px), linear-gradient(to bottom, #334155 1px, transparent 1px)`,
                backgroundSize: '24px 24px',
              }}
            />

            <svg
              className="absolute top-0 left-0 w-[840px] h-[640px] transition-transform duration-75 origin-top-left"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              }}
              viewBox={`0 0 ${wardLayout.width} ${wardLayout.height}`}
            >
              {/* Outer Ward Perimeter Wall */}
              <rect
                x="20"
                y="20"
                width={wardLayout.width - 40}
                height={wardLayout.height - 40}
                rx="14"
                fill="#0f172a"
                fillOpacity="0.8"
                stroke="#334155"
                strokeWidth="4"
              />

              {/* Corridor walkway in ward */}
              <path
                d={`M 180 340 L 760 340 M 400 40 L 400 560`}
                stroke="#1e293b"
                strokeWidth="24"
                strokeLinecap="round"
                fill="none"
              />

              {/* Sub-items: Stations, Bays, Blood Storage, Paperwork Drop Trays */}
              {wardLayout.items.map((item) => {
                const isSelected = selectedSubItemId === item.id;
                let bg = item.color || '#3b82f6';
                if (item.type === 'blood-bag-station') bg = '#ef4444';
                if (item.type === 'paperwork-tray') bg = '#f97316';
                if (item.type === 'door-keypad') bg = '#0284c7';

                return (
                  <g
                    key={item.id}
                    onMouseDown={(e) => handleSubItemMouseDown(e, item)}
                    className={`${isEditMode ? 'cursor-move' : 'cursor-pointer hover:opacity-95'}`}
                  >
                    <rect
                      x={item.x}
                      y={item.y}
                      width={item.width}
                      height={item.height}
                      rx="8"
                      fill={bg}
                      fillOpacity={isSelected ? 0.95 : 0.85}
                      stroke={isSelected ? '#38bdf8' : '#020617'}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                    />

                    {/* Icon or Type Tag */}
                    <text
                      x={item.x + 8}
                      y={item.y + 16}
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="'JetBrains Mono', monospace"
                      className="opacity-75 pointer-events-none"
                    >
                      {item.type.toUpperCase().replace('-', ' ')}
                    </text>

                    {/* Item Name */}
                    <text
                      x={item.x + 8}
                      y={item.y + 31}
                      fill="#ffffff"
                      fontSize={item.width > 120 ? '11' : '9.5'}
                      fontWeight="700"
                      className="pointer-events-none"
                    >
                      {item.name.length > 20 && item.width < 150
                        ? `${item.name.substring(0, 18)}...`
                        : item.name}
                    </text>

                    {/* Additional Notes or Serial / Door Code */}
                    {item.serialNumber && (
                      <text
                        x={item.x + 8}
                        y={item.y + 48}
                        fill="#fee2e2"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="'JetBrains Mono', monospace"
                        className="pointer-events-none"
                      >
                        SN: {item.serialNumber}
                      </text>
                    )}

                    {item.doorCode && (
                      <text
                        x={item.x + 8}
                        y={item.y + 48}
                        fill="#fef08a"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="'JetBrains Mono', monospace"
                        className="pointer-events-none"
                      >
                        PIN: {item.doorCode}
                      </text>
                    )}

                    {/* Edit mode resize handle & delete icon */}
                    {isEditMode && isSelected && (
                      <g>
                        <rect
                          x={item.x + item.width - 10}
                          y={item.y + item.height - 10}
                          width="14"
                          height="14"
                          rx="3"
                          fill="#38bdf8"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                          className="cursor-se-resize hover:scale-125 transition-transform"
                          onMouseDown={(e) => handleSubItemResizeMouseDown(e, item)}
                        />
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Floating Zoom & Controls */}
            <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1 bg-slate-900/90 border border-slate-700 p-1 rounded-xl shadow-lg">
              <button
                onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
                title="Zoom In"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
                title="Zoom Out"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setZoom(0.95);
                  setPan({ x: 20, y: 10 });
                }}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
                title="Reset View"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 3 ASSET INFORMATION PANELS */}
        <div className="w-full lg:w-[480px] xl:w-[520px] bg-slate-900 flex flex-col overflow-y-auto p-4 sm:p-5 space-y-6">
          {/* SECTION 1: RED BLOOD TRANSPORT BAGS */}
          <div className="bg-slate-950/70 border border-red-900/40 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-red-950 text-red-400 border border-red-800">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Red Blood Transport Bags</h3>
                  <p className="text-[11px] text-slate-400">
                    Serial codes & validated cold-chain carriers stored in {room.name}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsAddBagModalOpen(true)}
                className="px-2.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs flex items-center gap-1 shadow-md shadow-red-950/60 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Bag</span>
              </button>
            </div>

            {/* Bags List */}
            <div className="mt-3 space-y-2.5">
              {wardBags.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs bg-slate-900/50 rounded-xl border border-dashed border-slate-800">
                  No red blood transport bags logged in this ward yet. Click "+ Add Bag" above.
                </div>
              ) : (
                wardBags.map((bag) => (
                  <div
                    key={bag.id}
                    className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-red-400 bg-red-950/70 px-2 py-0.5 rounded border border-red-900/60">
                          {bag.serialCode}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                            bag.status === 'ready'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {bag.status}
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-slate-200 mt-1 truncate">
                        {bag.model}
                      </div>

                      <div className="text-[11px] text-slate-400 mt-0.5">
                        📍 {bag.locationDetails} · {bag.capacityUnits} units capacity
                      </div>

                      {bag.notes && (
                        <div className="text-[10px] text-slate-400 mt-1 italic">
                          "{bag.notes}"
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => onUpdateBags(data.bloodBags.filter((b) => b.id !== bag.id))}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
                      title="Remove Bag"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SECTION 2: COMPLETED TRANSFUSION REQUEST FORMS */}
          <div className="bg-slate-950/70 border border-orange-900/40 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-orange-950 text-orange-400 border border-orange-800">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Transfusion Request Paperwork</h3>
                  <p className="text-[11px] text-slate-400">
                    Designated in-trays and paperwork drop locations in {room.name}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsAddFormModalOpen(true)}
                className="px-2.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs flex items-center gap-1 shadow-md shadow-orange-950/60 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Tray</span>
              </button>
            </div>

            {/* Trays List */}
            <div className="mt-3 space-y-2.5">
              {wardForms.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs bg-slate-900/50 rounded-xl border border-dashed border-slate-800">
                  No transfusion form trays logged in this ward yet. Click "+ Add Tray" above.
                </div>
              ) : (
                wardForms.map((form) => {
                  const isCollected = form.status === 'collected';
                  return (
                    <div
                      key={form.id}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        isCollected
                          ? 'bg-slate-900/50 border-slate-800/80 opacity-75'
                          : 'bg-slate-900 border-orange-900/40'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white">
                            {form.trayLabel}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                              form.urgency === 'stat'
                                ? 'bg-red-950 text-red-300 border border-red-800'
                                : form.urgency === 'urgent'
                                ? 'bg-orange-950 text-orange-300 border border-orange-800'
                                : 'bg-blue-950 text-blue-300 border border-blue-800'
                            }`}
                          >
                            {form.urgency}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-300 mt-1">
                          📍 {form.exactSpot}
                        </div>

                        {form.lastCollectedAt && (
                          <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3" />
                            <span>Last collected at {form.lastCollectedAt}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleToggleFormStatus(form.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                            isCollected
                              ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-md'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isCollected ? 'Collected' : 'Mark Picked Up'}</span>
                        </button>

                        <button
                          onClick={() =>
                            onUpdateForms(data.transfusionForms.filter((f) => f.id !== form.id))
                          }
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Remove Paperwork Tray"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* SECTION 3: DOOR ACCESS & KEYPAD CODES */}
          <div className="bg-slate-950/70 border border-amber-900/40 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-950 text-amber-400 border border-amber-800">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Door Access & Keypad Codes</h3>
                  <p className="text-[11px] text-slate-400">
                    Airlock pins & restricted door codes for {room.name}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsAddCodeModalOpen(true)}
                className="px-2.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs flex items-center gap-1 shadow-md shadow-amber-950/60 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Code</span>
              </button>
            </div>

            {/* Codes List */}
            <div className="mt-3 space-y-2.5">
              {wardDoorCodes.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs bg-slate-900/50 rounded-xl border border-dashed border-slate-800">
                  No door codes assigned to this ward yet. Click "+ Add Code" above.
                </div>
              ) : (
                wardDoorCodes.map((door) => {
                  const isRevealed = revealedCodeIds.has(door.id);
                  const isCopied = copiedCodeId === door.id;

                  return (
                    <div
                      key={door.id}
                      className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">
                            {door.doorName}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {door.clearanceLevel}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-400 mt-1">
                          📍 {door.locationDescription}
                        </div>

                        {/* Code box */}
                        <div className="mt-2 flex items-center gap-2">
                          <div className="px-3 py-1 bg-slate-950 rounded-lg border border-slate-800 font-mono text-sm font-bold text-amber-400 tracking-wider">
                            {isRevealed ? door.code : '••••••'}
                          </div>

                          <button
                            onClick={() => toggleRevealCode(door.id)}
                            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                            title={isRevealed ? 'Hide code' : 'Reveal code'}
                          >
                            {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>

                          <button
                            onClick={() => handleCopyCode(door.id, door.code)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-[11px]"
                            title="Copy code"
                          >
                            {isCopied ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          onUpdateDoorCodes(data.doorCodes.filter((d) => d.id !== door.id))
                        }
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
                        title="Delete Code"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================= MODALS ================= */}

      {/* 1. Add Blood Transport Bag Modal */}
      {isAddBagModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-red-400" />
                <span>Add Red Blood Transport Bag</span>
              </h3>
              <button
                onClick={() => setIsAddBagModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBag} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Serial Number / Barcode *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RBTB-WHH-904A"
                  value={bagForm.serialCode}
                  onChange={(e) => setBagForm({ ...bagForm, serialCode: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Model / Specification
                </label>
                <input
                  type="text"
                  value={bagForm.model}
                  onChange={(e) => setBagForm({ ...bagForm, model: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Exact Storage Location in {room.name}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main Blood Fridge Bay 2, Shelf 3"
                  value={bagForm.locationDetails}
                  onChange={(e) => setBagForm({ ...bagForm, locationDetails: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Capacity (PRBC Units)
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={bagForm.capacityUnits}
                  onChange={(e) =>
                    setBagForm({ ...bagForm, capacityUnits: Number(e.target.value) })
                  }
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={bagForm.notes}
                  onChange={(e) => setBagForm({ ...bagForm, notes: e.target.value })}
                  placeholder="e.g. Dedicated for emergency surgical and hemorrhage transfusions"
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-red-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddBagModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg"
                >
                  Save Blood Bag
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Add Transfusion Paperwork Tray Modal */}
      {isAddFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-400" />
                <span>Add Transfusion Paperwork Tray</span>
              </h3>
              <button
                onClick={() => setIsAddFormModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFormTray} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tray / Drop-box Label *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ward Central Transfusion In-Tray"
                  value={formTrayForm.trayLabel}
                  onChange={(e) =>
                    setFormTrayForm({ ...formTrayForm, trayLabel: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Exact Spot Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Nursing desk behind barcode scanner beside phone"
                  value={formTrayForm.exactSpot}
                  onChange={(e) =>
                    setFormTrayForm({ ...formTrayForm, exactSpot: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Urgency
                  </label>
                  <select
                    value={formTrayForm.urgency}
                    onChange={(e) =>
                      setFormTrayForm({
                        ...formTrayForm,
                        urgency: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-orange-500"
                  >
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="stat">STAT / Immediate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Estimated Form Count
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={formTrayForm.estimatedFormsCount}
                    onChange={(e) =>
                      setFormTrayForm({
                        ...formTrayForm,
                        estimatedFormsCount: Number(e.target.value),
                      })
                    }
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={formTrayForm.notes}
                  onChange={(e) =>
                    setFormTrayForm({ ...formTrayForm, notes: e.target.value })
                  }
                  placeholder="e.g. Signed blood crossmatch forms and sample request slips"
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddFormModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-lg"
                >
                  Save Paperwork Tray
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Add Door Code Modal */}
      {isAddCodeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <span>Add Door Access Keypad Code</span>
              </h3>
              <button
                onClick={() => setIsAddCodeModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDoorCode} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Door Name / Identifier *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ward A2 Main Airlock Keypad"
                  value={codeForm.doorName}
                  onChange={(e) => setCodeForm({ ...codeForm, doorName: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Keypad Code / PIN *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. *4921# or 3829"
                  value={codeForm.code}
                  onChange={(e) => setCodeForm({ ...codeForm, code: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-mono font-bold tracking-wider focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Clearance Level
                </label>
                <select
                  value={codeForm.clearanceLevel}
                  onChange={(e) =>
                    setCodeForm({ ...codeForm, clearanceLevel: e.target.value as any })
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="Clinical Only">Clinical Only</option>
                  <option value="Standard Staff">Standard Staff</option>
                  <option value="Restricted Biohazard">Restricted Biohazard</option>
                  <option value="Security / Charge Nurse">Security / Charge Nurse</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Location Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Double glass entry doors from main corridor"
                  value={codeForm.locationDescription}
                  onChange={(e) =>
                    setCodeForm({ ...codeForm, locationDescription: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddCodeModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg"
                >
                  Save Door Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Add Ward Interior Sub-item Modal */}
      {isAddSubItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-400" />
                <span>Add Ward Station / Zone Box</span>
              </h3>
              <button
                onClick={() => setIsAddSubItemModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubItem} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Zone / Station Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Emergency Hemorrhage Fridge, Bay 3"
                  value={subItemForm.name}
                  onChange={(e) => setSubItemForm({ ...subItemForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Zone Type
                </label>
                <select
                  value={subItemForm.type}
                  onChange={(e) =>
                    setSubItemForm({ ...subItemForm, type: e.target.value as any })
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="patient-bay">Patient Bay / Beds</option>
                  <option value="nursing-station">Nursing Station</option>
                  <option value="blood-bag-station">Blood Transport Bag Storage</option>
                  <option value="paperwork-tray">Transfusion Paperwork Drop Tray</option>
                  <option value="door-keypad">Entrance / Keypad Door</option>
                  <option value="clean-utility">Clean Utility / Med Room</option>
                  <option value="sluice">Sluice / Disposal</option>
                  <option value="doctors-office">Doctors & Handover Office</option>
                  <option value="custom">Custom Area</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Width (px)
                  </label>
                  <input
                    type="number"
                    min={40}
                    max={400}
                    value={subItemForm.width}
                    onChange={(e) =>
                      setSubItemForm({ ...subItemForm, width: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Height (px)
                  </label>
                  <input
                    type="number"
                    min={30}
                    max={300}
                    value={subItemForm.height}
                    onChange={(e) =>
                      setSubItemForm({ ...subItemForm, height: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddSubItemModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg"
                >
                  Add Zone to Map
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
