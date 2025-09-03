<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.23.4/mod.ts'
// ADICIONE ESTA LINHA
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

const EfetivarConsultaSchema = z.object({
  atendimentoId: z.string().uuid(),
  plano: z.string(),
  valorCobrado: z.number(),
  googleCalendarEventId: z.string().optional(),
  valorPadrao: z.number(),
  nomeCliente: z.string(),
});

// SUBSTITUA "Deno.serve" POR "serve"
=======
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

>>>>>>> parent of b2ed3e9 (supabase)
=======
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

>>>>>>> parent of b2ed3e9 (supabase)
=======
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

>>>>>>> parent of b2ed3e9 (supabase)
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // ... (o restante do seu código permanece igual)
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

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
>>>>>>> parent of b2ed3e9 (supabase)
=======
>>>>>>> parent of b2ed3e9 (supabase)
    // Verificar se o usuário está autenticado
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { atendimentoId, plano, valorCobrado } = await req.json();

    if (!atendimentoId || !plano || valorCobrado === undefined) {
      return new Response(
        JSON.stringify({ error: 'Parâmetros obrigatórios: atendimentoId, plano, valorCobrado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Efetivando consulta:', { atendimentoId, plano, valorCobrado, userId: user.id });

    // Buscar o atendimento para verificar se pertence ao usuário
    const { data: atendimento, error: fetchError } = await supabaseClient
      .from('atendimentos')
      .select('google_calendar_event_id, valor_padrao, id_usuario')
      .eq('id', atendimentoId)
      .eq('id_usuario', user.id) // Garantir que só acesse seus próprios dados
      .single();

    if (fetchError || !atendimento) {
      console.error('Atendimento não encontrado:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Atendimento não encontrado ou sem permissão' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar o token do Google do usuário
    const { data: userData } = await supabaseClient
      .from('usuarios')
      .select('google_access_token')
      .eq('id', user.id)
      .single();

    const googleToken = userData?.google_access_token;

    // Deletar do Google Calendar se houver event_id e token
    if (atendimento.google_calendar_event_id && googleToken) {
      console.log('Deleting event from Google Calendar:', atendimento.google_calendar_event_id);
      
      const deleteResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${atendimento.google_calendar_event_id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${googleToken}`,
          },
        }
      );

      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text();
        console.error('Failed to delete from Google Calendar:', errorText);
        return new Response(
          JSON.stringify({ error: 'Falha ao remover evento do Google Calendar' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('Successfully deleted event from Google Calendar');
    }

    // Calcular desconto
    const valorPadrao = atendimento.valor_padrao || 150;
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> parent of b2ed3e9 (supabase)
=======
>>>>>>> parent of b2ed3e9 (supabase)
=======
>>>>>>> parent of b2ed3e9 (supabase)
    const desconto = valorPadrao - valorCobrado;

    // Atualizar no Supabase
    const { error: updateError } = await supabaseClient
      .from('atendimentos')
      .update({
        status: 'atendido',
        plano,
        valor_cobrado: valorCobrado,
        desconto
      })
      .eq('id', atendimentoId)
      .eq('id_usuario', user.id); // Garantir que só modifique seus próprios dados

    if (updateError) {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
      throw new Error('Falha ao atualizar o atendimento no banco de dados.');
    }

    const sessionResponse = await supabaseUser.auth.getSession();
    const providerToken = sessionResponse.data.session?.provider_token;

    if (googleCalendarEventId && providerToken) {
      const eventUpdateBody = {
        summary: `✅ ${nomeCliente} - Atendido`,
        colorId: '2', // Verde
      };

      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleCalendarEventId}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${providerToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventUpdateBody),
        }
=======
=======
>>>>>>> parent of b2ed3e9 (supabase)
=======
>>>>>>> parent of b2ed3e9 (supabase)
      console.error('Error updating atendimento:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao atualizar atendimento' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> parent of b2ed3e9 (supabase)
=======
>>>>>>> parent of b2ed3e9 (supabase)
=======
>>>>>>> parent of b2ed3e9 (supabase)
      );
    }

    console.log('Successfully updated atendimento status to atendido');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Consulta efetivada com sucesso!' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error instanceof z.ZodError ? 400 : 500,
    });
=======
=======
>>>>>>> parent of b2ed3e9 (supabase)
=======
>>>>>>> parent of b2ed3e9 (supabase)
    console.error('Error in efetivar-consulta function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> parent of b2ed3e9 (supabase)
=======
>>>>>>> parent of b2ed3e9 (supabase)
=======
>>>>>>> parent of b2ed3e9 (supabase)
  }
});