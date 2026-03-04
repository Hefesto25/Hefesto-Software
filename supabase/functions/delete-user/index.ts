import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Token de autorização ausente." }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        // Verify the caller is authenticated
        const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } },
        });
        const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
        if (callerError || !caller) {
            return new Response(
                JSON.stringify({ error: "Usuário não autenticado." }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const { user_id } = await req.json();
        if (!user_id) {
            return new Response(
                JSON.stringify({ error: "Campo obrigatório: user_id." }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Prevent self-deletion
        if (user_id === caller.id) {
            return new Response(
                JSON.stringify({ error: "Você não pode remover sua própria conta." }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const adminClient = createClient(supabaseUrl, serviceRoleKey);

        // Step 1: Delete profile from usuarios table
        const { error: profileError } = await adminClient
            .from("usuarios")
            .delete()
            .eq("id", user_id);

        if (profileError) {
            return new Response(
                JSON.stringify({ error: `Erro ao remover perfil: ${profileError.message}`, details: profileError }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Step 2: Delete the auth user
        const { error: authError } = await adminClient.auth.admin.deleteUser(user_id);
        if (authError) {
            return new Response(
                JSON.stringify({ error: `Erro ao remover conta: ${authError.message}` }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({ success: true }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (err) {
        return new Response(
            JSON.stringify({ error: `Erro interno: ${(err as Error).message}` }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
