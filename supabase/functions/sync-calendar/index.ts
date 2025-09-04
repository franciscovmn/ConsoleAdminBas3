import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

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
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Token de autorização necessário');
    }

    const token = authHeader.split(' ')[1];

    // Verify token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Token inválido');
    }

    console.log('Iniciando sincronização para usuário:', user.id);

    // Get Google tokens from database
    const { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .select('google_access_token, google_refresh_token, google_token_expiry')
      .eq('id', user.id)
      .single();

    if (userError || !usuario) {
      throw new Error('Tokens do Google não encontrados');
    }

    let accessToken = usuario.google_access_token;

    // Check if token is expired and refresh if needed
    if (usuario.google_token_expiry && new Date(usuario.google_token_expiry) < new Date()) {
      console.log('Token expirado, renovando...');
      
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
          refresh_token: usuario.google_refresh_token,
          grant_type: 'refresh_token'
        })
      });

      const refreshData = await refreshResponse.json();
      if (refreshData.error) {
        throw new Error('Falha ao renovar token: ' + refreshData.error_description);
      }

      accessToken = refreshData.access_token;
      const newExpiry = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();

      // Update tokens in database
      await supabase
        .from('usuarios')
        .update({
          google_access_token: accessToken,
          google_token_expiry: newExpiry
        })
        .eq('id', user.id);
    }

    // Fetch calendar events
    const now = new Date().toISOString();
    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&maxResults=100&singleEvents=true&orderBy=startTime`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!calendarResponse.ok) {
      const errorText = await calendarResponse.text();
      console.error('Erro na API do Google Calendar:', errorText);
      throw new Error('Falha ao buscar eventos do Google Calendar');
    }

    const calendarData = await calendarResponse.json();
    const events: GoogleCalendarEvent[] = calendarData.items || [];

    console.log(`Processando ${events.length} eventos do Google Calendar`);

    // Process each event
    for (const event of events) {
      if (!event.summary || !event.start?.dateTime) continue;

      const attendeeEmail = event.attendees?.[0]?.email || '';
      const attendeeName = event.attendees?.[0]?.displayName || event.summary;

      const valorPadrao = parseFloat(Deno.env.get('VALOR_PADRAO_CONSULTA') || '150');

      const atendimentoData = {
        id_usuario: user.id,
        nome_cliente: attendeeName,
        contato_cliente: attendeeEmail,
        status: 'agendado' as const,
        google_calendar_event_id: event.id,
        data_agendamento: event.start.dateTime,
        valor_padrao: valorPadrao
      };

      // Upsert no Supabase usando google_calendar_event_id como chave de conflito
      const { error } = await supabase
        .from('atendimentos')
        .upsert(atendimentoData, {
          onConflict: 'google_calendar_event_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('Erro no upsert do atendimento:', error);
      }
    }

    // Cleanup: remove scheduled appointments that no longer exist in Google
    const { data: atendimentosAgendados } = await supabase
      .from('atendimentos')
      .select('id, google_calendar_event_id')
      .eq('status', 'agendado')
      .eq('id_usuario', user.id);

    if (atendimentosAgendados) {
      const googleEventIds = events.map(e => e.id);
      const atendimentosParaRemover = atendimentosAgendados.filter(
        a => a.google_calendar_event_id && !googleEventIds.includes(a.google_calendar_event_id)
      );

      for (const atendimento of atendimentosParaRemover) {
        const { error: deleteError } = await supabase
          .from('atendimentos')
          .delete()
          .eq('id', atendimento.id);

        if (deleteError) {
          console.error('Erro ao deletar atendimento:', deleteError);
        }
      }
    }

    console.log('Sincronização concluída com sucesso');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Sincronização concluída com sucesso',
        eventsProcessed: events.length 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Erro na sincronização:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro interno do servidor' 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});