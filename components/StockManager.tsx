import React, { useState } from 'react';
import { AppState, Equipment, EquipmentStatus, Transaction, User } from '../types';
import { BarcodeScanner } from './BarcodeScanner';
import { StockHeader } from './StockHeader';
import { StockList } from './StockList';
import { AddItemModal } from './AddItemModal';
import { ActionModal } from './ActionModal';

interface StockManagerProps {
  state: AppState;
  currentUser: User | null;
  onAddEquipment: (eq: Equipment, pairBarcode?: string) => Promise<void>;
  onUpdateEquipment: (eq: Equipment, pairBarcode?: string) => Promise<void>;
  onDeleteEquipment: (itemId: string) => Promise<void>;
  onTransaction: (trans: Transaction[], newStatus: EquipmentStatus, assignee?: string) => Promise<void>;
}

export const StockManager: React.FC<StockManagerProps> = ({ state, currentUser, onAddEquipment, onUpdateEquipment, onDeleteEquipment, onTransaction }) => {
  const [filter, setFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanTarget, setScanTarget] = useState<'search' | 'form'>('search');
  const [barcodeForForm, setBarcodeForForm] = useState<string | null>(null);
  
  const [selectedItems, setSelectedItems] = useState<Equipment[] | null>(null);
  const [editingItem, setEditingItem] = useState<Equipment | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isClosingForScan, setIsClosingForScan] = useState(false);

  const filteredItems = state.inventory.filter(item => {
    const matchesFilter = filter === 'ALL' || item.status === filter;
    const searchLower = search.toLowerCase();
    const assignedUserName = item.assignedTo ? state.users.find(u => u.id === item.assignedTo)?.name.toLowerCase() : '';
    
    const matchesSearch = item.type.toLowerCase().includes(searchLower) || 
                          item.barcode.toLowerCase().includes(searchLower) || 
                          (assignedUserName && assignedUserName.includes(searchLower));
    return matchesFilter && matchesSearch;
  });

  const handleScan = (code: string) => {
    setIsScanning(false);
    if (scanTarget === 'form') {
      setBarcodeForForm(code);
      setShowAddModal(true);
    } else {
      const scannedItem = state.inventory.find(item => item.barcode === code);
      
      if (scannedItem) {
        let itemsToSelect = [scannedItem];
        if (scannedItem.pairId) {
          const pairedItem = state.inventory.find(item => item.id === scannedItem.pairId);
          if (pairedItem) {
            itemsToSelect.push(pairedItem);
          }
        }
        setSelectedItems(itemsToSelect);
        setShowActionModal(true);
      } else {
        alert(`Équipement introuvable avec le code : ${code}`);
        setSearch(code);
      }
    }
  };

  const handleAction = async (action: 'LOAN' | 'RETURN', userId?: string, reason?: string, note?: string) => {
    if (!selectedItems || !currentUser) return;

    const transactions: Transaction[] = selectedItems.map(item => {
      const transactionUserId = action === 'LOAN' 
        ? userId || currentUser.id 
        : item.assignedTo || currentUser.id;
      
      return {
        id: crypto.randomUUID(),
        equipmentId: item.id,
        userId: transactionUserId,
        type: action === 'LOAN' ? 'OUT' : 'IN',
        timestamp: Date.now(),
        note: note?.trim(),
        reason: action === 'LOAN' ? reason : undefined
      };
    });

    const newStatus = action === 'LOAN' ? EquipmentStatus.LOANED : EquipmentStatus.AVAILABLE;
    await onTransaction(transactions, newStatus, action === 'LOAN' ? userId : undefined);
    
    setShowActionModal(false);
    setSelectedItems(null);
  };

  const handleModalClose = () => {
    setShowAddModal(false);
    setBarcodeForForm(null);
    if (!isClosingForScan) {
      setEditingItem(null);
    }
    setIsClosingForScan(false);
  };

  return (
    <div className="pb-6 animate-fade-in">
      {isScanning && (
        <BarcodeScanner
          onClose={() => setIsScanning(false)}
          onScan={handleScan}
        />
      )}

      <StockHeader 
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        onScanClick={() => {
          setScanTarget('search');
          setIsScanning(true);
        }}
        onAddClick={() => { setEditingItem(null); setShowAddModal(true); }}
        userRole={currentUser?.role}
      />

      <StockList 
        items={filteredItems}
        users={state.users}
        onItemClick={(item) => {
          let itemsToSelect = [item];
          if (item.pairId) {
            const pairedItem = state.inventory.find(i => i.id === item.pairId);
            if (pairedItem) itemsToSelect.push(pairedItem);
          }
          setSelectedItems(itemsToSelect);
          setShowActionModal(true);
        }}
      />

      {showAddModal && (
        <AddItemModal 
          onClose={handleModalClose}
          onAdd={onAddEquipment}
          onUpdate={onUpdateEquipment}
          onDelete={onDeleteEquipment}
          initialItem={editingItem}
          initialBarcode={barcodeForForm}
          onScanRequest={() => {
            if (editingItem) {
              setIsClosingForScan(true);
            }
            setScanTarget('form');
            setIsScanning(true);
          }}
          inventory={state.inventory}
        />
      )}

      {showActionModal && (
        <ActionModal 
          isOpen={showActionModal}
          onClose={() => setShowActionModal(false)}
          items={selectedItems}
          currentUser={currentUser}
          users={state.users}
          transactions={state.transactions}
          onAction={handleAction}
          onEdit={(item) => {
            setShowActionModal(false);
            setSelectedItems(null);
            setEditingItem(item);
            setShowAddModal(true);
          }}
        />
      )}
    </div>
  );
};