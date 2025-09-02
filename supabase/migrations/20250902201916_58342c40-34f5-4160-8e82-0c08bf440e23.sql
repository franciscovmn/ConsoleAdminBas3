-- Criar a tabela de atendimentos
CREATE TABLE public.atendimentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  nome_cliente TEXT NOT NULL,
  contato_cliente TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('agendado', 'atendido', 'cancelado')),
  google_calendar_event_id TEXT UNIQUE, -- Garante que cada evento do Google seja único
  data_agendamento TIMESTAMP WITH TIME ZONE,
  plano TEXT, -- Ex: 'consulta_avulsa', 'plano_trimestral'
  valor_padrao NUMERIC, -- O valor padrão da consulta (ex: 150.00)
  valor_cobrado NUMERIC, -- O valor final pago pelo cliente
  desconto NUMERIC -- A diferença entre valor_padrao e valor_cobrado
);

-- Habilitar Row Level Security
ALTER TABLE public.atendimentos ENABLE ROW LEVEL SECURITY;

-- Permitir acesso total para usuários autenticados
CREATE POLICY "Permitir acesso total para usuários autenticados"
ON public.atendimentos
FOR ALL
USING (auth.role() = 'authenticated');

-- Criar função para atualizar timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Criar trigger para automatic timestamp updates
CREATE TRIGGER update_atendimentos_updated_at
    BEFORE UPDATE ON public.atendimentos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();