import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { User } from '@supabase/supabase-js';
import { LogOut, User as UserIcon, Shield, Mail, ChevronRight } from 'lucide-react';

export const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Chargement...</div>;
  }

  return (
    <div className="p-6 pb-24 animate-fade-in">
       <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Mon Profil</h1>
          <p className="text-slate-500 text-sm">Compte personnel</p>
       </header>

       <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
             <UserIcon className="w-10 h-10" />
          </div>
          <h2 className="font-bold text-lg text-slate-800 mb-1">Utilisateur</h2>
          <div className="flex items-center gap-1.5 text-slate-500 text-sm bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
             <Mail className="w-3 h-3" />
             {user?.email}
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
                 <p className="text-xs text-slate-500">Nom, Grade, Matricule</p>
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