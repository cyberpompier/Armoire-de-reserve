import React, { useState, useMemo } from 'react';
import { AppState, Equipment, Transaction, User, EquipmentStatus } from '../types';
import { StockHeader } from './StockHeader';
import { EquipmentList } from './EquipmentList';
import { AddItemModal } from './AddItemModal';
import { Scanner } from './Scanner';

interface StockManagerProps {
  state: AppState;
  currentUser: User | null;
  onAddEquipment: (eq: Equipment) => void;
  onUpdateEquipment: (eq: Equipment) => void;
  onDeleteEquipment: (id: string) => void;
  onTransaction: (t: Transaction, s: EquipmentStatus, u?: string) => void;
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
  const [isScanning, setIsScanning] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<Equipment | null>(null);

  const filteredInventory = useMemo(() => {
    return state.inventory.filter(item => {
      const matchesSearch = search === '' || 
        item.type.toLowerCase().includes(search.toLowerCase()) ||
        item.barcode.toLowerCase().includes(search.toLowerCase()) ||
        (item.assignedTo && state.users.find(u => u.id === item.assignedTo)?.name.toLowerCase().includes(search.toLowerCase()));
      
      const matchesFilter = filter === 'ALL' || item.status === filter;
      
      return matchesSearch && matchesFilter;
    });
  }, [state.inventory, search, filter, state.users]);

  return (
    <div className="h-full flex flex-col bg-slate-50/50">
      <StockHeader 
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        onScanClick={() => setIsScanning(true)}
        onAddClick={() => setIsAdding(true)}
        // On passe le rôle ici. Si currentUser est null (chargement), on force 'pompier' par sécurité pour masquer le bouton.
        userRole={currentUser?.role || 'pompier'}
      />

      <div className="flex-1 overflow-y-auto p-4 pb-20">
        <EquipmentList 
          items={filteredInventory}
          users={state.users}
          currentUser={currentUser}
          onEdit={setEditingItem}
        />
      </div>

      {isAdding && (
        <AddItemModal 
          onClose={() => setIsAdding(false)}
          onSave={(item) => {
            onAddEquipment(item);
            setIsAdding(false);
          }}
          mode="create"
        />
      )}

      {editingItem && (
        <AddItemModal 
          initialData={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={(item) => {
            onUpdateEquipment(item);
            setEditingItem(null);
          }}
          onDelete={() => {
            onDeleteEquipment(editingItem.id);
            setEditingItem(null);
          }}
          mode="edit"
        />
      )}

      {isScanning && (
        <Scanner 
          onScan={(code) => {
            setSearch(code);
            setIsScanning(false);
          }}
          onClose={() => setIsScanning(false)}
        />
      )}
    </div>
  );
};