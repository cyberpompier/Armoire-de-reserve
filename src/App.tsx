import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast'; 
import { AppState, Equipment, Transaction, User, EquipmentStatus } from './types';
import { Dashboard } from './components/Dashboard';
import { StockManager } from './components/StockManager';
import { Profile } from './components/Profile';
import { Login } from './components/Login';
import { LayoutDashboard, PackageSearch, UserCircle, Mail, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from './supabaseClient';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isProfileIncomplete, setIsProfileIncomplete] = useState(false);

  const fetchInitialData = useCallback(async () => {
    try {
      const [usersRes, inventoryRes, transactionsRes] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('armoire_equipment').select('*'),
        supabase.from('armoire_transactions').select('*').order('timestamp', { ascending: false })
      ]);

      if (inventoryRes.error) throw inventoryRes.error;
      if (usersRes.error) throw usersRes.error;
      
      const directory: User[] = (usersRes.data || []).map((p: any) => ({
        id: p.id, 
        name: `${p.nom?.toUpperCase() || ''} ${p.prenom || ''}`.trim() || 'Utilisateur',
        rank: p.grade || '', 
        role: p.role || 'pompier', 
        email: p.email,
        avatar: p.avatar
      }));

      setState({
        users: directory,
        inventory: (inventoryRes.data || []) as Equipment[],
        transactions: (transactionsRes.data || []) as Transaction[]
      });
      return true;
    } catch (e: any) {
      console.error("Erreur fetchInitialData:", e);
      return false;
    }
  }, []);

  const fetchUserProfile = useCallback(async (userId: string, email?: string) => {
    try {
      let { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

      if (!data || (error && error.code === 'PGRST116')) {
        const newProfile = {
          id: userId,
          email: email,
          role: 'pompier',
          updated_at: new Date().toISOString()
        };
        
        const { error: insertError } = await supabase.from('profiles').insert(newProfile);
        if (!insertError) {
          data = newProfile;
        }
      }

      if (data) {
        const isIncomplete = !data.nom || !data.prenom || !data.grade;
        setIsProfileIncomplete(isIncomplete);
        
        setCurrentUser({
          id: userId, 
          email: email, 
          name: `${data.nom?.toUpperCase() || ''} ${data.prenom || ''}`.trim() || 'Utilisateur',
          rank: data.grade || 'Sapeur', 
          role: data.role || 'pompier',
          avatar: data.avatar
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error("Erreur fetchUserProfile:", err);
      return false;
    }
  }, []);

  const initApp = useCallback(async () => {
    setIsLoadingData(true);
    setLoadError(null);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      
      if (currentSession) {
        const [profileSuccess, dataSuccess] = await Promise.all([
          fetchUserProfile(currentSession.user.id, currentSession.user.email),
          fetchInitialData()
        ]);
        
        if (!profileSuccess || !dataSuccess) {
          setLoadError("Certaines données n'ont pas pu être chargées.");
        }
      }
    } catch (error: any) {
      setLoadError("Erreur de connexion à la base de données.");
    } finally {
      setIsLoadingData(false);
    }
  }, [fetchUserProfile, fetchInitialData]);

  useEffect(() => {
    let mounted = true;

    initApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      
      const sessionChanged = session?.user.id !== newSession?.user.id;
      
      if (newSession && (sessionChanged || event === 'SIGNED_IN')) {
        setSession(newSession);
        initApp();
      } else if (!newSession) {
        setSession(null);
        setCurrentUser(null);
        setState(INITIAL_STATE);
        setIsProfileIncomplete(false);
        setIsLoadingData(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [initApp, session]);

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

      setState((prevState: AppState) => ({
        ...prevState,
        inventory: prevState.inventory.map((item: Equipment) => {
          const updated = updatedItems.find((u: any) => u.id === item.id);
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
        setState((prev: AppState) => ({ ...prev, inventory: [...prev.inventory, newEquipment as Equipment] }));
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

  if (isLoadingData || loadError) return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-6 p-8 bg-white rounded-3xl shadow-xl shadow-slate-200/50 w-full max-w-xs">
        {loadError ? (
          <>
            <div className="p-4 bg-red-50 rounded-full">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <div className="text-center">
              <p className="text-slate-900 font-bold">Oups !</p>
              <p className="text-slate-500 text-xs mt-1">{loadError}</p>
            </div>
            <button 
              onClick={initApp}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-3 rounded-xl font-bold text-sm active:scale-95 transition-all"
            >
              <RefreshCw size={16} /> Réessayer
            </button>
          </>
        ) : (
          <>
            <div className="relative">
              <Loader2 className="w-16 h-16 text-orange-600 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 bg-orange-100 rounded-full animate-pulse"></div>
              </div>
            </div>
            <div className="text-center">
              <p className="text-slate-900 text-lg font-bold">FireStock</p>
              <p className="text-slate-400 text-xs font-medium mt-1">Chargement des données...</p>
            </div>
          </>
        )}
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
              onProfileUpdate={() => initApp()}
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
          {activeTab === 'dashboard' && <Dashboard state={state} currentUser={currentUser} />}
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
              onProfileUpdate={() => initApp()} 
            />
          )}
        </div>
        <nav className="shrink-0 bg-white border-t px-6 py-2 flex justify-between pb-6 sm:pb-2">
          <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-orange-600' : 'text-slate-400'}`}>
            <LayoutDashboard size={20} /> <span className="text-[10px] font-bold">Accueil</span>
          </button>
          <button onClick={() => setActiveTab('stock')} className={`flex flex-col items-center gap-1 ${activeTab === 'stock' ? 'text-orange-600' : 'text-slate-400'}`}>
            <PackageSearch size={20} /> <span className="text-[10px] font-bold">Emprunter</span>
          </button>
          <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-orange-600' : 'text-slate-400'}`}>
            <UserCircle size={20} /> <span className="text-[10px] font-bold">Profil</span>
          </button>
        </nav>
      </main>
    </div>
  );
};

export default App;