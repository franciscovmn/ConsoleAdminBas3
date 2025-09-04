import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Parse request body
    const { atendimentoId, plano, valorCobrado } = await req.json();

    if (!atendimentoId || !plano || typeof valorCobrado !== 'number') {
      throw new Error('Parâmetros inválidos');
    }

    console.log('💼 Efetivando consulta:', { atendimentoId, plano, valorCobrado });

    // Fetch the atendimento to get google_calendar_event_id and verify ownership
    const { data: atendimento, error: fetchError } = await supabaseClient
      .from('atendimentos')
      .select('google_calendar_event_id, valor_padrao, id_usuario')
      .eq('id', atendimentoId)
      .eq('id_usuario', user.id) // Ensure user owns this appointment
      .single();

    if (fetchError || !atendimento) {
      throw new Error('Atendimento não encontrado ou sem permissão');
    }

    // Get user's Google tokens
    const { data: userData, error: tokenError } = await supabaseClient
      .from('usuarios')
      .select('google_access_token, google_refresh_token, google_token_expiry')
      .eq('id', user.id)
      .single();

    let accessToken = userData?.google_access_token;

    // Check if token is expired and refresh if needed
    if (userData?.google_token_expiry && new Date(userData.google_token_expiry) <= new Date()) {
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

    // Delete from Google Calendar if event exists
    if (atendimento.google_calendar_event_id && accessToken) {
      console.log('🗑️ Removendo evento do Google Calendar:', atendimento.google_calendar_event_id);
      
      const deleteResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${atendimento.google_calendar_event_id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!deleteResponse.ok && deleteResponse.status !== 404) {
        console.warn('⚠️ Falha ao remover evento do Google Calendar:', deleteResponse.status);
      } else {
        console.log('✅ Evento removido do Google Calendar');
      }
    }

    // Calculate discount
    const valorPadrao = atendimento.valor_padrao || parseFloat(Deno.env.get('VALOR_PADRAO_CONSULTA') ?? '150');
    const desconto = valorPadrao - valorCobrado;

    // Update in Supabase
    const { error: updateError } = await supabaseClient
      .from('atendimentos')
      .update({
        status: 'atendido',
        plano,
        valor_cobrado: valorCobrado,
        desconto
      })
      .eq('id', atendimentoId)
      .eq('id_usuario', user.id); // Double-check ownership

    if (updateError) {
      throw updateError;
    }

    console.log('✅ Consulta efetivada com sucesso');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Consulta efetivada com sucesso',
        desconto,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Erro ao efetivar consulta:', error);
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