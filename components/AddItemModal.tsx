import React, { useState } from 'react';
import { Equipment, EquipmentStatus, EquipmentType } from '../types';
import { ScanLine, X, Pencil } from 'lucide-react';

interface AddItemModalProps {
  onClose: () => void;
  onAdd: (item: Equipment) => void;
  onUpdate?: (item: Equipment) => void;
  initialItem?: Equipment | null;
  onScanRequest: () => void;
}

export const AddItemModal: React.FC<AddItemModalProps> = ({ onClose, onAdd, onUpdate, initialItem, onScanRequest }) => {
  const [newItemType, setNewItemType] = useState<EquipmentType>(initialItem?.type || EquipmentType.HELMET);
  const [newItemSize, setNewItemSize] = useState(initialItem?.size || 'L');
  const [newItemCondition, setNewItemCondition] = useState(initialItem?.condition || 'Neuf');
  const [newItemBarcode, setNewItemBarcode] = useState(initialItem?.barcode || '');

  const isEditing = !!initialItem;

  const handleSave = () => {
    const itemData: Equipment = {
      id: initialItem?.id || Date.now().toString(),
      type: newItemType,
      size: newItemSize,
      barcode: newItemBarcode.trim() || `MAN-${Date.now().toString().slice(-6)}`,
      status: initialItem?.status || EquipmentStatus.AVAILABLE,
      condition: newItemCondition as any,
      imageUrl: initialItem?.imageUrl || `https://picsum.photos/200?random=${Date.now()}`,
      assignedTo: initialItem?.assignedTo
    };

    if (isEditing && onUpdate) {
      onUpdate(itemData);
    } else {
      onAdd(itemData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl relative z-10 animate-fade-in overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-800">
            {isEditing ? 'Modifier l\'EPI' : 'Ajouter un EPI'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          {!isEditing && (
            <>
              <button 
                onClick={() => { onClose(); onScanRequest(); }}
                className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 p-4 rounded-xl border border-slate-200 transition-colors group"
              >
                <ScanLine className="w-5 h-5 text-slate-500 group-hover:text-slate-800" />
                <span className="font-medium">Scanner avec l'IA</span>
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-2 text-xs text-slate-400 uppercase">ou manuel</span>
                </div>
              </div>
            </>
          )}

          <div className="space-y-3">
            <div>
               <label className="block text-xs font-medium text-slate-500 mb-1">Code Barre / Identifiant</label>
               <input 
                 type="text"
                 value={newItemBarcode}
                 onChange={(e) => setNewItemBarcode(e.target.value)}
                 placeholder="Ex: CAS-001 (Laisser vide pour auto)"
                 className="w-full p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-fire-500 font-mono placeholder:font-sans"
               />
            </div>
            <div>
               <label className="block text-xs font-medium text-slate-500 mb-1">Type d'équipement</label>
               <select 
                 value={newItemType}
                 onChange={(e) => setNewItemType(e.target.value as EquipmentType)}
                 className="w-full p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-fire-500"
               >
                 {Object.values(EquipmentType).map(t => (
                   <option key={t} value={t}>{t}</option>
                 ))}
               </select>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Taille</label>
                <select 
                  value={newItemSize}
                  onChange={(e) => setNewItemSize(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-fire-500"
                >
                  {['XS', 'S', 'M', 'L', 'XL', 'XXL', '38', '39', '40', '41', '42', '43', '44', '45'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">État</label>
                <select 
                  value={newItemCondition}
                  onChange={(e) => setNewItemCondition(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-fire-500"
                >
                  {['Neuf', 'Bon', 'Usé', 'Critique'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <button 
            onClick={handleSave}
            className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-slate-200 active:scale-[0.98] transition-transform mt-2 flex items-center justify-center gap-2"
          >
            {isEditing && <Pencil className="w-4 h-4" />}
            {isEditing ? 'Mettre à jour' : 'Créer l\'équipement'}
          </button>
        </div>
      </div>
    </div>
  );
};