-- FASE 1: Correções Críticas de Segurança do Banco de Dados

-- 1. Tornar id_usuario NOT NULL para prevenir bypass de RLS
-- Primeiro, atualizar registros existentes com NULL id_usuario
UPDATE public.atendimentos 
SET id_usuario = (SELECT id FROM auth.users LIMIT 1)
WHERE id_usuario IS NULL;

-- Depois tornar a coluna NOT NULL
ALTER TABLE public.atendimentos ALTER COLUMN id_usuario SET NOT NULL;

-- 2. Criar função para criar perfil de usuário automaticamente no primeiro login
CREATE OR REPLACE FUNCTION public.handle_google_user_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir na tabela usuarios se não existir
  INSERT INTO public.usuarios (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger para criação automática de perfil (se não existir)
DROP TRIGGER IF EXISTS on_auth_user_created_google ON auth.users;
CREATE TRIGGER on_auth_user_created_google
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_google_user_creation();