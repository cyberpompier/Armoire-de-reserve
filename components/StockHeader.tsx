import React from 'react';
import { Search, Plus, QrCode } from 'lucide-react';
import { EquipmentStatus } from '../types';

interface StockHeaderProps {
  search: string;
  onSearchChange: (value: string) => void;
  filter: string;
  onFilterChange: (value: string) => void;
  onScanClick: () => void;
  onAddClick: () => void;
  userRole?: string;
}

export const StockHeader: React.FC<StockHeaderProps> = ({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  onScanClick,
  onAddClick,
  userRole
}) => {
  return (
    <div className="sticky top-0 bg-slate-50/90 backdrop-blur-md z-10 px-4 py-3 border-b border-slate-200">
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Rechercher EPI, Matricule..." 
            className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-fire-500 focus:border-transparent outline-none"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
          />
        </div>
        
        {/* Barcode Scan Button */}
        <button 
          onClick={onScanClick}
          className="bg-white text-slate-700 p-2 rounded-xl border border-slate-200 shadow-sm active:scale-95 transition-transform"
        >
          <QrCode className="w-5 h-5" />
        </button>

        {userRole !== 'pompier' && (
          <button 
            onClick={onAddClick}
            className="bg-slate-900 text-white p-2 rounded-xl shadow-lg active:scale-95 transition-transform"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Status Chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {['ALL', EquipmentStatus.AVAILABLE, EquipmentStatus.LOANED, EquipmentStatus.DAMAGED].map((status) => (
          <button
            key={status}
            onClick={() => onFilterChange(status)}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === status 
                ? 'bg-fire-600 text-white shadow-md shadow-fire-200' 
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            {status === 'ALL' ? 'Tout' : status}
          </button>
        ))}
      </div>
    </div>
  );
};