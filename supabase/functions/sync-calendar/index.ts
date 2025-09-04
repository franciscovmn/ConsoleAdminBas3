import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('User authenticated:', user.id);

    // Buscar tokens do Google do usuário
    const { data: userData, error: userError } = await supabaseClient
      .from('usuarios')
      .select('google_access_token, google_refresh_token, google_token_expiry')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.google_access_token) {
      console.error('User data error:', userError);
      return new Response(JSON.stringify({ error: 'Tokens do Google não encontrados' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar se o token está válido
    let accessToken = userData.google_access_token;
    const tokenExpiry = userData.google_token_expiry ? new Date(userData.google_token_expiry) : null;
    const now = new Date();

    // Se o token expirou, tentar renovar
    if (tokenExpiry && now >= tokenExpiry && userData.google_refresh_token) {
      console.log('Token expired, refreshing...');
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
          refresh_token: userData.google_refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        accessToken = refreshData.access_token;
        
        // Atualizar tokens no banco
        await supabaseClient
          .from('usuarios')
          .update({
            google_access_token: accessToken,
            google_token_expiry: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
          })
          .eq('id', user.id);
      } else {
        return new Response(JSON.stringify({ error: 'Falha ao renovar token do Google' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Buscar eventos do Google Calendar
    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now.toISOString()}&maxResults=100&singleEvents=true&orderBy=startTime`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!calendarResponse.ok) {
      const errorText = await calendarResponse.text();
      console.error('Google Calendar API error:', errorText);
      return new Response(JSON.stringify({ error: 'Falha ao buscar eventos do Google Calendar' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const calendarData = await calendarResponse.json();
    const events: GoogleCalendarEvent[] = calendarData.items || [];

    console.log(`Found ${events.length} events from Google Calendar`);

    // Processar cada evento
    let processedCount = 0;
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
        valor_padrao: 150.00,
        id_usuario: user.id // Sempre incluir o id do usuário
      };

      // Upsert no Supabase
      const { error } = await supabaseClient
        .from('atendimentos')
        .upsert(atendimentoData, {
          onConflict: 'google_calendar_event_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('Erro no upsert:', error);
      } else {
        processedCount++;
      }
    }

    // Limpeza: remover atendimentos agendados que não existem mais no Google
    const { data: atendimentosAgendados } = await supabaseClient
      .from('atendimentos')
      .select('id, google_calendar_event_id')
      .eq('status', 'agendado')
      .eq('id_usuario', user.id);

    let removedCount = 0;
    if (atendimentosAgendados) {
      const googleEventIds = events.map(e => e.id);
      const atendimentosParaRemover = atendimentosAgendados.filter(
        a => a.google_calendar_event_id && !googleEventIds.includes(a.google_calendar_event_id)
      );

      for (const atendimento of atendimentosParaRemover) {
        const { error } = await supabaseClient
          .from('atendimentos')
          .delete()
          .eq('id', atendimento.id);
        
        if (!error) removedCount++;
      }
    }

    console.log(`Sync completed - Processed: ${processedCount}, Removed: ${removedCount}`);

    return new Response(JSON.stringify({ 
      success: true, 
      processed: processedCount,
      removed: removedCount 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in sync-calendar function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});