-- 1. ADICIONAR COLUNA 'id_usuario' À TABELA EXISTENTE
ALTER TABLE public.atendimentos
ADD COLUMN id_usuario UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. CORRIGIR A POLÍTICA DE RLS (ROW-LEVEL SECURITY)
-- Remove a política insegura atual
DROP POLICY IF EXISTS "Permitir acesso total para usuários autenticados" ON public.atendimentos;

-- Cria a política correta que isola os dados por usuário
CREATE POLICY "Usuários podem acessar e gerenciar apenas seus próprios atendimentos."
ON public.atendimentos
FOR ALL
USING ( auth.uid() = id_usuario );

-- 3. CRIAR TABELA DE USUÁRIOS PARA GUARDAR TOKENS
CREATE TABLE public.usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  google_access_token TEXT,
  google_refresh_token TEXT,
  google_token_expiry TIMESTAMPTZ,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela usuarios
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- Política RLS para tabela usuarios
CREATE POLICY "Usuários podem gerenciar seus próprios perfis." 
ON public.usuarios 
FOR ALL 
USING ( auth.uid() = id );

-- Trigger para atualizar updated_at em usuarios
CREATE TRIGGER update_usuarios_updated_at
BEFORE UPDATE ON public.usuarios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();