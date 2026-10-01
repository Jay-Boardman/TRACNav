import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import {
  FloorId,
  HospitalData,
  Room,
  BloodTransportBag,
  TransfusionFormLocation,
  DoorCode,
  WingLabel,
  WingZone,
  Hallway,
  MapSymbol,
  MapSymbolType,
} from '../types/hospital';
import {
  Plus,
  Edit2,
  Trash2,
  Copy,
  Layers,
  Grid,
  Check,
  X,
  Palette,
  Move,
  RotateCcw,
  Sparkles,
  Sliders,
  Footprints,
  Search,
} from 'lucide-react';
import {
  defaultWingLabels,
  defaultWingZones,
  defaultHallways,
  defaultSymbols,
} from '../data/defaultArchitecturalData';

interface HospitalMapProps {
  data: HospitalData;
  activeFloorId: FloorId;
  onFloorChange: (floorId: FloorId) => void;
  isEditMode: boolean;
  onSelectWard: (room: Room) => void;
  onUpdateRooms: (rooms: Room[]) => void;
  onUpdateWingLabels: (wingLabels: WingLabel[]) => void;
  onUpdateWingZones: (wingZones: WingZone[]) => void;
  onUpdateHallways: (hallways: Hallway[]) => void;
  onUpdateSymbols: (symbols: MapSymbol[]) => void;
  onOpenAddRoomModal: () => void;
  onOpenEditRoomModal: (room: Room) => void;
}

type SelectedElement =
  | { type: 'room'; id: string }
  | { type: 'wingLabel'; id: string }
  | { type: 'wingZone'; id: string }
  | { type: 'hallway'; id: string }
  | { type: 'symbol'; id: string }
  | null;

type DragAction =
  | {
      type: 'move-symbol';
      id: string;
      startX: number;
      startY: number;
      mouseStartX: number;
      mouseStartY: number;
    }
  | {
      type: 'move-room';
      id: string;
      startX: number;
      startY: number;
      mouseStartX: number;
      mouseStartY: number;
    }
  | {
      type: 'resize-room';
      id: string;
      direction: 'se' | 's' | 'e';
      startW: number;
      startH: number;
      mouseStartX: number;
      mouseStartY: number;
    }
  | {
      type: 'move-wingLabel';
      id: string;
      startX: number;
      startY: number;
      mouseStartX: number;
      mouseStartY: number;
    }
  | {
      type: 'resize-wingLabel';
      id: string;
      startW: number;
      startH: number;
      mouseStartX: number;
      mouseStartY: number;
    }
  | {
      type: 'move-wingZone';
      id: string;
      startX: number;
      startY: number;
      mouseStartX: number;
      mouseStartY: number;
    }
  | {
      type: 'resize-wingZone';
      id: string;
      direction: 'se' | 's' | 'e' | 'nw';
      startX: number;
      startY: number;
      startW: number;
      startH: number;
      mouseStartX: number;
      mouseStartY: number;
    }
  | {
      type: 'move-hallway';
      id: string;
      startX1: number;
      startY1: number;
      startX2: number;
      startY2: number;
      mouseStartX: number;
      mouseStartY: number;
    }
  | {
      type: 'move-hallway-node';
      id: string;
      nodeIndex: 1 | 2;
      mouseStartX: number;
      mouseStartY: number;
      startX: number;
      startY: number;
    }
  | null;

const ZONE_PALETTE = [
  { label: 'Purple (Appleton)', color: '#4a044e', border: '#701a75' },
  { label: 'Teal (Burtonwood)', color: '#0f766e', border: '#14b8a6' },
  { label: 'Magenta (Croft)', color: '#831843', border: '#db2777' },
  { label: 'Blue (Entrance)', color: '#0284c7', border: '#38bdf8' },
  { label: 'Indigo (Specialty)', color: '#3730a3', border: '#6366f1' },
  { label: 'Amber (Urgent)', color: '#78350f', border: '#f59e0b' },
  { label: 'Slate (Corridor)', color: '#334155', border: '#64748b' },
];

const WING_LABEL_COLORS = [
  '#0284c7', // Blue
  '#701a75', // Purple
  '#0f766e', // Teal
  '#831843', // Magenta
  '#334155', // Slate
  '#b45309', // Amber
  '#15803d', // Emerald
];

