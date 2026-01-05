import React, { useState, useEffect } from 'react';
import { Equipment, EquipmentStatus, Transaction, User } from '../types';
import { History, User as UserIcon, Pencil, Link2, AlertCircle } from 'lucide-react';

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: Equipment[] | null;
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
  const isAdmin = currentUser?.role === 'admin';
  
  // Vérification des droits : admin ou propriétaire de l'emprunt
  const isOwner = primaryItem.assignedTo === currentUser?.id;
  const canPerformAction = primaryItem.status === EquipmentStatus.AVAILABLE || isAdmin || isOwner;

  const handleConfirm = (action: 'LOAN' | 'RETURN') => {
    if (!canPerformAction && action === 'RETURN') return;
    onAction(action, selectedUser, loanReason, note);
  };

  const itemHistory = transactions
    .filter(t => t.equipmentId === primaryItem.id)
    .sort((a, b) => {
       const dateA = new Date(a.timestamp).getTime();
       const dateB = new Date(b.timestamp).getTime();
       return dateB - dateA;
    });

  const borrower = users.find(u => u.id === primaryItem.assignedTo);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white w-full max-w-md rounded-t-3xl p-6 relative z-50 animate-slide-up shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
        
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-start gap-4">
            <img 
              src={primaryItem.imageUrl} 
              alt={primaryItem.type} 
              className="w-16 h-16 rounded-xl object-cover bg-slate-100"
            />
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">{primaryItem.type} {isPair && '(Paire)'}</h2>
              <div className="flex flex-col gap-0.5">
                <p className="text-slate-500 text-xs font-mono">ID: {primaryItem.barcode}</p>
                {isPair && (
                  <p className="text-slate-400 text-xs flex items-center gap-1 font-mono">
                    <Link2 size={10}/> {items[1].barcode}
                  </p>
                )}
              </div>
            </div>
          </div>
          {isAdmin && (
            <button 
              onClick={() => onEdit?.(primaryItem)}
              className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="mb-8">
          {/* Note / Commentaire - Désactivé si pas de droits */}
          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Note / Commentaire</label>
            <textarea 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={canPerformAction ? "Ajouter une note..." : "Vous n'avez pas les droits pour commenter"}
              disabled={!canPerformAction}
              className={`w-full p-3 rounded-xl border border-slate-200 text-sm transition-all outline-none ${
                canPerformAction 
                ? 'bg-slate-50 focus:ring-2 focus:ring-slate-200 focus:bg-white' 
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            />
          </div>

          {/* Section ACTION : Disponible */}
          {primaryItem.status === EquipmentStatus.AVAILABLE && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Attribuer à</label>
                <select 
                  className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-bold appearance-none"
                  value={selectedUser}
                  onChange={e => setSelectedUser(e.target.value)}
                  disabled={!isAdmin}
                >
                  {currentUser && <option value={currentUser.id}>MOI ({currentUser.rank} {currentUser.name})</option>}
                  {isAdmin && users.filter(u => u.id !== currentUser?.id).map(u => (
                    <option key={u.id} value={u.id}>{u.rank} {u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Motif de sortie</label>
                <select 
                  className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm"
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
                className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold shadow-lg shadow-slate-200 active:scale-[0.98] transition-transform"
              >
                Valider la Sortie
              </button>
            </div>
          )}

          {/* Section ACTION : Emprunté */}
          {primaryItem.status === EquipmentStatus.LOANED && (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl flex items-center gap-3 ${isOwner ? 'bg-fire-50 border border-fire-100' : 'bg-slate-100 border border-slate-200'}`}>
                  <div className={`p-2 rounded-lg ${isOwner ? 'bg-fire-100 text-fire-600' : 'bg-slate-200 text-slate-500'}`}>
                    <UserIcon size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Actuellement détenu par</p>
                    <p className={`text-sm font-bold ${isOwner ? 'text-fire-700' : 'text-slate-700'}`}>
                      {isOwner ? 'VOUS' : (borrower ? `${borrower.rank} ${borrower.name}` : 'Inconnu')}
                    </p>
                  </div>
              </div>

              {canPerformAction ? (
                <button 
                  onClick={() => handleConfirm('RETURN')}
                  className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-100 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                >
                  <CheckCircle size={18} /> Confirmer le Retour
                </button>
              ) : (
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Cet équipement est sous la responsabilité de <span className="font-bold text-slate-700">{borrower?.name || 'un autre agent'}</span>. 
                    Seul l'emprunteur ou un administrateur peut confirmer le retour.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Historique */}
        <div className="border-t border-slate-100 pt-6">
           <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
             <History size={14} /> Traçabilité
           </h3>
           <div className="space-y-3">
             {itemHistory.length === 0 ? (
               <p className="text-xs text-slate-400 italic">Aucun mouvement enregistré pour cet EPI.</p>
             ) : (
               itemHistory.slice(0, 5).map((t: any) => (
                 <div key={t.id} className="flex items-start gap-3 text-xs">
                   <div className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${t.type === 'OUT' ? 'bg-orange-400' : 'bg-emerald-400'}`}></div>
                   <div className="flex-1">
                     <p className="text-slate-700 font-medium">
                       {t.type === 'OUT' ? 'Sortie par' : 'Retour de'} <span className="font-bold">{users.find(u => u.id === t.userId)?.name || 'Inconnu'}</span>
                     </p>
                     <p className="text-slate-400 text-[10px] mt-0.5">
                       {new Date(t.timestamp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                       {t.note && <span className="block mt-1 italic text-slate-500">"{t.note}"</span>}
                     </p>
                   </div>
                 </div>
               ))
             )}
           </div>
        </div>
      </div>
    </div>
  );
};

// Petite icône interne manquante
const CheckCircle = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
);