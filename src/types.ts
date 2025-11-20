export interface User {
  id: string;
  name: string;
  rank: string;
  email?: string;
  matricule?: string;
  caserne?: string;
  role?: 'ADMIN' | 'USER';
}

export enum EquipmentStatus {
  AVAILABLE = 'Disponible',
  LOANED = 'Sorti',
  DAMAGED = 'Inutilisable',
}

export enum EquipmentType {
  HELMET = 'Casque F1',
  JACKET = 'Veste textile',
  TROUSERS = 'Pantalon textile',
  BOOTS = 'Bottes',
  GLOVES = 'Gants',
  BAG = 'Sac de transport',
}

export interface Equipment {
  id: string;
  type: EquipmentType;
  size: string;
  barcode: string;
  status: EquipmentStatus;
  condition: 'Neuf' | 'Bon' | 'Usé' | 'Critique';
  imageUrl?: string;
  assignedTo?: string;
}

export interface Transaction {
  id: string;
  equipmentId: string;
  userId: string;
  type: 'IN' | 'OUT';
  timestamp: number;
  note?: string;
  reason?: string;
}

export interface AppState {
  inventory: Equipment[];
  users: User[];
  transactions: Transaction[];
}