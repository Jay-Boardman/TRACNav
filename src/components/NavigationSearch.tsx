import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  HospitalData,
  Room,
  TravelMode,
  BloodTransportBag,
  TransfusionFormLocation,
  DoorCode,
} from '../types/hospital';
import {
  Search,
  Navigation,
  ArrowUpDown,
  X,
  MapPin,
  Package,
  FileText,
  KeyRound,
  Footprints,
  Accessibility,
  ArrowRight,
} from 'lucide-react';

interface NavigationSearchProps {
  data: HospitalData;
  originRoom: Room | null;
  destinationRoom: Room | null;
  onSelectOrigin: (room: Room | null) => void;
  onSelectDestination: (room: Room | null) => void;
  travelMode: TravelMode;
  onChangeTravelMode: (mode: TravelMode) => void;
  isRoutingMode: boolean;
  onToggleRoutingMode: (enabled: boolean) => void;
  onSwapOriginDestination: () => void;
  onClearRoute: () => void;
  onDirectSelectEntity?: (type: 'room' | 'bag' | 'form' | 'door', id: string) => void;
}

export const NavigationSearch: React.FC<NavigationSearchProps> = ({
  data,
  originRoom,
  destinationRoom,
  onSelectOrigin,
  onSelectDestination,
  travelMode,
  onChangeTravelMode,
  isRoutingMode,
  onToggleRoutingMode,
  onSwapOriginDestination,
  onClearRoute,
}) => {
  const [activeInput, setActiveInput] = useState<'single' | 'origin' | 'destination' | null>(null);
  const [query, setQuery] = useState<string>('');
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close suggestions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setActiveInput(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered search results
  const searchResults = useMemo(() => {
    if (!query.trim()) {
      // If query is empty, show quick categories / recent rooms
      return {
        rooms: data.rooms.slice(0, 5),
        bloodBags: data.bloodBags.slice(0, 3),
        forms: data.transfusionForms.slice(0, 3),
        doorCodes: data.doorCodes.slice(0, 3),
      };
    }

    const q = query.toLowerCase().trim();

    const matchingRooms = data.rooms.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.code && r.code.toLowerCase().includes(q)) ||
        r.department.toLowerCase().includes(q) ||
        (r.wing && r.wing.toLowerCase().includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q))
    );

    const matchingBags = data.bloodBags.filter(
      (b) =>
        b.serialCode.toLowerCase().includes(q) ||
        b.model.toLowerCase().includes(q) ||
        b.locationDetails.toLowerCase().includes(q)
    );

    const matchingForms = data.transfusionForms.filter(
      (f) =>
        f.trayLabel.toLowerCase().includes(q) ||
        f.exactSpot.toLowerCase().includes(q) ||
        f.notes?.toLowerCase().includes(q)
    );

    const matchingDoorCodes = data.doorCodes.filter(
      (d) =>
        d.doorName.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        d.locationDescription.toLowerCase().includes(q)
    );

    return {
      rooms: matchingRooms,
      bloodBags: matchingBags,
      forms: matchingForms,
      doorCodes: matchingDoorCodes,
    };
  }, [query, data]);

  const handleSelectRoom = (room: Room) => {
    if (activeInput === 'origin') {
      onSelectOrigin(room);
      setActiveInput(null);
      setQuery('');
    } else if (activeInput === 'destination' || activeInput === 'single') {
      onSelectDestination(room);
      if (!isRoutingMode) {
        onToggleRoutingMode(true);
      }
      setActiveInput(null);
      setQuery('');
    }
  };

  const handleSelectBag = (bag: BloodTransportBag) => {
    const room = data.rooms.find((r) => r.id === bag.roomId);
    if (room) {
      handleSelectRoom(room);
    }
  };

  const handleSelectForm = (form: TransfusionFormLocation) => {
    const room = data.rooms.find((r) => r.id === form.roomId);
    if (room) {
      handleSelectRoom(room);
    }
  };

  const handleSelectDoorCode = (door: DoorCode) => {
    const room = data.rooms.find((r) => r.id === door.roomId);
    if (room) {
      handleSelectRoom(room);
    }
  };

  const hasAnyResults =
    searchResults.rooms.length > 0 ||
    searchResults.bloodBags.length > 0 ||
    searchResults.forms.length > 0 ||
    searchResults.doorCodes.length > 0;

  return (
    <div
      ref={searchContainerRef}
      className="absolute top-3 left-3 right-3 sm:left-4 sm:right-auto sm:w-[440px] z-30 flex flex-col pointer-events-auto"
    >
      {/* Search Header Container (Google Maps Floating Card) */}
      <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl p-2.5 transition-all">
        {!isRoutingMode ? (
          /* Simple Single Search Bar */
          <div className="flex items-center gap-2 px-1">
            <div className="p-2 text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setActiveInput('single')}
              placeholder="Search rooms, blood bags, form trays, door codes..."
              className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-400 focus:outline-none min-h-[44px]"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onToggleRoutingMode(true)}
              className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-blue-900/40 transition-colors shrink-0"
              title="Directions"
            >
              <Navigation className="w-4 h-4 fill-white" />
              <span>Directions</span>
            </button>
          </div>
        ) : (
          /* Dual Routing Mode: Origin & Destination Inputs */
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 px-1">
              <span className="text-xs font-semibold text-slate-300">Indoor Route Guidance</span>
              <div className="flex items-center gap-1">
                {/* Travel Modes */}
                <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                  <button
                    onClick={() => onChangeTravelMode('walking')}
                    className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                      travelMode === 'walking'
                        ? 'bg-blue-600 text-white font-medium'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Standard Walking (Stairs & Elevators)"
                  >
                    <Footprints className="w-3.5 h-3.5" />
                    <span>Walk</span>
                  </button>
                  <button
                    onClick={() => onChangeTravelMode('trolley')}
                    className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                      travelMode === 'trolley'
                        ? 'bg-blue-600 text-white font-medium'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Bed / Trolley / Accessible (Elevator Only)"
                  >
                    <Accessibility className="w-3.5 h-3.5" />
                    <span>Trolley</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    onClearRoute();
                    onToggleRoutingMode(false);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors ml-1"
                  title="Close Directions"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1 py-1">
                <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
                <span className="w-0.5 h-6 bg-slate-700" />
                <span className="w-3 h-3 rounded-full bg-red-500 border-2 border-slate-900" />
              </div>

              <div className="flex-1 flex flex-col gap-2">
                {/* Origin Input */}
                <div className="relative">
                  <input
                    type="text"
                    value={activeInput === 'origin' ? query : originRoom?.name || ''}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => {
                      setActiveInput('origin');
                      setQuery('');
                    }}
                    placeholder="Choose start location..."
                    className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                  {originRoom && (
                    <span className="absolute right-2 top-2 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/50">
                      {originRoom.floorId}
                    </span>
                  )}
                </div>

                {/* Destination Input */}
                <div className="relative">
                  <input
                    type="text"
                    value={activeInput === 'destination' ? query : destinationRoom?.name || ''}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => {
                      setActiveInput('destination');
                      setQuery('');
                    }}
                    placeholder="Choose destination..."
                    className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                  {destinationRoom && (
                    <span className="absolute right-2 top-2 text-[10px] font-mono text-red-400 bg-red-950/60 px-1.5 py-0.5 rounded border border-red-800/50">
                      {destinationRoom.floorId}
                    </span>
                  )}
                </div>
              </div>

              {/* Swap Origin / Destination Button */}
              <button
                onClick={onSwapOriginDestination}
                className="min-h-[44px] min-w-[44px] p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors flex items-center justify-center shrink-0 border border-slate-700/50"
                title="Swap Start and Destination"
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Autocomplete Suggestions Card Dropdown */}
      {activeInput !== null && (
        <div className="mt-2 bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden max-h-[360px] overflow-y-auto">
          <div className="p-2 border-b border-slate-800 text-[11px] text-slate-400 font-medium flex items-center justify-between">
            <span>{query ? `Suggestions for "${query}"` : 'Quick Selection'}</span>
            <span className="text-[10px] text-slate-500">Tap to route</span>
          </div>

          {!hasAnyResults ? (
            <div className="p-4 text-center text-xs text-slate-400">
              No rooms, bags, or paperwork found for "{query}".
            </div>
          ) : (
            <div className="divide-y divide-slate-800/50">
              {/* Rooms & Departments */}
              {searchResults.rooms.length > 0 && (
                <div className="p-1">
                  <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Rooms & Wards
                  </div>
                  {searchResults.rooms.map((room) => (
                    <button
                      key={room.id}
                      onClick={() => handleSelectRoom(room)}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left hover:bg-slate-800/80 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 shrink-0">
                          <MapPin className="w-3.5 h-3.5 text-blue-400" />
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-medium text-slate-100 truncate">
                            {room.name}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                            <span className="font-mono text-slate-300">{room.code}</span>
                            <span>·</span>
                            <span>{room.department}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0 ml-2">
                        {room.floorId}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Red Blood Transport Bags */}
              {searchResults.bloodBags.length > 0 && (
                <div className="p-1">
                  <div className="px-2 py-1 text-[10px] font-semibold text-red-400 uppercase tracking-wider flex items-center gap-1">
                    <Package className="w-3 h-3 text-red-400" />
                    <span>Red Blood Transport Bags</span>
                  </div>
                  {searchResults.bloodBags.map((bag) => (
                    <button
                      key={bag.id}
                      onClick={() => handleSelectBag(bag)}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left hover:bg-slate-800/80 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-lg bg-red-950/60 border border-red-800/60 text-red-300 shrink-0">
                          <Package className="w-3.5 h-3.5 text-red-400" />
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-semibold text-red-200 font-mono truncate">
                            {bag.serialCode}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {bag.locationDetails}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-900/40 text-red-300 border border-red-800/50 shrink-0 ml-2">
                        {bag.floorId}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Completed Transfusion Request Forms */}
              {searchResults.forms.length > 0 && (
                <div className="p-1">
                  <div className="px-2 py-1 text-[10px] font-semibold text-orange-400 uppercase tracking-wider flex items-center gap-1">
                    <FileText className="w-3 h-3 text-orange-400" />
                    <span>Transfusion Request Paperwork</span>
                  </div>
                  {searchResults.forms.map((form) => (
                    <button
                      key={form.id}
                      onClick={() => handleSelectForm(form)}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left hover:bg-slate-800/80 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-lg bg-orange-950/60 border border-orange-800/60 text-orange-300 shrink-0">
                          <FileText className="w-3.5 h-3.5 text-orange-400" />
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-medium text-orange-100 truncate">
                            {form.trayLabel}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {form.exactSpot}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-orange-900/40 text-orange-300 border border-orange-800/50">
                          {form.estimatedFormsCount} forms
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {form.floorId}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Door Codes */}
              {searchResults.doorCodes.length > 0 && (
                <div className="p-1">
                  <div className="px-2 py-1 text-[10px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <KeyRound className="w-3 h-3 text-amber-400" />
                    <span>Door Access Keypads</span>
                  </div>
                  {searchResults.doorCodes.map((door) => (
                    <button
                      key={door.id}
                      onClick={() => handleSelectDoorCode(door)}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left hover:bg-slate-800/80 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-lg bg-amber-950/60 border border-amber-800/60 text-amber-300 shrink-0">
                          <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-medium text-amber-100 truncate">
                            {door.doorName}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {door.locationDescription}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-900/50 text-amber-200 border border-amber-800/60">
                          {door.code}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
