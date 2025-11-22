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

  const fetchInitialData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const [usersRes, inventoryRes, transactionsRes] = await Promise.all([
        supabase.from('profiles').select('*').order('nom', { ascending: true }),
        supabase.from('armoire_equipment').select('*'),
        supabase.from('armoire_transactions').select('*').order('timestamp', { ascending: false })
      ]);

      if (usersRes.error) throw usersRes.error;
      if (inventoryRes.error) throw inventoryRes.error;
      if (transactionsRes.error) throw transactionsRes.error;

      const directory: User[] = usersRes.data.map((p: any) => ({
        id: p.id,
        matricule: p.matricule || 'N/A',
        name: `${p.nom?.toUpperCase() || ''} ${p.prenom || ''}`.trim() || 'Utilisateur Inconnu',
        rank: p.grade || '',
        role: p.role || 'pompier',
        email: p.email
      }));

      setState({
        users: directory,
        inventory: inventoryRes.data as Equipment[],
        transactions: transactionsRes.data as Transaction[]
      });

    } catch (e) {
      console.error("Erreur lors du chargement des données initiales:", e);
      showError("Erreur de chargement des données");
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  const fetchUserProfile = useCallback(async (userId: string, email?: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data && !error) {
        const userProfile: User = {
          id: userId,
          email: email,
          matricule: data.matricule || 'N/A',
          name: `${data.nom?.toUpperCase() || ''} ${data.prenom || ''}`.trim() || 'Utilisateur',
          rank: data.grade || 'Sapeur',
          role: data.role || 'pompier'
        };
        setCurrentUser(userProfile);
      } else {
         // Create a fallback profile if none exists
         setCurrentUser({ id: userId, email: email, name: 'Nouvel Utilisateur', rank: '', role: 'pompier' });
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  }, []);

  // --- Auth Session Management ---
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        await fetchUserProfile(session.user.id, session.user.email);
        await fetchInitialData();
      } else {
        setCurrentUser(null);
        setState(INITIAL_STATE); // Clear state on logout
      }
    });

    // Initial load
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            setSession(session)
            fetchUserProfile(session.user.id, session.user.email);
            fetchInitialData();
        }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserProfile, fetchInitialData]);

  // --- CRUD Operations (Efficient State Updates) ---

  const handleTransaction = async (newTrans: Transaction, newStatus: EquipmentStatus, assigneeId?: string) => {
    const loadingToastId = showLoading(`Enregistrement...`);
    try {
      // 1. Update Equipment in DB and get the updated record back
      const { data: updatedEquipment, error: updateError } = await supabase
        .from('armoire_equipment')
        .update({ 
          status: newStatus, 
          assignedTo: newStatus === EquipmentStatus.LOANED ? assigneeId : null,
          lastInspection: new Date().toISOString()
        })
        .eq('id', newTrans.equipmentId)
        .select()
        .single();

      if (updateError) throw updateError;

      // 2. Insert Transaction record
      const { error: transError } = await supabase.from('armoire_transactions').insert({
        id: newTrans.id,
        equipmentId: newTrans.equipmentId,
        userId: newTrans.userId,
        type: newTrans.type,
        timestamp: new Date(newTrans.timestamp).toISOString(),
        note: newTrans.note,
        reason: (newTrans as any).reason,
      });

      if (transError) throw transError;

      // 3. Update local state efficiently
      setState(prevState => ({
        ...prevState,
        inventory: prevState.inventory.map(item => 
          item.id === newTrans.equipmentId ? updatedEquipment as Equipment : item
        ),
        transactions: [newTrans, ...prevState.transactions] // Add to top of the list
      }));
      
      dismissToast(loadingToastId);
      showSuccess(`Opération réussie !`);
    } catch (error: any) {
      dismissToast(loadingToastId);
      showError(`Erreur: ${error.message}`);
      throw error;
    }
  };

  const handleAddEquipment = async (eq: Equipment) => {
    const loadingToastId = showLoading("Ajout de l'équipement...");
    try {
      const { data: existing, error: checkError } = await supabase
        .from('armoire_equipment').select('id').eq('barcode', eq.barcode).maybeSingle();
      if (checkError) throw checkError;
      if (existing) throw new Error("Ce code-barres existe déjà.");

      const { data: newEquipment, error: insertError } = await supabase
        .from('armoire_equipment')
        .insert(eq)
        .select()
        .single();

      if (insertError) throw insertError;

      setState(prevState => ({
        ...prevState,
        inventory: [...prevState.inventory, newEquipment as Equipment]
      }));

      dismissToast(loadingToastId);
      showSuccess(`Équipement ajouté.`);
    } catch (error: any) {
      dismissToast(loadingToastId);
      showError(`Erreur: ${error.message}`);
      throw error;
    }
  };

  const handleUpdateEquipment = async (updatedItem: Equipment) => {
    const loadingToastId = showLoading("Mise à jour...");
    try {
      const { data: returnedItem, error } = await supabase
        .from('armoire_equipment')
        .update(updatedItem)
        .eq('id', updatedItem.id)
        .select()
        .single();

      if (error) throw error;

      setState(prevState => ({
        ...prevState,
        inventory: prevState.inventory.map(item => 
          item.id === updatedItem.id ? returnedItem as Equipment : item
        )
      }));

      dismissToast(loadingToastId);
      showSuccess(`Équipement mis à jour.`);
    } catch (error: any) {
      dismissToast(loadingToastId);
      showError(`Erreur: ${error.message}`);
      throw error;
    }
  };

  const handleDeleteEquipment = async (itemId: string) => {
    const loadingToastId = showLoading("Suppression...");
    try {
      const { error } = await supabase.from('armoire_equipment').delete().eq('id', itemId);
      if (error) throw error;

      setState(prevState => ({
        ...prevState,
        inventory: prevState.inventory.filter(item => item.id !== itemId)
      }));

      dismissToast(loadingToastId);
      showSuccess("Équipement supprimé.");
    } catch (error: any) {
      dismissToast(loadingToastId);
      showError(`Erreur: ${error.message}`);
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