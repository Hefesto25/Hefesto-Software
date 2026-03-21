-- ============================================================
-- HEFESTO IA — Trigger Loop Guard
-- Migration: 031_trigger_loop_guard
-- Fixes bidirectional sync loop between clients ↔ diretorio_clientes
-- ============================================================
-- Problem: When clients is updated → trg_sync_client_update fires →
-- diretorio_clientes is updated → trg_sync_directory_update fires →
-- clients is updated again (extra roundtrip).
-- The existing field-change guard prevents infinite loops but causes
-- one unnecessary extra UPDATE per change. This migration adds a
-- pre-check that skips the reverse sync if clients already reflects
-- the current values in diretorio_clientes.

CREATE OR REPLACE FUNCTION sync_directory_to_client_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Guard: only sync if relevant fields changed in diretorio_clientes
  IF NOT (
    OLD.nome IS DISTINCT FROM NEW.nome OR
    OLD.segmento IS DISTINCT FROM NEW.segmento OR
    OLD.site IS DISTINCT FROM NEW.site OR
    OLD.email IS DISTINCT FROM NEW.email OR
    OLD.telefone IS DISTINCT FROM NEW.telefone OR
    OLD.status IS DISTINCT FROM NEW.status OR
    OLD.observacoes IS DISTINCT FROM NEW.observacoes
  ) THEN
    RETURN NEW;
  END IF;

  -- Loop guard: skip if clients already reflects the incoming values
  -- (prevents the extra roundtrip when sync_client_to_directory_update fired first)
  IF EXISTS (
    SELECT 1 FROM public.clients
    WHERE id = NEW.id
      AND COALESCE(name, '')          = COALESCE(NEW.nome, '')
      AND COALESCE(contact_email, '') = COALESCE(NEW.email, '')
      AND COALESCE(contact_phone, '') = COALESCE(NEW.telefone, '')
      AND COALESCE(website, '')       = COALESCE(NEW.site, '')
      AND COALESCE(observations, '')  = COALESCE(NEW.observacoes, '')
  ) THEN
    RETURN NEW;
  END IF;

  UPDATE public.clients SET
    name          = NEW.nome,
    segment       = NEW.segmento,
    contact_email = NEW.email,
    contact_phone = NEW.telefone,
    website       = NEW.site,
    status        = CASE LOWER(NEW.status)
                      WHEN 'ativo'   THEN 'Ativo'
                      WHEN 'inativo' THEN 'Inativo'
                      ELSE NEW.status
                    END,
    observations  = NEW.observacoes,
    updated_at    = NOW()
  WHERE id = NEW.id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in sync_directory_to_client_update: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
