import React, { useState, useEffect } from 'react'; // Ajout de useEffect
import { Equipment, EquipmentStatus, EquipmentType } from '../types';
import { ScanLine, X, Pencil, Trash2, AlertTriangle, Loader2 } from 'lucide-react';

interface AddItemModalProps {
  onClose: () => void;
  onAdd: (item: Equipment) => void;
  onUpdate?: (item: Equipment) => void;
  onDelete?: (itemId: string) => void;
  initialItem?: Equipment | null;
  onScanRequest: () => void;
}

export const AddItemModal: React.FC<AddItemModalProps> = ({ onClose, onAdd, onUpdate, onDelete, initialItem, onScanRequest }) => {
  // Initialisation des states
  const [newItemType, setNewItemType] = useState<EquipmentType>(EquipmentType.HELMET);
  const [newItemSize, setNewItemSize] = useState('L');
  const [newItemCondition, setNewItemCondition] = useState<'Neuf' | 'Bon' | 'Usé' | 'Critique'>('Neuf');
  const [newItemStatus, setNewItemStatus] = useState<EquipmentStatus>(EquipmentStatus.AVAILABLE);
  const [newItemBarcode, setNewItemBarcode] = useState('');
  
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!initialItem;

  // CORRECTION 1 : Réinitialiser le formulaire quand la modale s'ouvre ou que l'item change
  useEffect(() => {
    if (initialItem) {
      // Mode Édition : on remplit avec les données existantes
      setNewItemType(initialItem.type);
      setNewItemSize(initialItem.size);
      setNewItemCondition(initialItem.condition);
      setNewItemStatus(initialItem.status);
      setNewItemBarcode(initialItem.barcode);
    } else {
      // Mode Ajout : on remet tout à zéro (très important pour le 2ème ajout)
      setNewItemType(EquipmentType.HELMET);
      setNewItemSize('L');
      setNewItemCondition('Neuf');
      setNewItemStatus(EquipmentStatus.AVAILABLE);
      setNewItemBarcode('');
    }
    setConfirmDelete(false);
  }, [initialItem]); // Se déclenche quand initialItem change (ou quand la modale s'ouvre si le parent gère bien la clé)

  const handleSave = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // CORRECTION 2 : Gestion de l'ID
      // Si Supabase attend un UUID, il vaut mieux ne pas envoyer d'ID (laisser Supabase le générer)
      // OU utiliser crypto.randomUUID() si l'environnement le supporte.
      // Ici, on garde votre logique mais on s'assure qu'elle est unique.
      const newItemId = initialItem?.id || crypto.randomUUID(); 
      
      // Génération du code-barres
      // Si newItemBarcode est vide (reset par le useEffect), on en génère un nouveau unique
      const finalBarcode = newItemBarcode.trim() || `MAN-${newItemId.slice(-8).toUpperCase()}`;

      const itemData: Equipment = {
        id: newItemId,
        type: newItemType,
        size: newItemSize,
        barcode: finalBarcode,
        status: newItemStatus,
        condition: newItemCondition,
        imageUrl: initialItem?.imageUrl || `https://picsum.photos/200?random=${Date.now()}`, // Force une nouvelle image
        assignedTo: newItemStatus === EquipmentStatus.AVAILABLE ? undefined : initialItem?.assignedTo
      };

      if (isEditing && onUpdate) {
        await onUpdate(itemData);
      } else {
        await onAdd(itemData);
      }
      
      onClose();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde", error);
      alert("Erreur lors de la sauvegarde. Vérifiez que le code-barres n'existe pas déjà.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (initialItem && onDelete) {
      onDelete(initialItem.id);
      onClose();
    }
  };

  return (
    // ... Le reste de votre JSX (inchangé) ...
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={isSubmitting ? undefined : onClose}></div>
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl relative z-10 animate-fade-in overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="font-bold text-lg text-slate-800">
            {isEditing ? 'Modifier l\'EPI' : 'Ajouter un EPI'}
          </h3>
          <button 
            onClick={onClose} 
            disabled={isSubmitting}
            className="p-1 hover:bg-slate-100 rounded-full text-slate-400 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          {!isEditing && (
            <>
              <button 
                onClick={() => { onClose(); onScanRequest(); }}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 p-4 rounded-xl border border-slate-200 transition-colors group disabled:opacity-50"
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
                 disabled={isSubmitting}
                 placeholder="Ex: CAS-001 (Laisser vide pour auto)"
                 className="w-full p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-fire-500 font-mono placeholder:font-sans disabled:opacity-50"
               />
            </div>
            <div>
               <label className="block text-xs font-medium text-slate-500 mb-1">Type d'équipement</label>
               <select 
                 value={newItemType}
                 onChange={(e) => setNewItemType(e.target.value as EquipmentType)}
                 disabled={isSubmitting}
                 className="w-full p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-fire-500 disabled:opacity-50"
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
                 disabled={isSubmitting}
                 className={`w-full p-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-fire-500 font-medium disabled:opacity-50 ${
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
                  disabled={isSubmitting}
                  className="w-full p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-fire-500 disabled:opacity-50"
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
                  onChange={(e) => setNewItemCondition(e.target.value as any)}
                  disabled={isSubmitting}
                  className="w-full p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-fire-500 disabled:opacity-50"
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
            disabled={isSubmitting}
            className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-slate-200 active:scale-[0.98] transition-transform mt-2 flex items-center justify-center gap-2 disabled:opacity-70 disabled:active:scale-100"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Traitement...
              </>
            ) : (
              <>
                {isEditing && <Pencil className="w-4 h-4" />}
                {isEditing ? 'Mettre à jour' : 'Créer l\'équipement'}
              </>
            )}
          </button>

          {isEditing && onDelete && (
            <div className="pt-4 mt-2 border-t border-slate-100">
              {!confirmDelete ? (
                <button 
                  onClick={() => setConfirmDelete(true)}
                  disabled={isSubmitting}
                  className="w-full py-3 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
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
                       disabled={isSubmitting}
                       className="flex-1 py-2 bg-white text-slate-600 text-xs font-bold rounded-lg border border-red-100 disabled:opacity-50"
                     >
                       Annuler
                     </button>
                     <button 
                       onClick={handleDelete}
                       disabled={isSubmitting}
                       className="flex-1 py-2 bg-red-600 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50"
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