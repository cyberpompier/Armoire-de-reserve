import React from 'react';
import { Equipment, EquipmentStatus, EquipmentType, User } from '../types';
import { User as UserIcon } from 'lucide-react';

interface StockListProps {
  items: Equipment[];
  users: User[];
  onItemClick: (item: Equipment) => void;
}

export const StockList: React.FC<StockListProps> = ({ items, users, onItemClick }) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 opacity-50">
        <PackageIcon className="w-12 h-12 mx-auto mb-2" />
        <p>Aucun équipement trouvé</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {items.map(item => (
        <div 
          key={item.id} 
          onClick={() => onItemClick(item)}
          className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 active:scale-[0.99] transition-transform"
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            item.status === EquipmentStatus.AVAILABLE ? 'bg-green-100 text-green-700' :
            item.status === EquipmentStatus.LOANED ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
          }`}>
            {getIconForType(item.type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <h4 className="font-bold text-slate-800 truncate">{item.type}</h4>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                item.status === EquipmentStatus.AVAILABLE ? 'bg-green-50 text-green-600' :
                item.status === EquipmentStatus.LOANED ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
              }`}>
                {item.status}
              </span>
            </div>
            <div className="flex justify-between items-end mt-1">
              <div className="text-xs text-slate-500">
                <p>Taille: {item.size} • {item.condition}</p>
                {item.assignedTo && (
                  <p className="text-blue-600 font-medium mt-0.5 flex items-center gap-1">
                    <UserIcon className="w-3 h-3" /> 
                    {users.find(u => u.id === item.assignedTo)?.name || item.assignedTo}
                  </p>
                )}
              </div>
              <div className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                {item.barcode}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Helpers
const PackageIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22v-9"/></svg>;

function getIconForType(type: EquipmentType) {
  switch (type) {
    case EquipmentType.HELMET: return <span className="text-xl">⛑️</span>;
    case EquipmentType.JACKET: return <span className="text-xl">🧥</span>;
    case EquipmentType.BOOTS: return <span className="text-xl">👢</span>;
    case EquipmentType.GLOVES: return <span className="text-xl">🧤</span>;
    case EquipmentType.BAG: return <span className="text-xl">🎒</span>;
    default: return <span className="text-xl">📦</span>;
  }
}