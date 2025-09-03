import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

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

Deno.serve(async (req) => {
  // Tratar requisição pre-flight OPTIONS para CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    const { data: { session } } = await supabaseUser.auth.getSession();
    const providerToken = session?.provider_token;
    if (!providerToken) {
      throw new Error('Token do provedor Google não encontrado.');
    }

    const now = new Date().toISOString();
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&maxResults=100&singleEvents=true&orderBy=startTime`,
      {
        headers: { Authorization: `Bearer ${providerToken}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Falha ao buscar eventos do Google Calendar: ${response.statusText}`);
    }

    const data = await response.json();
    const events: GoogleCalendarEvent[] = data.items || [];
    
    // Melhoria: Usar variável de ambiente para o valor padrão
    const valorPadraoConsulta = parseFloat(Deno.env.get('VALOR_PADRAO_CONSULTA') ?? '150');

    for (const event of events) {
      // Ignora eventos que já foram atendidos (marcados com ✅) ou sem data/hora
      if (!event.summary || !event.start?.dateTime || event.summary.startsWith('✅')) continue;

      const attendeeEmail = event.attendees?.[0]?.email || 'Não informado';
      const attendeeName = event.attendees?.[0]?.displayName || event.summary;

      const atendimentoData = {
        id_usuario: user.id,
        nome_cliente: attendeeName,
        contato_cliente: attendeeEmail,
        status: 'agendado' as const,
        google_calendar_event_id: event.id,
        data_agendamento: event.start.dateTime,
        valor_padrao: valorPadraoConsulta,
      };

      // Usar a chave de serviço para o upsert para contornar políticas de RLS dentro da função
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { error } = await supabaseAdmin
        .from('atendimentos')
        .upsert(atendimentoData, { onConflict: 'google_calendar_event_id' });

      if (error) {
        console.error('Erro no upsert do atendimento:', error);
      }
    }

    return new Response(JSON.stringify({ message: 'Sincronização concluída!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Erro na função sync-calendar:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});