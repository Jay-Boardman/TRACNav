import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
} from './types/hospital';
import {
  loadHospitalData,
  saveHospitalData,
  decodeDataFromSync,
} from './services/storage';
import { TabBar } from './components/TabBar';
import { HospitalMap } from './components/HospitalMap';
import { WardInfoModal } from './components/WardInfoModal';
import { AddRoomModal } from './components/AddRoomModal';
import { SyncModal } from './components/SyncModal';

export default function App() {
  // Main Hospital Data State (Offline persisted)
  const [data, setData] = useState<HospitalData>(() => loadHospitalData());
  const [activeFloorId, setActiveFloorId] = useState<FloorId>('G');

  // Edit Mode Toggle
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  // Sync / Transfer Modal
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);

  // Ward Information Modal (View or Edit mode)
  const [selectedWardForInfo, setSelectedWardForInfo] = useState<Room | null>(null);
  const [isWardInfoModalOpen, setIsWardInfoModalOpen] = useState<boolean>(false);

  // Add / Edit Room Modal State (Dimensions & Style)
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState<boolean>(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Update Hospital Data and persist offline
  const handleUpdateData = useCallback((newData: HospitalData) => {
    setData(newData);
    saveHospitalData(newData);
  }, []);

  // Check for auto-sync link (#sync=...) on initial load
  useEffect(() => {
    if (window.location.hash && window.location.hash.startsWith('#sync=')) {
      try {
        const encoded = window.location.hash.slice(6);
        const importedData = decodeDataFromSync(encoded);
        if (importedData) {
          handleUpdateData(importedData);
          showToast('✓ Successfully synced all layout edits to your iPhone!');
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      } catch (e) {
        console.error('Failed to import sync data from URL hash', e);
      }
    }
  }, [handleUpdateData, showToast]);

  // Update Rooms
  const handleUpdateRooms = useCallback(
    (rooms: Room[]) => {
      const updated = { ...data, rooms };
      handleUpdateData(updated);
      if (selectedWardForInfo) {
        const found = rooms.find((r) => r.id === selectedWardForInfo.id);
        if (found) setSelectedWardForInfo(found);
      }
    },
    [data, handleUpdateData, selectedWardForInfo]
  );

  // Update a single room
  const handleUpdateSingleRoom = useCallback(
    (updatedRoom: Room) => {
      const rooms = data.rooms.map((r) => (r.id === updatedRoom.id ? updatedRoom : r));
      handleUpdateRooms(rooms);
      setSelectedWardForInfo(updatedRoom);
      showToast(`Ward "${updatedRoom.name}" notes updated`);
    },
    [data.rooms, handleUpdateRooms, showToast]
  );

  // Update Blood Bags (Red Boxes)
  const handleUpdateBags = useCallback(
    (bags: BloodTransportBag[]) => {
      const updated = { ...data, bloodBags: bags };
      handleUpdateData(updated);
      showToast('Red box locations updated');
    },
    [data, handleUpdateData, showToast]
  );

  // Update Transfusion Request Forms (Paperwork)
  const handleUpdateForms = useCallback(
    (forms: TransfusionFormLocation[]) => {
      const updated = { ...data, transfusionForms: forms };
      handleUpdateData(updated);
      showToast('Paperwork locations updated');
    },
    [data, handleUpdateData, showToast]
  );

  // Update Door Codes
  const handleUpdateDoorCodes = useCallback(
    (doorCodes: DoorCode[]) => {
      const updated = { ...data, doorCodes };
      handleUpdateData(updated);
      showToast('Door security codes updated');
    },
    [data, handleUpdateData, showToast]
  );

  // Update Wing Labels (Appleton Wing, Burtonwood Wing, etc.)
  const handleUpdateWingLabels = useCallback(
    (wingLabels: WingLabel[]) => {
      const updated = { ...data, wingLabels };
      handleUpdateData(updated);
    },
    [data, handleUpdateData]
  );

  // Update Coloured Surrounding Boxes (Wing Zones)
  const handleUpdateWingZones = useCallback(
    (wingZones: WingZone[]) => {
      const updated = { ...data, wingZones };
      handleUpdateData(updated);
    },
    [data, handleUpdateData]
  );

  // Update Hallways
  const handleUpdateHallways = useCallback(
    (hallways: Hallway[]) => {
      const updated = { ...data, hallways };
      handleUpdateData(updated);
    },
    [data, handleUpdateData]
  );

  // Update Map Symbols (Stairs & Elevator circle symbols)
  const handleUpdateSymbols = useCallback(
    (symbols: MapSymbol[]) => {
      const updated = { ...data, symbols };
      handleUpdateData(updated);
    },
    [data, handleUpdateData]
  );

  // Click on a ward box on the map: opens Ward Information Modal
  const handleSelectWard = useCallback((room: Room) => {
    setSelectedWardForInfo(room);
    setIsWardInfoModalOpen(true);
  }, []);

  // Open Room Modal for creating a new box
  const handleOpenAddModal = useCallback(() => {
    setEditingRoom(null);
    setIsAddRoomModalOpen(true);
  }, []);

  // Open Room Modal for editing an existing box
  const handleOpenEditModal = useCallback((room: Room) => {
    setEditingRoom(room);
    setIsAddRoomModalOpen(true);
  }, []);

  // Save new or edited room box
  const handleSaveRoomModal = useCallback(
    (roomData: Partial<Room>) => {
      if (editingRoom) {
        // Edit existing room
        const updated = data.rooms.map((r) =>
          r.id === editingRoom.id ? { ...r, ...roomData } : r
        );
        handleUpdateRooms(updated);
        showToast(`Ward "${roomData.name || editingRoom.name}" updated`);
      } else {
        // Create new room
        const newRoom: Room = {
          id: `r-ward-${Date.now()}`,
          name: roomData.name || 'New Ward',
          code: roomData.code || 'WARD',
          wing: roomData.wing || 'appleton',
          department: roomData.department || 'ward',
          floorId: roomData.floorId || activeFloorId,
          x: 250,
          y: 200,
          width: roomData.width || 140,
          height: roomData.height || 80,
          color: roomData.color || '#2563eb',
          description: roomData.description || '',
        };
        handleUpdateRooms([...data.rooms, newRoom]);
        showToast(`New ward "${newRoom.name}" added to map!`);
      }
    },
    [editingRoom, data.rooms, activeFloorId, handleUpdateRooms, showToast]
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* Floating Top Navigation Header */}
      <TabBar
        isEditMode={isEditMode}
        onToggleEditMode={() => {
          setIsEditMode((prev) => !prev);
          showToast(!isEditMode ? 'Layout Edit Mode activated' : 'Exited Edit Mode');
        }}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
      />

      {/* Main Hospital Floor Plan Canvas (Full-bleed) */}
      <main className="absolute inset-0 w-full h-full overflow-hidden">
        <HospitalMap
          data={data}
          activeFloorId={activeFloorId}
          onFloorChange={setActiveFloorId}
          isEditMode={isEditMode}
          onSelectWard={handleSelectWard}
          onUpdateRooms={handleUpdateRooms}
          onUpdateWingLabels={handleUpdateWingLabels}
          onUpdateWingZones={handleUpdateWingZones}
          onUpdateHallways={handleUpdateHallways}
          onUpdateSymbols={handleUpdateSymbols}
          onOpenAddRoomModal={handleOpenAddModal}
          onOpenEditRoomModal={handleOpenEditModal}
        />
      </main>

      {/* Ward Information Modal (View or Edit Red Boxes, Paperwork, Door Codes) */}
      <WardInfoModal
        isOpen={isWardInfoModalOpen}
        onClose={() => setIsWardInfoModalOpen(false)}
        room={selectedWardForInfo}
        isEditMode={isEditMode}
        data={data}
        onUpdateBags={handleUpdateBags}
        onUpdateForms={handleUpdateForms}
        onUpdateDoorCodes={handleUpdateDoorCodes}
        onUpdateRoom={handleUpdateSingleRoom}
      />

      {/* Add / Edit Ward Box Modal (Geometry & Visual Style) */}
      <AddRoomModal
        isOpen={isAddRoomModalOpen}
        onClose={() => setIsAddRoomModalOpen(false)}
        onSave={handleSaveRoomModal}
        initialRoom={editingRoom}
        activeFloorId={activeFloorId}
      />

      {/* Sync & Transfer to Mobile Modal */}
      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        data={data}
        onImportData={handleUpdateData}
        showToast={showToast}
      />

      {/* In-App Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none px-4 py-2 rounded-full bg-slate-900 border border-slate-700 text-slate-100 text-xs font-semibold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
