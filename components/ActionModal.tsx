import React, { useState, useEffect } from 'react';
import { Equipment, EquipmentStatus, Transaction, User } from '../types';
import { History, User as UserIcon, Pencil, Link2 } from 'lucide-react';

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: Equipment[] | null; // Changed from item to items
  currentUser: User | null;
  users: User[];
  transactions: Transaction[];
  onAction: (action: 'LOAN' | 'RETURN', userId?: string, reason?: string, note?: string) => Promise<void>;
  onEdit?: (item: Equipment) => void;
}

export const ActionModal: React.FC<ActionModalProps> = ({
  isOpen,
  onClose,
  items,
  currentUser,
  users,
  transactions,
  onAction,
  onEdit
}) => {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [note, setNote] = useState('');
  const [loanReason, setLoanReason] = useState<string>('Intervention');

  useEffect(() => {
    if (isOpen && currentUser) {
      setSelectedUser(currentUser.id);
    }
    setNote('');
    setLoanReason('Intervention');
  }, [isOpen, currentUser]);

  if (!isOpen || !items || items.length === 0) return null;

  const primaryItem = items[0];
  const isPair = items.length > 1;

  const handleConfirm = (action: 'LOAN' | 'RETURN') => {
    onAction(action, selectedUser, loanReason, note);
  };

  const itemHistory = transactions
    .filter(t => t.equipmentId === primaryItem.id)
    .sort((a, b) => b.timestamp - a.timestamp);

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white w-full max-w-md rounded-t-3xl p-6 relative z-50 animate-slide-up shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
        
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">{primaryItem.type} {isPair && '(Paire)'}</h2>
            <p className="text-slate-500 text-sm">ID: {primaryItem.barcode}</p>
            {isPair && <p className="text-slate-500 text-sm flex items-center gap-1"><Link2 size={12}/> {items[1].barcode}</p>}
          </div>
          {isAdmin && (
            <button 
              onClick={() => onEdit?.(primaryItem)}
              className="p-2.5 bg-slate-100 text-slate-600 rounded-xl"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="mb-8">
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Note / Commentaire</label>
            <textarea 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ajouter une note..."
              className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          {primaryItem.status === EquipmentStatus.AVAILABLE && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Attribuer à :</label>
                <select 
                  className="w-full p-3 bg-slate-50 rounded-xl"
                  value={selectedUser}
                  onChange={e => setSelectedUser(e.target.value)}
                  disabled={!isAdmin}
                >
                  {currentUser && <option value={currentUser.id}>MOI - {currentUser.name}</option>}
                  {isAdmin && users.filter(u => u.id !== currentUser?.id).map(u => (
                    <option key={u.id} value={u.id}>{u.rank} {u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Motif de sortie :</label>
                <select 
                  className="w-full p-3 bg-slate-50 rounded-xl"
                  value={loanReason}
                  onChange={e => setLoanReason(e.target.value)}
                >
                  <option>Intervention</option>
                  <option>Entraînement</option>
                  <option>Maintenance</option>
                  <option>Autre</option>
                </select>
              </div>
              <button 
                onClick={() => handleConfirm('LOAN')}
                disabled={!selectedUser}
                className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold"
              >
                Valider la Sortie
              </button>
            </div>
          )}

          {primaryItem.status === EquipmentStatus.LOANED && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-xl">
                  <p className="text-sm text-blue-800">
                    Attribué à : <span className="font-bold">{users.find(u => u.id === primaryItem.assignedTo)?.name || 'Inconnu'}</span>
                  </p>
              </div>
              <button 
                onClick={() => handleConfirm('RETURN')}
                className="w-full bg-green-600 text-white py-4 rounded-xl font-bold"
              >
                Confirmer le Retour
              </button>
            </div>
          )}
        </div>

        {/* History Section */}
        <div className="border-t border-slate-100 pt-6">
           <h3 className="text-sm font-bold text-slate-800 mb-4">Traçabilité ({primaryItem.barcode})</h3>
           {itemHistory.length === 0 ? (
             <p className="text-xs text-slate-400">Aucun historique.</p>
           ) : (
             itemHistory.map((t: any) => (
               <div key={t.id} className="text-xs mb-2">...</div>
             ))
           )}
        </div>
      </div>
    </div>
  );
};