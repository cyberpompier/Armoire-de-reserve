import React, { useState, useEffect } from 'react';
import { AppState, Equipment, Transaction, User, EquipmentType, EquipmentStatus } from './types';
import { Dashboard } from './components/Dashboard';
import { StockManager } from './components/StockManager';
import { Profile } from './components/Profile';
import { Login } from './components/Login';
import { LayoutDashboard, PackageSearch, Settings, UserCircle } from 'lucide-react';
import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';

// Mock Initial Data (utilisé uniquement si pas de données)
const INITIAL_STATE: AppState = {
  inventory: [
    { id: '1', type: EquipmentType.HELMET, size: 'M', barcode: 'CAS-001', status: EquipmentStatus.AVAILABLE, condition: 'Bon' },
    { id: '2', type: EquipmentType.JACKET, size: 'L', barcode: 'VES-042', status: EquipmentStatus.LOANED, assignedTo: 'u1', condition: 'Usé' },
    { id: '3', type: EquipmentType.BOOTS, size: '43', barcode: 'BOT-101', status: EquipmentStatus.AVAILABLE, condition: 'Neuf' },
    { id: '4', type: EquipmentType.GLOVES, size: '9', barcode: 'GAN-007', status: EquipmentStatus.DAMAGED, condition: 'Critique' },
    { id: '5', type: EquipmentType.HELMET, size: 'L', barcode: 'CAS-005', status: EquipmentStatus.AVAILABLE, condition: 'Neuf' },
  ],
  users: [],
  transactions: []
};

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'stock' | 'settings' | 'profile'>('dashboard');
  const [state, setState] = useState<AppState>(INITIAL_STATE);

  // Auth Session Management
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) {
        await fetchUserProfile(session.user.id);
        await fetchUsersDirectory(); // Récupérer tous les utilisateurs pour les listes
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        await fetchUserProfile(session.user.id);
        await fetchUsersDirectory();
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Récupère le profil de l'utilisateur connecté
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
          role: data.role || 'USER'
        };
        setCurrentUser(userProfile);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  // Récupère TOUS les profils pour peupler les listes déroulantes
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
          // Formatage : NOM Prénom
          name: `${p.nom?.toUpperCase() || ''} ${p.prenom || ''}`.trim() || 'Utilisateur Inconnu',
          rank: p.grade || '',
          role: p.role || 'USER'
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

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('firestock_state');
    if (saved) {
      const parsed = JSON.parse(saved);
      // On garde les users chargés depuis la BDD s'ils sont vides dans le storage
      setState(prev => ({ ...parsed, users: prev.users.length ? prev.users : parsed.users }));
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
    setActiveTab('stock');
  };

  const handleUpdateEquipment = (updatedItem: Equipment) => {
    setState(prev => ({
      ...prev,
      inventory: prev.inventory.map(item => item.id === updatedItem.id ? updatedItem : item)
    }));
  };

  const handleDeleteEquipment = (itemId: string) => {
    setState(prev => ({
      ...prev,
      inventory: prev.inventory.filter(item => item.id !== itemId)
    }));
  };

  if (!session) {
    return <Login />;
  }

  return (
    <div className="h-full w-full bg-slate-50 font-sans text-slate-900 selection:bg-fire-200 flex justify-center">
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
          {activeTab === 'profile' && <Profile />}
          {activeTab === 'settings' && (
             <div className="p-6 flex flex-col items-center justify-center min-h-full text-slate-400">
               <Settings className="w-16 h-16 mb-4 opacity-20" />
               <h2 className="text-lg font-medium">Paramètres</h2>
               <p className="text-sm text-center mt-2">Configuration de la caserne.</p>
               {currentUser?.role === 'ADMIN' && (
                 <div className="mt-4 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold">
                    Panneau Administrateur Actif
                 </div>
               )}
               <button 
                onClick={() => { localStorage.removeItem('firestock_state'); window.location.reload(); }}
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