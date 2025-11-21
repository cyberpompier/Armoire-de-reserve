import React, { useState } from 'react';
import { AppState, Equipment, EquipmentType, EquipmentStatus, Transaction, User } from '../types';
import { ScannerAI } from './ScannerAI';
import { BarcodeScanner } from './BarcodeScanner';
import { StockHeader } from './StockHeader';
import { StockList } from './StockList';
import { AddItemModal } from './AddItemModal';
import { ActionModal } from './ActionModal';

interface StockManagerProps {
  state: AppState;
  currentUser: User | null;
  onAddEquipment: (eq: Equipment) => void;
  onUpdateEquipment: (eq: Equipment) => void;
  onDeleteEquipment: (itemId: string) => void;
  onTransaction: (trans: Transaction, newStatus: EquipmentStatus, assignee?: string) => void;
}

export const StockManager: React.FC<StockManagerProps> = ({ state, currentUser, onAddEquipment, onUpdateEquipment, onDeleteEquipment, onTransaction }) => {
  const [filter, setFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [showScanner, setShowScanner] = useState(false); // AI Scanner
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false); // Barcode Scanner
  
  const [selectedItem, setSelectedItem] = useState<Equipment | null>(null);
  const [editingItem, setEditingItem] = useState<Equipment | null>(null); // Item being edited
  const [showActionModal, setShowActionModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

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
      setShowActionModal(true);
    } else {
      alert(`Équipement introuvable avec le code : ${code}`);
      setShowBarcodeScanner(false);
      setSearch(code);
    }
  };

  const handleAction = (action: 'LOAN' | 'RETURN', userId?: string, reason?: string, note?: string) => {
    if (!selectedItem) return;

    const transaction: any = {
      id: Date.now().toString(),
      equipmentId: selectedItem.id,
      userId: action === 'LOAN' && userId ? userId : (selectedItem.assignedTo || 'SYSTEM'),
      type: action === 'LOAN' ? 'OUT' : 'IN',
      timestamp: Date.now(),
      note: note?.trim(),
      reason: action === 'LOAN' ? reason : undefined
    };

    const newStatus = action === 'LOAN' ? EquipmentStatus.LOANED : EquipmentStatus.AVAILABLE;
    onTransaction(transaction, newStatus, action === 'LOAN' ? userId : undefined);
    setShowActionModal(false);
    setSelectedItem(null);
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

      <StockHeader 
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        onScanClick={() => setShowBarcodeScanner(true)}
        onAddClick={() => {
          setEditingItem(null); // Ensure we are in Add mode
          setShowAddModal(true);
        }}
      />

      <StockList 
        items={filteredItems}
        users={state.users}
        onItemClick={(item) => {
          setSelectedItem(item);
          setShowActionModal(true);
        }}
      />

      {showAddModal && (
        <AddItemModal 
          onClose={() => {
            setShowAddModal(false);
            setEditingItem(null);
          }}
          onAdd={onAddEquipment}
          onUpdate={onUpdateEquipment}
          onDelete={onDeleteEquipment}
          initialItem={editingItem}
          onScanRequest={() => setShowScanner(true)}
        />
      )}

      {showActionModal && (
        <ActionModal 
          isOpen={showActionModal}
          onClose={() => setShowActionModal(false)}
          item={selectedItem}
          currentUser={currentUser}
          users={state.users}
          transactions={state.transactions}
          onAction={handleAction}
          onEdit={(item) => {
            setShowActionModal(false); // Close view modal
            setSelectedItem(null);
            setEditingItem(item); // Set item to edit
            setShowAddModal(true); // Open edit modal (which is AddItemModal)
          }}
        />
      )}
    </div>
  );
};