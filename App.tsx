import React, { useState, useEffect } from 'react';
import { AppState, Equipment, Transaction, User, EquipmentType, EquipmentStatus } from './types';
import { Dashboard } from './components/Dashboard';
import { StockManager } from './components/StockManager';
import { Profile } from './components/Profile';
import { Login } from './components/Login';
import { LayoutDashboard, PackageSearch, Settings, UserCircle, RefreshCw } from 'lucide-react';
import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';

const INITIAL_STATE: AppState = {
  inventory: [],
  users: [],
  transactions: []
};

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'stock' | 'settings' | 'profile'>('dashboard');
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [loadingData, setLoadingData] = useState(false);

  // Auth Session Management
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) {
        await fetchUserProfile(session.user.id);
        await fetchUsersDirectory();
        await fetchSharedData(); // Chargement des données partagées
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        await fetchUserProfile(session.user.id);
        await fetchUsersDirectory();
        await fetchSharedData();
      } else {
        setCurrentUser(null);
        setState(INITIAL_STATE);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Récupération des données partagées (Inventaire + Transactions)
  const fetchSharedData = async () => {
    setLoadingData(true);
    try {
      // 1. Inventaire - Table corrigée
      const { data: equipmentData, error: eqError } = await supabase
        .from('armoire_equipment')
        .select('*');
      
      if (eqError) throw eqError;

      const inventory: Equipment[] = (equipmentData || []).map(e => ({
        id: e.id,
        type: e.type as EquipmentType,
        size: e.size,
        barcode: e.barcode,
        status: e.status as EquipmentStatus,
        condition: e.condition as any,
        assignedTo: e.assigned_to,
        imageUrl: e.image_url
      }));

      // 2. Transactions
      const { data: transData, error: trError } = await supabase
        .from('armoire_transactions')
        .select('*')
        .order('timestamp', { ascending: false });

      if (trError) throw trError;

      const transactions: Transaction[] = (transData || []).map(t => ({
        id: t.id,
        equipmentId: t.equipment_id,
        userId: t.user_id,
        type: t.type as 'OUT' | 'IN',
        timestamp: t.timestamp,
        reason: t.reason,
        note: t.note
      }));

      setState(prev => ({
        ...prev,
        inventory,
        transactions
      }));

    } catch (err) {
      console.error("Erreur chargement données partagées:", err);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchUserProfile = async (userId: string) => {
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
          role: data.role || 'pompier',
          email: session?.user.email
        };
        setCurrentUser(userProfile);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  const fetchUsersDirectory = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('nom', { ascending: true });

      if (data && !error) {
        const directory: User[] = data.map((p: any) => ({
          id: p.id,
          matricule: p.matricule || 'N/A',
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
  };

  // ACTIONS SUPABASE (Remplacement du LocalStorage)

  const handleTransaction = async (newTrans: Transaction, newStatus: EquipmentStatus, assigneeId?: string) => {
    // Mise à jour Optimiste UI
    setState(prev => ({
      ...prev,
      inventory: prev.inventory.map(item => 
        item.id === newTrans.equipmentId 
          ? { ...item, status: newStatus, assignedTo: assigneeId } 
          : item
      ),
      transactions: [newTrans, ...prev.transactions]
    }));

    // Écriture DB - Tables renommées
    try {
      await supabase.from('armoire_transactions').insert({
        id: newTrans.id,
        equipment_id: newTrans.equipmentId,
        user_id: newTrans.userId,
        type: newTrans.type,
        timestamp: newTrans.timestamp,
        reason: newTrans.reason,
        note: newTrans.note
      });

      await supabase.from('armoire_equipment').update({
        status: newStatus,
        assigned_to: assigneeId || null
      }).eq('id', newTrans.equipmentId);
    } catch (err) {
      console.error("Erreur transaction DB:", err);
      fetchSharedData(); // Rollback en cas d'erreur
    }
  };

  const handleAddEquipment = async (eq: Equipment) => {
    // UI Optimiste
    setState(prev => ({
      ...prev,
      inventory: [...prev.inventory, eq]
    }));
    setActiveTab('stock');

    // DB - Table corrigée
    try {
      await supabase.from('armoire_equipment').insert({
        id: eq.id,
        type: eq.type,
        size: eq.size,
        barcode: eq.barcode,
        status: eq.status,
        condition: eq.condition,
        assigned_to: eq.assignedTo,
        image_url: eq.imageUrl
      });
    } catch (err) {
      console.error("Erreur ajout DB:", err);
    }
  };

  const handleUpdateEquipment = async (updatedItem: Equipment) => {
    // UI Optimiste
    setState(prev => ({
      ...prev,
      inventory: prev.inventory.map(item => 
        item.id === updatedItem.id ? updatedItem : item
      )
    }));

    // DB - Table corrigée
    try {
      await supabase.from('armoire_equipment').update({
        type: updatedItem.type,
        size: updatedItem.size,
        barcode: updatedItem.barcode,
        status: updatedItem.status,
        condition: updatedItem.condition,
        assigned_to: updatedItem.assignedTo,
        image_url: updatedItem.imageUrl
      }).eq('id', updatedItem.id);
    } catch (err) {
      console.error("Erreur update DB:", err);
    }
  };

  const handleDeleteEquipment = async (itemId: string) => {
    // UI Optimiste
    setState(prev => ({
      ...prev,
      inventory: prev.inventory.filter(item => item.id !== itemId)
    }));

    // DB - Table corrigée
    try {
      await supabase.from('armoire_equipment').delete().eq('id', itemId);
    } catch (err) {
      console.error("Erreur delete DB:", err);
    }
  };

  if (!session) {
    return <Login />;
  }

  return (
    <div className="h-full w-full bg-slate-50 font-sans text-slate-900 selection:bg-fire-200 flex justify-center">
      <main className="w-full max-w-md h-full bg-white shadow-2xl overflow-hidden flex flex-col relative">
        <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar relative w-full bg-slate-50/50">
          {loadingData && (
            <div className="absolute top-0 left-0 w-full h-1 bg-slate-100 overflow-hidden z-50">
               <div className="h-full bg-fire-500 animate-pulse w-1/3 mx-auto"></div>
            </div>
          )}
          
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
               <p className="text-sm text-center mt-2">Données synchronisées via Supabase.</p>
               
               <button 
                 onClick={fetchSharedData}
                 className="mt-6 px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm text-sm text-slate-600 flex items-center gap-2 active:scale-95 transition-transform"
               >
                 <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
                 Forcer la synchronisation
               </button>

               {currentUser?.role === 'admin' && (
                 <div className="mt-6 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold">
                    Panneau Administrateur Actif
                 </div>
               )}
               
               <div className="mt-8 text-[10px] text-slate-300 text-center">
                 Version PWA 1.1 • Connecté au Cloud
               </div>
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