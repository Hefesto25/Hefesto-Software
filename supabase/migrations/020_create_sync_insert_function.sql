-- Migration: Create function to sync clients INSERT to diretorio_clientes
-- Purpose: Automatically create directory entry when new client is added to CRM

CREATE OR REPLACE FUNCTION sync_client_to_directory_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO diretorio_clientes (
    id,
    nome,
    segmento,
    email,
    telefone,
    site,
    status,
    observacoes,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.name,
    NEW.segment,
    NEW.contact_email,
    NEW.contact_phone,
    NEW.website,
    LOWER(COALESCE(NEW.status, 'Ativo')),
    NEW.observations,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    segmento = EXCLUDED.segmento,
    email = EXCLUDED.email,
    telefone = EXCLUDED.telefone,
    site = EXCLUDED.site,
    status = EXCLUDED.status,
    observacoes = EXCLUDED.observacoes
  WHERE diretorio_clientes.id = NEW.id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in sync_client_to_directory_insert: %', SQLERRM;
  RETURN NEW; -- Don't fail the original insert
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists (PostgreSQL does not support CREATE OR REPLACE TRIGGER)
DROP TRIGGER IF EXISTS trg_sync_client_insert ON clients;

-- Create the trigger
CREATE TRIGGER trg_sync_client_insert
AFTER INSERT ON clients
FOR EACH ROW
EXECUTE FUNCTION sync_client_to_directory_insert();
