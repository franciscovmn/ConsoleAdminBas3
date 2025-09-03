// src/hooks/useAtendimentos.ts -> CÓDIGO CORRIGIDO E COMPLETO

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { startOfMonth, endOfMonth } from 'date-fns';
import type { Tables } from '@/integrations/supabase/types';

// Exportando a interface para ser usada em outros lugares
export type Atendimento = Tables<'atendimentos'>;

// Interface para as métricas
interface Metrics {
  novosContatos: number;
  consultasAtendidas: number;
  receitaMes: number;
}

export const useAtendimentos = () => {
  // DECLARAÇÕES DE ESTADO (PROVÁVEL FONTE DO ERRO ORIGINAL)
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [loading, setLoading] = useState(true);
  const { session } = useAuth();
  const { toast } = useToast();

  const fetchAtendimentos = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('atendimentos')
        .select('*')
        .order('data_agendamento', { ascending: true });

      if (error) throw error;
      
      setAtendimentos(data || []);
    } catch (error) {
      console.error('Erro ao buscar atendimentos:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível buscar os agendamentos.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [session, toast]);

  useEffect(() => {
    fetchAtendimentos();
  }, [fetchAtendimentos]);

  const syncGoogleCalendar = useCallback(async () => {
    // Sua função de sincronia... (parece correta)
    if (!session?.provider_token) {
      toast({ title: "Erro de Autenticação", description: "Sessão com o Google expirou. Por favor, faça login novamente.", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.functions.invoke('sync-calendar', {
        body: { provider_token: session.provider_token },
      });
      if (error) throw error;
      toast({ title: "Sincronização iniciada!", description: "Seus agendamentos estão sendo atualizados." });
      await fetchAtendimentos();
    } catch (error) {
      console.error('Erro na sincronização:', error);
      toast({
        title: "Erro na sincronização",
        description: "Não foi possível sincronizar com o Google Calendar.",
        variant: "destructive"
      });
    }
  }, [session?.provider_token, fetchAtendimentos, toast]);

  const updateStatus = useCallback(async (
    atendimento: Atendimento, // Espera o objeto completo
    plano: string,
    valorCobrado: number
  ): Promise<boolean> => {
    try {
      const { error } = await supabase.functions.invoke('efetivar-consulta', {
        body: {
          atendimentoId: atendimento.id,
          plano,
          valorCobrado,
          googleCalendarEventId: atendimento.google_calendar_event_id,
          valorPadrao: atendimento.valor_padrao,
          nomeCliente: atendimento.nome_cliente,
        },
      });

      if (error) throw error;

      await fetchAtendimentos();
      toast({
        title: "Consulta efetivada com sucesso!",
        description: "O atendimento foi marcado como atendido e atualizado na sua agenda.",
        variant: "default"
      });
      return true;

    } catch (error) {
      console.error('Erro ao efetivar consulta:', error);
      toast({
        title: "Erro ao efetivar consulta",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive"
      });
      return false;
    }
  }, [fetchAtendimentos, toast]);

  // CÁLCULO DE AGENDAMENTOS E MÉTRICAS (AQUI ESTAVA O ERRO)
  const agendamentos = useMemo(() => {
    return atendimentos.filter(a => a.status === 'agendado');
  }, [atendimentos]);

  const metrics: Metrics = useMemo(() => {
    const agora = new Date();
    const inicioDoMes = startOfMonth(agora);
    const fimDoMes = endOfMonth(agora);

    const atendimentosDoMes = atendimentos.filter(a => {
      const data = new Date(a.created_at); // Usando created_at para "novos contatos"
      return data >= inicioDoMes && data <= fimDoMes;
    });

    const consultasAtendidasNoMes = atendimentosDoMes.filter(a => a.status === 'atendido');

    const receitaMes = consultasAtendidasNoMes.reduce((acc, curr) => acc + (curr.valor_cobrado || 0), 0);

    return {
      novosContatos: atendimentosDoMes.length,
      consultasAtendidas: consultasAtendidasNoMes.length,
      receitaMes,
    };
  }, [atendimentos]); // Depende de 'atendimentos'

  return {
    atendimentos,
    agendamentos,
    metrics,
    loading,
    updateStatus,
    syncGoogleCalendar,
  };
};