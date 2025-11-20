import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { User } from '@supabase/supabase-js';
import { LogOut, User as UserIcon, Shield, Mail, ChevronRight, BadgeInfo } from 'lucide-react';

interface UserProfile {
  nom: string | null;
  prenom: string | null;
  avatar: string | null;
  matricule: string | null;
  email: string | null;
}

export const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getProfileData = async () => {
      try {
        // 1. Récupérer l'utilisateur authentifié
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        if (user) {
          // 2. Récupérer les détails depuis la table 'profiles'
          const { data, error } = await supabase
            .from('profiles')
            .select('nom, prenom, avatar, matricule, email')
            .eq('id', user.id)
            .single();

          if (error) {
            console.warn('Profil non trouvé ou erreur:', error.message);
          } else {
            setProfile(data);
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

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Chargement...</div>;
  }

  // Construction du nom d'affichage
  const displayName = profile?.prenom || profile?.nom 
    ? `${profile.prenom || ''} ${profile.nom || ''}`.trim() 
    : 'Utilisateur';

  return (
    <div className="p-6 pb-24 animate-fade-in">
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
          
          <div className="flex flex-col gap-2 items-center mt-1">
            <div className="flex items-center gap-1.5 text-slate-500 text-xs bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
               <Mail className="w-3 h-3" />
               {profile?.email || user?.email}
            </div>
            
            {profile?.matricule && (
              <div className="flex items-center gap-1.5 text-blue-600 text-xs bg-blue-50 px-3 py-1 rounded-full border border-blue-100 font-medium">
                <BadgeInfo className="w-3 h-3" />
                {profile.matricule}
              </div>
            )}
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

         <button className="w-full bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between active:scale-[0.99] transition-transform">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-slate-50 text-slate-600 rounded-lg">
                 <UserIcon className="w-5 h-5" />
               </div>
               <div className="text-left">
                 <p className="text-sm font-bold text-slate-700">Modifier mes informations</p>
                 <p className="text-xs text-slate-500">Nom, Prénom, Avatar</p>
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
    </div>
  );
};