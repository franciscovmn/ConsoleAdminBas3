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

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
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
    if (!session?.provider_token) {
      console.warn('Token do Google não disponível');
      return;
    }

    try {
      const now = new Date().toISOString();
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&maxResults=100&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            Authorization: `Bearer ${session.provider_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Falha ao buscar eventos do Google Calendar');
      }

      const data = await response.json();
      const events: GoogleCalendarEvent[] = data.items || [];

      // Processar cada evento
      for (const event of events) {
        if (!event.summary || !event.start?.dateTime) continue;

        const attendeeEmail = event.attendees?.[0]?.email || '';
        const attendeeName = event.attendees?.[0]?.displayName || event.summary;

        const atendimentoData = {
          nome_cliente: attendeeName,
          contato_cliente: attendeeEmail,
          status: 'agendado' as const,
          google_calendar_event_id: event.id,
          data_agendamento: event.start.dateTime,
          valor_padrao: 150.00 // Valor padrão da consulta
        };

        // Upsert no Supabase usando google_calendar_event_id como chave de conflito
        const { error } = await supabase
          .from('atendimentos')
          .upsert(atendimentoData, {
            onConflict: 'google_calendar_event_id',
            ignoreDuplicates: false
          });

        if (error) {
          console.error('Erro no upsert:', error);
        }
      }

      // Limpeza: remover atendimentos agendados que não existem mais no Google
      const { data: atendimentosAgendados } = await supabase
        .from('atendimentos')
        .select('id, google_calendar_event_id')
        .eq('status', 'agendado');

      if (atendimentosAgendados) {
        const googleEventIds = events.map(e => e.id);
        const atendimentosParaRemover = atendimentosAgendados.filter(
          a => a.google_calendar_event_id && !googleEventIds.includes(a.google_calendar_event_id)
        );

        for (const atendimento of atendimentosParaRemover) {
          await supabase
            .from('atendimentos')
            .delete()
            .eq('id', atendimento.id);
        }
      }

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
    atendimentoId: string,
    plano: string,
    valorCobrado: number
  ): Promise<boolean> => {
    try {
      // Buscar o atendimento para obter o google_calendar_event_id
      const { data: atendimento, error: fetchError } = await supabase
        .from('atendimentos')
        .select('google_calendar_event_id, valor_padrao')
        .eq('id', atendimentoId)
        .single();

      if (fetchError || !atendimento) {
        throw new Error('Atendimento não encontrado');
      }

      // Deletar do Google Calendar se houver event_id
      if (atendimento.google_calendar_event_id && session?.provider_token) {
        const deleteResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${atendimento.google_calendar_event_id}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${session.provider_token}`,
            },
          }
        );

        if (!deleteResponse.ok) {
          throw new Error('Falha ao remover evento do Google Calendar');
        }
      }

      // Calcular desconto
      const valorPadrao = atendimento.valor_padrao || 150;
      const desconto = valorPadrao - valorCobrado;

      // Atualizar no Supabase
      const { error: updateError } = await supabase
        .from('atendimentos')
        .update({
          status: 'atendido',
          plano,
          valor_cobrado: valorCobrado,
          desconto
        })
        .eq('id', atendimentoId);

      if (updateError) {
        throw updateError;
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
  }, [session?.provider_token, fetchAtendimentos, toast]);

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