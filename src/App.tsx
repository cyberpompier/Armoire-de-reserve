import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast'; 
import { AppState, Equipment, Transaction, User, EquipmentType, EquipmentStatus } from './types';
import { Dashboard } from './components/Dashboard';
import { StockManager } from './components/StockManager';
import { Profile } from './components/Profile';
import { Login } from './components/Login';
import { LayoutDashboard, PackageSearch, Settings, UserCircle, Mail } from 'lucide-react';
import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';
import { ToastProvider } from './components/ToastProvider';
import { showSuccess, showError, showLoading, dismissToast } from './utils/toast';
import { generateMailtoLink, sendTransactionNotification } from './services/notificationService';

const INITIAL_STATE: AppState = { inventory: [], users: [], transactions: [] };

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'stock' | 'profile'>('dashboard');
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isProfileIncomplete, setIsProfileIncomplete] = useState(false);

  // Charge les données globales (Stock, Historique, Annuaire)
  const fetchInitialData = useCallback(async () => {
    try {
      const [usersRes, inventoryRes, transactionsRes] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('armoire_equipment').select('*'),
        supabase.from('armoire_transactions').select('*').order('timestamp', { ascending: false })
      ]);

      if (inventoryRes.error) {
        console.error("Erreur chargement inventaire:", inventoryRes.error);
      }
      
      const directory: User[] = (usersRes.data || []).map((p: any) => ({
        id: p.id, 
        name: `${p.nom?.toUpperCase() || ''} ${p.prenom || ''}`.trim() || 'Utilisateur',
        rank: p.grade || '', 
        role: p.role || 'pompier', 
        email: p.email
      }));

      setState({
        users: directory,
        inventory: (inventoryRes.data || []) as Equipment[],
        transactions: (transactionsRes.data || []) as Transaction[]
      });
    } catch (e: any) {
      console.error("Erreur fetchInitialData:", e);
    }
  }, []);

  // Charge ET répare le profil utilisateur courant
  const fetchUserProfile = useCallback(async (userId: string, email?: string) => {
    try {
      let { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

      // Si le profil n'existe pas (Erreur PGRST116 ou null), on le crée
      if (!data || (error && error.code === 'PGRST116')) {
        console.log("Profil manquant, création automatique...");
        const newProfile = {
          id: userId,
          email: email,
          role: 'pompier',
          updated_at: new Date().toISOString()
        };
        
        const { error: insertError } = await supabase.from('profiles').insert(newProfile);
        if (insertError) {
          console.error("Erreur création profil:", insertError);
        } else {
          data = newProfile;
        }
      }

      if (data) {
        // Vérification de la complétude du profil
        const isIncomplete = !data.nom || !data.prenom || !data.grade;
        setIsProfileIncomplete(isIncomplete);
        
        setCurrentUser({
          id: userId, 
          email: email, 
          name: `${data.nom?.toUpperCase() || ''} ${data.prenom || ''}`.trim() || 'Utilisateur',
          rank: data.grade || 'Sapeur', 
          role: data.role || 'pompier'
        });
      } else {
        setIsProfileIncomplete(true);
        setCurrentUser({ id: userId, email, name: 'Utilisateur', rank: '', role: 'pompier' });
      }
    } catch (err) {
      console.error("Erreur fetchUserProfile:", err);
      // En cas d'erreur critique, on laisse l'utilisateur entrer mais en mode "Profil incomplet"
      setIsProfileIncomplete(true);
      setCurrentUser({ id: userId, email, name: 'Utilisateur', rank: '', role: 'pompier' });
    }
  }, []);

  // Gestion de la session et du démarrage
  useEffect(() => {
    let mounted = true;

    const initApp = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(session);
          if (session) {
            await fetchUserProfile(session.user.id, session.user.email);
            await fetchInitialData();
          }
        }
      } catch (error) {
        console.error("Erreur initialisation:", error);
      } finally {
        if (mounted) setIsLoadingData(false);
      }
    };

    initApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (mounted) {
        setSession(session);
        if (session) {
          setIsLoadingData(true);
          await fetchUserProfile(session.user.id, session.user.email);
          await fetchInitialData();
          setIsLoadingData(false);
        } else {
          setCurrentUser(null);
          setState(INITIAL_STATE);
          setIsProfileIncomplete(false);
          setIsLoadingData(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile, fetchInitialData]);

  const handleTransaction = async (transactions: Transaction[], newStatus: EquipmentStatus, assigneeId?: string) => {
    const loadingToastId = showLoading("Enregistrement...");
    try {
      const equipmentIds = transactions.map(t => t.equipmentId);
      
      const { data: updatedItems, error: updateError } = await supabase
        .from('armoire_equipment')
        .update({ status: newStatus, assignedTo: newStatus === EquipmentStatus.LOANED ? assigneeId : null })
        .in('id', equipmentIds)
        .select();
      if (updateError) throw updateError;

      const transactionData = transactions.map(t => ({ ...t, timestamp: new Date(t.timestamp).toISOString() }));
      const { error: transError } = await supabase.from('armoire_transactions').insert(transactionData);
      if (transError) throw transError;

      setState(prevState => ({
        ...prevState,
        inventory: prevState.inventory.map(item => {
          const updated = updatedItems.find(u => u.id === item.id);
          return updated ? updated as Equipment : item;
        }),
        transactions: [...transactions, ...prevState.transactions]
      }));
      
      dismissToast(loadingToastId);
      
      const mailtoLink = generateMailtoLink(transactions, state.inventory, state.users, currentUser);

      if (mailtoLink) {
        sendTransactionNotification(mailtoLink);
        toast((t) => (
          <div className="flex flex-col gap-3 min-w-[220px]">
            <span className="font-bold text-sm">✅ Mouvement enregistré !</span>
            <button 
              onClick={() => {
                sendTransactionNotification(mailtoLink);
                toast.dismiss(t.id);
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-3 rounded-lg flex items-center gap-2 justify-center font-bold text-xs shadow-md active:scale-95 transition-all"
            >
              <Mail size={16} />
              CLIQUEZ ICI POUR ENVOYER L'EMAIL
            </button>
            <p className="text-[10px] text-slate-500 italic text-center">
              Si l'application mail ne s'ouvre pas,<br/>cliquez sur le bouton ci-dessus.
            </p>
            <button onClick={() => toast.dismiss(t.id)} className="text-[10px] text-slate-400 underline text-center">Fermer</button>
          </div>
        ), { duration: Infinity });
      } else {
        showSuccess("Opération réussie !");
      }

    } catch (error: any) {
      dismissToast(loadingToastId);
      showError(`Erreur: ${error.message}`);
      throw error;
    }
  };

  const handleAddEquipment = async (eq: Equipment, pairBarcode?: string) => {
    const toastId = showLoading("Ajout en cours...");
    try {
      let pairId: string | undefined = undefined;
      if (pairBarcode) {
        const { data: pairedItem } = await supabase.from('armoire_equipment').select('id').eq('barcode', pairBarcode).single();
        if (!pairedItem) throw new Error(`Le gant avec le code-barres ${pairBarcode} est introuvable.`);
        pairId = pairedItem.id;
      }

      const { data: newEquipment, error } = await supabase.from('armoire_equipment').insert({ ...eq, pairId }).select().single();
      if (error) throw error;

      if (pairId) {
        await supabase.from('armoire_equipment').update({ pairId: newEquipment.id }).eq('id', pairId);
        await fetchInitialData(); 
      } else {
        setState(prev => ({ ...prev, inventory: [...prev.inventory, newEquipment as Equipment] }));
      }
      
      dismissToast(toastId);
      showSuccess("Équipement ajouté.");
    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message);
      throw error;
    }
  };

  const handleUpdateEquipment = async (updatedItem: Equipment, pairBarcode?: string) => {
    const toastId = showLoading("Mise à jour...");
    try {
      let pairId: string | undefined = undefined;
      if (pairBarcode) {
        const { data: pairedItem } = await supabase.from('armoire_equipment').select('id').eq('barcode', pairBarcode).single();
        if (!pairedItem) throw new Error(`Le gant avec le code-barres ${pairBarcode} est introuvable.`);
        if (pairedItem.id === updatedItem.id) throw new Error("Ne peut pas se lier à lui-même.");
        pairId = pairedItem.id;
      }

      const { data: returnedItem, error } = await supabase.from('armoire_equipment').update({ ...updatedItem, pairId }).eq('id', updatedItem.id).select().single();
      if (error) throw error;

      if (pairId) {
        await supabase.from('armoire_equipment').update({ pairId: returnedItem.id }).eq('id', pairId);
      }
      
      await fetchInitialData(); 
      dismissToast(toastId);
      showSuccess("Équipement mis à jour.");
    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message);
      throw error;
    }
  };

  const handleDeleteEquipment = async (itemId: string) => {
    await supabase.from('armoire_equipment').delete().eq('id', itemId);
    await fetchInitialData();
    showSuccess("Équipement supprimé.");
  };

  if (isLoadingData) return (
    <div className="h-full w-full flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-fire-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 text-sm font-medium animate-pulse">Chargement FireStock...</p>
      </div>
    </div>
  );
  
  if (!session) return <Login />;

  if (isProfileIncomplete) {
    return (
      <div className="h-full w-full bg-slate-50 flex justify-center">
        <ToastProvider />
        <main className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col">
          <div className="flex-1 overflow-y-auto bg-slate-50/50">
            <Profile 
              session={session} 
              isProfileIncomplete={true}
              onProfileUpdate={() => {
                fetchUserProfile(session.user.id, session.user.email);
                fetchInitialData();
              }}
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-slate-50 flex justify-center">
      <ToastProvider />
      <main className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col">
        <div className="flex-1 overflow-y-auto bg-slate-50/50">
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
          {activeTab === 'profile' && (
            <Profile 
              session={session} 
              onProfileUpdate={() => {
                fetchUserProfile(session.user.id, session.user.email);
                fetchInitialData();
              }} 
            />
          )}
        </div>
        <nav className="shrink-0 bg-white border-t px-6 py-2 flex justify-between pb-6 sm:pb-2">
          <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-fire-600' : 'text-slate-400'}`}>
            <LayoutDashboard size={20} /> <span className="text-[10px] font-bold">Accueil</span>
          </button>
          <button onClick={() => setActiveTab('stock')} className={`flex flex-col items-center gap-1 ${activeTab === 'stock' ? 'text-fire-600' : 'text-slate-400'}`}>
            <PackageSearch size={20} /> <span className="text-[10px] font-bold">Stock</span>
          </button>
          <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-fire-600' : 'text-slate-400'}`}>
            <UserCircle size={20} /> <span className="text-[10px] font-bold">Profil</span>
          </button>
        </nav>
      </main>
    </div>
  );
};

export default App;