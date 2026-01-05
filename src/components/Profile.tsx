import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Session } from '@supabase/supabase-js';
import { 
  LogOut, User as UserIcon, Shield, Mail, ChevronRight, 
  BadgeInfo, Star, X, Check, Loader2, Building2, 
  AlertTriangle, Camera, Package, History, ArrowUpRight, ArrowDownLeft,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { Equipment, Transaction } from '../types';

interface UserProfile {
  nom: string | null;
  prenom: string | null;
  avatar: string | null;
  matricule: string | null;
  email: string | null;
  grade: string | null;
  caserne: string | null;
}

interface ProfileProps {
  session: Session | null;
  isProfileIncomplete?: boolean;
  onProfileUpdate?: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ session, isProfileIncomplete, onProfileUpdate }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentLoans, setCurrentLoans] = useState<Equipment[]>([]);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UserProfile>({
    nom: '',
    prenom: '',
    avatar: '',
    matricule: '',
    email: '',
    grade: '',
    caserne: ''
  });
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    const getProfileData = async () => {
      try {
        const user = session?.user;

        if (user) {
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('nom, prenom, avatar, matricule, email, grade, caserne')
            .eq('id', user.id)
            .single();

          if (!error) {
            setProfile(profileData);
            setFormData(profileData);
          } else {
            setFormData(prev => ({ ...prev, email: user.email || '' }));
          }

          const { data: loanData } = await supabase
            .from('armoire_equipment')
            .select('*')
            .eq('assignedTo', user.id);
          
          if (loanData) setCurrentLoans(loanData);

          const { data: historyData } = await supabase
            .from('armoire_transactions')
            .select(`
              *,
              equipment:armoire_equipment(type, size)
            `)
            .eq('userId', user.id)
            .order('timestamp', { ascending: false })
            .limit(20);
          
          if (historyData) setHistory(historyData);
        }
      } catch (err) {
        console.error('Erreur inattendue:', err);
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      getProfileData();
    }
  }, [session]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.user) return;

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('banque image habillement')
        .upload(`profiles/${fileName}`, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('banque image habillement')
        .getPublicUrl(`profiles/${fileName}`);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar: publicUrl })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar: publicUrl } : null);
      setFormData(prev => ({ ...prev, avatar: publicUrl }));
      
      if (onProfileUpdate) onProfileUpdate();
    } catch (error: any) {
      console.error('Erreur upload avatar:', error);
      alert("Erreur lors de l'envoi de la photo.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    const user = session?.user;
    if (!user) return;

    if (!formData.nom || !formData.prenom || !formData.grade) {
      alert('Veuillez remplir au minimum votre nom, prénom et grade.');
      return;
    }
    
    setSaving(true);
    try {
      const updates = {
        id: user.id,
        nom: formData.nom,
        prenom: formData.prenom,
        matricule: formData.matricule,
        grade: formData.grade,
        caserne: formData.caserne,
        email: user.email,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(updates);

      if (error) throw error;

      setProfile({ ...formData, email: user.email || null, avatar: profile?.avatar || null });
      setIsEditing(false);
      
      if (onProfileUpdate) onProfileUpdate();
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour:', error);
      alert('Erreur lors de la sauvegarde du profil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full space-y-4 animate-pulse">
        <div className="w-24 h-24 bg-slate-200 rounded-full"></div>
        <div className="h-4 w-32 bg-slate-200 rounded"></div>
        <div className="h-3 w-48 bg-slate-200 rounded"></div>
      </div>
    );
  }

  const displayName = profile?.prenom || profile?.nom 
    ? `${profile.prenom || ''} ${profile.nom || ''}`.trim() 
    : 'Utilisateur';

  const displayedHistory = showAllHistory ? history : history.slice(0, 3);

  return (
    <div className="p-6 pb-24 animate-fade-in relative max-w-md mx-auto">
       {isProfileIncomplete && (
         <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg shadow-sm">
           <div className="flex items-start gap-3">
             <div className="shrink-0 pt-0.5">
               <AlertTriangle className="w-5 h-5 text-yellow-500" />
             </div>
             <div>
               <p className="font-bold text-yellow-800">Profil incomplet</p>
               <p className="text-sm text-yellow-700 mt-1">Veuillez compléter vos informations.</p>
             </div>
           </div>
         </div>
       )}

       <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Mon Profil</h1>
          <p className="text-slate-500 text-sm">Gestion de mes équipements</p>
       </header>

       {/* Section 1: Équipements en cours */}
       {currentLoans.length > 0 && (
         <div className="mb-6 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Package className="w-3 h-3" /> Équipements en ma possession
            </h3>
            <div className="flex flex-wrap gap-2">
              {currentLoans.map((item) => (
                <div key={item.id} className="bg-fire-50 text-fire-700 border border-fire-100 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-fire-500 animate-pulse"></div>
                  {item.type} <span className="opacity-50 font-normal">({item.size})</span>
                </div>
              ))}
            </div>
         </div>
       )}

       {/* Carte Profil principale */}
       <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6 flex flex-col items-center text-center">
          <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
            {profile?.avatar ? (
              <img 
                src={profile.avatar} 
                alt="Avatar" 
                className={`w-24 h-24 rounded-full object-cover mb-4 border-4 border-slate-50 shadow-sm transition-opacity ${uploadingAvatar ? 'opacity-50' : 'group-hover:opacity-80'}`}
              />
            ) : (
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400 border-4 border-slate-50 shadow-sm">
                 <UserIcon className="w-10 h-10" />
              </div>
            )}
            
            <div className="absolute bottom-4 right-0 p-1.5 bg-fire-600 text-white rounded-full shadow-lg border-2 border-white">
              {uploadingAvatar ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
            </div>
            
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} disabled={uploadingAvatar} />
          </div>
          
          <h2 className="font-bold text-lg text-slate-800 mb-1 capitalize">{displayName}</h2>
          
          <div className="flex flex-col gap-2 items-center mt-1 w-full">
             {profile?.grade && (
              <div className="flex items-center gap-1.5 text-amber-600 text-xs bg-amber-50 px-3 py-1 rounded-full border border-amber-100 font-bold uppercase tracking-wide">
                <Star className="w-3 h-3 fill-amber-600" />
                {profile.grade}
              </div>
            )}

            <div className="flex items-center gap-1.5 text-slate-500 text-xs bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
               <Mail className="w-3 h-3" />
               {profile?.email || session?.user.email}
            </div>

            <div className="flex gap-2 justify-center w-full flex-wrap">
              {profile?.matricule && (
                <div className="flex items-center gap-1.5 text-blue-600 text-xs bg-blue-50 px-3 py-1 rounded-full border border-blue-100 font-medium">
                  <BadgeInfo className="w-3 h-3" />
                  {profile.matricule}
                </div>
              )}
              {profile?.caserne && (
                <div className="flex items-center gap-1.5 text-slate-600 text-xs bg-slate-100 px-3 py-1 rounded-full border border-slate-200 font-medium">
                  <Building2 className="w-3 h-3" />
                  {profile.caserne}
                </div>
              )}
            </div>
          </div>
       </div>

       <div className="space-y-3">
         <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                 <Shield className="w-5 h-5" />
               </div>
               <div>
                 <p className="text-sm font-bold text-slate-700">Statut</p>
                 <p className="text-xs text-slate-500">Compte vérifié</p>
               </div>
            </div>
         </div>

         <button 
            onClick={() => setIsEditing(true)}
            className="w-full bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-center gap-3 active:scale-[0.99] transition-transform hover:bg-slate-50 group"
         >
            <div className="flex items-center gap-3 flex-1">
               <div className="p-2 bg-slate-50 text-slate-600 rounded-lg group-hover:bg-slate-100 transition-colors">
                 <UserIcon className="w-5 h-5" />
               </div>
               <div className="text-left">
                 <p className="text-sm font-bold text-slate-700">Modifier mes informations</p>
                 <p className="text-xs text-slate-500">Nom, Grade, Caserne...</p>
               </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
         </button>

         {/* Section Historique */}
         <div className="mt-8 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <History className="w-3 h-3" /> Historique récent
            </h3>
            
            <div className="space-y-3">
              {history.length > 0 ? (
                <>
                  {displayedHistory.map((trans) => (
                    <div key={trans.id} className="bg-white p-3 rounded-xl border border-slate-100 flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
                      <div className={`p-2 rounded-lg ${trans.type === 'OUT' ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {trans.type === 'OUT' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">
                          {(trans as any).equipment?.type || 'Équipement'}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {new Date(trans.timestamp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className={`text-[10px] font-bold px-2 py-1 rounded-full ${trans.type === 'OUT' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {trans.type === 'OUT' ? 'EMPRUNT' : 'RETOUR'}
                      </div>
                    </div>
                  ))}
                  
                  {history.length > 3 && (
                    <button 
                      onClick={() => setShowAllHistory(!showAllHistory)}
                      className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center justify-center gap-2 transition-colors"
                    >
                      {showAllHistory ? (
                        <>Voir moins <ChevronUp size={14} /></>
                      ) : (
                        <>Voir tout l'historique ({history.length}) <ChevronDown size={14} /></>
                      )}
                    </button>
                  )}
                </>
              ) : (
                <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-2xl">
                   <p className="text-xs text-slate-400">Aucun historique disponible</p>
                </div>
              )}
            </div>
         </div>
       </div>

       <button 
         onClick={() => supabase.auth.signOut()}
         className="mt-8 w-full py-4 border border-red-100 bg-red-50 text-red-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform hover:bg-red-100"
       >
         <LogOut className="w-4 h-4" /> Se déconnecter
       </button>
       
       <p className="mt-6 text-[10px] text-slate-300 text-center font-mono">
         UID: {session?.user.id.slice(0, 8)}...
       </p>

       {isEditing && (
         <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => !isProfileIncomplete && setIsEditing(false)}></div>
            <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 relative z-50 animate-slide-up shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900">Modifier le profil</h3>
                <button onClick={() => !isProfileIncomplete && setIsEditing(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200" disabled={isProfileIncomplete}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Prénom *</label>
                    <input type="text" name="prenom" value={formData.prenom || ''} onChange={(e) => setFormData(prev => ({...prev, prenom: e.target.value}))} className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-fire-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Nom *</label>
                    <input type="text" name="nom" value={formData.nom || ''} onChange={(e) => setFormData(prev => ({...prev, nom: e.target.value}))} className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-fire-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Matricule</label>
                  <div className="relative">
                    <input type="text" name="matricule" value={formData.matricule || ''} onChange={(e) => setFormData(prev => ({...prev, matricule: e.target.value}))} placeholder="SP-XXXX" className="w-full p-3 pl-10 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-fire-500 font-mono" />
                    <BadgeInfo className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Caserne</label>
                  <div className="relative">
                    <input type="text" name="caserne" value={formData.caserne || ''} onChange={(e) => setFormData(prev => ({...prev, caserne: e.target.value}))} placeholder="CS Centre" className="w-full p-3 pl-10 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-fire-500" />
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Grade *</label>
                  <select name="grade" value={formData.grade || ''} onChange={(e) => setFormData(prev => ({...prev, grade: e.target.value}))} className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-fire-500" >
                    <option value="">Sélectionner...</option>
                    <option value="Sapeur">Sapeur</option>
                    <option value="Caporal">Caporal</option>
                    <option value="Caporal-Chef">Caporal-Chef</option>
                    <option value="Sergent">Sergent</option>
                    <option value="Sergent-Chef">Sergent-Chef</option>
                    <option value="Adjudant">Adjudant</option>
                    <option value="Adjudant-Chef">Adjudant-Chef</option>
                    <option value="Lieutenant">Lieutenant</option>
                    <option value="Capitaine">Capitaine</option>
                    <option value="Commandant">Commandant</option>
                  </select>
                </div>

                <button onClick={handleSave} disabled={saving} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold shadow-lg shadow-slate-200 mt-4 flex items-center justify-center gap-2 disabled:opacity-70 hover:bg-slate-800 transition-colors" >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  {saving ? 'Enregistrement...' : 'Enregistrer le profil'}
                </button>
              </div>
            </div>
         </div>
       )}
    </div>
  );
};