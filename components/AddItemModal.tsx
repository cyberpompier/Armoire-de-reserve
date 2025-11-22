import React, { useState } from 'react';
import { Equipment, EquipmentStatus, EquipmentType } from '../types';
import { ScanLine, X, Pencil, Trash2, AlertTriangle, Loader2, Link2 } from 'lucide-react';

interface AddItemModalProps {
  onClose: (reason?: 'scan') => void;
  onAdd: (item: Equipment, pairBarcode?: string) => Promise<void>;
  onUpdate?: (item: Equipment, pairBarcode?: string) => Promise<void>;
  onDelete?: (itemId: string) => Promise<void>;
  initialItem?: Equipment | null;
  initialBarcode?: string | null;
  onScanRequest: () => void;
  inventory: Equipment[]; // Pass full inventory to find pairs
}

export const AddItemModal: React.FC<AddItemModalProps> = ({ onClose, onAdd, onUpdate, onDelete, initialItem, initialBarcode, onScanRequest, inventory }) => {
  const [newItemType, setNewItemType] = useState<EquipmentType>(initialItem?.type || EquipmentType.HELMET);
  const [newItemSize, setNewItemSize] = useState(initialItem?.size || 'L');
  const [newItemCondition, setNewItemCondition] = useState<'Neuf' | 'Bon' | 'Usé' | 'Critique'>(
    initialItem?.condition || 'Neuf'
  );
  const [newItemStatus, setNewItemStatus] = useState<EquipmentStatus>(initialItem?.status || EquipmentStatus.AVAILABLE);
  const [newItemBarcode, setNewItemBarcode] = useState(initialBarcode || initialItem?.barcode || '');
  const [pairBarcode, setPairBarcode] = useState('');
  
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isEditing = !!initialItem;

  // Find initial pair barcode on edit
  React.useEffect(() => {
    if (isEditing && initialItem?.pairId) {
      const pairedItem = inventory.find(item => item.id === initialItem.pairId);
      if (pairedItem) {
        setPairBarcode(pairedItem.barcode);
      }
    }
  }, [initialItem, inventory, isEditing]);

  const handleSave = async () => {
    if (!newItemBarcode.trim()) {
      alert("Veuillez saisir un code-barres ou un identifiant.");
      return;
    }

    setIsSaving(true);
    const itemData: Equipment = {
      id: initialItem?.id || crypto.randomUUID(),
      type: newItemType,
      size: newItemSize,
      barcode: newItemBarcode.trim(),
      status: newItemStatus,
      condition: newItemCondition,
      imageUrl: initialItem?.imageUrl || `https://picsum.photos/200?random=${Date.now()}`,
      assignedTo: newItemStatus === EquipmentStatus.AVAILABLE ? undefined : initialItem?.assignedTo,
      // pairId will be handled in App.tsx
    };

    try {
      if (isEditing && onUpdate) {
        await onUpdate(itemData, pairBarcode);
      } else {
        await onAdd(itemData, pairBarcode);
      }
      onClose();
    } catch (error) {
      console.error("Save failed in modal:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (initialItem && onDelete) {
      setIsDeleting(true);
      try {
        await onDelete(initialItem.id);
        onClose();
      } catch (error) {
        console.error("Delete failed in modal:", error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleScanButtonClick = () => {
    onScanRequest();
    onClose('scan');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => onClose()}></div>
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl relative z-10 animate-fade-in overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="font-bold text-lg text-slate-800">
            {isEditing ? 'Modifier l\'EPI' : 'Ajouter un EPI'}
          </h3>
          <button onClick={() => onClose()} className="p-1 hover:bg-slate-100 rounded-full text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="space-y-3">
            <div>
               <label className="block text-xs font-medium text-slate-500 mb-1">Code Barre / Identifiant *</label>
               <div className="relative">
                 <input 
                   type="text"
                   value={newItemBarcode}
                   onChange={(e) => setNewItemBarcode(e.target.value)}
                   placeholder="Ex: 2024GCD000494"
                   className="w-full p-2.5 pr-10 bg-slate-50 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-fire-500 font-mono placeholder:font-sans"
                 />
                 <button onClick={handleScanButtonClick} className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 bg-slate-200 hover:bg-slate-300 rounded-md text-slate-600">
                   <ScanLine className="w-4 h-4" />
                 </button>
               </div>
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

            {newItemType === EquipmentType.GLOVES && (
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <label className="block text-xs font-medium text-blue-700 mb-1.5">Lier à un autre gant</label>
                <div className="relative">
                  <input 
                    type="text"
                    value={pairBarcode}
                    onChange={(e) => setPairBarcode(e.target.value)}
                    placeholder="Scanner ou saisir le code-barres"
                    className="w-full p-2.5 pl-9 bg-white rounded-md border border-blue-200 text-sm outline-none focus:ring-2 focus:ring-fire-500 font-mono"
                  />
                  <Link2 className="w-4 h-4 text-blue-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                <p className="text-[10px] text-blue-500 mt-1.5">
                  Pour lier les gants, ajoutez-les d'abord individuellement, puis modifiez-en un pour ajouter le code-barres de l'autre ici.
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Taille</label>
                <select 
                  value={newItemSize}
                  onChange={(e) => setNewItemSize(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-fire-500"
                >
                  <option>S</option>
                  <option>M</option>
                  <option>L</option>
                  <option>XL</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">État</label>
                <select 
                  value={newItemCondition}
                  onChange={(e) => setNewItemCondition(e.target.value as 'Neuf' | 'Bon' | 'Usé' | 'Critique')}
                  className="w-full p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-fire-500"
                >
                  <option>Neuf</option>
                  <option>Bon</option>
                  <option>Usé</option>
                  <option>Critique</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Statut</label>
              <select 
                value={newItemStatus}
                onChange={(e) => setNewItemStatus(e.target.value as EquipmentStatus)}
                className="w-full p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-fire-500"
              >
                {Object.values(EquipmentStatus).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-slate-200 active:scale-[0.98] transition-transform mt-2 flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : (isEditing && <Pencil className="w-4 h-4" />)}
            {isSaving ? 'Enregistrement...' : (isEditing ? 'Mettre à jour' : 'Créer l\'équipement')}
          </button>

          {isEditing && (
            <div className="mt-4 text-center">
              {!confirmDelete ? (
                <button 
                  onClick={() => setConfirmDelete(true)}
                  className="text-xs text-red-500 hover:text-red-700 font-semibold inline-flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Supprimer cet équipement
                </button>
              ) : (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                  <p className="text-xs text-red-800 font-medium mb-2">Êtes-vous sûr de vouloir supprimer cet EPI ?</p>
                  <div className="flex justify-center gap-2">
                    <button 
                      onClick={() => setConfirmDelete(false)}
                      className="px-3 py-1 text-xs font-bold text-slate-600 bg-slate-200 rounded-md"
                    >
                      Annuler
                    </button>
                    <button 
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="px-3 py-1 text-xs font-bold text-white bg-red-600 rounded-md flex items-center justify-center gap-1 disabled:opacity-70"
                    >
                      {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-3 h-3" />}
                      {isDeleting ? 'Suppression...' : 'Oui, supprimer'}
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