import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// ... (interface Atendimento permanece a mesma) ...

export const useAtendimentos = () => {
  // ... (estados existentes permanecem os mesmos) ...
  const { session } = useAuth();
  const { toast } = useToast();

  const fetchAtendimentos = useCallback(async () => {
    // ... (esta função permanece a mesma) ...
  }, [toast]);

  const syncGoogleCalendar = useCallback(async () => {
    if (!session?.provider_token) {
      toast({ title: "Erro de Autenticação", description: "Sessão com o Google expirou. Por favor, faça login novamente.", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.functions.invoke('sync-calendar', {
        body: { provider_token: session.provider_token },
      });
      if (error) throw error;
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
    atendimento: Atendimento,
    plano: string,
    valorCobrado: number
  ): Promise<boolean> => {
    try {
      // Melhoria: Passar todos os dados necessários para a Edge Function
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

  // ... (o restante do hook, useEffect e metrics, permanece o mesmo) ...

  return {
    atendimentos,
    agendamentos,
    metrics,
    loading,
    updateStatus,
    syncGoogleCalendar,
  };
};