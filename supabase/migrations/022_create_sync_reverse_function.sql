-- Migration: Create function to sync diretorio_clientes UPDATE back to clients
-- Purpose: Keep shared fields in sync from directory back to CRM

CREATE OR REPLACE FUNCTION sync_directory_to_client_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync shared fields back to clients
  IF (
    OLD.nome IS DISTINCT FROM NEW.nome OR
    OLD.segmento IS DISTINCT FROM NEW.segmento OR
    OLD.site IS DISTINCT FROM NEW.site OR
    OLD.email IS DISTINCT FROM NEW.email OR
    OLD.telefone IS DISTINCT FROM NEW.telefone OR
    OLD.status IS DISTINCT FROM NEW.status OR
    OLD.observacoes IS DISTINCT FROM NEW.observacoes
  ) THEN
    UPDATE clients SET
      name = NEW.nome,
      segment = NEW.segmento,
      contact_email = NEW.email,
      contact_phone = NEW.telefone,
      website = NEW.site,
      status = CASE LOWER(NEW.status) WHEN 'ativo' THEN 'Ativo' WHEN 'inativo' THEN 'Inativo' ELSE NEW.status END,
      observations = NEW.observacoes,
      updated_at = NOW()
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in sync_directory_to_client_update: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trg_sync_directory_update ON diretorio_clientes;

-- Create the trigger
CREATE TRIGGER trg_sync_directory_update
AFTER UPDATE ON diretorio_clientes
FOR EACH ROW
EXECUTE FUNCTION sync_directory_to_client_update();
