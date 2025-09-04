import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

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

    // Parse request body
    const { atendimentoId, plano, valorCobrado } = await req.json();

    if (!atendimentoId || !plano || valorCobrado === undefined) {
      throw new Error('Parâmetros obrigatórios: atendimentoId, plano, valorCobrado');
    }

    console.log('Efetivando consulta:', { atendimentoId, plano, valorCobrado, userId: user.id });

    // Get the appointment to verify ownership and get Google Calendar event ID
    const { data: atendimento, error: fetchError } = await supabase
      .from('atendimentos')
      .select('google_calendar_event_id, valor_padrao, id_usuario')
      .eq('id', atendimentoId)
      .single();

    if (fetchError || !atendimento) {
      throw new Error('Atendimento não encontrado');
    }

    // Verify ownership
    if (atendimento.id_usuario !== user.id) {
      throw new Error('Acesso negado: este atendimento não pertence ao usuário');
    }

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

    // Delete from Google Calendar if there's an event_id
    if (atendimento.google_calendar_event_id && accessToken) {
      console.log('Removendo evento do Google Calendar:', atendimento.google_calendar_event_id);
      
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
        const errorText = await deleteResponse.text();
        console.warn('Aviso: Falha ao remover evento do Google Calendar:', errorText);
        // Continue even if calendar deletion fails
      } else {
        console.log('Evento removido do Google Calendar com sucesso');
      }
    }

    // Calculate discount
    const valorPadrao = atendimento.valor_padrao || parseFloat(Deno.env.get('VALOR_PADRAO_CONSULTA') || '150');
    const desconto = valorPadrao - valorCobrado;

    // Update in Supabase
    const { error: updateError } = await supabase
      .from('atendimentos')
      .update({
        status: 'atendido',
        plano,
        valor_cobrado: valorCobrado,
        desconto
      })
      .eq('id', atendimentoId)
      .eq('id_usuario', user.id); // Additional security check

    if (updateError) {
      throw updateError;
    }

    console.log('Consulta efetivada com sucesso');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Consulta efetivada com sucesso',
        atendimentoId,
        valorCobrado,
        desconto
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Erro ao efetivar consulta:', error);
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