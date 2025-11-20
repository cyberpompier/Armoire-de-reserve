import React, { useEffect, useState } from 'react';
import { AppState, Equipment, EquipmentType, EquipmentStatus, Transaction, User } from '../types';
import { Search, Plus, User as UserIcon, History, ScanLine, X, QrCode } from 'lucide-react';
import { ScannerAI } from './ScannerAI';
import { BarcodeScanner } from './BarcodeScanner';

interface StockManagerProps {
  state: AppState;
  currentUser: User | null;
  onAddEquipment: (eq: Equipment) => void;
  onTransaction: (trans: Transaction, newStatus: EquipmentStatus, assignee?: string) => void;
}

export const StockManager: React.FC<StockManagerProps> = ({ state, currentUser, onAddEquipment, onTransaction }) => {
  const [filter, setFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [showScanner, setShowScanner] = useState(false); // AI Scanner
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false); // Barcode Scanner
  const [selectedItem, setSelectedItem] = useState<Equipment | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [note, setNote] = useState('');
  const [loanReason, setLoanReason] = useState<string>('Intervention');

  // New Item State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemType, setNewItemType] = useState<EquipmentType>(EquipmentType.HELMET);
  const [newItemSize, setNewItemSize] = useState('L');
  const [newItemCondition, setNewItemCondition] = useState('Neuf');
  const [newItemBarcode, setNewItemBarcode] = useState('');

  // Set default user when opening modal
  useEffect(() => {
    if (showActionModal && currentUser) {
      setSelectedUser(currentUser.id);
    }
  }, [showActionModal, currentUser]);

  // Filter logic
  const filteredItems = state.inventory.filter(item => {
    const matchesFilter = filter === 'ALL' || item.status === filter;
    const matchesSearch = item.type.toLowerCase().includes(search.toLowerCase()) || 
                          item.barcode.includes(search) || 
                          (item.assignedTo && state.users.find(u => u.id === item.assignedTo)?.name.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  // Sound Feedback
  const playBeep = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.value = 1000; // 1000Hz beep
      gain.gain.value = 0.1; // Volume bas

      osc.start();
      osc.stop(ctx.currentTime + 0.15); // 150ms duration
    } catch (e) {
      console.error("Audio play failed", e);
    }
  };

  const handleAiIdentify = (type: EquipmentType, condition: string) => {
    playBeep();
    // Create new item from scan
    const newItem: Equipment = {
      id: Date.now().toString(),
      type,
      size: 'L', // Default
      barcode: `GEN-${Date.now().toString().slice(-6)}`,
      status: EquipmentStatus.AVAILABLE,
      condition: condition as 'Neuf'|'Bon'|'Usé'|'Critique',
      imageUrl: `https://picsum.photos/200?random=${Date.now()}`
    };
    onAddEquipment(newItem);
  };

  const handleBarcodeFound = (code: string) => {
    // Try to find item in inventory
    const foundItem = state.inventory.find(item => item.barcode === code);
    
    if (foundItem) {
      playBeep();
      // Item found: Open action modal directly
      setShowBarcodeScanner(false);
      setSelectedItem(foundItem);
      setNote('');
      setLoanReason('Intervention');
      setShowActionModal(true);
    } else {
      alert(`Équipement introuvable avec le code : ${code}`);
      setShowBarcodeScanner(false);
      setSearch(code);
    }
  };

  const handleManualAdd = () => {
    const newItem: Equipment = {
      id: Date.now().toString(),
      type: newItemType,
      size: newItemSize,
      barcode: newItemBarcode.trim() || `MAN-${Date.now().toString().slice(-6)}`,
      status: EquipmentStatus.AVAILABLE,
      condition: newItemCondition as any,
      imageUrl: `https://picsum.photos/200?random=${Date.now()}`
    };
    onAddEquipment(newItem);
    setShowAddModal(false);
    setNewItemBarcode('');
  };

  const handleAction = (action: 'LOAN' | 'RETURN') => {
    if (!selectedItem) return;

    const transaction: any = {
      id: Date.now().toString(),
      equipmentId: selectedItem.id,
      userId: action === 'LOAN' ? selectedUser : (selectedItem.assignedTo || 'SYSTEM'),
      type: action === 'LOAN' ? 'OUT' : 'IN',
      timestamp: Date.now(),
      note: note.trim(),
      reason: action === 'LOAN' ? loanReason : undefined
    };

    const newStatus = action === 'LOAN' ? EquipmentStatus.LOANED : EquipmentStatus.AVAILABLE;
    onTransaction(transaction, newStatus, action === 'LOAN' ? selectedUser : undefined);
    setShowActionModal(false);
    setSelectedItem(null);
    setNote('');
    setLoanReason('Intervention');
  };

  // Helper to get history for selected item
  const getSelectedItemHistory = () => {
    if (!selectedItem) return [];
    return state.transactions
      .filter(t => t.equipmentId === selectedItem.id)
      .sort((a, b) => b.timestamp - a.timestamp);
  };

  return (
    <div className="pb-6 animate-fade-in">
      {showScanner && (
        <ScannerAI 
          onClose={() => setShowScanner(false)} 
          onIdentified={handleAiIdentify} 
        />
      )}

      {showBarcodeScanner && (
        <BarcodeScanner
          onClose={() => setShowBarcodeScanner(false)}
          onScan={handleBarcodeFound}
        />
      )}

      {/* Header Search */}
      <div className="sticky top-0 bg-slate-50/90 backdrop-blur-md z-10 px-4 py-3 border-b border-slate-200">
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Rechercher EPI, Matricule..." 
              className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-fire-500 focus:border-transparent outline-none"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          
          {/* Barcode Scan Button */}
          <button 
            onClick={() => setShowBarcodeScanner(true)}
            className="bg-white text-slate-700 p-2 rounded-xl border border-slate-200 shadow-sm active:scale-95 transition-transform"
          >
            <QrCode className="w-5 h-5" />
          </button>

          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-slate-900 text-white p-2 rounded-xl shadow-lg active:scale-95 transition-transform"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Status Chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {['ALL', EquipmentStatus.AVAILABLE, EquipmentStatus.LOANED, EquipmentStatus.DAMAGED].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === status 
                  ? 'bg-fire-600 text-white shadow-md shadow-fire-200' 
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              {status === 'ALL' ? 'Tout' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory List */}
      <div className="p-4 space-y-3">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 opacity-50">
            <PackageIcon className="w-12 h-12 mx-auto mb-2" />
            <p>Aucun équipement trouvé</p>
          </div>
        ) : (
          filteredItems.map(item => (
            <div 
              key={item.id} 
              onClick={() => { setSelectedItem(item); setShowActionModal(true); setNote(''); setLoanReason('Intervention'); }}
              className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 active:scale-[0.99] transition-transform"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                item.status === EquipmentStatus.AVAILABLE ? 'bg-green-100 text-green-700' :
                item.status === EquipmentStatus.LOANED ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
              }`}>
                {getIconForType(item.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-slate-800 truncate">{item.type}</h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.status === EquipmentStatus.AVAILABLE ? 'bg-green-50 text-green-600' :
                    item.status === EquipmentStatus.LOANED ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
                  }`}>
                    {item.status}
                  </span>
                </div>
                <div className="flex justify-between items-end mt-1">
                  <div className="text-xs text-slate-500">
                    <p>Taille: {item.size} • {item.condition}</p>
                    {item.assignedTo && (
                      <p className="text-blue-600 font-medium mt-0.5 flex items-center gap-1">
                        <UserIcon className="w-3 h-3" /> 
                        {state.users.find(u => u.id === item.assignedTo)?.name || item.assignedTo}
                      </p>
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                    {item.barcode}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl relative z-10 animate-fade-in overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800">Ajouter un EPI</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <button 
                onClick={() => { setShowAddModal(false); setShowScanner(true); }}
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
                onClick={handleManualAdd}
                className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-slate-200 active:scale-[0.98] transition-transform mt-2"
              >
                Créer l'équipement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal (Bottom Sheet simulation) */}
      {showActionModal && selectedItem && (
        <div className="fixed inset-0 z-40 flex items-end justify-center">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setShowActionModal(false)}></div>
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 relative z-50 animate-slide-up shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 sticky top-0"></div>
            
            <h2 className="text-xl font-bold text-slate-900 mb-1">{selectedItem.type}</h2>
            <p className="text-slate-500 text-sm mb-6">ID: {selectedItem.barcode} • État: {selectedItem.condition}</p>

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

              {selectedItem.status === EquipmentStatus.AVAILABLE && (
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
                             👉 MOI ({currentUser.rank} {currentUser.name})
                          </option>
                        )}
                        <option disabled>──────────────────</option>
                        {state.users
                          .filter(u => u.id !== currentUser?.id)
                          .map(u => (
                            <option key={u.id} value={u.id}>{u.rank} {u.name}</option>
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
                    onClick={() => handleAction('LOAN')}
                    disabled={!selectedUser}
                    className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold shadow-lg shadow-slate-200 disabled:opacity-50 disabled:shadow-none active:scale-[0.98] transition-transform"
                  >
                    Valider la Sortie
                  </button>
                </div>
              )}

              {selectedItem.status === EquipmentStatus.LOANED && (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                      <p className="text-sm text-blue-800">
                        Actuellement attribué à : <br/>
                        <span className="font-bold text-lg">
                          {state.users.find(u => u.id === selectedItem.assignedTo)?.name || 'Utilisateur inconnu'}
                        </span>
                      </p>
                  </div>
                  <button 
                    onClick={() => handleAction('RETURN')}
                    className="w-full bg-green-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-green-200 active:scale-[0.98] transition-transform"
                  >
                    Confirmer le Retour
                  </button>
                </div>
              )}
              
              {selectedItem.status === EquipmentStatus.DAMAGED && (
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
                  {getSelectedItemHistory().length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Aucun historique pour cet équipement.</p>
                  ) : (
                    getSelectedItemHistory().map((t: any, idx) => {
                      const user = state.users.find(u => u.id === t.userId);
                      const date = new Date(t.timestamp);
                      return (
                        <div key={t.id} className="relative flex gap-4">
                           {/* Timeline Line */}
                           {idx !== getSelectedItemHistory().length - 1 && (
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
      )}
    </div>
  );
};

// Helper for icons
const PackageIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22v-9"/></svg>;

function getIconForType(type: EquipmentType) {
  // Simple mapping to abstract icons or lucide icons
  switch (type) {
    case EquipmentType.HELMET: return <span className="text-xl">⛑️</span>;
    case EquipmentType.JACKET: return <span className="text-xl">🧥</span>;
    case EquipmentType.BOOTS: return <span className="text-xl">👢</span>;
    case EquipmentType.GLOVES: return <span className="text-xl">🧤</span>;
    default: return <span className="text-xl">📦</span>;
  }
}