-- 013_comercial_finance_updates.sql

-- 1. Usuarios: flag for Comercial Team
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS in_comercial_team BOOLEAN DEFAULT FALSE;

-- 2. Comercial: Commission Tiers
CREATE TABLE IF NOT EXISTS public.comercial_commission_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    min_value NUMERIC NOT NULL DEFAULT 0,
    max_value NUMERIC, -- NULL means unlimited
    percentage NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.comercial_commission_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all to comercial_commission_tiers" ON public.comercial_commission_tiers FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all to comercial_commission_tiers" ON public.comercial_commission_tiers FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all to comercial_commission_tiers" ON public.comercial_commission_tiers FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all to comercial_commission_tiers" ON public.comercial_commission_tiers FOR DELETE USING (true);

-- 3. CRM: Client Rentability Fields
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS hosting_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS db_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS operational_hours NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS hour_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS cac NUMERIC DEFAULT 0;

-- 4. Financeiro: Financial Taxes
CREATE TABLE IF NOT EXISTS public.financial_taxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    descricao TEXT NOT NULL,
    categoria TEXT NOT NULL,
    competencia TEXT NOT NULL,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    valor NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Pendente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.financial_taxes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all to financial_taxes" ON public.financial_taxes FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all to financial_taxes" ON public.financial_taxes FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all to financial_taxes" ON public.financial_taxes FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all to financial_taxes" ON public.financial_taxes FOR DELETE USING (true);
