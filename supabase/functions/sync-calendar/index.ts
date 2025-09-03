<<<<<<< HEAD
<<<<<<< HEAD
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
=======
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
=======
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
>>>>>>> parent of b2ed3e9 (supabase)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
>>>>>>> parent of b2ed3e9 (supabase)

<<<<<<< HEAD
// ... (interface e esquema de validação permanecem os mesmos) ...

<<<<<<< HEAD
// A mudança está aqui: trocamos Deno.serve por serve()
=======
>>>>>>> parent of b2ed3e9 (supabase)
=======
>>>>>>> parent of b2ed3e9 (supabase)
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
<<<<<<< HEAD
<<<<<<< HEAD
    // O restante da lógica da função permanece exatamente o mesmo...
    const { provider_token } = await req.json();
    
    const supabaseUser = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    if (!provider_token) throw new Error('Token do provedor Google não encontrado.');
    
    // ... (resto da lógica de busca e upsert dos eventos) ...
    // ... (código omitido por brevidade, ele continua igual ao que você já tem) ...

    return new Response(JSON.stringify({ message: 'Sincronização concluída!' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
=======
=======
>>>>>>> parent of b2ed3e9 (supabase)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verificar se o usuário está autenticado
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Syncing calendar for user:', user.id);

    // Buscar o token do Google do usuário
    const { data: userData } = await supabaseClient
      .from('usuarios')
      .select('google_access_token')
      .eq('id', user.id)
      .single();

    const googleToken = userData?.google_access_token;
    if (!googleToken) {
      console.error('Google token not found for user:', user.id);
      return new Response(
        JSON.stringify({ error: 'Token do Google não encontrado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar eventos do Google Calendar
    const now = new Date().toISOString();
    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&maxResults=100&singleEvents=true&orderBy=startTime`,
      {
        headers: {
          Authorization: `Bearer ${googleToken}`,
        },
      }
    );

    if (!calendarResponse.ok) {
      console.error('Failed to fetch Google Calendar events:', await calendarResponse.text());
      throw new Error('Falha ao buscar eventos do Google Calendar');
    }

    const calendarData = await calendarResponse.json();
    const events: GoogleCalendarEvent[] = calendarData.items || [];
    console.log(`Found ${events.length} events in Google Calendar`);

    // Processar cada evento
    let upsertCount = 0;
    for (const event of events) {
      if (!event.summary || !event.start?.dateTime) continue;

      const attendeeEmail = event.attendees?.[0]?.email || '';
      const attendeeName = event.attendees?.[0]?.displayName || event.summary;

      const atendimentoData = {
        id_usuario: user.id,
        nome_cliente: attendeeName,
        contato_cliente: attendeeEmail,
        status: 'agendado' as const,
        google_calendar_event_id: event.id,
        data_agendamento: event.start.dateTime,
        valor_padrao: 150.00
      };

      const { error } = await supabaseClient
        .from('atendimentos')
        .upsert(atendimentoData, {
          onConflict: 'google_calendar_event_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('Erro no upsert:', error);
      } else {
        upsertCount++;
      }
    }

    console.log(`Upserted ${upsertCount} events`);

    // Limpeza: remover atendimentos agendados que não existem mais no Google
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

      let deleteCount = 0;
      for (const atendimento of atendimentosParaRemover) {
        const { error } = await supabaseClient
          .from('atendimentos')
          .delete()
          .eq('id', atendimento.id);
        
        if (!error) deleteCount++;
      }

      console.log(`Removed ${deleteCount} outdated appointments`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sincronização concluída: ${upsertCount} eventos processados` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-calendar function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
<<<<<<< HEAD
>>>>>>> parent of b2ed3e9 (supabase)
=======
>>>>>>> parent of b2ed3e9 (supabase)
  }
});