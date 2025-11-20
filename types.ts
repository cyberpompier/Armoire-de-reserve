export enum EquipmentType {
  HELMET = 'Casque F1',
  JACKET = 'Veste de feu',
  TROUSERS = 'Surpantalon',
  BOOTS = 'Rangers',
  GLOVES = 'Gants d\'attaque',
  BELT = 'Ceinturon',
  HOOD = 'Cagoule'
}

export enum EquipmentStatus {
  AVAILABLE = 'Disponible',
  LOANED = 'Emprunté',
  DAMAGED = 'Hors service',
  MAINTENANCE = 'En maintenance'
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

export interface User {
  id: string;
  matricule: string;
  rank: string; // Grade
  name: string;
}

export interface Transaction {
  id: string;
  equipmentId: string;
  userId: string;
  type: 'OUT' | 'IN';
  timestamp: number;
  notes?: string;
}

export interface AppState {
  inventory: Equipment[];
  users: User[];
  transactions: Transaction[];
}