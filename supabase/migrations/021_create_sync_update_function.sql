-- Migration: Create function to sync clients UPDATE to diretorio_clientes
-- Purpose: Bidirectional sync when CRM fields change

-- Ensure updated_at column exists on diretorio_clientes
ALTER TABLE diretorio_clientes
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION sync_client_to_directory_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync if relevant fields changed
  IF (
    OLD.name IS DISTINCT FROM NEW.name OR
    OLD.segment IS DISTINCT FROM NEW.segment OR
    OLD.website IS DISTINCT FROM NEW.website OR
    OLD.contact_email IS DISTINCT FROM NEW.contact_email OR
    OLD.contact_phone IS DISTINCT FROM NEW.contact_phone OR
    OLD.status IS DISTINCT FROM NEW.status OR
    OLD.observations IS DISTINCT FROM NEW.observations
  ) THEN
    UPDATE diretorio_clientes SET
      nome = NEW.name,
      segmento = NEW.segment,
      email = NEW.contact_email,
      telefone = NEW.contact_phone,
      site = NEW.website,
      status = LOWER(COALESCE(NEW.status, 'Ativo')),
      observacoes = NEW.observations,
      updated_at = NOW()
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in sync_client_to_directory_update: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trg_sync_client_update ON clients;

-- Create the trigger
CREATE TRIGGER trg_sync_client_update
AFTER UPDATE ON clients
FOR EACH ROW
EXECUTE FUNCTION sync_client_to_directory_update();
