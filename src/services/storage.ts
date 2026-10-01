import { HospitalData } from '../types/hospital';
import { defaultHospitalData } from '../data/defaultHospitalData';

const STORAGE_KEY = 'hospital_nav_warrington_v3_dual_floor';
const CURRENT_LOCATION_KEY = 'hospital_nav_current_room_id_v3';
const TRAVEL_MODE_KEY = 'hospital_nav_travel_mode';

export function loadHospitalData(): HospitalData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveHospitalData(defaultHospitalData);
      return defaultHospitalData;
    }
    const parsed = JSON.parse(raw);
    if (!parsed.floors || !parsed.rooms || parsed.hospitalName !== defaultHospitalData.hospitalName) {
      saveHospitalData(defaultHospitalData);
      return defaultHospitalData;
    }
    // Backfill architectural elements if not present in saved state
    if (!parsed.wingLabels || parsed.wingLabels.length === 0) {
      parsed.wingLabels = defaultHospitalData.wingLabels;
    }
    if (!parsed.wingZones || parsed.wingZones.length === 0) {
      parsed.wingZones = defaultHospitalData.wingZones;
    }
    if (!parsed.hallways || parsed.hallways.length === 0) {
      parsed.hallways = defaultHospitalData.hallways;
    }
    if (!parsed.symbols || parsed.symbols.length === 0) {
      parsed.symbols = defaultHospitalData.symbols;
    }
    return parsed;
  } catch (err) {
    console.error('Failed to load hospital data from localStorage, using default:', err);
    return defaultHospitalData;
  }
}

export function saveHospitalData(data: HospitalData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save hospital data to localStorage:', err);
  }
}

export function resetHospitalDataToDefault(): HospitalData {
  saveHospitalData(defaultHospitalData);
  return defaultHospitalData;
}

export function exportDataAsJson(data: HospitalData): void {
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(data, null, 2)
  )}`;
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', jsonString);
  downloadAnchor.setAttribute(
    'download',
    `warrington_hospital_navigation_${new Date().toISOString().slice(0, 10)}.json`
  );
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function encodeDataForSync(data: HospitalData): string {
  try {
    const json = JSON.stringify(data);
    const bytes = new TextEncoder().encode(json);
    let binary = '';
    const chunk = 8192;
    for (let i = 0; i < bytes.length; i += chunk) {
      const sub = bytes.subarray(i, i + chunk);
      binary += String.fromCharCode.apply(null, Array.from(sub));
    }
    return btoa(binary);
  } catch (err) {
    console.error('Failed to encode sync data', err);
    return '';
  }
}

export function decodeDataFromSync(encoded: string): HospitalData | null {
  try {
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json);
    if (parsed && Array.isArray(parsed.rooms) && Array.isArray(parsed.floors)) {
      return parsed as HospitalData;
    }
    return null;
  } catch (err) {
    console.error('Failed to decode sync data', err);
    return null;
  }
}

export function getSavedCurrentLocation(): string {
  return localStorage.getItem(CURRENT_LOCATION_KEY) || 'r-main-entrance';
}

export function setSavedCurrentLocation(roomId: string): void {
  localStorage.setItem(CURRENT_LOCATION_KEY, roomId);
}

export function getSavedTravelMode(): 'walking' | 'trolley' | 'accessible' {
  return (localStorage.getItem(TRAVEL_MODE_KEY) as any) || 'walking';
}

export function setSavedTravelMode(mode: 'walking' | 'trolley' | 'accessible'): void {
  localStorage.setItem(TRAVEL_MODE_KEY, mode);
}
