import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user from JWT
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Usuário não autenticado');
    }

    console.log('🔄 Iniciando sincronização para usuário:', user.id);

    // Get user's Google tokens from usuarios table
    const { data: userData, error: tokenError } = await supabaseClient
      .from('usuarios')
      .select('google_access_token, google_refresh_token, google_token_expiry')
      .eq('id', user.id)
      .single();

    if (tokenError || !userData?.google_access_token) {
      throw new Error('Tokens do Google não encontrados. Faça login novamente.');
    }

    let accessToken = userData.google_access_token;

    // Check if token is expired and refresh if needed
    if (userData.google_token_expiry && new Date(userData.google_token_expiry) <= new Date()) {
      console.log('🔄 Token expirado, renovando...');
      
      if (!userData.google_refresh_token) {
        throw new Error('Token de refresh não disponível. Faça login novamente.');
      }

      // Refresh the token
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
          refresh_token: userData.google_refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (!refreshResponse.ok) {
        throw new Error('Falha ao renovar token do Google');
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;

      // Update tokens in database
      const newExpiry = new Date(Date.now() + (refreshData.expires_in * 1000));
      await supabaseClient
        .from('usuarios')
        .update({
          google_access_token: accessToken,
          google_token_expiry: newExpiry.toISOString(),
        })
        .eq('id', user.id);
    }

    // Fetch events from Google Calendar
    const now = new Date().toISOString();
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&maxResults=100&singleEvents=true&orderBy=startTime`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Falha ao buscar eventos do Google Calendar');
    }

    const data = await response.json();
    const events: GoogleCalendarEvent[] = data.items || [];

    console.log(`📅 Encontrados ${events.length} eventos no Google Calendar`);

    // Process each event
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
        valor_padrao: parseFloat(Deno.env.get('VALOR_PADRAO_CONSULTA') ?? '150'),
        id_usuario: user.id,
      };

      // Upsert in Supabase using google_calendar_event_id as conflict key
      const { error } = await supabaseClient
        .from('atendimentos')
        .upsert(atendimentoData, {
          onConflict: 'google_calendar_event_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('❌ Erro no upsert:', error);
      } else {
        processedCount++;
      }
    }

    // Cleanup: remove scheduled appointments that no longer exist in Google
    const { data: atendimentosAgendados } = await supabaseClient
      .from('atendimentos')
      .select('id, google_calendar_event_id')
      .eq('status', 'agendado')
      .eq('id_usuario', user.id);

    if (atendimentosAgendados) {
      const googleEventIds = events.map(e => e.id);
      const atendimentosParaRemover = atendimentosAgendados.filter(
        a => a.google_calendar_event_id && !googleEventIds.includes(a.google_calendar_event_id)
      );

      let removedCount = 0;
      for (const atendimento of atendimentosParaRemover) {
        const { error } = await supabaseClient
          .from('atendimentos')
          .delete()
          .eq('id', atendimento.id);

        if (!error) {
          removedCount++;
        }
      }

      console.log(`🗑️ Removidos ${removedCount} atendimentos obsoletos`);
    }

    console.log(`✅ Sincronização concluída: ${processedCount} eventos processados`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sincronização concluída com sucesso',
        processed: processedCount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});