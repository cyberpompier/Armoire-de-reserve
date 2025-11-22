-- Supprimez d'abord les tables si elles existent (ATTENTION: cela supprimera toutes les données existantes dans ces tables)
DROP TABLE IF EXISTS armoire_transactions;
DROP TABLE IF EXISTS armoire_equipment;

-- Recréez la table armoire_equipment avec assignedTo en UUID
CREATE TABLE armoire_equipment (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    size TEXT NOT NULL,
    barcode TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Disponible', 'Emprunté', 'Hors service', 'En maintenance')),
    assignedTo UUID REFERENCES profiles(id), -- Changement ici: UUID au lieu de TEXT
    lastInspection TIMESTAMPTZ,
    condition TEXT NOT NULL CHECK (condition IN ('Neuf', 'Bon', 'Usé', 'Critique')),
    imageUrl TEXT
);

-- Recréez la table armoire_transactions
CREATE TABLE armoire_transactions (
    id TEXT PRIMARY KEY,
    equipmentId TEXT NOT NULL REFERENCES armoire_equipment(id) ON DELETE CASCADE,
    userId UUID NOT NULL REFERENCES profiles(id), -- Changement ici: UUID au lieu de TEXT
    type TEXT NOT NULL CHECK (type IN ('OUT', 'IN')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    note TEXT,
    reason TEXT
);

-- Recréez les index
CREATE INDEX idx_armoire_equipment_status ON armoire_equipment(status);
CREATE INDEX idx_armoire_equipment_barcode ON armoire_equipment(barcode);
CREATE INDEX idx_armoire_transactions_equipment ON armoire_transactions(equipmentId);
CREATE INDEX idx_armoire_transactions_user ON armoire_transactions(userId);
CREATE INDEX idx_armoire_transactions_timestamp ON armoire_transactions(timestamp DESC);