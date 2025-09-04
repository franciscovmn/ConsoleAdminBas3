import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { atendimentoId, plano, valorCobrado } = await req.json();

    // Validar dados de entrada
    if (!atendimentoId || !plano || typeof valorCobrado !== 'number') {
      return new Response(JSON.stringify({ error: 'Dados inválidos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Sanitizar entradas
    const sanitizedPlano = plano.toString().slice(0, 100); // Limitar tamanho
    const sanitizedValorCobrado = Math.max(0, Number(valorCobrado)); // Garantir valor positivo

    console.log(`Efetivando consulta: ${atendimentoId}, plano: ${sanitizedPlano}, valor: ${sanitizedValorCobrado}`);

    // Buscar o atendimento (apenas do usuário atual)
    const { data: atendimento, error: fetchError } = await supabaseClient
      .from('atendimentos')
      .select('google_calendar_event_id, valor_padrao, id_usuario')
      .eq('id', atendimentoId)
      .eq('id_usuario', user.id) // Garantir que é do usuário atual
      .single();

    if (fetchError || !atendimento) {
      console.error('Atendimento não encontrado:', fetchError);
      return new Response(JSON.stringify({ error: 'Atendimento não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar tokens do Google se necessário deletar do calendar
    let deletedFromCalendar = false;
    if (atendimento.google_calendar_event_id) {
      const { data: userData, error: userError } = await supabaseClient
        .from('usuarios')
        .select('google_access_token, google_refresh_token, google_token_expiry')
        .eq('id', user.id)
        .single();

      if (!userError && userData?.google_access_token) {
        let accessToken = userData.google_access_token;
        
        // Verificar se o token está válido
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
          }
        }

        // Deletar do Google Calendar
        try {
          const deleteResponse = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${atendimento.google_calendar_event_id}`,
            {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );

          if (deleteResponse.ok) {
            deletedFromCalendar = true;
            console.log('Event deleted from Google Calendar');
          } else {
            console.error('Failed to delete from Google Calendar:', await deleteResponse.text());
          }
        } catch (error) {
          console.error('Error deleting from Google Calendar:', error);
        }
      }
    }

    // Calcular desconto
    const valorPadrao = atendimento.valor_padrao || 150;
    const desconto = valorPadrao - sanitizedValorCobrado;

    // Atualizar no Supabase
    const { error: updateError } = await supabaseClient
      .from('atendimentos')
      .update({
        status: 'atendido',
        plano: sanitizedPlano,
        valor_cobrado: sanitizedValorCobrado,
        desconto
      })
      .eq('id', atendimentoId)
      .eq('id_usuario', user.id); // Garantir que é do usuário atual

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(JSON.stringify({ error: 'Falha ao atualizar atendimento' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Consulta efetivada com sucesso');

    return new Response(JSON.stringify({ 
      success: true,
      deletedFromCalendar,
      desconto 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in efetivar-consulta function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});