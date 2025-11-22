import React, { useState, useEffect } from 'react';
import { Equipment, EquipmentStatus, Transaction, User, EquipmentType } from '../types';
import { History, User as UserIcon, Pencil, Link as LinkIcon } from 'lucide-react';

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Equipment | null;
  inventory: Equipment[]; // Ajout de l'inventaire complet
  currentUser: User | null;
  users: User[];
  transactions: Transaction[];
  onAction: (action: 'LOAN' | 'RETURN', userId?: string, reason?: string, note?: string, specificItemId?: string) => void;
  onEdit?: (item: Equipment) => void;
}

export const ActionModal: React.FC<ActionModalProps> = ({
  isOpen,
  onClose,
  item,
  inventory,
  currentUser,
  users,
  transactions,
  onAction,
  onEdit
}) => {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [note, setNote] = useState('');
  const [loanReason, setLoanReason] = useState<string>('Intervention');
  
  // Logique de paire
  const [partnerItem, setPartnerItem] = useState<Equipment | null>(null);
  const [includePartner, setIncludePartner] = useState(false);

  // Set default user when opening & detect pair
  useEffect(() => {
    if (isOpen && currentUser) {
      setSelectedUser(currentUser.id);
    }
    // Reset fields
    setNote('');
    setLoanReason('Intervention');
    setPartnerItem(null);
    setIncludePartner(false);

    // Detection de paire pour les Gants
    if (isOpen && item && item.type === EquipmentType.GLOVES) {
        let partnerCode = null;
        // Logique specifique au code client : 2024GCG... <-> 2024GCD...
        if (item.barcode.includes('GCG')) {
            partnerCode = item.barcode.replace('GCG', 'GCD');
        } else if (item.barcode.includes('GCD')) {
            partnerCode = item.barcode.replace('GCD', 'GCG');
        }

        if (partnerCode) {
            const partner = inventory.find(i => i.barcode === partnerCode);
            // On ne propose la paire que si elle est dans le même état (Dispo ou Emprunté par le même user)
            if (partner) {
                const isAvailablePair = item.status === EquipmentStatus.AVAILABLE && partner.status === EquipmentStatus.AVAILABLE;
                const isReturnablePair = item.status === EquipmentStatus.LOANED && partner.status === EquipmentStatus.LOANED && item.assignedTo === partner.assignedTo;
                
                if (isAvailablePair || isReturnablePair) {
                    setPartnerItem(partner);
                    setIncludePartner(true); // Par défaut on coche
                }
            }
        }
    }
  }, [isOpen, currentUser, item, inventory]);

  if (!isOpen || !item) return null;

  const handleConfirm = (action: 'LOAN' | 'RETURN') => {
    // Configuration de l'email commune
    const recipient = 'sebastien.dupressoir@sdis60.fr';
    const userEmail = (currentUser as any)?.email;

    let itemsSubject = `${item.type} - ${item.barcode}`;
    let itemsBodyDetail = `Type : ${item.type}\nIdentifiant : ${item.barcode}\nÉtat : ${item.condition}`;

    // Si on inclut la paire, on ajoute les infos
    if (includePartner && partnerItem) {
        itemsSubject += ` + ${partnerItem.barcode}`;
        itemsBodyDetail += `\n\n--- PAIRE INCLUSE ---\nType : ${partnerItem.type}\nIdentifiant : ${partnerItem.barcode}\nÉtat : ${partnerItem.condition}`;
    }

    if (action === 'LOAN') {
      const subject = `Sortie EPI : ${itemsSubject}`;
      const body = `Bonjour, je viens d’emprunter le materiel suivant:\n\n` +
        `Détails de l'emprunt de matériel :\n\n` +
        `--- MATÉRIEL PRINCIPAL ---\n` +
        itemsBodyDetail + `\n\n` +
        `--- SORTIE ---\n` +
        `Attribué à : ${users.find(u => u.id === selectedUser)?.name || 'Inconnu'}\n` +
        `Motif : ${loanReason}\n` +
        `Note : ${note || 'Aucune'}\n\n` +
        `--- INFO ---\n` +
        `Enregistré par : ${currentUser?.name || 'Inconnu'}\n` +
        `Date : ${new Date().toLocaleString('fr-FR')}\n\n` +
        `Je m’engage à le restituer propre, et je signalerais toutes anomalies, via l’application.\n\n` +
        `Cordialement`;

      const mailtoLink = `mailto:${recipient}?cc=${userEmail || ''}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoLink;
    } 
    else if (action === 'RETURN') {
      const assignedUser = users.find(u => u.id === item.assignedTo);
      const subject = `Retour EPI : ${itemsSubject}`;
      const body = `Bonjour, je viens de restituer le materiel suivant:\n\n` +
        `Détails du retour de matériel :\n\n` +
        `--- MATÉRIEL PRINCIPAL ---\n` +
        itemsBodyDetail + `\n\n` +
        `--- RETOUR ---\n` +
        `Restitué par : ${assignedUser?.name || 'Inconnu'}\n` +
        `Note : ${note || 'Aucune'}\n\n` +
        `--- INFO ---\n` +
        `Enregistré par : ${currentUser?.name || 'Inconnu'}\n` +
        `Date : ${new Date().toLocaleString('fr-FR')}\n\n` +
        `Cordialement`;

      const mailtoLink = `mailto:${recipient}?cc=${userEmail || ''}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoLink;
    }

    // 1. Action Principale
    onAction(action, selectedUser, loanReason, note);

    // 2. Action Paire (si cochée)
    if (includePartner && partnerItem) {
        // Petit délai pour assurer l'ordre des transactions
        setTimeout(() => {
            onAction(action, selectedUser, loanReason, note, partnerItem.id);
        }, 100);
    }
  };

  // Get history for this item
  const itemHistory = transactions
    .filter(t => t.equipmentId === item.id)
    .sort((a, b) => b.timestamp - a.timestamp);

  // Check if admin (lowercase)
  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="bg-white w-full max-w-md rounded-t-3xl p-6 relative z-50 animate-slide-up shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 sticky top-0"></div>
        
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">{item.type}</h2>
            <p className="text-slate-500 text-sm">ID: {item.barcode} • État: {item.condition}</p>
          </div>
          {isAdmin && (
            <button 
              onClick={() => onEdit?.(item)}
              className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 active:scale-95 transition-all border border-slate-200"
              title="Modifier l'équipement"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* PAIR DETECTION ALERT */}
        {partnerItem && (
            <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex flex-col gap-3">
                <div className="flex items-center gap-2 text-indigo-800 font-bold text-sm">
                    <LinkIcon className="w-4 h-4" />
                    <span>Paire détectée !</span>
                </div>
                <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-indigo-100 shadow-sm cursor-pointer active:scale-[0.98] transition-transform">
                    <input 
                        type="checkbox" 
                        checked={includePartner}
                        onChange={(e) => setIncludePartner(e.target.checked)}
                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1">
                        <p className="text-sm font-bold text-slate-800">
                            {partnerItem.barcode.includes('GCG') ? 'Inclure Gant Gauche' : 
                             partnerItem.barcode.includes('GCD') ? 'Inclure Gant Droit' : 'Inclure la paire'}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">{partnerItem.barcode}</p>
                    </div>
                </label>
            </div>
        )}

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
                    disabled={!isAdmin} // Désactiver le select si pas admin
                  >
                    <option value="">Sélectionner...</option>
                    {/* Current User Option First */}
                    {currentUser && (
                      <option value={currentUser.id} className="font-bold">
                         👉 {currentUser.rank} {currentUser.name} (MOI)
                      </option>
                    )}
                    
                    {/* Show other users ONLY if ADMIN */}
                    {isAdmin && (
                      <>
                        <option disabled>──────────────────</option>
                        {users
                          .filter(u => u.id !== currentUser?.id)
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map(u => (
                            <option key={u.id} value={u.id}>
                              {u.rank ? `${u.rank} ` : ''}{u.name}
                            </option>
                        ))}
                      </>
                    )}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <UserIcon className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
                {!isAdmin && (
                  <p className="text-[10px] text-slate-400 mt-1 ml-1">
                    * Seul un administrateur peut attribuer du matériel à un tiers.
                  </p>
                )}
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
                {includePartner ? 'Valider la Sortie de la PAIRE' : 'Valider la Sortie'} (Email)
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
                {includePartner ? 'Confirmer le Retour de la PAIRE' : 'Confirmer le Retour'} (Email)
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