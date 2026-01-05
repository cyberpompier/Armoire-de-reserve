import React, { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast'; 
import { AppState, Equipment, Transaction, User, EquipmentStatus } from './types';
import { Dashboard } from './components/Dashboard';
import { StockManager } from './components/StockManager';
import { Profile } from './components/Profile';
import { Login } from './components/Login';
import { LayoutDashboard, PackageSearch, UserCircle, Mail, Loader2 } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileIncomplete, setIsProfileIncomplete] = useState(false);
  const initializedRef = useRef(false);

  // Fonction de chargement globale
  const loadAppData = useCallback(async (userId: string, email?: string) => {
    try {
      // 1. Profil utilisateur
      let { data: profile, error: pError } = await supabase.from('profiles').select('*').eq('id', userId).single();
      
      if (pError && pError.code === 'PGRST116') {
        const { data: newP } = await supabase.from('profiles').insert({ id: userId, email, role: 'pompier' }).select().single();
        profile = newP;
      }

      if (profile) {
        setIsProfileIncomplete(!profile.nom || !profile.prenom || !profile.grade);
        setCurrentUser({
          id: userId, email, name: `${profile.nom?.toUpperCase() || ''} ${profile.prenom || ''}`.trim() || 'Utilisateur',
          rank: profile.grade || 'Sapeur', role: profile.role || 'pompier', avatar: profile.avatar
        });
      }

      // 2. Données globales (Inventaire, Utilisateurs, Transactions)
      const [usersRes, inventoryRes, transactionsRes] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('armoire_equipment').select('*'),
        supabase.from('armoire_transactions').select('*').order('timestamp', { ascending: false }).limit(50)
      ]);

      const directory: User[] = (usersRes.data || []).map((p: any) => ({
        id: p.id, name: `${p.nom?.toUpperCase() || ''} ${p.prenom || ''}`.trim() || 'Utilisateur',
        rank: p.grade || '', role: p.role || 'pompier', email: p.email, avatar: p.avatar
      }));

      setState({
        users: directory,
        inventory: (inventoryRes.data || []) as Equipment[],
        transactions: (transactionsRes.data || []) as Transaction[]
      });
      
    } catch (err) {
      console.error("Erreur de chargement:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Un seul effet pour gérer l'authentification et le chargement initial
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Vérifier la session actuelle
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (currentSession) {
        setSession(currentSession);
        loadAppData(currentSession.user.id, currentSession.user.email);
      } else {
        setIsLoading(false);
      }
    });

    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        setIsLoading(true);
        loadAppData(newSession.user.id, newSession.user.email);
      } else {
        setCurrentUser(null);
        setState(INITIAL_STATE);
        setIsProfileIncomplete(false);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadAppData]);

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

      setState(prev => ({
        ...prev,
        inventory: prev.inventory.map(item => {
          const updated = updatedItems.find(u => u.id === item.id);
          return updated ? (updated as Equipment) : item;
        }),
        transactions: [...transactions, ...prev.transactions]
      }));
      
      dismissToast(loadingToastId);
      const mailtoLink = generateMailtoLink(transactions, state.inventory, state.users, currentUser);
      if (mailtoLink) {
        sendTransactionNotification(mailtoLink);
        toast((t) => (
          <div className="flex flex-col gap-2">
            <span className="font-bold text-sm">✅ Mouvement enregistré</span>
            <button onClick={() => { sendTransactionNotification(mailtoLink); toast.dismiss(t.id); }} className="bg-slate-900 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-md">
              RENVOYER L'EMAIL
            </button>
          </div>
        ));
      } else {
        showSuccess("Opération réussie !");
      }
    } catch (error: any) {
      dismissToast(loadingToastId);
      showError(`Erreur: ${error.message}`);
    }
  };

  const handleAddEquipment = async (eq: Equipment, pairBarcode?: string) => {
    const toastId = showLoading("Ajout...");
    try {
      let pairId: string | undefined = undefined;
      if (pairBarcode) {
        const { data: paired } = await supabase.from('armoire_equipment').select('id').eq('barcode', pairBarcode).single();
        if (paired) pairId = paired.id;
      }
      const { data: newEq, error } = await supabase.from('armoire_equipment').insert({ ...eq, pairId }).select().single();
      if (error) throw error;
      if (pairId) await supabase.from('armoire_equipment').update({ pairId: newEq.id }).eq('id', pairId);
      
      // Rechargement léger
      const { data: inv } = await supabase.from('armoire_equipment').select('*');
      if (inv) setState(prev => ({ ...prev, inventory: inv as Equipment[] }));
      dismissToast(toastId);
      showSuccess("EPI ajouté.");
    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message);
    }
  };

  const handleUpdateEquipment = async (updatedItem: Equipment, pairBarcode?: string) => {
    const toastId = showLoading("Mise à jour...");
    try {
      let pairId: string | undefined = undefined;
      if (pairBarcode) {
        const { data: paired } = await supabase.from('armoire_equipment').select('id').eq('barcode', pairBarcode).single();
        if (paired && paired.id !== updatedItem.id) pairId = paired.id;
      }
      const { data: returned, error } = await supabase.from('armoire_equipment').update({ ...updatedItem, pairId }).eq('id', updatedItem.id).select().single();
      if (error) throw error;
      if (pairId) await supabase.from('armoire_equipment').update({ pairId: returned.id }).eq('id', pairId);
      
      const { data: inv } = await supabase.from('armoire_equipment').select('*');
      if (inv) setState(prev => ({ ...prev, inventory: inv as Equipment[] }));
      dismissToast(toastId);
      showSuccess("EPI mis à jour.");
    } catch (error: any) {
      dismissToast(toastId);
      showError(error.message);
    }
  };

  const handleDeleteEquipment = async (itemId: string) => {
    await supabase.from('armoire_equipment').delete().eq('id', itemId);
    setState(prev => ({ ...prev, inventory: prev.inventory.filter(i => i.id !== itemId) }));
    showSuccess("Supprimé.");
  };

  if (isLoading) return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-12 h-12 text-orange-600 animate-spin" />
        <p className="text-slate-400 text-sm font-medium">Chargement FireStock...</p>
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
            <Profile session={session} isProfileIncomplete={true} onProfileUpdate={() => loadAppData(session.user.id, session.user.email)} />
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
          {activeTab === 'profile' && <Profile session={session} onProfileUpdate={() => loadAppData(session.user.id, session.user.email)} />}
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