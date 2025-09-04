import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [loading, setLoading] = useState(true);
  const { session } = useAuth();
  const { toast } = useToast();

  const fetchAtendimentos = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('atendimentos')
        .select('*')
        .order('data_agendamento', { ascending: true });

      if (error) throw error;
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
    if (!session?.access_token) {
      console.warn('Usuário não autenticado');
      return;
    }

    try {
      console.log('🔄 Iniciando sincronização via Edge Function...');
      
      const { data, error } = await supabase.functions.invoke('sync-calendar', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro na sincronização');
      }

      console.log('✅ Sincronização concluída:', data.message);
      await fetchAtendimentos();
      
      toast({
        title: "Sincronização concluída",
        description: data.message,
        variant: "default"
      });
    } catch (error) {
      console.error('❌ Erro na sincronização:', error);
      toast({
        title: "Erro na sincronização",
        description: error instanceof Error ? error.message : "Não foi possível sincronizar com o Google Calendar.",
        variant: "destructive"
      });
    }
  }, [session?.access_token, fetchAtendimentos, toast]);

  const updateStatus = useCallback(async (
    atendimentoId: string,
    plano: string,
    valorCobrado: number
  ): Promise<boolean> => {
    if (!session?.access_token) {
      toast({
        title: "Erro de autenticação",
        description: "Usuário não autenticado.",
        variant: "destructive"
      });
      return false;
    }

    try {
      console.log('💼 Efetivando consulta via Edge Function...');
      
      const { data, error } = await supabase.functions.invoke('efetivar-consulta', {
        body: {
          atendimentoId,
          plano,
          valorCobrado,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao efetivar consulta');
      }

      console.log('✅ Consulta efetivada com sucesso');
      await fetchAtendimentos();
      
      toast({
        title: "Consulta efetivada com sucesso!",
        description: "O atendimento foi marcado como atendido e removido da agenda.",
        variant: "default"
      });

      return true;
    } catch (error) {
      console.error('❌ Erro ao efetivar consulta:', error);
      toast({
        title: "Erro ao efetivar consulta",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive"
      });
      return false;
    }
  }, [session?.access_token, fetchAtendimentos, toast]);

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

  return {
    atendimentos,
    agendamentos,
    metrics,
    loading,
    updateStatus,
    syncGoogleCalendar
  };
};