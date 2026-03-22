ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_stage_check;
ALTER TABLE public.deals ADD CONSTRAINT deals_stage_check
  CHECK (stage = ANY (ARRAY['prospeccao'::text, 'diagnostico'::text, 'proposta_comercial'::text, 'negociacao'::text, 'fechado'::text, 'perdido'::text]));
