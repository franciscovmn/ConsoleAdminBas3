-- FASE 1: Correções Críticas de Segurança do Banco de Dados

-- 1. Tornar id_usuario NOT NULL para prevenir bypass de RLS
ALTER TABLE public.atendimentos ALTER COLUMN id_usuario SET NOT NULL;

-- 2. Adicionar trigger para automaticamente popular id_usuario
CREATE OR REPLACE FUNCTION public.set_atendimento_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Se id_usuario não foi fornecido, usar o usuário atual
  IF NEW.id_usuario IS NULL THEN
    NEW.id_usuario = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger para INSERT
CREATE TRIGGER set_atendimento_user_id_trigger
  BEFORE INSERT ON public.atendimentos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_atendimento_user_id();

-- 3. Criar função para criar perfil de usuário automaticamente no primeiro login
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

-- Criar trigger para criação automática de perfil
CREATE TRIGGER on_auth_user_created_google
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_google_user_creation();