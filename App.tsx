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

const INITIAL_STATE: AppState = { inventory: [], users: [], transactions: [] };

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'stock' | 'profile'>('dashboard');
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const fetchInitialData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const [usersRes, inventoryRes, transactionsRes] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('armoire_equipment').select('*'),
        supabase.from('armoire_transactions').select('*').order('timestamp', { ascending: false })
      ]);

      if (usersRes.error) throw usersRes.error;
      if (inventoryRes.error) throw inventoryRes.error;
      if (transactionsRes.error) throw transactionsRes.error;

      const directory: User[] = usersRes.data.map((p: any) => ({
        id: p.id, name: `${p.nom?.toUpperCase() || ''} ${p.prenom || ''}`.trim() || 'Inconnu',
        rank: p.grade || '', role: p.role || 'pompier', email: p.email
      }));

      setState({
        users: directory,
        inventory: inventoryRes.data as Equipment[],
        transactions: transactionsRes.data as Transaction[]
      });
    } catch (e) {
      showError("Erreur de chargement des données");
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  const fetchUserProfile = useCallback(async (userId: string, email?: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) {
      setCurrentUser({
        id: userId, email, name: `${data.nom?.toUpperCase() || ''} ${data.prenom || ''}`.trim() || 'Utilisateur',
        rank: data.grade || 'Sapeur', role: data.role || 'pompier'
      });
    } else {
      setCurrentUser({ id: userId, email, name: 'Nouvel Utilisateur', rank: '', role: 'pompier' });
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id, session.user.email);
        fetchInitialData();
      } else {
        setIsLoadingData(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id, session.user.email);
        fetchInitialData();
      } else {
        setCurrentUser(null);
        setState(INITIAL_STATE);
      }
    });
    return () => subscription.unsubscribe();
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
      showSuccess("Opération réussie !");
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
        await fetchInitialData(); // Refresh all data to ensure consistency
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
      
      await fetchInitialData(); // Easiest way to sync state after complex update
      dismissToast(toastId);
      showSuccess("Équipement mis à jour.");
    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message);
      throw error;
    }
  };

  const handleDeleteEquipment = async (itemId: string) => {
    // This needs to be enhanced to handle un-pairing
    await supabase.from('armoire_equipment').delete().eq('id', itemId);
    await fetchInitialData();
    showSuccess("Équipement supprimé.");
  };

  if (isLoadingData) return <div>Chargement...</div>;
  if (!session) return <Login />;

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
          {activeTab === 'profile' && <Profile session={session} />}
        </div>
        <nav className="shrink-0 bg-white border-t px-6 py-2 flex justify-between">
          <button onClick={() => setActiveTab('dashboard')} className={activeTab === 'dashboard' ? 'text-fire-600' : 'text-slate-400'}>
            <LayoutDashboard /> <span className="text-xs">Accueil</span>
          </button>
          <button onClick={() => setActiveTab('stock')} className={activeTab === 'stock' ? 'text-fire-600' : 'text-slate-400'}>
            <PackageSearch /> <span className="text-xs">Stock</span>
          </button>
          <button onClick={() => setActiveTab('profile')} className={activeTab === 'profile' ? 'text-fire-600' : 'text-slate-400'}>
            <UserCircle /> <span className="text-xs">Profil</span>
          </button>
        </nav>
      </main>
    </div>
  );
};

export default App;