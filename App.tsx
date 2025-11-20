import React, { useState, useEffect } from 'react';
import { AppState, Equipment, Transaction, User, EquipmentType, EquipmentStatus } from './types';
import { Dashboard } from './components/Dashboard';
import { StockManager } from './components/StockManager';
import { LayoutDashboard, PackageSearch, Settings } from 'lucide-react';

// Mock Initial Data
const INITIAL_STATE: AppState = {
  inventory: [
    { id: '1', type: EquipmentType.HELMET, size: 'M', barcode: 'CAS-001', status: EquipmentStatus.AVAILABLE, condition: 'Bon' },
    { id: '2', type: EquipmentType.JACKET, size: 'L', barcode: 'VES-042', status: EquipmentStatus.LOANED, assignedTo: 'u1', condition: 'Usé' },
    { id: '3', type: EquipmentType.BOOTS, size: '43', barcode: 'BOT-101', status: EquipmentStatus.AVAILABLE, condition: 'Neuf' },
    { id: '4', type: EquipmentType.GLOVES, size: '9', barcode: 'GAN-007', status: EquipmentStatus.DAMAGED, condition: 'Critique' },
    { id: '5', type: EquipmentType.HELMET, size: 'L', barcode: 'CAS-005', status: EquipmentStatus.AVAILABLE, condition: 'Neuf' },
  ],
  users: [
    { id: 'u1', matricule: 'SP-2934', name: 'Sgt. Dupont', rank: 'Sergent' },
    { id: 'u2', matricule: 'SP-1102', name: 'Cpl. Martin', rank: 'Caporal' },
    { id: 'u3', matricule: 'SP-4455', name: 'Sap. Leroy', rank: 'Sapeur' },
  ],
  transactions: []
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'stock' | 'settings'>('dashboard');
  const [state, setState] = useState<AppState>(INITIAL_STATE);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('firestock_state');
    if (saved) {
      setState(JSON.parse(saved));
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem('firestock_state', JSON.stringify(state));
  }, [state]);

  const handleTransaction = (newTrans: Transaction, newStatus: EquipmentStatus, assigneeId?: string) => {
    setState(prev => ({
      ...prev,
      inventory: prev.inventory.map(item => 
        item.id === newTrans.equipmentId 
          ? { ...item, status: newStatus, assignedTo: assigneeId } 
          : item
      ),
      transactions: [newTrans, ...prev.transactions]
    }));
  };

  const handleAddEquipment = (eq: Equipment) => {
    setState(prev => ({
      ...prev,
      inventory: [...prev.inventory, eq]
    }));
    setActiveTab('stock'); // Switch to list to see new item
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-fire-200">
      
      {/* Main Content Area */}
      <main className="max-w-md mx-auto h-screen bg-white shadow-2xl overflow-hidden relative">
        
        <div className="h-full overflow-y-auto no-scrollbar">
          {activeTab === 'dashboard' && <Dashboard state={state} />}
          {activeTab === 'stock' && (
            <StockManager 
              state={state} 
              onAddEquipment={handleAddEquipment}
              onTransaction={handleTransaction}
            />
          )}
          {activeTab === 'settings' && (
             <div className="p-6 flex flex-col items-center justify-center h-[80vh] text-slate-400">
               <Settings className="w-16 h-16 mb-4 opacity-20" />
               <h2 className="text-lg font-medium">Paramètres</h2>
               <p className="text-sm text-center mt-2">Configuration de la caserne et gestion des utilisateurs.</p>
               <button 
                onClick={() => { localStorage.removeItem('firestock_state'); window.location.reload(); }}
                className="mt-8 text-fire-600 text-sm underline"
               >
                 Réinitialiser les données démo
               </button>
             </div>
          )}
        </div>

        {/* Bottom Navigation Bar */}
        <nav className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-2 pb-safe flex justify-between items-center z-30">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
              activeTab === 'dashboard' ? 'text-fire-600 scale-105' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <LayoutDashboard className={`w-6 h-6 ${activeTab === 'dashboard' && 'fill-current'}`} strokeWidth={activeTab === 'dashboard' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Accueil</span>
          </button>

          <button 
            onClick={() => setActiveTab('stock')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
              activeTab === 'stock' ? 'text-fire-600 scale-105' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <PackageSearch className={`w-6 h-6 ${activeTab === 'stock' && 'fill-fire-100'}`} strokeWidth={activeTab === 'stock' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Stock</span>
          </button>

          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
              activeTab === 'settings' ? 'text-fire-600 scale-105' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Settings className="w-6 h-6" strokeWidth={activeTab === 'settings' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Options</span>
          </button>
        </nav>

      </main>

      {/* Styles for animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .animate-slide-up {
          animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom, 20px);
        }
      `}</style>
    </div>
  );
};

export default App;