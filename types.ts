export interface User {
  id: string;
  name: string;
  rank: string;
  email?: string;
  matricule?: string;
  caserne?: string;
  role?: 'admin' | 'pompier';
}

export enum EquipmentStatus {
  AVAILABLE = 'Disponible',
  LOANED = 'Emprunté',
  DAMAGED = 'Hors service',
  MAINTENANCE = 'En maintenance'
}

export enum EquipmentType {
  HELMET = 'Casque F1',
  JACKET = 'Veste de feu',
  TROUSERS = 'Surpantalon',
  BOOTS = 'Rangers',
  GLOVES = 'Gants d\'attaque',
  BAG = 'Sac de transport'
}

export interface Equipment {
  id: string;
  type: EquipmentType;
  size: string;
  barcode: string;
  status: EquipmentStatus;
  assignedTo?: string; // User ID if loaned
  lastInspection?: string;
  condition: 'Neuf' | 'Bon' | 'Usé' | 'Critique';
  imageUrl?: string;
}

export interface Transaction {
  id: string;
  equipmentId: string;
  userId: string;
  type: 'OUT' | 'IN';
  timestamp: number;
  notes?: string;
  reason?: string;
  note?: string; // Alias for backward compatibility or unification
}

export interface AppState {
  inventory: Equipment[];
  users: User[];
  transactions: Transaction[];
}