export const HospitalMap: React.FC<HospitalMapProps> = ({
  data,
  activeFloorId,
  onFloorChange,
  isEditMode,
  onSelectWard,
  onUpdateRooms,
  onUpdateWingLabels,
  onUpdateWingZones,
  onUpdateHallways,
  onUpdateSymbols,
  onOpenAddRoomModal,
  onOpenEditRoomModal,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Pan and Zoom
  const [zoom, setZoom] = useState<number>(0.92);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 20, y: 10 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Snap to Grid (10px increments)
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);

  // Unified selection in Edit Mode
  const [selected, setSelected] = useState<SelectedElement>(null);

  // Dragging / Resizing interaction state
  const [dragAction, setDragAction] = useState<DragAction>(null);

  // Inline editing popover states
  const [editingWingLabelId, setEditingWingLabelId] = useState<string | null>(null);
  const [wingLabelText, setWingLabelText] = useState<string>('');

  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [zoneNameText, setZoneNameText] = useState<string>('');

  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  // Ward Search State
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return [...data.rooms].sort((a, b) => a.name.localeCompare(b.name));
    }
    return data.rooms
      .filter((room) => {
        return (
          room.name.toLowerCase().includes(q) ||
          (room.code && room.code.toLowerCase().includes(q)) ||
          (room.department && room.department.toLowerCase().includes(q)) ||
          (room.description && room.description.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        const aStart = a.name.toLowerCase().startsWith(q);
        const bStart = b.name.toLowerCase().startsWith(q);
        if (aStart && !bStart) return -1;
        if (!aStart && bStart) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [data.rooms, searchQuery]);

  const handleSelectSearchedWard = useCallback(
    (room: Room) => {
      if (room.floorId !== activeFloorId) {
        onFloorChange(room.floorId);
      }
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const targetZoom = 1.35;
        const roomCenterX = room.x + room.width / 2;
        const roomCenterY = room.y + room.height / 2;
        setPan({
          x: rect.width / 2 - roomCenterX * targetZoom,
          y: rect.height / 2 - roomCenterY * targetZoom,
        });
        setZoom(targetZoom);
      }
      setSelected({ type: 'room', id: room.id });
      setIsSearchOpen(false);
      setSearchQuery('');
      onSelectWard(room);
    },
    [activeFloorId, onFloorChange, onSelectWard]
  );

  // Floor entities
  const allWingLabels = data.wingLabels || defaultWingLabels;
  const allWingZones = data.wingZones || defaultWingZones;
  const allHallways = data.hallways || defaultHallways;
  const allSymbols = data.symbols || defaultSymbols;

  const currentFloorRooms = useMemo(() => {
    return data.rooms.filter((r) => r.floorId === activeFloorId);
  }, [data.rooms, activeFloorId]);

  const currentFloorWingLabels = useMemo(() => {
    return allWingLabels.filter((wl) => wl.floorId === activeFloorId);
  }, [allWingLabels, activeFloorId]);

  const currentFloorWingZones = useMemo(() => {
    return allWingZones.filter((wz) => wz.floorId === activeFloorId);
  }, [allWingZones, activeFloorId]);

  const currentFloorHallways = useMemo(() => {
    return allHallways.filter((hw) => hw.floorId === activeFloorId);
  }, [allHallways, activeFloorId]);

  const currentFloorSymbols = useMemo(() => {
    return allSymbols.filter((s) => s.floorId === activeFloorId);
  }, [allSymbols, activeFloorId]);

  // Bags mapped by room
  const bagsByRoom = useMemo(() => {
    const map = new Map<string, BloodTransportBag[]>();
    data.bloodBags.forEach((b) => {
      const arr = map.get(b.roomId) || [];
      arr.push(b);
      map.set(b.roomId, arr);
    });
    return map;
  }, [data.bloodBags]);

  // Forms mapped by room
  const formsByRoom = useMemo(() => {
    const map = new Map<string, TransfusionFormLocation[]>();
    data.transfusionForms.forEach((f) => {
      const arr = map.get(f.roomId) || [];
      arr.push(f);
      map.set(f.roomId, arr);
    });
    return map;
  }, [data.transfusionForms]);

  // Screen to SVG coordinate converter
  const screenToSvgCoord = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const rawX = clientX - rect.left - pan.x;
      const rawY = clientY - rect.top - pan.y;
      return {
        x: rawX / zoom,
        y: rawY / zoom,
      };
    },
    [pan, zoom]
  );

  // Pan controls
  const handleMouseDownBackground = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    if (!isEditMode) {
      setSelected(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    if (!dragAction) return;

    const currentSvg = screenToSvgCoord(e.clientX, e.clientY);
    const startSvg = screenToSvgCoord(dragAction.mouseStartX, dragAction.mouseStartY);
    const deltaX = currentSvg.x - startSvg.x;
    const deltaY = currentSvg.y - startSvg.y;

    // Helper for snapping
    const snap = (val: number) => (snapToGrid ? Math.round(val / 10) * 10 : Math.round(val));

    // 0. Move Circular Map Symbol (Elevator or Stairs)
    if (dragAction.type === 'move-symbol') {
      const newX = Math.max(15, Math.min(1035, snap(dragAction.startX + deltaX)));
      const newY = Math.max(15, Math.min(1005, snap(dragAction.startY + deltaY)));
      const updated = allSymbols.map((s) =>
        s.id === dragAction.id ? { ...s, x: newX, y: newY } : s
      );
      onUpdateSymbols(updated);
      return;
    }

    // 1. Move Room Box
    if (dragAction.type === 'move-room') {
      const newX = Math.max(10, Math.min(1050, snap(dragAction.startX + deltaX)));
      const newY = Math.max(10, Math.min(1050, snap(dragAction.startY + deltaY)));
      const updated = data.rooms.map((r) =>
        r.id === dragAction.id ? { ...r, x: newX, y: newY } : r
      );
      onUpdateRooms(updated);
      return;
    }

    // 2. Resize Room Box
    if (dragAction.type === 'resize-room') {
      let newW = dragAction.startW;
      let newH = dragAction.startH;
      if (dragAction.direction === 'se' || dragAction.direction === 'e') {
        newW = Math.max(70, Math.min(450, snap(dragAction.startW + deltaX)));
      }
      if (dragAction.direction === 'se' || dragAction.direction === 's') {
        newH = Math.max(45, Math.min(400, snap(dragAction.startH + deltaY)));
      }
      const updated = data.rooms.map((r) =>
        r.id === dragAction.id ? { ...r, width: newW, height: newH } : r
      );
      onUpdateRooms(updated);
      return;
    }

    // 3. Move Wing Label Box (Appleton Wing, Burtonwood Wing, etc.)
    if (dragAction.type === 'move-wingLabel') {
      const newX = Math.max(10, Math.min(1050, snap(dragAction.startX + deltaX)));
      const newY = Math.max(10, Math.min(1050, snap(dragAction.startY + deltaY)));
      const updated = allWingLabels.map((wl) =>
        wl.id === dragAction.id ? { ...wl, x: newX, y: newY } : wl
      );
      onUpdateWingLabels(updated);
      return;
    }

    // 4. Resize Wing Label Box
    if (dragAction.type === 'resize-wingLabel') {
      const newW = Math.max(80, Math.min(400, snap(dragAction.startW + deltaX)));
      const newH = Math.max(28, Math.min(160, snap(dragAction.startH + deltaY)));
      const updated = allWingLabels.map((wl) =>
        wl.id === dragAction.id ? { ...wl, width: newW, height: newH } : wl
      );
      onUpdateWingLabels(updated);
      return;
    }

    // 5. Move Coloured Surrounding Box (Wing Zone)
    if (dragAction.type === 'move-wingZone') {
      const newX = Math.max(5, Math.min(1050, snap(dragAction.startX + deltaX)));
      const newY = Math.max(5, Math.min(1050, snap(dragAction.startY + deltaY)));
      const updated = allWingZones.map((wz) =>
        wz.id === dragAction.id ? { ...wz, x: newX, y: newY } : wz
      );
      onUpdateWingZones(updated);
      return;
    }

    // 6. Resize Coloured Surrounding Box
    if (dragAction.type === 'resize-wingZone') {
      let newX = dragAction.startX;
      let newY = dragAction.startY;
      let newW = dragAction.startW;
      let newH = dragAction.startH;

      if (dragAction.direction === 'se' || dragAction.direction === 'e') {
        newW = Math.max(60, snap(dragAction.startW + deltaX));
      }
      if (dragAction.direction === 'se' || dragAction.direction === 's') {
        newH = Math.max(50, snap(dragAction.startH + deltaY));
      }
      if (dragAction.direction === 'nw') {
        const proposedX = snap(dragAction.startX + deltaX);
        const proposedY = snap(dragAction.startY + deltaY);
        const diffW = dragAction.startX - proposedX;
        const diffH = dragAction.startY - proposedY;
        if (dragAction.startW + diffW >= 60) {
          newX = proposedX;
          newW = dragAction.startW + diffW;
        }
        if (dragAction.startH + diffH >= 50) {
          newY = proposedY;
          newH = dragAction.startH + diffH;
        }
      }

      const updated = allWingZones.map((wz) =>
        wz.id === dragAction.id ? { ...wz, x: newX, y: newY, width: newW, height: newH } : wz
      );
      onUpdateWingZones(updated);
      return;
    }

    // 7. Move Hallway Segment (Both endpoints move together)
    if (dragAction.type === 'move-hallway') {
      const deltaClampedX = snap(deltaX);
      const deltaClampedY = snap(deltaY);
      const updated = allHallways.map((hw) =>
        hw.id === dragAction.id
          ? {
              ...hw,
              x1: Math.max(10, Math.min(1050, dragAction.startX1 + deltaClampedX)),
              y1: Math.max(10, Math.min(1050, dragAction.startY1 + deltaClampedY)),
              x2: Math.max(10, Math.min(1050, dragAction.startX2 + deltaClampedX)),
              y2: Math.max(10, Math.min(1050, dragAction.startY2 + deltaClampedY)),
            }
          : hw
      );
      onUpdateHallways(updated);
      return;
    }

    // 8. Move Hallway Node (Endpoint 1 or 2)
    if (dragAction.type === 'move-hallway-node') {
      const newX = Math.max(10, Math.min(1050, snap(dragAction.startX + deltaX)));
      const newY = Math.max(10, Math.min(1050, snap(dragAction.startY + deltaY)));
      const updated = allHallways.map((hw) => {
        if (hw.id !== dragAction.id) return hw;
        if (dragAction.nodeIndex === 1) {
          return { ...hw, x1: newX, y1: newY };
        } else {
          return { ...hw, x2: newX, y2: newY };
        }
      });
      onUpdateHallways(updated);
      return;
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDragAction(null);
  };

  // Zoom in / out centered on the screen viewport
  const zoomAtScreenCenter = useCallback((factor: number) => {
    let cx = window.innerWidth / 2;
    let cy = window.innerHeight / 2;

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      cx = rect.width / 2;
      cy = rect.height / 2;
    }

    setZoom((prevZoom) => {
      const nextZoom = Math.min(2.5, Math.max(0.4, prevZoom * factor));
      if (Math.abs(nextZoom - prevZoom) < 0.0001) return prevZoom;

      const scaleChange = nextZoom / prevZoom;

      setPan((prevPan) => ({
        x: cx - (cx - prevPan.x) * scaleChange,
        y: cy - (cy - prevPan.y) * scaleChange,
      }));

      return nextZoom;
    });
  }, []);

  const resetToCenter = useCallback(() => {
    const targetZoom = 0.92;
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = (rect.width - 1050 * targetZoom) / 2;
      const centerY = (rect.height - 1020 * targetZoom) / 2;
      setZoom(targetZoom);
      setPan({ x: Math.max(10, centerX), y: Math.max(10, centerY) });
    } else {
      setZoom(0.92);
      setPan({ x: 20, y: 10 });
    }
  }, []);

  // Center map on initial load
  useEffect(() => {
    resetToCenter();
  }, [resetToCenter]);

  // Zoom with Wheel (Always centered on screen)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    zoomAtScreenCenter(zoomFactor);
  };

  // Touch Handlers for mobile pan & pinch-zoom (centered on screen)
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchDistanceRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsPanning(true);
      touchStartRef.current = {
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      };
      touchDistanceRef.current = null;
    } else if (e.touches.length === 2) {
      setIsPanning(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchDistanceRef.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isPanning) {
      setPan({
        x: e.touches[0].clientX - touchStartRef.current.x,
        y: e.touches[0].clientY - touchStartRef.current.y,
      });
    } else if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      const newDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (touchDistanceRef.current > 0) {
        const factor = newDist / touchDistanceRef.current;
        zoomAtScreenCenter(factor);
      }
      touchDistanceRef.current = newDist;
    }
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
    setDragAction(null);
    touchDistanceRef.current = null;
  };

  // ==========================================
  // ADD ELEMENT HELPERS
  // ==========================================

  // Add new Wing Box (Appleton Wing, Burtonwood Wing, etc.)
  const handleAddWingLabel = () => {
    const newId = `wl-${Date.now()}`;
    const newLabel: WingLabel = {
      id: newId,
      floorId: activeFloorId,
      title: 'New Wing Box',
      x: 350,
      y: 250,
      width: 170,
      height: 38,
      borderColor: '#701a75',
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
      fontSize: 15,
    };
    onUpdateWingLabels([...allWingLabels, newLabel]);
    setSelected({ type: 'wingLabel', id: newId });
  };

  // Add new Coloured Surrounding Box (Wing Zone)
  const handleAddWingZone = () => {
    const newId = `wz-${Date.now()}`;
    const newZone: WingZone = {
      id: newId,
      floorId: activeFloorId,
      name: 'Coloured Wing Zone',
      wing: 'appleton',
      x: 300,
      y: 200,
      width: 250,
      height: 200,
      color: '#4a044e',
      opacity: 0.28,
      borderColor: '#701a75',
      borderRadius: 8,
    };
    onUpdateWingZones([...allWingZones, newZone]);
    setSelected({ type: 'wingZone', id: newId });
  };

  // Add new Hallway Corridor segment
  const handleAddHallway = () => {
    const newId = `hw-${Date.now()}`;
    const newHallway: Hallway = {
      id: newId,
      floorId: activeFloorId,
      name: 'Corridor Hallway',
      x1: 250,
      y1: 300,
      x2: 450,
      y2: 300,
      width: 14,
      color: '#eab308',
    };
    onUpdateHallways([...allHallways, newHallway]);
    setSelected({ type: 'hallway', id: newId });
  };

  // Add new circular symbol (Elevator or Stairs in circle)
  const handleAddSymbol = (type: 'elevator' | 'stairs') => {
    const newId = `sym-${Date.now()}`;
    const newSymbol: MapSymbol = {
      id: newId,
      floorId: activeFloorId,
      type,
      x: 350,
      y: 350,
      radius: 18,
      label: type === 'elevator' ? 'Lift' : 'Stairs',
      color: type === 'elevator' ? '#0284c7' : '#0f172a',
    };
    onUpdateSymbols([...allSymbols, newSymbol]);
    setSelected({ type: 'symbol', id: newId });
  };

  // Revert architecture to default Warrington Hospital layout
  const handleResetArchitecture = () => {
    onUpdateWingLabels(defaultWingLabels);
    onUpdateWingZones(defaultWingZones);
    onUpdateHallways(defaultHallways);
    onUpdateSymbols(defaultSymbols);
    setShowResetConfirm(false);
    setSelected(null);
  };

  // Selected item object references
  const selectedRoom = useMemo(() => {
    if (selected?.type !== 'room') return null;
    return data.rooms.find((r) => r.id === selected.id) || null;
  }, [data.rooms, selected]);

  const selectedWingLabel = useMemo(() => {
    if (selected?.type !== 'wingLabel') return null;
    return allWingLabels.find((wl) => wl.id === selected.id) || null;
  }, [allWingLabels, selected]);

  const selectedWingZone = useMemo(() => {
    if (selected?.type !== 'wingZone') return null;
    return allWingZones.find((wz) => wz.id === selected.id) || null;
  }, [allWingZones, selected]);

  const selectedHallway = useMemo(() => {
    if (selected?.type !== 'hallway') return null;
    return allHallways.find((hw) => hw.id === selected.id) || null;
  }, [allHallways, selected]);

  const selectedSymbol = useMemo(() => {
    if (selected?.type !== 'symbol') return null;
    return allSymbols.find((s) => s.id === selected.id) || null;
  }, [allSymbols, selected]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-slate-950 overflow-hidden select-none ${
        isEditMode ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
      }`}
      onMouseDown={handleMouseDownBackground}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Blueprint Grid Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage: `linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)`,
          backgroundSize: snapToGrid ? '20px 20px' : '36px 36px',
        }}
      />

      {/* TOP EDIT MODE TOOLBAR */}
      {isEditMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-auto bg-slate-900/95 border border-amber-500/80 backdrop-blur-md rounded-2xl px-4 py-2 text-slate-200 text-xs shadow-2xl flex flex-wrap items-center justify-center gap-2 max-w-[95vw]">
          <div className="flex items-center gap-2 pr-2 border-r border-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <strong className="text-amber-300 font-bold hidden sm:inline">Edit Mode:</strong>
            <span className="text-[11px] text-slate-300 hidden md:inline">
              Move & resize wing boxes, coloured zones, hallways & wards
            </span>
          </div>

          {/* Quick Add Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={onOpenAddRoomModal}
              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold flex items-center gap-1 transition-colors shadow-sm"
              title="Add a new ward box (name & number)"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Ward Box</span>
            </button>

            <button
              onClick={handleAddWingLabel}
              className="px-2.5 py-1 rounded-lg bg-purple-700 hover:bg-purple-600 text-white text-[11px] font-bold flex items-center gap-1 transition-colors shadow-sm"
              title="Add movable Appleton/Burtonwood/Croft Wing Title Box"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Wing Box</span>
            </button>

            <button
              onClick={handleAddWingZone}
              className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1 transition-colors shadow-sm"
              title="Add movable & resizable coloured surrounding zone"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Coloured Zone</span>
            </button>

            <button
              onClick={handleAddHallway}
              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-[11px] flex items-center gap-1 transition-colors shadow-sm"
              title="Add editable circulation corridor / hallway segment"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Hallway</span>
            </button>

            <button
              onClick={() => handleAddSymbol('elevator')}
              className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] flex items-center gap-1 transition-colors shadow-sm"
              title="Add elevator / lift circle symbol"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ 🛗 Elevator</span>
            </button>

            <button
              onClick={() => handleAddSymbol('stairs')}
              className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-[11px] flex items-center gap-1 transition-colors shadow-sm border border-slate-600"
              title="Add stairs circle symbol"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ 🪜 Stairs</span>
            </button>

            {/* Snap Toggle */}
            <button
              onClick={() => setSnapToGrid(!snapToGrid)}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors ml-1 ${
                snapToGrid ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50' : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Grid className="w-3 h-3" />
              <span>Snap 10px</span>
            </button>

            {/* Reset to Warrington Hospital defaults */}
            <button
              onClick={() => setShowResetConfirm(true)}
              className="p-1 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-300 border border-slate-700 transition-colors ml-1"
              title="Reset layout to default Warrington hospital architectural plan"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* RESET CONFIRMATION MODAL */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-red-300 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-red-400" />
              <span>Reset Floor Plan Layout?</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              This will restore all Wing Boxes (Appleton, Burtonwood, Croft), Coloured Background Zones, and Circulation Hallways back to the default Warrington Hospital architectural floor plan.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleResetArchitecture}
                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md"
              >
                Reset to Default
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SVG Canvas */}
      <svg
        className="absolute top-0 left-0 w-[1050px] h-[1020px] transition-transform duration-75 ease-out origin-top-left"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
        viewBox="0 0 1050 1020"
      >
        <defs>
          <filter id="boxShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.5" />
          </filter>
        </defs>

        {/* ========================================================
            LAYER 1: COLOURED BOXES SURROUNDING THE WARDS (Wing Zones)
           ======================================================== */}
        <g id="layer-coloured-wing-zones">
          {currentFloorWingZones.map((zone) => {
            const isSelected = selected?.type === 'wingZone' && selected.id === zone.id;

            return (
              <g
                key={zone.id}
                onMouseDown={(e) => {
                  if (!isEditMode) return;
                  if (e.button !== 0) return;
                  e.stopPropagation();
                  setSelected({ type: 'wingZone', id: zone.id });
                  setDragAction({
                    type: 'move-wingZone',
                    id: zone.id,
                    startX: zone.x,
                    startY: zone.y,
                    mouseStartX: e.clientX,
                    mouseStartY: e.clientY,
                  });
                }}
                className={isEditMode ? 'cursor-move' : ''}
              >
                {/* Surrounding coloured box rect */}
                <rect
                  x={zone.x}
                  y={zone.y}
                  width={zone.width}
                  height={zone.height}
                  rx={zone.borderRadius || 8}
                  fill={zone.color}
                  fillOpacity={zone.opacity ?? 0.28}
                  stroke={isSelected ? '#38bdf8' : zone.borderColor || zone.color}
                  strokeWidth={isSelected ? 3 : 2}
                  strokeDasharray={isSelected ? '6 4' : 'none'}
                />

                {/* Subtle Zone label in Edit Mode */}
                {isEditMode && (
                  <text
                    x={zone.x + 10}
                    y={zone.y + 20}
                    fill={isSelected ? '#38bdf8' : '#ffffff'}
                    fontSize="11"
                    fontWeight="bold"
                    fontFamily="'Plus Jakarta Sans', sans-serif"
                    className="pointer-events-none opacity-60"
                  >
                    {zone.name}
                  </text>
                )}

                {/* Resize handle (Bottom-Right) in Edit Mode */}
                {isEditMode && isSelected && (
                  <g
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setDragAction({
                        type: 'resize-wingZone',
                        id: zone.id,
                        direction: 'se',
                        startX: zone.x,
                        startY: zone.y,
                        startW: zone.width,
                        startH: zone.height,
                        mouseStartX: e.clientX,
                        mouseStartY: e.clientY,
                      });
                    }}
                    className="cursor-se-resize"
                  >
                    <circle
                      cx={zone.x + zone.width}
                      cy={zone.y + zone.height}
                      r="7"
                      fill="#38bdf8"
                      stroke="#0f172a"
                      strokeWidth="2"
                    />
                  </g>
                )}
              </g>
            );
          })}
        </g>

        {/* ========================================================
            LAYER 2: EDITABLE CIRCULATION HALLWAYS
           ======================================================== */}
        <g id="layer-hallways">
          {currentFloorHallways.map((hw) => {
            const isSelected = selected?.type === 'hallway' && selected.id === hw.id;
            const strokeColor = hw.color || '#eab308';
            const baseWidth = hw.width || 14;

            return (
              <g
                key={hw.id}
                onMouseDown={(e) => {
                  if (!isEditMode) return;
                  if (e.button !== 0) return;
                  e.stopPropagation();
                  setSelected({ type: 'hallway', id: hw.id });
                  setDragAction({
                    type: 'move-hallway',
                    id: hw.id,
                    startX1: hw.x1,
                    startY1: hw.y1,
                    startX2: hw.x2,
                    startY2: hw.y2,
                    mouseStartX: e.clientX,
                    mouseStartY: e.clientY,
                  });
                }}
                className={isEditMode ? 'cursor-move group' : ''}
              >
                {/* Outer corridor stroke */}
                <line
                  x1={hw.x1}
                  y1={hw.y1}
                  x2={hw.x2}
                  y2={hw.y2}
                  stroke={isSelected ? '#38bdf8' : strokeColor}
                  strokeWidth={isSelected ? baseWidth + 4 : baseWidth}
                  strokeLinecap="round"
                  opacity={isSelected ? 1 : 0.85}
                />

                {/* Inner bright yellow stroke for hospital floor aesthetic */}
                <line
                  x1={hw.x1}
                  y1={hw.y1}
                  x2={hw.x2}
                  y2={hw.y2}
                  stroke="#fde047"
                  strokeWidth={Math.max(4, baseWidth - 6)}
                  strokeLinecap="round"
                  opacity={0.95}
                />

                {/* Hallway Endpoint Handles (Node 1 and Node 2) in Edit Mode */}
                {isEditMode && isSelected && (
                  <>
                    {/* Node 1 handle */}
                    <circle
                      cx={hw.x1}
                      cy={hw.y1}
                      r="7"
                      fill="#ffffff"
                      stroke="#38bdf8"
                      strokeWidth="2.5"
                      className="cursor-crosshair"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDragAction({
                          type: 'move-hallway-node',
                          id: hw.id,
                          nodeIndex: 1,
                          startX: hw.x1,
                          startY: hw.y1,
                          mouseStartX: e.clientX,
                          mouseStartY: e.clientY,
                        });
                      }}
                    />

                    {/* Node 2 handle */}
                    <circle
                      cx={hw.x2}
                      cy={hw.y2}
                      r="7"
                      fill="#ffffff"
                      stroke="#38bdf8"
                      strokeWidth="2.5"
                      className="cursor-crosshair"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDragAction({
                          type: 'move-hallway-node',
                          id: hw.id,
                          nodeIndex: 2,
                          startX: hw.x2,
                          startY: hw.y2,
                          mouseStartX: e.clientX,
                          mouseStartY: e.clientY,
                        });
                      }}
                    />
                  </>
                )}
              </g>
            );
          })}
        </g>

        {/* ========================================================
            LAYER 3: MOVABLE WING BOXES (Appleton, Burtonwood, Croft, etc.)
           ======================================================== */}
        <g id="layer-wing-labels">
          {currentFloorWingLabels.map((wl) => {
            const isSelected = selected?.type === 'wingLabel' && selected.id === wl.id;

            return (
              <g
                key={wl.id}
                onMouseDown={(e) => {
                  if (!isEditMode) return;
                  if (e.button !== 0) return;
                  e.stopPropagation();
                  setSelected({ type: 'wingLabel', id: wl.id });
                  setDragAction({
                    type: 'move-wingLabel',
                    id: wl.id,
                    startX: wl.x,
                    startY: wl.y,
                    mouseStartX: e.clientX,
                    mouseStartY: e.clientY,
                  });
                }}
                onDoubleClick={(e) => {
                  if (!isEditMode) return;
                  e.stopPropagation();
                  setEditingWingLabelId(wl.id);
                  setWingLabelText(wl.title);
                }}
                className={isEditMode ? 'cursor-move' : ''}
              >
                {/* Wing Box Container */}
                <rect
                  x={wl.x}
                  y={wl.y}
                  width={wl.width}
                  height={wl.height}
                  rx="7"
                  fill={wl.backgroundColor || '#ffffff'}
                  stroke={isSelected ? '#38bdf8' : wl.borderColor || '#701a75'}
                  strokeWidth={isSelected ? 3 : 2}
                  strokeDasharray={isSelected ? '4 3' : 'none'}
                  filter="url(#boxShadow)"
                />

                {/* Wing Title Text */}
                <text
                  x={wl.x + wl.width / 2}
                  y={wl.y + wl.height / 2 + 5}
                  fill={wl.textColor || '#0f172a'}
                  fontSize={wl.fontSize || 15}
                  fontWeight="bold"
                  textAnchor="middle"
                  fontFamily="'Plus Jakarta Sans', sans-serif"
                  className="pointer-events-none select-none"
                >
                  {wl.title}
                </text>

                {/* Resize Handle in Edit Mode */}
                {isEditMode && isSelected && (
                  <circle
                    cx={wl.x + wl.width}
                    cy={wl.y + wl.height}
                    r="6"
                    fill="#38bdf8"
                    stroke="#0f172a"
                    strokeWidth="1.5"
                    className="cursor-se-resize"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setDragAction({
                        type: 'resize-wingLabel',
                        id: wl.id,
                        startW: wl.width,
                        startH: wl.height,
                        mouseStartX: e.clientX,
                        mouseStartY: e.clientY,
                      });
                    }}
                  />
                )}
              </g>
            );
          })}
        </g>

        {/* ========================================================
            LAYER 4: WARD / ROOM BOXES (Clean Ward Name & Number ONLY)
           ======================================================== */}
        <g id="layer-ward-boxes">
          {currentFloorRooms.map((room) => {
            const isSelected = selected?.type === 'room' && selected.id === room.id;
            const baseFill = room.color || '#2563eb';

            return (
              <g
                key={room.id}
                onMouseDown={(e) => {
                  if (e.button !== 0) return;
                  e.stopPropagation();

                  if (isEditMode) {
                    setSelected({ type: 'room', id: room.id });
                    setDragAction({
                      type: 'move-room',
                      id: room.id,
                      startX: room.x,
                      startY: room.y,
                      mouseStartX: e.clientX,
                      mouseStartY: e.clientY,
                    });
                  } else {
                    // Normal mode: Open Ward Information Viewer!
                    onSelectWard(room);
                  }
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  onSelectWard(room);
                }}
                className={`transition-opacity ${
                  isEditMode ? 'cursor-move' : 'cursor-pointer hover:opacity-95'
                }`}
              >
                {/* Ward Box Rect */}
                <rect
                  x={room.x}
                  y={room.y}
                  width={room.width}
                  height={room.height}
                  rx="8"
                  fill={baseFill}
                  fillOpacity={isSelected ? 0.98 : 0.9}
                  stroke={isSelected ? '#38bdf8' : '#0f172a'}
                  strokeWidth={isSelected ? 3 : 1.5}
                  strokeDasharray={isEditMode && isSelected ? '4 3' : 'none'}
                  filter="url(#boxShadow)"
                />

                {/* WARD NAME / NUMBER ONLY (No code/ref box) */}
                <foreignObject
                  x={room.x + 8}
                  y={room.y + 6}
                  width={room.width - 16}
                  height={room.height - 12}
                  className="pointer-events-none overflow-hidden"
                >
                  <div className="w-full h-full flex flex-col justify-center items-start text-white leading-tight">
                    <span
                      className={`font-bold drop-shadow-md tracking-tight ${
                        room.width < 110 || room.height < 55
                          ? 'text-[11px] leading-3'
                          : room.width > 160
                          ? 'text-sm font-extrabold'
                          : 'text-xs'
                      }`}
                    >
                      {room.name}
                    </span>
                  </div>
                </foreignObject>

                {/* Resize Handles (Corner SE) in Edit Mode */}
                {isEditMode && isSelected && (
                  <circle
                    cx={room.x + room.width}
                    cy={room.y + room.height}
                    r="6.5"
                    fill="#38bdf8"
                    stroke="#0f172a"
                    strokeWidth="1.5"
                    className="cursor-se-resize"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setDragAction({
                        type: 'resize-room',
                        id: room.id,
                        direction: 'se',
                        startW: room.width,
                        startH: room.height,
                        mouseStartX: e.clientX,
                        mouseStartY: e.clientY,
                      });
                    }}
                  />
                )}
              </g>
            );
          })}
        </g>

        {/* ========================================================
            LAYER 5: CIRCULAR MAP SYMBOLS (STAIRS & ELEVATOR IN CIRCLE)
           ======================================================== */}
        <g id="layer-map-symbols">
          {currentFloorSymbols.map((sym) => {
            const isSelected = selected?.type === 'symbol' && selected.id === sym.id;
            const circleColor = sym.color || (sym.type === 'elevator' ? '#0284c7' : '#0f172a');
            const radius = sym.radius || 18;

            return (
              <g
                key={sym.id}
                onMouseDown={(e) => {
                  if (!isEditMode) return;
                  if (e.button !== 0) return;
                  e.stopPropagation();
                  setSelected({ type: 'symbol', id: sym.id });
                  setDragAction({
                    type: 'move-symbol',
                    id: sym.id,
                    startX: sym.x,
                    startY: sym.y,
                    mouseStartX: e.clientX,
                    mouseStartY: e.clientY,
                  });
                }}
                className={isEditMode ? 'cursor-move' : 'cursor-default'}
              >
                {/* Outer halo when selected in Edit Mode */}
                {isEditMode && isSelected && (
                  <circle
                    cx={sym.x}
                    cy={sym.y}
                    r={radius + 4}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                    strokeDasharray="4 2"
                    className="animate-pulse"
                  />
                )}

                {/* Circle Container */}
                <circle
                  cx={sym.x}
                  cy={sym.y}
                  r={radius}
                  fill={circleColor}
                  stroke={isSelected ? '#38bdf8' : '#ffffff'}
                  strokeWidth={isSelected ? 3 : 2}
                  filter="url(#boxShadow)"
                />

                {/* Symbol Graphics: Elevator or Stairs */}
                {sym.type === 'elevator' ? (
                  <g className="pointer-events-none">
                    {/* Outer Lift Car */}
                    <rect
                      x={sym.x - 9}
                      y={sym.y - 9}
                      width={18}
                      height={18}
                      rx="2.5"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                    {/* Up Arrow triangle */}
                    <polygon
                      points={`${sym.x - 4},${sym.y - 7} ${sym.x - 7},${sym.y - 3} ${sym.x - 1},${sym.y - 3}`}
                      fill="#ffffff"
                    />
                    {/* Down Arrow triangle */}
                    <polygon
                      points={`${sym.x + 4},${sym.y - 3} ${sym.x + 1},${sym.y - 7} ${sym.x + 7},${sym.y - 7}`}
                      fill="#ffffff"
                    />
                    {/* Two stylized figure dots and shoulders inside car */}
                    <circle cx={sym.x - 4} cy={sym.y + 1} r="1.5" fill="#ffffff" />
                    <rect x={sym.x - 6} y={sym.y + 3.5} width="4" height="4" rx="0.8" fill="#ffffff" />
                    <circle cx={sym.x + 4} cy={sym.y + 1} r="1.5" fill="#ffffff" />
                    <rect x={sym.x + 2} y={sym.y + 3.5} width="4" height="4" rx="0.8" fill="#ffffff" />
                  </g>
                ) : (
                  <g className="pointer-events-none">
                    {/* Staircase diagonal steps */}
                    <path
                      d={`
                        M ${sym.x - 8} ${sym.y + 7}
                        L ${sym.x - 8} ${sym.y + 2.5}
                        L ${sym.x - 3} ${sym.y + 2.5}
                        L ${sym.x - 3} ${sym.y - 2.5}
                        L ${sym.x + 2.5} ${sym.y - 2.5}
                        L ${sym.x + 2.5} ${sym.y - 7.5}
                        L ${sym.x + 8} ${sym.y - 7.5}
                      `}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Small directional step arrow */}
                    <polygon
                      points={`${sym.x - 7},${sym.y - 3} ${sym.x - 2},${sym.y - 7.5} ${sym.x - 2},${sym.y - 2}`}
                      fill="#38bdf8"
                    />
                  </g>
                )}

                {/* Native SVG tooltip on hover without rendering text below the symbol */}
                <title>{sym.type === 'elevator' ? 'Elevator' : 'Stairs'}</title>
              </g>
            );
          })}
        </g>
      </svg>

      {/* ========================================================
          FLOATING TOOLBAR FOR CURRENTLY SELECTED ELEMENT
         ======================================================== */}
      {isEditMode && selected && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 bg-slate-900 border border-slate-700/90 backdrop-blur-md rounded-2xl px-4 py-2 text-white shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-150">
          {/* A. Selected Ward Box Toolbar */}
          {selectedRoom && (
            <>
              <div className="flex items-center gap-2 pr-3 border-r border-slate-700">
                <div
                  className="w-3.5 h-3.5 rounded-full"
                  style={{ backgroundColor: selectedRoom.color || '#2563eb' }}
                />
                <span className="font-bold text-xs text-white max-w-[160px] truncate">
                  {selectedRoom.name}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onSelectWard(selectedRoom)}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
                  title="Add or manage red box locations, paperwork trays, and door codes"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add / Manage Info</span>
                </button>

                <button
                  onClick={() => onOpenEditRoomModal(selectedRoom)}
                  className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Box Style</span>
                </button>

                <button
                  onClick={() => {
                    const cloned: Room = {
                      ...selectedRoom,
                      id: `r-ward-${Date.now()}`,
                      name: `${selectedRoom.name} (Copy)`,
                      x: selectedRoom.x + 20,
                      y: selectedRoom.y + 20,
                    };
                    onUpdateRooms([...data.rooms, cloned]);
                    setSelected({ type: 'room', id: cloned.id });
                  }}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Duplicate Ward"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    onUpdateRooms(data.rooms.filter((r) => r.id !== selectedRoom.id));
                    setSelected(null);
                  }}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-red-950 text-slate-300 hover:text-red-300"
                  title="Delete Ward"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}

          {/* B. Selected Wing Label Box (Appleton Wing, etc.) Toolbar */}
          {selectedWingLabel && (
            <>
              <div className="flex items-center gap-2 pr-3 border-r border-slate-700">
                <span className="text-xs text-purple-300 font-bold">Wing Box:</span>
                <span className="font-semibold text-xs text-white max-w-[150px] truncate">
                  {selectedWingLabel.title}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setEditingWingLabelId(selectedWingLabel.id);
                    setWingLabelText(selectedWingLabel.title);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-semibold flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Rename</span>
                </button>

                {/* Border Colors Palette */}
                <div className="flex items-center gap-1 pl-1">
                  {WING_LABEL_COLORS.map((col) => (
                    <button
                      key={col}
                      onClick={() => {
                        const updated = allWingLabels.map((wl) =>
                          wl.id === selectedWingLabel.id ? { ...wl, borderColor: col } : wl
                        );
                        onUpdateWingLabels(updated);
                      }}
                      className="w-4 h-4 rounded-full border border-slate-800 hover:scale-125 transition-transform"
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>

                <button
                  onClick={() => {
                    const cloned: WingLabel = {
                      ...selectedWingLabel,
                      id: `wl-${Date.now()}`,
                      title: `${selectedWingLabel.title} (Copy)`,
                      x: selectedWingLabel.x + 20,
                      y: selectedWingLabel.y + 20,
                    };
                    onUpdateWingLabels([...allWingLabels, cloned]);
                    setSelected({ type: 'wingLabel', id: cloned.id });
                  }}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Duplicate Wing Box"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    onUpdateWingLabels(allWingLabels.filter((wl) => wl.id !== selectedWingLabel.id));
                    setSelected(null);
                  }}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-red-950 text-slate-300 hover:text-red-300"
                  title="Delete Wing Box"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}

          {/* C. Selected Coloured Zone Box Toolbar */}
          {selectedWingZone && (
            <>
              <div className="flex items-center gap-2 pr-3 border-r border-slate-700">
                <div
                  className="w-3.5 h-3.5 rounded-sm border"
                  style={{ backgroundColor: selectedWingZone.color, borderColor: selectedWingZone.borderColor }}
                />
                <span className="font-semibold text-xs text-white max-w-[140px] truncate">
                  {selectedWingZone.name}
                </span>
              </div>

              {/* Color Presets */}
              <div className="flex items-center gap-1">
                {ZONE_PALETTE.map((p) => (
                  <button
                    key={p.color}
                    onClick={() => {
                      const updated = allWingZones.map((wz) =>
                        wz.id === selectedWingZone.id
                          ? { ...wz, color: p.color, borderColor: p.border }
                          : wz
                      );
                      onUpdateWingZones(updated);
                    }}
                    title={p.label}
                    className="w-4 h-4 rounded-sm border border-slate-800 hover:scale-125 transition-transform"
                    style={{ backgroundColor: p.color }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-700">
                <button
                  onClick={() => {
                    setEditingZoneId(selectedWingZone.id);
                    setZoneNameText(selectedWingZone.name);
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                >
                  Rename
                </button>

                {/* Opacity toggle */}
                <button
                  onClick={() => {
                    const nextOpacity =
                      selectedWingZone.opacity === 0.2
                        ? 0.35
                        : selectedWingZone.opacity === 0.35
                        ? 0.5
                        : 0.2;
                    const updated = allWingZones.map((wz) =>
                      wz.id === selectedWingZone.id ? { ...wz, opacity: nextOpacity } : wz
                    );
                    onUpdateWingZones(updated);
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  title="Cycle opacity"
                >
                  {Math.round((selectedWingZone.opacity ?? 0.28) * 100)}%
                </button>

                <button
                  onClick={() => {
                    onUpdateWingZones(allWingZones.filter((wz) => wz.id !== selectedWingZone.id));
                    setSelected(null);
                  }}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-red-950 text-slate-300 hover:text-red-300"
                  title="Delete Coloured Zone"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}

          {/* D. Selected Hallway Segment Toolbar */}
          {selectedHallway && (
            <>
              <div className="flex items-center gap-2 pr-3 border-r border-slate-700">
                <div className="w-5 h-2 rounded-full bg-amber-400" />
                <span className="font-bold text-xs text-amber-300">Hallway:</span>
                <span className="text-xs text-slate-300 font-mono">
                  {selectedHallway.width || 14}px
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    const updated = allHallways.map((hw) =>
                      hw.id === selectedHallway.id
                        ? { ...hw, width: Math.max(8, (hw.width || 14) - 2) }
                        : hw
                    );
                    onUpdateHallways(updated);
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                  title="Narrower hallway"
                >
                  - Width
                </button>

                <button
                  onClick={() => {
                    const updated = allHallways.map((hw) =>
                      hw.id === selectedHallway.id
                        ? { ...hw, width: Math.min(28, (hw.width || 14) + 2) }
                        : hw
                    );
                    onUpdateHallways(updated);
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                  title="Wider hallway"
                >
                  + Width
                </button>

                <button
                  onClick={() => {
                    const cloned: Hallway = {
                      ...selectedHallway,
                      id: `hw-${Date.now()}`,
                      x1: selectedHallway.x1 + 20,
                      y1: selectedHallway.y1 + 20,
                      x2: selectedHallway.x2 + 20,
                      y2: selectedHallway.y2 + 20,
                    };
                    onUpdateHallways([...allHallways, cloned]);
                    setSelected({ type: 'hallway', id: cloned.id });
                  }}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Duplicate Hallway Segment"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    onUpdateHallways(allHallways.filter((hw) => hw.id !== selectedHallway.id));
                    setSelected(null);
                  }}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-red-950 text-slate-300 hover:text-red-300"
                  title="Delete Hallway Segment"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}

          {/* E. Selected Circular Map Symbol (Elevator or Stairs) Toolbar */}
          {selectedSymbol && (
            <>
              <div className="flex items-center gap-2 pr-3 border-r border-slate-700">
                <span className="text-sm">
                  {selectedSymbol.type === 'elevator' ? '🛗' : '🪜'}
                </span>
                <span className="font-bold text-xs text-white">
                  {selectedSymbol.type === 'elevator' ? 'Elevator / Lift' : 'Stairs'}
                </span>
                {selectedSymbol.label && (
                  <span className="text-[11px] text-slate-400 font-mono">
                    ({selectedSymbol.label})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {/* Switch between Elevator and Stairs */}
                <button
                  onClick={() => {
                    const newType: MapSymbolType = selectedSymbol.type === 'elevator' ? 'stairs' : 'elevator';
                    const updated: MapSymbol[] = allSymbols.map((s) =>
                      s.id === selectedSymbol.id
                        ? {
                            ...s,
                            type: newType,
                            label: newType === 'elevator' ? 'Lift' : 'Stairs',
                            color: newType === 'elevator' ? '#0284c7' : '#0f172a',
                          }
                        : s
                    );
                    onUpdateSymbols(updated);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1"
                  title="Switch to other symbol type"
                >
                  <span>Switch to {selectedSymbol.type === 'elevator' ? 'Stairs' : 'Elevator'}</span>
                </button>

                {/* Duplicate */}
                <button
                  onClick={() => {
                    const cloned: MapSymbol = {
                      ...selectedSymbol,
                      id: `sym-${Date.now()}`,
                      x: selectedSymbol.x + 25,
                      y: selectedSymbol.y + 25,
                    };
                    onUpdateSymbols([...allSymbols, cloned]);
                    setSelected({ type: 'symbol', id: cloned.id });
                  }}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Duplicate Symbol"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                {/* Remove / Delete symbol */}
                <button
                  onClick={() => {
                    onUpdateSymbols(allSymbols.filter((s) => s.id !== selectedSymbol.id));
                    setSelected(null);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-red-950 text-slate-300 hover:text-red-300 text-xs font-semibold flex items-center gap-1.5"
                  title="Remove symbol from map"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Symbol</span>
                </button>
              </div>
            </>
          )}

          {/* Deselect button */}
          <button
            onClick={() => setSelected(null)}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* RENAME WING LABEL MODAL */}
      {editingWingLabelId && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-3">
            <h3 className="text-sm font-bold text-white">Edit Wing Box Title</h3>
            <input
              type="text"
              value={wingLabelText}
              onChange={(e) => setWingLabelText(e.target.value)}
              placeholder="e.g. Appleton Wing, Burtonwood Wing"
              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-purple-500"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingWingLabelId(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const updated = allWingLabels.map((wl) =>
                    wl.id === editingWingLabelId ? { ...wl, title: wingLabelText.trim() || 'Wing' } : wl
                  );
                  onUpdateWingLabels(updated);
                  setEditingWingLabelId(null);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md"
              >
                Save Title
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENAME ZONE MODAL */}
      {editingZoneId && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-3">
            <h3 className="text-sm font-bold text-white">Edit Coloured Zone Name</h3>
            <input
              type="text"
              value={zoneNameText}
              onChange={(e) => setZoneNameText(e.target.value)}
              placeholder="e.g. Appleton West Block, Burtonwood Main"
              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingZoneId(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const updated = allWingZones.map((wz) =>
                    wz.id === editingZoneId ? { ...wz, name: zoneNameText.trim() || 'Zone' } : wz
                  );
                  onUpdateWingZones(updated);
                  setEditingZoneId(null);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md"
              >
                Save Name
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Floor Selector */}
      <div className="absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-[max(1.25rem,env(safe-area-inset-left))] z-20 pointer-events-auto flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 backdrop-blur-md rounded-2xl p-1.5 shadow-xl">
        {/* Search Ward Quick Icon */}
        <button
          onClick={() => {
            setIsSearchOpen(true);
            setTimeout(() => searchInputRef.current?.focus(), 60);
          }}
          className={`p-2 rounded-xl transition-all ${
            isSearchOpen
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Search Ward or Department"
          aria-label="Search Ward or Department"
        >
          <Search className="w-4 h-4" />
        </button>
        <div className="h-4 w-px bg-slate-800 mx-0.5" />
        {(['G', 'F1', 'F2', 'F3'] as FloorId[]).map((fId) => {
          const isActive = activeFloorId === fId;
          const label = fId === 'G' ? 'Ground' : fId === 'F1' ? '1st Floor' : fId === 'F2' ? '2nd Floor' : '3rd Floor';
          return (
            <button
              key={fId}
              onClick={() => {
                onFloorChange(fId);
                setSelected(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Quick Ward Search Modal */}
      {isSearchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsSearchOpen(false)}
        >
          <div
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[82vh] sm:max-h-[580px] mb-2 sm:mb-0 animate-in slide-in-from-bottom-3 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <div className="p-3 border-b border-slate-800 bg-slate-950/60 flex items-center gap-2.5">
              <Search className="w-4 h-4 text-blue-400 shrink-0 ml-1.5" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsSearchOpen(false);
                  } else if (e.key === 'Enter' && searchResults.length > 0) {
                    handleSelectSearchedWard(searchResults[0]);
                  }
                }}
                placeholder="Type ward name (e.g. A1, ITU, A&E, Maternity)..."
                className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none py-1"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsSearchOpen(false)}
                className="px-2.5 py-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-semibold"
              >
                Close
              </button>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-slate-800/40">
              {searchResults.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No wards found matching &quot;{searchQuery}&quot;
                </div>
              ) : (
                searchResults.map((room) => {
                  const floorLabel =
                    room.floorId === 'G'
                      ? 'Ground'
                      : room.floorId === 'F1'
                      ? '1st Floor'
                      : room.floorId === 'F2'
                      ? '2nd Floor'
                      : '3rd Floor';
                  const floorBadgeColor =
                    room.floorId === 'G'
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                      : room.floorId === 'F1'
                      ? 'bg-blue-950/80 text-blue-300 border-blue-800/60'
                      : room.floorId === 'F2'
                      ? 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                      : 'bg-purple-950/80 text-purple-300 border-purple-800/60';

                  const bagCount = (data.bloodBags || []).filter((b) => b.roomId === room.id).length;
                  const codeCount = (data.doorCodes || []).filter((c) => c.roomId === room.id).length;

                  return (
                    <button
                      key={room.id}
                      onClick={() => handleSelectSearchedWard(room)}
                      className="w-full text-left p-3 rounded-2xl hover:bg-slate-800/80 active:bg-slate-800 transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-100 group-hover:text-blue-400 transition-colors">
                            {room.name}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${floorBadgeColor}`}
                          >
                            {floorLabel}
                          </span>
                        </div>
                        {room.department && (
                          <p className="text-xs text-slate-400 truncate mt-0.5">
                            {room.department}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 text-[11px]">
                        {bagCount > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-950/70 border border-rose-800/60 text-rose-300 font-semibold flex items-center gap-1">
                            📦 {bagCount} {bagCount === 1 ? 'box' : 'boxes'}
                          </span>
                        )}
                        {codeCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-950/70 border border-amber-800/60 text-amber-300 font-mono text-[10px]">
                            🔑 Code
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
