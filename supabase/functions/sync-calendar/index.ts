import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

// ... (interface e esquema de validação permanecem os mesmos) ...

// A mudança está aqui: trocamos Deno.serve por serve()
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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
  }
});