import React, { useState, useMemo } from 'react';
import { AppState, Equipment, Transaction, User, EquipmentStatus, EquipmentType } from '../types';
import { StockHeader } from './StockHeader';
import { EquipmentList } from './EquipmentList';
import { AddItemModal } from './AddItemModal';
import { BarcodeScanner } from './BarcodeScanner';
import { ScannerAI } from './ScannerAI';

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
  const [isScanning, setIsScanning] = useState(false); // Scanner Code-barres (Recherche)
  const [isAiScanning, setIsAiScanning] = useState(false); // Scanner IA (Ajout)
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<Equipment | null>(null);
  
  // Stocke les données trouvées par l'IA pour pré-remplir le formulaire
  const [aiDraftItem, setAiDraftItem] = useState<Equipment | null>(null);

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

  const handleAiIdentified = (type: EquipmentType, condition: string) => {
    // Création d'un objet temporaire avec les infos de l'IA
    const draft: Equipment = {
      id: '',
      type: type,
      condition: condition as any, // Cast car string vs literal type
      status: EquipmentStatus.AVAILABLE,
      size: 'L', // Valeur par défaut
      barcode: '',
      imageUrl: ''
    };
    setAiDraftItem(draft);
    setIsAiScanning(false);
    setIsAdding(true); // Réouverture du modal d'ajout
  };

  const handleOpenAdd = () => {
    setAiDraftItem(null);
    setIsAdding(true);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50/50">
      <StockHeader 
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        onScanClick={() => setIsScanning(true)}
        onAddClick={handleOpenAdd}
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

      {/* Modal d'Ajout (Nouveau ou après scan IA) */}
      {isAdding && (
        <AddItemModal 
          onClose={() => setIsAdding(false)}
          onAdd={(item) => {
            onAddEquipment(item);
            setIsAdding(false);
          }}
          onScanRequest={() => {
            setIsAdding(false);
            setIsAiScanning(true);
          }}
          initialItem={aiDraftItem}
        />
      )}

      {/* Modal d'Édition */}
      {editingItem && (
        <AddItemModal 
          initialItem={editingItem}
          onClose={() => setEditingItem(null)}
          onAdd={() => {}} // Non utilisé en mode édition
          onUpdate={(item) => {
            onUpdateEquipment(item);
            setEditingItem(null);
          }}
          onDelete={(id) => {
            onDeleteEquipment(id);
            setEditingItem(null);
          }}
          onScanRequest={() => {}} // Pas de scan en mode édition
        />
      )}

      {/* Scanner Code-barres pour la recherche */}
      {isScanning && (
        <BarcodeScanner 
          onScan={(code) => {
            setSearch(code);
            setIsScanning(false);
          }}
          onClose={() => setIsScanning(false)}
        />
      )}

      {/* Scanner IA pour l'identification d'équipement */}
      {isAiScanning && (
        <ScannerAI 
          onClose={() => setIsAiScanning(false)}
          onIdentified={handleAiIdentified}
        />
      )}
    </div>
  );
};