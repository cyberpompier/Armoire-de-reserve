import React, { useEffect, useState } from 'react';
import { AppState, EquipmentStatus } from '../types';
import { ShieldAlert, Package, Activity, Sparkles, ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react';
import { analyzeStockStatus } from '../services/geminiService';

interface DashboardProps {
  state: AppState;
}

export const Dashboard: React.FC<DashboardProps> = ({ state }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  const totalItems = state.inventory.length;
  const loanedItems = state.inventory.filter(i => i.status === EquipmentStatus.LOANED).length;
  const damagedItems = state.inventory.filter(i => i.status === EquipmentStatus.DAMAGED).length;
  const availableItems = state.inventory.filter(i => i.status === EquipmentStatus.AVAILABLE).length;

  // Get recent transactions sorted by date
  const recentTransactions = [...state.transactions]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);

  const getAiInsight = async () => {
    setLoadingInsight(true);
    // Simplify data to save tokens
    const simpleInv = state.inventory.map(i => ({ t: i.type, s: i.status, c: i.condition }));
    const text = await analyzeStockStatus(JSON.stringify(simpleInv));
    setInsight(text);
    setLoadingInsight(false);
  };

  return (
    <div className="p-4 pb-24 space-y-6 animate-fade-in">
      <header className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tableau de Bord</h1>
          <p className="text-slate-500 text-sm">Gestion de Stock EPI • CIS Principal</p>
        </div>
        <div className="h-10 w-10 bg-fire-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-fire-200">
          P
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
          <div className="bg-green-100 p-2 rounded-full mb-2">
            <Package className="w-6 h-6 text-green-600" />
          </div>
          <span className="text-2xl font-bold text-slate-800">{availableItems}</span>
          <span className="text-xs text-slate-500 font-medium">Disponibles</span>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
          <div className="bg-blue-100 p-2 rounded-full mb-2">
            <Activity className="w-6 h-6 text-blue-600" />
          </div>
          <span className="text-2xl font-bold text-slate-800">{loanedItems}</span>
          <span className="text-xs text-slate-500 font-medium">Sortis</span>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center col-span-2">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-5 h-5 text-fire-600" />
            <span className="text-sm font-medium text-slate-600">Matériel Indisponible</span>
          </div>
          <div className="flex items-end gap-2">
             <span className="text-3xl font-bold text-slate-800">{damagedItems}</span>
             <span className="text-sm text-slate-400 mb-1">/ {totalItems} total</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-fire-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${(damagedItems / totalItems) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <Clock className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Flux d'activité</h3>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {recentTransactions.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center gap-2 opacity-50">
              <Activity className="w-8 h-8 text-slate-300" />
              <p className="text-sm text-slate-500">Aucun mouvement récent</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recentTransactions.map(t => {
                const item = state.inventory.find(i => i.id === t.equipmentId);
                const user = state.users.find(u => u.id === t.userId);
                const date = new Date(t.timestamp);
                const trans = t as any; // Access dynamic properties
                
                return (
                  <div key={t.id} className="p-4 flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                      t.type === 'OUT' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
                    }`}>
                      {t.type === 'OUT' ? <ArrowUpRight size={18} strokeWidth={2.5} /> : <ArrowDownLeft size={18} strokeWidth={2.5} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">
                        {t.type === 'OUT' ? 'Emprunt' : 'Retour'} <span className="font-normal text-slate-500">• {item?.type || 'Inconnu'}</span>
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {user ? `${user.rank} ${user.name}` : 'Système'}
                      </p>
                      
                      {/* Display Reason */}
                      {t.type === 'OUT' && trans.reason && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] text-slate-600 font-medium">
                           {trans.reason}
                        </span>
                      )}
                      
                      {/* Display Note */}
                      {trans.note && (
                        <p className="mt-1.5 text-xs text-slate-600 italic bg-slate-50 p-2 rounded border border-slate-100">
                          "{trans.note}"
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-slate-700 font-mono">
                        {date.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {date.toLocaleDateString('fr-FR', {day: '2-digit', month: 'short'})}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* AI Insight Section */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 shadow-lg text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-fire-600 rounded-full opacity-20 blur-2xl"></div>
        
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          <h3 className="font-bold text-lg">Assistant Logistique IA</h3>
        </div>

        <div className="min-h-[80px] text-sm text-slate-300 leading-relaxed">
          {loadingInsight ? (
             <div className="flex items-center gap-2 animate-pulse">
               <span className="w-2 h-2 bg-white rounded-full animate-bounce"></span>
               <span className="w-2 h-2 bg-white rounded-full animate-bounce delay-100"></span>
               <span className="w-2 h-2 bg-white rounded-full animate-bounce delay-200"></span>
               Analyse du stock en cours...
             </div>
          ) : insight ? (
            <div className="whitespace-pre-line">{insight}</div>
          ) : (
            <p>Appuyez pour générer un rapport d'état instantané sur votre réserve.</p>
          )}
        </div>

        <button 
          onClick={getAiInsight}
          disabled={loadingInsight}
          className="mt-4 w-full bg-white/10 hover:bg-white/20 active:bg-white/30 backdrop-blur-sm border border-white/10 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {insight ? 'Actualiser l\'analyse' : 'Analyser le stock'}
        </button>
      </div>
    </div>
  );
};