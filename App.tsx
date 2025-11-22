import React, { useState, useEffect, useCallback } from 'react';
import { AppState, Equipment, Transaction, User, EquipmentType, EquipmentStatus } from './types';
import { Dashboard } from './components/Dashboard';
import { StockManager } from './components/StockManager';
import { Profile } from './components/Profile';
import { Login } from './components/Login';
import { LayoutDashboard, PackageSearch, Settings, UserCircle } from 'lucide-react';
import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';
import { ToastProvider } from './components/ToastProvider';
import { showSuccess, showError, showLoading, dismissToast } from './utils/toast';

// Mock Initial Data (utilisé uniquement si pas de données)
const INITIAL_STATE: AppState = {
  inventory: [], // Start empty, data will be fetched from Supabase
  users: [],
  transactions: [] // Start empty, data will be fetched from Supabase
};

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'stock' | 'settings' | 'profile'>('dashboard');
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // --- Data Fetching Functions ---

  // Récupère TOUS les profils pour peupler les listes déroulantes
  const fetchUsersDirectory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('nom', { ascending: true });

      if (data && !error) {
        const directory: User[] = data.map((p: any) => ({
          id: p.id,
          matricule: p.matricule || 'N/A',
          // Formatage : NOM Prénom
          name: `${p.nom?.toUpperCase() || ''} ${p.prenom || ''}`.trim() || 'Utilisateur Inconnu',
          rank: p.grade || '',
          role: p.role || 'pompier'
        }));

        setState(prev => ({
          ...prev,
          users: directory
        }));
      }
    } catch (e) {
      console.error("Erreur chargement annuaire:", e);
    }
  }, []);

  // Récupère l'inventaire et les transactions
  const fetchInventoryAndTransactions = useCallback(async () => {
    setIsLoadingData(true);
    try {
      // Fetch Inventory
      const { data: inventoryData, error: invError } = await supabase
        .from('armoire_equipment')
        .select('*');
      
      if (invError) throw invError;

      // Fetch Transactions
      const { data: transactionData, error: transError } = await supabase
        .from('armoire_transactions')
        .select('*')
        .order('timestamp', { ascending: false });

      if (transError) throw transError;

      setState(prev => ({
        ...prev,
        inventory: inventoryData as Equipment[],
        transactions: transactionData as Transaction[]
      }));

    } catch (e) {
      console.error("Erreur lors du chargement des données:", e);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  // Récupère le profil de l'utilisateur connecté
  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data && !error) {
        const userProfile: User = {
          id: userId,
          matricule: data.matricule || 'N/A',
          name: `${data.nom?.toUpperCase() || ''} ${data.prenom || ''}`.trim() || 'Utilisateur',
          rank: data.grade || 'Sapeur',
          role: data.role || 'pompier'
        };
        setCurrentUser(userProfile);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  }, []);

  // --- Auth Session Management ---
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) {
        await fetchUserProfile(session.user.id);
        await fetchUsersDirectory();
        await fetchInventoryAndTransactions();
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        await fetchUserProfile(session.user.id);
        await fetchUsersDirectory();
        await fetchInventoryAndTransactions();
      } else {
        setCurrentUser(null);
        setState(INITIAL_STATE); // Clear state on logout
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserProfile, fetchUsersDirectory, fetchInventoryAndTransactions]);

  // --- CRUD Operations (Supabase) ---

  const handleTransaction = async (newTrans: Transaction, newStatus: EquipmentStatus, assigneeId?: string) => {
    if (!currentUser) return;
    
    const loadingToastId = showLoading(`Enregistrement de la ${newTrans.type === 'OUT' ? 'sortie' : 'retour'}...`);

    try {
      // 1. Update Equipment Status
      const { error: updateError } = await supabase
        .from('armoire_equipment')
        .update({ 
          status: newStatus, 
          assignedTo: assigneeId || null,
          lastInspection: new Date().toISOString() // Mark as inspected/handled
        })
        .eq('id', newTrans.equipmentId);

      if (updateError) throw updateError;

      // 2. Insert Transaction Record
      const { error: transError } = await supabase
        .from('armoire_transactions')
        .insert({
          id: newTrans.id,
          equipmentId: newTrans.equipmentId,
          userId: currentUser.id, // Use current user ID for transaction logging
          type: newTrans.type,
          timestamp: newTrans.timestamp,
          note: newTrans.note,
          reason: (newTrans as any).reason,
        });

      if (transError) throw transError;

      // 3. Update local state (optimistic update or re-fetch)
      await fetchInventoryAndTransactions();
      
      dismissToast(loadingToastId);
      showSuccess(`Opération réussie : ${newTrans.type === 'OUT' ? 'Équipement sorti' : 'Équipement retourné'}.`);

    } catch (error: any) {
      dismissToast(loadingToastId);
      console.error("Erreur lors de la transaction:", error);
      showError(`Erreur lors de l'enregistrement de la transaction: ${error.message || 'Inconnue'}`);
      throw error; // Re-throw to notify modal/component
    }
  };

  const handleAddEquipment = async (eq: Equipment) => {
    const loadingToastId = showLoading("Ajout de l'équipement...");
    try {
      const { error } = await supabase
        .from('armoire_equipment')
        .insert({
          id: eq.id,
          type: eq.type,
          size: eq.size,
          barcode: eq.barcode,
          status: eq.status,
          condition: eq.condition,
          imageUrl: eq.imageUrl,
          lastInspection: new Date().toISOString()
        });

      if (error) throw error;
      
      // Update local state
      await fetchInventoryAndTransactions();
      dismissToast(loadingToastId);
      showSuccess(`Équipement ${eq.type} ajouté avec succès.`);
    } catch (error: any) {
      dismissToast(loadingToastId);
      console.error("Erreur lors de l'ajout de l'équipement:", error);
      showError(`Erreur: Le code-barres est peut-être déjà utilisé. (${error.message || 'Inconnue'})`);
      throw error;
    }
  };

  const handleUpdateEquipment = async (updatedItem: Equipment) => {
    const loadingToastId = showLoading("Mise à jour de l'équipement...");
    try {
      const { error } = await supabase
        .from('armoire_equipment')
        .update({
          type: updatedItem.type,
          size: updatedItem.size,
          barcode: updatedItem.barcode,
          status: updatedItem.status,
          condition: updatedItem.condition,
          assignedTo: updatedItem.assignedTo || null,
          lastInspection: new Date().toISOString()
        })
        .eq('id', updatedItem.id);

      if (error) throw error;

      // Update local state
      await fetchInventoryAndTransactions();
      dismissToast(loadingToastId);
      showSuccess(`Équipement ${updatedItem.type} mis à jour.`);
    } catch (error: any) {
      dismissToast(loadingToastId);
      console.error("Erreur lors de la mise à jour de l'équipement:", error);
      showError(`Erreur lors de la mise à jour: ${error.message || 'Inconnue'}`);
      throw error;
    }
  };

  const handleDeleteEquipment = async (itemId: string) => {
    const loadingToastId = showLoading("Suppression de l'équipement...");
    try {
      const { error } = await supabase
        .from('armoire_equipment')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      // Update local state
      await fetchInventoryAndTransactions();
      dismissToast(loadingToastId);
      showSuccess("Équipement supprimé avec succès.");
    } catch (error: any) {
      dismissToast(loadingToastId);
      console.error("Erreur lors de la suppression de l'équipement:", error);
      showError(`Erreur lors de la suppression: ${error.message || 'Inconnue'}`);
      throw error;
    }
  };

  if (!session) {
    return <Login />;
  }
  
  if (isLoadingData) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center text-slate-500">
          <LayoutDashboard className="w-8 h-8 animate-pulse mb-2" />
          <p className="text-sm font-medium">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-slate-50 font-sans text-slate-900 selection:bg-fire-200 flex justify-center">
      <ToastProvider />
      <main className="w-full max-w-md h-full bg-white shadow-2xl overflow-hidden flex flex-col relative">
        <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar relative w-full bg-slate-50/50">
          {activeTab === 'dashboard' && <Dashboard state={state} />}
          {activeTab === 'stock' && (
            <StockManager 
              state={state} 
              currentUser={currentUser}
              onAddEquipment={handleAddEquipment}
              onUpdateEquipment={handleUpdateEquipment}
              onDeleteEquipment={handleDeleteEquipment}
              onTransaction={handleTransaction}
            />
          )}
          {activeTab === 'profile' && <Profile session={session} />}
          {activeTab === 'settings' && (
             <div className="p-6 flex flex-col items-center justify-center min-h-full text-slate-400">
               <Settings className="w-16 h-16 mb-4 opacity-20" />
               <h2 className="text-lg font-medium">Paramètres</h2>
               <p className="text-sm text-center mt-2">Configuration de la caserne.</p>
               {currentUser?.role === 'admin' && (
                 <div className="mt-4 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold">
                    Panneau Administrateur Actif
                 </div>
               )}
               <button 
                onClick={() => { 
                  // No longer needed as data is in Supabase, but keep for local cache reset if needed
                  localStorage.removeItem('firestock_state'); 
                  window.location.reload(); 
                }}
                className="mt-8 text-fire-600 text-sm underline"
               >
                 Réinitialiser cache local
               </button>
             </div>
          )}
        </div>

        <nav className="shrink-0 bg-white border-t border-slate-100 px-6 py-2 pb-safe flex justify-between items-center z-30 w-full shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
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
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
              activeTab === 'profile' ? 'text-fire-600 scale-105' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <UserCircle className={`w-6 h-6 ${activeTab === 'profile' && 'fill-current'}`} strokeWidth={activeTab === 'profile' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Profil</span>
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
      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 20px); }
      `}</style>
    </div>
  );
};

export default App;