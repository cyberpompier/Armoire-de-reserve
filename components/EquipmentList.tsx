import React from 'react';
import { Equipment, User, EquipmentStatus } from '../types';
import { Shield, User as UserIcon, AlertTriangle, CheckCircle, Clock, Activity } from 'lucide-react';

interface EquipmentListProps {
  items: Equipment[];
  users: User[];
  currentUser: User | null;
  onEdit: (item: Equipment) => void;
}

export const EquipmentList: React.FC<EquipmentListProps> = ({
  items,
  users,
  currentUser,
  onEdit
}) => {
  const getStatusColor = (status: EquipmentStatus) => {
    switch (status) {
      case EquipmentStatus.AVAILABLE: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case EquipmentStatus.LOANED: return 'bg-blue-100 text-blue-700 border-blue-200';
      case EquipmentStatus.DAMAGED: return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status: EquipmentStatus) => {
    switch (status) {
      case EquipmentStatus.AVAILABLE: return <CheckCircle className="w-3 h-3" />;
      case EquipmentStatus.LOANED: return <Clock className="w-3 h-3" />;
      case EquipmentStatus.DAMAGED: return <AlertTriangle className="w-3 h-3" />;
      default: return <Shield className="w-3 h-3" />;
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <Shield className="w-12 h-12 mb-2 opacity-20" />
        <p className="text-sm">Aucun équipement trouvé</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map(item => {
        const assignee = users.find(u => u.id === item.assignedTo);
        
        return (
          <div 
            key={item.id}
            onClick={() => onEdit(item)}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm active:scale-[0.99] transition-all hover:shadow-md cursor-pointer"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">{item.type}</span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-mono rounded border border-slate-200">
                  {item.size}
                </span>
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${getStatusColor(item.status)}`}>
                {getStatusIcon(item.status)}
                {item.status}
              </div>
            </div>

            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                  {item.barcode}
                </div>
                {item.condition && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Activity className="w-3 h-3" />
                    <span>État: {item.condition}</span>
                  </div>
                )}
              </div>

              {assignee && (
                <div className="flex items-center gap-1.5 pl-3 pr-2 py-1 bg-slate-50 rounded-lg border border-slate-100 max-w-[140px]">
                  <UserIcon className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-600 truncate font-medium">
                    {assignee.name}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};