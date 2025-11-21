import React, { useState } from 'react';
import { Equipment, EquipmentStatus, EquipmentType } from '../types';
import { ScanLine, X, Pencil, Trash2, AlertTriangle } from 'lucide-react';

interface AddItemModalProps {
  onClose: () => void;
  onAdd: (item: Equipment) => void;
  onUpdate?: (item: Equipment) => void;
  onDelete?: (itemId: string) => void;
  initialItem?: Equipment | null;
  onScanRequest: () => void;
}

export const AddItemModal: React.FC<AddItemModalProps> = ({ onClose, onAdd, onUpdate, onDelete, initialItem, onScanRequest }) => {
  const [newItemType, setNewItemType] = useState<EquipmentType>(initialItem?.type || EquipmentType.HELMET);
  const [newItemSize, setNewItemSize] = useState(initialItem?.size || 'L');
  const [newItemCondition, setNewItemCondition] = useState(initialItem?.condition || 'Neuf');
  const [newItemStatus, setNewItemStatus] = useState<EquipmentStatus>(initialItem?.status || EquipmentStatus.AVAILABLE);
  const [newItemBarcode, setNewItemBarcode] = useState(initialItem?.barcode || '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isEditing = !!initialItem;

  const handleSave = () => {
    const itemData: Equipment = {
      id: initialItem?.id || Date.now().toString(),
      type: newItemType,
      size: newItemSize,
      barcode: newItemBarcode.trim() || `MAN-${Date.now().toString().slice(-6)}`,
      status: newItemStatus,
      condition: newItemCondition as any,
      imageUrl: initialItem?.imageUrl || `https://picsum.photos/200?random=${Date.now()}`,
      assignedTo: newItemStatus === EquipmentStatus.AVAILABLE ? undefined : initialItem?.assignedTo
    };

    if (isEditing && onUpdate) {
      onUpdate(itemData);
    } else {
      onAdd(itemData);
    }
    onClose();
  };

  const handleDelete = () => {
    if (initialItem && onDelete) {
      onDelete(initialItem.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl relative z-10 animate-fade-in overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
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
            
            <div>
               <label className="block text-xs font-medium text-slate-500 mb-1">Statut (Disponibilité)</label>
               <select 
                 value={newItemStatus}
                 onChange={(e) => setNewItemStatus(e.target.value as EquipmentStatus)}
                 className={`w-full p-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-fire-500 font-medium ${
                    newItemStatus === EquipmentStatus.AVAILABLE ? 'bg-green-50 text-green-700' :
                    newItemStatus === EquipmentStatus.LOANED ? 'bg-blue-50 text-blue-700' :
                    'bg-red-50 text-red-700'
                 }`}
               >
                 {Object.values(EquipmentStatus).map(s => (
                   <option key={s} value={s}>{s}</option>
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
                <label className="block text-xs font-medium text-slate-500 mb-1">État (Usure)</label>
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

          {/* Delete Button */}
          {isEditing && onDelete && (
            <div className="pt-4 mt-2 border-t border-slate-100">
              {!confirmDelete ? (
                <button 
                  onClick={() => setConfirmDelete(true)}
                  className="w-full py-3 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer l'équipement
                </button>
              ) : (
                <div className="bg-red-50 p-3 rounded-xl animate-fade-in">
                   <div className="flex items-center gap-2 text-red-600 mb-2">
                     <AlertTriangle className="w-4 h-4" />
                     <span className="text-xs font-bold">Êtes-vous sûr ?</span>
                   </div>
                   <div className="flex gap-2">
                     <button 
                       onClick={() => setConfirmDelete(false)}
                       className="flex-1 py-2 bg-white text-slate-600 text-xs font-bold rounded-lg border border-red-100"
                     >
                       Annuler
                     </button>
                     <button 
                       onClick={handleDelete}
                       className="flex-1 py-2 bg-red-600 text-white text-xs font-bold rounded-lg shadow-sm"
                     >
                       Confirmer
                     </button>
                   </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};