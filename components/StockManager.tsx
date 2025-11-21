import React, { useState, useMemo } from 'react';
import { AppState, Equipment, Transaction, User, EquipmentStatus } from '../types';
import { StockHeader } from './StockHeader';
import { Package, AlertTriangle, CheckCircle2, Clock, Trash2, Edit, User as UserIcon, ArrowRightLeft } from 'lucide-react';

interface StockManagerProps {
  state: AppState;
  currentUser: User | null;
  onAddEquipment: (eq: Equipment) => void;
  onUpdateEquipment: (eq: Equipment) => void;
  onDeleteEquipment: (id: string) => void;
  onTransaction: (t: Transaction, s: EquipmentStatus, a?: string) => void;
}

export const StockManager: React.FC<StockManagerProps> = ({
  state,
  currentUser,
  onAddEquipment,
  onUpdateEquipment,
  onDeleteEquipment,
  onTransaction
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');

  // Filtrage des équipements
  const filteredInventory = useMemo(() => {
    return state.inventory.filter(item => {
      const matchesSearch = 
        item.barcode.toLowerCase().includes(search.toLowerCase()) ||
        item.type.toLowerCase().includes(search.toLowerCase()) ||
        (item.size && item.size.toLowerCase().includes(search.toLowerCase()));
      
      const matchesFilter = filter === 'ALL' || item.status === filter;

      return matchesSearch && matchesFilter;
    });
  }, [state.inventory, search, filter]);

  const getStatusColor = (status: EquipmentStatus) => {
    switch (status) {
      case EquipmentStatus.AVAILABLE: return 'bg-green-50 text-green-700 border-green-100';
      case EquipmentStatus.LOANED: return 'bg-blue-50 text-blue-700 border-blue-100';
      case EquipmentStatus.DAMAGED: return 'bg-red-50 text-red-700 border-red-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  return (
    <div className="pb-24">
      <StockHeader 
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        onScanClick={() => alert('Scanner à implémenter')}
        onAddClick={() => {
            // Simple prompt pour démo, idéalement une modale
            const type = prompt('Type (Casque, Veste, etc.)') || 'Autre';
            const barcode = prompt('Code Barre') || `GEN-${Math.floor(Math.random()*1000)}`;
            const size = prompt('Taille');
            if(type && barcode) {
                onAddEquipment({
                    id: Date.now().toString(),
                    type: type as any,
                    barcode,
                    size: size || 'N/A', // Correction: fallback sur string car size est requis
                    status: EquipmentStatus.AVAILABLE,
                    condition: 'Neuf'
                });
            }
        }}
        userRole={currentUser?.role}
      />

      <div className="p-4 space-y-3">
        {filteredInventory.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Aucun équipement trouvé</p>
          </div>
        ) : (
          filteredInventory.map(item => (
            <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-500 border border-slate-100">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{item.type}</h3>
                    <p className="text-xs text-slate-500 font-mono">{item.barcode}</p>
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(item.status)}`}>
                  {item.status}
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500 pl-[52px]">
                {item.size && <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100">Taille: {item.size}</span>}
                {item.condition && <span>État: {item.condition}</span>}
              </div>
              
              {item.assignedTo && (
                  <div className="pl-[52px] flex items-center gap-2 text-xs text-blue-600">
                      <UserIcon className="w-3 h-3" />
                      <span className="font-medium">Assigné à: {state.users.find(u => u.id === item.assignedTo)?.name || item.assignedTo}</span>
                  </div>
              )}

              {/* Actions Admin Only */}
              {currentUser?.role === 'admin' && (
                <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-slate-50">
                   <button 
                     onClick={() => onDeleteEquipment(item.id)}
                     className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                   <button 
                     onClick={() => {
                         const newCond = prompt('Nouvel état ?', item.condition);
                         // Correction: cast explicite car string != 'Neuf' | 'Bon'...
                         if(newCond) onUpdateEquipment({...item, condition: newCond as any});
                     }}
                     className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors"
                   >
                     <Edit className="w-4 h-4" />
                   </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};