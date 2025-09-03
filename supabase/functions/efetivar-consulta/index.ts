import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.23.4/mod.ts';
import { corsHeaders } from '../_shared/cors.ts';

// Esquema de validação com Zod para o corpo da requisição
const EfetivarConsultaSchema = z.object({
  atendimentoId: z.string().uuid(),
  plano: z.string(),
  valorCobrado: z.number(),
  googleCalendarEventId: z.string().optional(),
  valorPadrao: z.number(),
  nomeCliente: z.string(),
});

Deno.serve(async (req) => {
  // Tratar requisição pre-flight OPTIONS para CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

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

    // 1. ATUALIZAR PRIMEIRO O BANCO DE DADOS LOCAL (Mais seguro)
    // =============================================================
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
      console.error('Erro ao atualizar atendimento no Supabase:', updateError);
      throw new Error('Falha ao atualizar o atendimento no banco de dados.');
    }

    // 2. ATUALIZAR O EVENTO NO GOOGLE CALENDAR (Não deletar)
    // =========================================================
    const sessionResponse = await supabaseUser.auth.getSession();
    const providerToken = sessionResponse.data.session?.provider_token;

    if (googleCalendarEventId && providerToken) {
      const eventUpdateBody = {
        summary: `✅ ${nomeCliente} - Atendido`,
        colorId: '2', // Cor verde no Google Calendar
      };

      const updateResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleCalendarEventId}`,
        {
          method: 'PATCH', // Usar PATCH para atualizar em vez de DELETE
          headers: {
            Authorization: `Bearer ${providerToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventUpdateBody),
        }
      );

      if (!updateResponse.ok) {
        // A falha aqui não é crítica, pois o dado principal já está salvo.
        // Apenas registramos o aviso.
        console.warn('Falha ao atualizar evento no Google Calendar, mas o atendimento foi salvo localmente.', await updateResponse.text());
      }
    }

    return new Response(JSON.stringify({ message: 'Consulta efetivada com sucesso!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Erro na função efetivar-consulta:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error instanceof z.ZodError ? 400 : 500,
    });
  }
});