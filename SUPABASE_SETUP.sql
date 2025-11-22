-- Table des équipements
CREATE TABLE public.equipment (
    id text PRIMARY KEY,
    type text NOT NULL,
    size text,
    barcode text,
    status text,
    condition text,
    assigned_to uuid REFERENCES auth.users(id), -- ou profiles(id) si vous utilisez une table profiles liée
    image_url text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Table des transactions (historique)
CREATE TABLE public.transactions (
    id text PRIMARY KEY,
    equipment_id text REFERENCES public.equipment(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id),
    type text, -- 'OUT' ou 'IN'
    timestamp bigint,
    reason text,
    note text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Activer RLS (Sécurité) - Optionnel : Permettre à tout le monde de lire/écrire pour l'instant (mode simple)
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Politiques simples (tout le monde peut tout faire si authentifié)
CREATE POLICY "Enable all for authenticated users" ON public.equipment
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all for authenticated users" ON public.transactions
    FOR ALL USING (auth.role() = 'authenticated');