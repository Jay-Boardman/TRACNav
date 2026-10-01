import { Room, WardMapLayout, WardSubItem, BloodTransportBag, TransfusionFormLocation, DoorCode } from '../types/hospital';

export function generateDefaultWardLayout(
  room: Room,
  bloodBags: BloodTransportBag[] = [],
  forms: TransfusionFormLocation[] = [],
  doorCode?: DoorCode
): WardMapLayout {
  const items: WardSubItem[] = [];

  // 1. Entrance / Door Keypad
  items.push({
    id: `ward-door-${room.id}`,
    name: doorCode?.doorName || `${room.name} Main Entrance Keypad`,
    type: 'door-keypad',
    x: 40,
    y: 320,
    width: 140,
    height: 70,
    color: '#0284c7',
    notes: doorCode?.locationDescription || 'Primary access double-doors into ward corridor',
    doorCode: doorCode?.code || (room.doorCodeId ? '*1234#' : undefined),
  });

  // 2. Central Nursing Station
  items.push({
    id: `ward-ns-${room.id}`,
    name: 'Central Nursing & Staff Station',
    type: 'nursing-station',
    x: 280,
    y: 260,
    width: 240,
    height: 140,
    color: '#3b82f6',
    notes: 'Main ward desk, computers, telephone, and coordinator',
  });

  // 3. Paperwork Drop Tray (if exists or default)
  const roomForms = forms.filter((f) => f.roomId === room.id);
  if (roomForms.length > 0) {
    roomForms.forEach((form, idx) => {
      items.push({
        id: `ward-form-${form.id}`,
        name: form.trayLabel,
        type: 'paperwork-tray',
        x: 310 + idx * 80,
        y: 280,
        width: 130,
        height: 80,
        color: '#f97316',
        notes: `${form.exactSpot}. Urgency: ${form.urgency.toUpperCase()}.`,
        trayLabel: form.trayLabel,
      });
    });
  } else {
    items.push({
      id: `ward-form-default-${room.id}`,
      name: 'Transfusion Request Paperwork Tray',
      type: 'paperwork-tray',
      x: 320,
      y: 280,
      width: 140,
      height: 70,
      color: '#f97316',
      notes: 'Station desk drop tray for completed crossmatch & transfusion forms',
      trayLabel: `${room.name} Transfusion In-Tray`,
    });
  }

  // 4. Red Blood Transport Bag Station / Fridge
  const roomBags = bloodBags.filter((b) => b.roomId === room.id);
  if (roomBags.length > 0) {
    roomBags.forEach((bag, idx) => {
      items.push({
        id: `ward-bag-${bag.id}`,
        name: `Blood Bag: ${bag.serialCode}`,
        type: 'blood-bag-station',
        x: 580,
        y: 100 + idx * 110,
        width: 170,
        height: 90,
        color: '#ef4444',
        notes: `${bag.locationDetails}. Model: ${bag.model}. Capacity: ${bag.capacityUnits} units.`,
        serialNumber: bag.serialCode,
      });
    });
  } else {
    items.push({
      id: `ward-bag-default-${room.id}`,
      name: 'Blood Transport Bag Storage',
      type: 'blood-bag-station',
      x: 580,
      y: 110,
      width: 160,
      height: 90,
      color: '#ef4444',
      notes: 'Designated temperature-controlled cooler drop bracket',
      serialNumber: 'RBTB-PENDING',
    });
  }

  // 5. Patient Bays / Beds or Clinical Treatment Bays
  items.push({
    id: `ward-bay1-${room.id}`,
    name: 'Patient Bay 1 (Beds 1-4)',
    type: 'patient-bay',
    x: 40,
    y: 80,
    width: 200,
    height: 180,
    color: '#6366f1',
    notes: 'Inpatient 4-bed cohort bay',
  });

  items.push({
    id: `ward-bay2-${room.id}`,
    name: 'Patient Bay 2 (Beds 5-8)',
    type: 'patient-bay',
    x: 280,
    y: 80,
    width: 240,
    height: 140,
    color: '#6366f1',
    notes: 'Inpatient 4-bed cohort bay',
  });

  // 6. Clean Utility & Drug Prep
  items.push({
    id: `ward-clean-util-${room.id}`,
    name: 'Clean Utility & Med Room',
    type: 'clean-utility',
    x: 580,
    y: 280,
    width: 170,
    height: 120,
    color: '#10b981',
    notes: 'Locked medication storage, intravenous fluids, and sterile supplies',
  });

  // 7. Sluice & Dirty Utility
  items.push({
    id: `ward-sluice-${room.id}`,
    name: 'Sluice & Waste Disposal',
    type: 'sluice',
    x: 40,
    y: 440,
    width: 170,
    height: 120,
    color: '#64748b',
    notes: 'Hazardous waste and clinical disposal disposal area',
  });

  // 8. Doctors & Handover Office
  items.push({
    id: `ward-doc-office-${room.id}`,
    name: 'Consultant & Handover Room',
    type: 'doctors-office',
    x: 280,
    y: 440,
    width: 220,
    height: 120,
    color: '#8b5cf6',
    notes: 'Clinical handover and private family consultation room',
  });

  return {
    width: 800,
    height: 600,
    items,
    notes: `Architectural interior layout for ${room.name} (${room.code})`,
  };
}
