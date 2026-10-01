import React, { useState, useEffect } from 'react';
import { Room, FloorId, WingType, DepartmentType } from '../types/hospital';
import { X, Building2, Palette, Check } from 'lucide-react';

interface AddRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (roomData: Partial<Room>) => void;
  initialRoom?: Room | null;
  activeFloorId: FloorId;
  defaultPosition?: { x: number; y: number };
}

const PRESET_COLORS = [
  '#2563eb', // Blue
  '#7c3aed', // Purple
  '#db2777', // Pink/Magenta
  '#059669', // Emerald
  '#d97706', // Amber
  '#dc2626', // Red
  '#475569', // Slate
  '#0891b2', // Cyan
  '#4f46e5', // Indigo
];

export const AddRoomModal: React.FC<AddRoomModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialRoom,
  activeFloorId,
  defaultPosition,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [wing, setWing] = useState<WingType>('appleton');
  const [department, setDepartment] = useState<DepartmentType>('ward');
  const [floorId, setFloorId] = useState<FloorId>(activeFloorId);
  const [color, setColor] = useState('#2563eb');
  const [width, setWidth] = useState(140);
  const [height, setHeight] = useState(80);
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (initialRoom) {
      setName(initialRoom.name);
      setCode(initialRoom.code || '');
      setWing(initialRoom.wing);
      setDepartment(initialRoom.department);
      setFloorId(initialRoom.floorId);
      setColor(initialRoom.color || '#2563eb');
      setWidth(initialRoom.width);
      setHeight(initialRoom.height);
      setDescription(initialRoom.description || '');
    } else {
      setName('');
      setCode(`W-${Math.floor(100 + Math.random() * 900)}`);
      setWing('appleton');
      setDepartment('ward');
      setFloorId(activeFloorId);
      setColor('#2563eb');
      setWidth(140);
      setHeight(80);
      setDescription('');
    }
  }, [initialRoom, activeFloorId, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const safeCode = initialRoom?.code || name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 10) || 'WARD';

    onSave({
      name: name.trim(),
      code: safeCode,
      wing,
      department,
      floorId,
      color,
      width: Math.max(60, Number(width) || 120),
      height: Math.max(40, Number(height) || 70),
      description: description.trim(),
      ...(defaultPosition && !initialRoom ? { x: defaultPosition.x, y: defaultPosition.y } : {}),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-950 text-blue-400 border border-blue-800">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {initialRoom ? `Edit Ward: ${initialRoom.name}` : 'Add New Ward / Room Box'}
              </h2>
              <p className="text-xs text-slate-400">
                Configure box dimensions, wing location, and department
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Ward Name / Number *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ward A1, Ward 12, Neonatal Unit, Blood Bank"
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Hospital Wing
              </label>
              <select
                value={wing}
                onChange={(e) => setWing(e.target.value as WingType)}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="appleton">Appleton Wing (Purple)</option>
                <option value="burtonwood">Burtonwood Wing (Indigo)</option>
                <option value="croft">Croft Wing (Magenta)</option>
                <option value="entrance">Main Entrance (Blue)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Floor
              </label>
              <select
                value={floorId}
                onChange={(e) => setFloorId(e.target.value as FloorId)}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="G">Ground Floor (Main Entrance & Outpatients)</option>
                <option value="F1">First Floor (Theatres & Pathology)</option>
                <option value="F2">Floor 2 (Upper Inpatient Wards)</option>
                <option value="F3">Floor 3 (Specialty Wards)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value as DepartmentType)}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="ward">Inpatient Ward</option>
                <option value="blood-bank">Blood Bank / Transfusion</option>
                <option value="pathology">Pathology / Labs</option>
                <option value="emergency">Emergency / SDEC</option>
                <option value="icu">ICU / HDU</option>
                <option value="maternity">Maternity & Neonatal</option>
                <option value="surgery">Theatres / Surgical</option>
                <option value="outpatient">Outpatient Clinic</option>
                <option value="reception">Reception / Food Court</option>
                <option value="general">General Support</option>
              </select>
            </div>
          </div>

          {/* Size controls */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-800/40 rounded-xl border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Box Width (px)
              </label>
              <input
                type="number"
                min={60}
                max={500}
                step={10}
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Box Height (px)
              </label>
              <input
                type="number"
                min={40}
                max={400}
                step={10}
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Color Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-blue-400" />
              <span>Box Color</span>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110 flex items-center justify-center"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? '#ffffff' : 'transparent',
                  }}
                >
                  {color === c && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                title="Custom color picker"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Description / Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Inpatient surgical ward with 28 acute beds"
              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-900/40 transition-colors"
            >
              {initialRoom ? 'Update Ward Box' : 'Add Ward Box'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
