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
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // ... (o restante do seu código permanece igual)
  try {
    const {
      atendimentoId,
      plano,
      valorCobrado,
      googleCalendarEventId,
      valorPadrao,
      nomeCliente,
    } = EfetivarConsultaSchema.parse(await req.json());

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const desconto = valorPadrao - valorCobrado;
    const { error: updateError } = await supabaseUser
      .from('atendimentos')
      .update({
        status: 'atendido',
        plano,
        valor_cobrado: valorCobrado,
        desconto,
      })
      .eq('id', atendimentoId);

    if (updateError) {
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
      );
    }

    return new Response(JSON.stringify({ message: 'Consulta efetivada com sucesso!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error instanceof z.ZodError ? 400 : 500,
    });
  }
});