export type FloorId = 'G' | 'F1' | 'F2' | 'F3';

export interface FloorInfo {
  id: FloorId;
  name: string;
  shortLabel: string;
  description: string;
  elevation: number;
}

export type WingType = 'appleton' | 'burtonwood' | 'croft' | 'entrance';

export type DepartmentType = 
  | 'blood-bank'
  | 'pathology'
  | 'emergency'
  | 'icu'
  | 'surgery'
  | 'ward'
  | 'maternity'
  | 'outpatient'
  | 'radiology'
  | 'cardiac'
  | 'reception'
  | 'general';

export type WardItemType =
  | 'nursing-station'
  | 'blood-bag-station'
  | 'paperwork-tray'
  | 'door-keypad'
  | 'patient-bay'
  | 'clean-utility'
  | 'sluice'
  | 'doctors-office'
  | 'treatment-room'
  | 'custom';

export interface WardSubItem {
  id: string;
  name: string;
  type: WardItemType;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  notes?: string;
  serialNumber?: string;
  doorCode?: string;
  trayLabel?: string;
}

export interface WardMapLayout {
  width: number;
  height: number;
  items: WardSubItem[];
  notes?: string;
}

export interface WingLabel {
  id: string;
  floorId: FloorId;
  title: string;
  subtitle?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  borderColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
}

export interface WingZone {
  id: string;
  floorId: FloorId;
  name: string;
  wing: WingType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  opacity?: number;
  borderColor?: string;
  borderRadius?: number;
}

export interface Hallway {
  id: string;
  floorId: FloorId;
  name?: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  color?: string;
}

export type MapSymbolType = 'elevator' | 'stairs';

export interface MapSymbol {
  id: string;
  floorId: FloorId;
  type: MapSymbolType;
  x: number;
  y: number;
  radius?: number;
  label?: string;
  color?: string;
  borderColor?: string;
}

export interface Room {
  id: string;
  code?: string; // Optional ward code
  name: string;
  wing: WingType;
  department: DepartmentType;
  floorId: FloorId;
  x: number;
  y: number;
  width: number;
  height: number;
  doorNodeId?: string; // NavNode where door opens to yellow corridor
  doorCodeId?: string; // If access requires a code
  color?: string;
  description?: string;
  isRestricted?: boolean;
  wardLayout?: WardMapLayout;
}

export interface NavNode {
  id: string;
  floorId: FloorId;
  x: number;
  y: number;
  label?: string;
  isElevator?: boolean;
  elevatorGroup?: string; // Links across floors
  isStairs?: boolean;
  stairsGroup?: string;
  isDoorway?: boolean;
  doorCodeId?: string;
}

export interface NavEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  distanceMeters: number;
  isVerticalTransition?: boolean; // elevator or stairs
  accessibleOnly?: boolean; // e.g. elevator (true) vs stairs (false)
}

export type BloodBagStatus = 'ready' | 'in-transit' | 'cleaning' | 'inspection-due';

export interface BloodTransportBag {
  id: string;
  serialCode: string; // e.g., "RBTB-7049-A", "RBTB-8812-C"
  model: string; // e.g., "Validated Cold-Chain Porter 2-6°C", "Rapid Resus Cooler"
  roomId: string;
  floorId: FloorId;
  locationDetails: string; // e.g., "Top shelf of Red Fridge, Bay 2"
  status: BloodBagStatus;
  capacityUnits: number; // e.g., 4 units PRBC
  lastInspectedDate: string;
  notes?: string;
}

export type FormUrgency = 'stat' | 'urgent' | 'routine';
export type FormCollectionStatus = 'pending' | 'collected';

export interface TransfusionFormLocation {
  id: string;
  roomId: string;
  floorId: FloorId;
  trayLabel: string; // e.g. "Transfusion Request In-Tray #1"
  exactSpot: string; // e.g. "Main nursing station desk behind barcode scanner"
  urgency: FormUrgency;
  status: FormCollectionStatus;
  estimatedFormsCount: number;
  lastCollectedAt?: string;
  notes?: string;
}

export interface DoorCode {
  id: string;
  doorName: string; // e.g. "Blood Bank Airlock Keypad"
  code: string; // e.g. "*4921#"
  floorId: FloorId;
  roomId?: string;
  locationDescription: string; // e.g. "West wing entry corridor between Lab and Blood Bank"
  clearanceLevel: 'Standard Staff' | 'Clinical Only' | 'Restricted Biohazard' | 'Security / Charge Nurse';
  updatedAt: string;
}

export interface TurnStep {
  stepIndex: number;
  instruction: string;
  turnType: 'straight' | 'slight-left' | 'left' | 'sharp-left' | 'slight-right' | 'right' | 'sharp-right' | 'elevator' | 'stairs' | 'door-code' | 'arrive';
  distanceMeters: number;
  floorId: FloorId;
  doorCode?: DoorCode;
  nodeId: string;
  cumulativeDistanceMeters: number;
  estimatedSeconds: number;
}

export interface RouteResult {
  steps: TurnStep[];
  pathNodeIds: string[];
  totalDistanceMeters: number;
  estimatedTotalSeconds: number;
  startRoomId?: string;
  targetRoomId?: string;
  floorsTraversed: FloorId[];
}

export type TravelMode = 'walking' | 'trolley' | 'accessible';

export interface HospitalData {
  hospitalName: string;
  lastUpdated: string;
  floors: FloorInfo[];
  rooms: Room[];
  nodes: NavNode[];
  edges: NavEdge[];
  bloodBags: BloodTransportBag[];
  transfusionForms: TransfusionFormLocation[];
  doorCodes: DoorCode[];
  wingLabels?: WingLabel[];
  wingZones?: WingZone[];
  hallways?: Hallway[];
  symbols?: MapSymbol[];
}
