-- Table des équipements
CREATE TABLE public.armoire_equipement (
    id text PRIMARY KEY,
    type text NOT NULL,
    size text,
    barcode text,
    status text,
    condition text,
    assigned_to uuid REFERENCES auth.users(id),
    image_url text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Table des transactions (historique)
CREATE TABLE public.armoire_transactions (
    id text PRIMARY KEY,
    equipment_id text REFERENCES public.armoire_equipement(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id),
    type text, -- 'OUT' ou 'IN'
    timestamp bigint,
    reason text,
    note text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Activer RLS
ALTER TABLE public.armoire_equipement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.armoire_transactions ENABLE ROW LEVEL SECURITY;

-- Politiques de sécurité
CREATE POLICY "Enable all for authenticated users" ON public.armoire_equipement
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all for authenticated users" ON public.armoire_transactions
    FOR ALL USING (auth.role() = 'authenticated');