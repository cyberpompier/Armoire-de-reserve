import React, { useState, useMemo } from 'react';
import { AppState, Equipment, Transaction, User, EquipmentType, EquipmentStatus } from '../types';
import { Search, Filter, Plus, ChevronRight, AlertCircle } from 'lucide-react';
import { ActionModal } from './ActionModal';

interface StockManagerProps {
  state: AppState;
  currentUser: User | null;
  onAddEquipment: (eq: Equipment) => void;
  onTransaction: (trans: Transaction, newStatus: EquipmentStatus, userId?: string) => void;
  onUpdateEquipment: (eq: Equipment) => void;
}

export const StockManager: React.FC<StockManagerProps> = ({
  state,
  currentUser,
  onAddEquipment,
  onTransaction,
  onUpdateEquipment
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [selectedItem, setSelectedItem] = useState<Equipment | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);

  // Filter Logic
  const filteredInventory = useMemo(() => {
    return state.inventory.filter(item => {
      const matchesSearch = 
        item.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.assignedTo && state.users.find(u => u.id === item.assignedTo)?.name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesType = filterType === 'ALL' || item.type === filterType;
      
      return matchesSearch && matchesType;
    });
  }, [state.inventory, searchTerm, filterType, state.users]);

  // Handle Modal Close
  const handleCloseModal = () => {
    setIsActionModalOpen(false);
    setSelectedItem(null);
  };

  // Handle Transaction from Modal
  const handleAction = (action: 'LOAN' | 'RETURN', userId?: string, reason?: string, note?: string) => {
    if (!selectedItem || !currentUser) return;

    const newTrans: Transaction = {
      id: Date.now().toString(),
      equipmentId: selectedItem.id,
      userId: userId || currentUser.id, // Defaults to current user if not specified
      type: action === 'LOAN' ? 'OUT' : 'IN',
      timestamp: Date.now(),
      reason: reason,
      note: note
    };

    const newStatus = action === 'LOAN' ? EquipmentStatus.LOANED : EquipmentStatus.AVAILABLE;
    
    onTransaction(newTrans, newStatus, action === 'LOAN' ? userId : undefined);
    handleCloseModal();
  };

  // Handle Update from Modal
  const handleUpdate = (updatedItem: Equipment) => {
    onUpdateEquipment(updatedItem);
    // On ne ferme pas forcément la modale, ou on peut, selon l'UX. Ici on ferme.
    handleCloseModal(); 
  };

  return (
    <div className="p-6 pb-24 min-h-full">
      {/* Header */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventaire</h1>
          <p className="text-slate-500 text-sm">{state.inventory.length} équipements enregistrés</p>
        </div>
        <button 
          className="bg-fire-600 text-white p-3 rounded-xl shadow-lg shadow-fire-200 active:scale-95 transition-all"
          onClick={() => {
              // Logic for adding new equipment would go here (out of scope for this specific edit, but button exists)
              const newId = (state.inventory.length + 1).toString();
              onAddEquipment({
                  id: newId,
                  type: EquipmentType.HELMET, // Default
                  size: 'M',
                  barcode: `NEW-${newId.padStart(3, '0')}`,
                  status: EquipmentStatus.AVAILABLE,
                  condition: 'Neuf'
              });
          }}
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Rechercher (ref, type, porteur)..." 
            className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-slate-100 text-sm shadow-sm outline-none focus:ring-2 focus:ring-fire-100"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative">
           <select 
             className="appearance-none bg-white px-4 py-3 pr-10 rounded-xl border border-slate-100 text-sm shadow-sm outline-none focus:ring-2 focus:ring-fire-100 font-medium text-slate-600"
             value={filterType}
             onChange={e => setFilterType(e.target.value)}
           >
             <option value="ALL">Tous</option>
             {Object.values(EquipmentType).map(t => (
               <option key={t} value={t}>{t}</option>
             ))}
           </select>
           <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Inventory List */}
      <div className="space-y-3">
        {filteredInventory.length === 0 ? (
           <div className="text-center py-12 text-slate-400">
             <p>Aucun équipement trouvé.</p>
           </div>
        ) : (
          filteredInventory.map(item => {
            const isAvailable = item.status === EquipmentStatus.AVAILABLE;
            const assignedUser = item.assignedTo ? state.users.find(u => u.id === item.assignedTo) : null;

            return (
              <div 
                key={item.id} 
                onClick={() => { setSelectedItem(item); setIsActionModalOpen(true); }}
                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm active:scale-[0.99] transition-transform cursor-pointer flex items-center gap-4 relative overflow-hidden"
              >
                {/* Status Indicator Bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                  item.status === EquipmentStatus.AVAILABLE ? 'bg-emerald-500' :
                  item.status === EquipmentStatus.LOANED ? 'bg-blue-500' :
                  'bg-red-500'
                }`}></div>

                <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 shrink-0">
                  <span className="text-xs font-bold">{item.size}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-slate-800 truncate pr-2">{item.type}</h3>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{item.barcode}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                       item.status === EquipmentStatus.AVAILABLE ? 'bg-emerald-50 text-emerald-700' :
                       item.status === EquipmentStatus.LOANED ? 'bg-blue-50 text-blue-700' :
                       'bg-red-50 text-red-700'
                    }`}>
                      {item.status}
                    </span>
                    {assignedUser && (
                      <span className="text-xs text-slate-500 truncate">
                         • {assignedUser.name}
                      </span>
                    )}
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-slate-300" />
              </div>
            );
          })
        )}
      </div>

      <ActionModal 
        isOpen={isActionModalOpen}
        onClose={handleCloseModal}
        item={selectedItem}
        currentUser={currentUser}
        users={state.users}
        transactions={state.transactions}
        onAction={handleAction}
        onUpdate={handleUpdate}
      />
    </div>
  );
};