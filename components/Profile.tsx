import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { User } from '@supabase/supabase-js';
import { LogOut, User as UserIcon, Shield, Mail, ChevronRight, BadgeInfo, Star, X, Check, Loader2, Building2 } from 'lucide-react';

interface UserProfile {
  nom: string | null;
  prenom: string | null;
  avatar: string | null;
  matricule: string | null;
  email: string | null;
  grade: string | null;
  caserne: string | null;
}

export const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // États pour l'édition
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

  useEffect(() => {
    const getProfileData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        if (user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('nom, prenom, avatar, matricule, email, grade, caserne')
            .eq('id', user.id)
            .single();

          if (error) {
            console.warn('Profil non trouvé ou erreur:', error.message);
          } else {
            setProfile(data);
            setFormData(data);
          }
        }
      } catch (err) {
        console.error('Erreur inattendue:', err);
      } finally {
        setLoading(false);
      }
    };
    getProfileData();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const updates = {
        nom: formData.nom,
        prenom: formData.prenom,
        matricule: formData.matricule,
        grade: formData.grade,
        caserne: formData.caserne,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      setProfile({ ...formData, email: profile?.email || null, avatar: profile?.avatar || null });
      setIsEditing(false);
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      alert('Erreur lors de la mise à jour du profil.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Chargement...</div>;
  }

  const displayName = profile?.prenom || profile?.nom 
    ? `${profile.prenom || ''} ${profile.nom || ''}`.trim() 
    : 'Utilisateur';

  return (
    <div className="p-6 pb-24 animate-fade-in relative">
       <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Mon Profil</h1>
          <p className="text-slate-500 text-sm">Compte personnel</p>
       </header>

       <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6 flex flex-col items-center text-center">
          {profile?.avatar ? (
            <img 
              src={profile.avatar} 
              alt="Avatar" 
              className="w-24 h-24 rounded-full object-cover mb-4 border-4 border-slate-50 shadow-sm"
            />
          ) : (
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
               <UserIcon className="w-10 h-10" />
            </div>
          )}
          
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
               {profile?.email || user?.email}
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
                 <p className="text-sm font-bold text-slate-700">Rôle</p>
                 <p className="text-xs text-slate-500">Authentifié</p>
               </div>
            </div>
         </div>

         <button 
            onClick={() => setIsEditing(true)}
            className="w-full bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between active:scale-[0.99] transition-transform hover:bg-slate-50"
         >
            <div className="flex items-center gap-3">
               <div className="p-2 bg-slate-50 text-slate-600 rounded-lg">
                 <UserIcon className="w-5 h-5" />
               </div>
               <div className="text-left">
                 <p className="text-sm font-bold text-slate-700">Modifier mes informations</p>
                 <p className="text-xs text-slate-500">Nom, Grade, Caserne...</p>
               </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
         </button>
       </div>

       <button 
         onClick={handleSignOut}
         className="mt-8 w-full py-4 border border-red-100 bg-red-50 text-red-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
       >
         <LogOut className="w-4 h-4" />
         Se déconnecter
       </button>
       
       <p className="mt-6 text-[10px] text-slate-300 text-center font-mono">
         UID: {user?.id.slice(0, 8)}...
       </p>

       {/* MODAL D'ÉDITION */}
       {isEditing && (
         <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsEditing(false)}></div>
            <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 relative z-50 animate-slide-up shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900">Modifier le profil</h3>
                <button onClick={() => setIsEditing(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Prénom</label>
                    <input 
                      type="text" 
                      name="prenom"
                      value={formData.prenom || ''}
                      onChange={handleInputChange}
                      className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-fire-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Nom</label>
                    <input 
                      type="text" 
                      name="nom"
                      value={formData.nom || ''}
                      onChange={handleInputChange}
                      className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-fire-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Matricule</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      name="matricule"
                      value={formData.matricule || ''}
                      onChange={handleInputChange}
                      placeholder="SP-XXXX"
                      className="w-full p-3 pl-10 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-fire-500 font-mono"
                    />
                    <BadgeInfo className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Caserne / Centre de Secours</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      name="caserne"
                      value={formData.caserne || ''}
                      onChange={handleInputChange}
                      placeholder="Ex: CS Centre"
                      className="w-full p-3 pl-10 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-fire-500"
                    />
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Grade</label>
                  <select 
                    name="grade"
                    value={formData.grade || ''}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-fire-500"
                  >
                    <option value="">Sélectionner un grade...</option>
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

                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold shadow-lg shadow-slate-200 mt-4 flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </button>
              </div>
            </div>
         </div>
       )}
    </div>
  );
};