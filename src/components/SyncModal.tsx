import React, { useState, useRef } from 'react';
import { HospitalData } from '../types/hospital';
import {
  encodeDataForSync,
  decodeDataFromSync,
  exportDataAsJson,
} from '../services/storage';
import {
  X,
  Smartphone,
  Copy,
  Check,
  Download,
  Upload,
  Share2,
  RefreshCw,
  FileCode,
} from 'lucide-react';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: HospitalData;
  onImportData: (newData: HospitalData) => void;
  showToast: (msg: string) => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  data,
  onImportData,
  showToast,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Generate sync link with hash
  const encodedData = encodeDataForSync(data);
  const syncUrl = `${window.location.origin}${window.location.pathname}#sync=${encodedData}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(syncUrl);
      setCopiedLink(true);
      showToast('✓ iPhone Sync Link copied! Send this link to your phone.');
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      showToast('Could not copy link automatically. Please copy the code below.');
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(encodedData);
      setCopiedCode(true);
      showToast('✓ Sync Data Code copied to clipboard!');
      setTimeout(() => setCopiedCode(false), 3000);
    } catch {
      showToast('Could not copy to clipboard.');
    }
  };

  const handleManualImport = () => {
    if (!manualCode.trim()) {
      showToast('Please paste a sync code first.');
      return;
    }
    const decoded = decodeDataFromSync(manualCode.trim());
    if (decoded) {
      onImportData(decoded);
      showToast('✓ Layout imported and saved successfully!');
      onClose();
    } else {
      showToast('Invalid sync code format. Please check the code.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (parsed && Array.isArray(parsed.rooms) && Array.isArray(parsed.floors)) {
          onImportData(parsed as HospitalData);
          showToast('✓ Backup file imported successfully!');
          onClose();
        } else {
          showToast('File does not match the hospital layout schema.');
        }
      } catch {
        showToast('Failed to parse the JSON backup file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-950 text-blue-400 border border-blue-800/80">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Transfer & Sync to iPhone
              </h2>
              <p className="text-xs text-slate-400">
                Transfer your custom edits between computer and mobile
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Method 1: Instant Sync Link */}
          <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-800/50 space-y-3">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-blue-200">
                Method 1: One-Click iPhone Sync Link
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This link encodes your exact ward positions, door codes, and red blood box details. Send this link to your iPhone (via AirDrop, iMessage, WhatsApp, or Email) and tap it in Safari.
            </p>

            <button
              onClick={handleCopyLink}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-bold text-xs shadow-md transition-all"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy iPhone Sync Link</span>
                </>
              )}
            </button>
          </div>

          {/* Method 2: Manual Code or Import on Mobile */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-200">
                  Method 2: Sync Code
                </h3>
              </div>
              <button
                onClick={handleCopyCode}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
              >
                {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedCode ? 'Copied' : 'Copy Code'}
              </button>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Paste sync code here on your phone..."
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleManualImport}
                disabled={!manualCode.trim()}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
              >
                Apply Pasted Code to this Device
              </button>
            </div>
          </div>

          {/* Method 3: JSON Backup File */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-3">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-200">
                Method 3: Download / Upload Backup File
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => exportDataAsJson(data)}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export .JSON</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-blue-400" />
                <span>Import .JSON</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
