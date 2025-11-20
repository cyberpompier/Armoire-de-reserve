import React, { useState, useEffect } from 'react';
import { Equipment, EquipmentStatus, Transaction, User } from '../types';
import { History, User as UserIcon } from 'lucide-react';

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Equipment | null;
  currentUser: User | null;
  users: User[];
  transactions: Transaction[];
  onAction: (action: 'LOAN' | 'RETURN', userId?: string, reason?: string, note?: string) => void;
}

export const ActionModal: React.FC<ActionModalProps> = ({
  isOpen,
  onClose,
  item,
  currentUser,
  users,
  transactions,
  onAction
}) => {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [note, setNote] = useState('');
  const [loanReason, setLoanReason] = useState<string>('Intervention');

  // Set default user when opening
  useEffect(() => {
    if (isOpen && currentUser) {
      setSelectedUser(currentUser.id);
    }
    // Reset fields
    setNote('');
    setLoanReason('Intervention');
  }, [isOpen, currentUser]);

  if (!isOpen || !item) return null;

  const handleConfirm = (action: 'LOAN' | 'RETURN') => {
    onAction(action, selectedUser, loanReason, note);
  };

  // Get history for this item
  const itemHistory = transactions
    .filter(t => t.equipmentId === item.id)
    .sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="bg-white w-full max-w-md rounded-t-3xl p-6 relative z-50 animate-slide-up shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 sticky top-0"></div>
        
        <h2 className="text-xl font-bold text-slate-900 mb-1">{item.type}</h2>
        <p className="text-slate-500 text-sm mb-6">ID: {item.barcode} • État: {item.condition}</p>

        {/* Actions */}
        <div className="mb-8">
          {/* Note field for all actions */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Note / Commentaire</label>
            <textarea 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ajouter une note sur l'état ou l'opération..."
              className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-fire-500 resize-none h-20"
            />
          </div>

          {item.status === EquipmentStatus.AVAILABLE && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Attribuer à :</label>
                <div className="relative">
                  <select 
                    className="w-full p-3 bg-slate-50 rounded-xl border-r-8 border-transparent outline-none text-slate-700 appearance-none"
                    value={selectedUser}
                    onChange={e => setSelectedUser(e.target.value)}
                  >
                    <option value="">Sélectionner...</option>
                    {/* Current User Option First */}
                    {currentUser && (
                      <option value={currentUser.id} className="font-bold">
                         👉 {currentUser.rank} {currentUser.name} (MOI)
                      </option>
                    )}
                    <option disabled>──────────────────</option>
                    {users
                      .filter(u => u.id !== currentUser?.id)
                      .sort((a, b) => a.name.localeCompare(b.name)) // Tri alphabétique
                      .map(u => (
                        <option key={u.id} value={u.id}>
                          {u.rank ? `${u.rank} ` : ''}{u.name}
                        </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <UserIcon className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Motif de sortie :</label>
                <select 
                  className="w-full p-3 bg-slate-50 rounded-xl border-r-8 border-transparent outline-none text-slate-700"
                  value={loanReason}
                  onChange={e => setLoanReason(e.target.value)}
                >
                  <option value="Intervention">Intervention</option>
                  <option value="Entraînement">Entraînement / Manœuvre</option>
                  <option value="Maintenance">Maintenance / Entretien</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              <button 
                onClick={() => handleConfirm('LOAN')}
                disabled={!selectedUser}
                className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold shadow-lg shadow-slate-200 disabled:opacity-50 disabled:shadow-none active:scale-[0.98] transition-transform"
              >
                Valider la Sortie
              </button>
            </div>
          )}

          {item.status === EquipmentStatus.LOANED && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <p className="text-sm text-blue-800">
                    Actuellement attribué à : <br/>
                    <span className="font-bold text-lg">
                      {users.find(u => u.id === item.assignedTo)?.name || 'Utilisateur inconnu'}
                    </span>
                  </p>
              </div>
              <button 
                onClick={() => handleConfirm('RETURN')}
                className="w-full bg-green-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-green-200 active:scale-[0.98] transition-transform"
              >
                Confirmer le Retour
              </button>
            </div>
          )}
          
          {item.status === EquipmentStatus.DAMAGED && (
            <div className="p-4 bg-red-50 text-red-700 rounded-xl text-center font-medium">
              Matériel hors service. Nécessite réparation ou remplacement.
            </div>
          )}
        </div>

        {/* History Section */}
        <div className="border-t border-slate-100 pt-6">
           <div className="flex items-center gap-2 mb-4">
             <History className="w-4 h-4 text-slate-400" />
             <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Traçabilité</h3>
           </div>
           
           <div className="space-y-4 pl-2">
              {itemHistory.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Aucun historique pour cet équipement.</p>
              ) : (
                itemHistory.map((t: any, idx) => {
                  const user = users.find(u => u.id === t.userId);
                  const date = new Date(t.timestamp);
                  return (
                    <div key={t.id} className="relative flex gap-4">
                       {/* Timeline Line */}
                       {idx !== itemHistory.length - 1 && (
                         <div className="absolute left-[5px] top-3 bottom-[-16px] w-[2px] bg-slate-100"></div>
                       )}
                       
                       <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 z-10 ring-4 ring-white ${
                         t.type === 'OUT' ? 'bg-blue-500' : 'bg-green-500'
                       }`}></div>
                       
                       <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <p className="text-sm font-medium text-slate-800">
                              {t.type === 'OUT' ? 'Emprunté' : 'Restitué'}
                              <span className="text-slate-500 font-normal"> par </span>
                              {user ? user.name : 'Système'}
                            </p>
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 rounded">
                              {date.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 items-center mt-0.5">
                            <p className="text-xs text-slate-500">
                              {date.toLocaleDateString('fr-FR', {weekday: 'long', day: 'numeric', month: 'long'})}
                            </p>
                            {t.reason && (
                              <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                {t.reason}
                              </span>
                            )}
                          </div>
                          {t.note && (
                            <p className="text-xs text-slate-600 mt-1 bg-slate-50 p-2 rounded border border-slate-100 italic">
                              "{t.note}"
                            </p>
                          )}
                       </div>
                    </div>
                  );
                })
              )}
           </div>
        </div>

      </div>
    </div>
  );
};