// src/hooks/useAtendimentos.ts -> CÓDIGO CORRIGIDO E COMPLETO

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { startOfMonth, endOfMonth } from 'date-fns';
import type { Tables } from '@/integrations/supabase/types';

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
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
=======
export interface Atendimento {
  id: string;
  created_at: string;
  updated_at: string;
  nome_cliente: string;
  contato_cliente: string;
  status: 'agendado' | 'atendido' | 'cancelado';
  google_calendar_event_id?: string;
  data_agendamento?: string;
  plano?: string;
  valor_padrao?: number;
  valor_cobrado?: number;
  desconto?: number;
}


export const useAtendimentos = () => {
>>>>>>> parent of b2ed3e9 (supabase)
=======
export interface Atendimento {
  id: string;
  created_at: string;
  updated_at: string;
  nome_cliente: string;
  contato_cliente: string;
  status: 'agendado' | 'atendido' | 'cancelado';
  google_calendar_event_id?: string;
  data_agendamento?: string;
  plano?: string;
  valor_padrao?: number;
  valor_cobrado?: number;
  desconto?: number;
}


export const useAtendimentos = () => {
>>>>>>> parent of b2ed3e9 (supabase)
=======
export interface Atendimento {
  id: string;
  created_at: string;
  updated_at: string;
  nome_cliente: string;
  contato_cliente: string;
  status: 'agendado' | 'atendido' | 'cancelado';
  google_calendar_event_id?: string;
  data_agendamento?: string;
  plano?: string;
  valor_padrao?: number;
  valor_cobrado?: number;
  desconto?: number;
}


export const useAtendimentos = () => {
>>>>>>> parent of b2ed3e9 (supabase)
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [loading, setLoading] = useState(true);
  const { session } = useAuth();
  const { toast } = useToast();

  const fetchAtendimentos = useCallback(async () => {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
    if (!session) return;
    setLoading(true);
=======
>>>>>>> parent of b2ed3e9 (supabase)
=======
>>>>>>> parent of b2ed3e9 (supabase)
=======
>>>>>>> parent of b2ed3e9 (supabase)
    try {
      const { data, error } = await supabase
        .from('atendimentos')
        .select('*')
        .order('data_agendamento', { ascending: true });

      if (error) throw error;
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
      
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
=======
=======
>>>>>>> parent of b2ed3e9 (supabase)
=======
>>>>>>> parent of b2ed3e9 (supabase)
      setAtendimentos((data || []) as Atendimento[]);
    } catch (error) {
      console.error('Erro ao buscar atendimentos:', error);
      toast({
        title: "Erro ao carregar atendimentos",
        description: "Não foi possível carregar os dados. Tente novamente.",
        variant: "destructive"
      });
    }
  }, [toast]);

  const syncGoogleCalendar = useCallback(async () => {
    if (!session) {
      console.warn('Sessão não disponível');
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> parent of b2ed3e9 (supabase)
=======
>>>>>>> parent of b2ed3e9 (supabase)
=======
>>>>>>> parent of b2ed3e9 (supabase)
      return;
    }

    try {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
      const { error } = await supabase.functions.invoke('sync-calendar', {
        body: { provider_token: session.provider_token },
      });
      if (error) throw error;
      toast({ title: "Sincronização iniciada!", description: "Seus agendamentos estão sendo atualizados." });
=======
=======
>>>>>>> parent of b2ed3e9 (supabase)
=======
>>>>>>> parent of b2ed3e9 (supabase)
      const { data, error } = await supabase.functions.invoke('sync-calendar');
      
      if (error) {
        throw error;
      }

<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> parent of b2ed3e9 (supabase)
=======
>>>>>>> parent of b2ed3e9 (supabase)
=======
>>>>>>> parent of b2ed3e9 (supabase)
      await fetchAtendimentos();
      
      toast({
        title: "Sincronização concluída",
        description: data?.message || "Google Calendar sincronizado com sucesso!",
        variant: "default"
      });
    } catch (error) {
      console.error('Erro na sincronização:', error);
      toast({
        title: "Erro na sincronização",
        description: "Não foi possível sincronizar com o Google Calendar.",
        variant: "destructive"
      });
    }
  }, [session, fetchAtendimentos, toast]);

  const updateStatus = useCallback(async (
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
    atendimento: Atendimento, // Espera o objeto completo
=======
    atendimentoId: string,
>>>>>>> parent of b2ed3e9 (supabase)
=======
    atendimentoId: string,
>>>>>>> parent of b2ed3e9 (supabase)
=======
    atendimentoId: string,
>>>>>>> parent of b2ed3e9 (supabase)
    plano: string,
    valorCobrado: number
  ): Promise<boolean> => {
    try {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
      const { error } = await supabase.functions.invoke('efetivar-consulta', {
        body: {
          atendimentoId: atendimento.id,
          plano,
          valorCobrado,
          googleCalendarEventId: atendimento.google_calendar_event_id,
          valorPadrao: atendimento.valor_padrao,
          nomeCliente: atendimento.nome_cliente,
        },
=======
      const { data, error } = await supabase.functions.invoke('efetivar-consulta', {
        body: { atendimentoId, plano, valorCobrado }
>>>>>>> parent of b2ed3e9 (supabase)
=======
      const { data, error } = await supabase.functions.invoke('efetivar-consulta', {
        body: { atendimentoId, plano, valorCobrado }
>>>>>>> parent of b2ed3e9 (supabase)
=======
      const { data, error } = await supabase.functions.invoke('efetivar-consulta', {
        body: { atendimentoId, plano, valorCobrado }
>>>>>>> parent of b2ed3e9 (supabase)
      });
      
      if (error) {
        throw error;
      }

      await fetchAtendimentos();
      
      toast({
        title: "Consulta efetivada com sucesso!",
        description: "O atendimento foi marcado como atendido e removido da agenda.",
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

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
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
=======
=======
>>>>>>> parent of b2ed3e9 (supabase)
=======
>>>>>>> parent of b2ed3e9 (supabase)
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await syncGoogleCalendar();
      setLoading(false);
    };

    if (session) {
      loadData();
    }
  }, [session, syncGoogleCalendar]);

  // Métricas calculadas
  const metrics = {
    novosContatos: atendimentos.filter(a => {
      const thisMonth = new Date().getMonth();
      const thisYear = new Date().getFullYear();
      const atendimentoDate = new Date(a.created_at);
      return atendimentoDate.getMonth() === thisMonth && 
             atendimentoDate.getFullYear() === thisYear;
    }).length,

    consultasAtendidas: atendimentos.filter(a => {
      const thisMonth = new Date().getMonth();
      const thisYear = new Date().getFullYear();
      const atendimentoDate = new Date(a.updated_at);
      return a.status === 'atendido' && 
             atendimentoDate.getMonth() === thisMonth && 
             atendimentoDate.getFullYear() === thisYear;
    }).length,

    receitaMes: atendimentos
      .filter(a => {
        const thisMonth = new Date().getMonth();
        const thisYear = new Date().getFullYear();
        const atendimentoDate = new Date(a.updated_at);
        return a.status === 'atendido' && 
               atendimentoDate.getMonth() === thisMonth && 
               atendimentoDate.getFullYear() === thisYear;
      })
      .reduce((total, a) => total + (a.valor_cobrado || 0), 0)
  };

  const agendamentos = atendimentos.filter(a => a.status === 'agendado');
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> parent of b2ed3e9 (supabase)
=======
>>>>>>> parent of b2ed3e9 (supabase)
=======
>>>>>>> parent of b2ed3e9 (supabase)

  return {
    atendimentos,
    agendamentos,
    metrics,
    loading,
    updateStatus,
    syncGoogleCalendar
  };
};