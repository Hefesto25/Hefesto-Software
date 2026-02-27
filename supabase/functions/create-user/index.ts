import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Get the authorization header from the request (caller's JWT)
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Token de autorização ausente." }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Create a client with the caller's JWT to verify they are authenticated
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } },
        });

        // Verify the caller is authenticated
        const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
        if (callerError || !caller) {
            return new Response(
                JSON.stringify({ error: "Usuário não autenticado." }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Parse request body
        const { email, password, nome, cargo, categoria, modulos_acesso } = await req.json();

        if (!email || !password || !nome || !categoria) {
            return new Response(
                JSON.stringify({ error: "Campos obrigatórios: email, password, nome, categoria." }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (password.length < 6) {
            return new Response(
                JSON.stringify({ error: "A senha deve ter no mínimo 6 caracteres." }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Create admin client with service role key
        const adminClient = createClient(supabaseUrl, serviceRoleKey);

        // Step 1: Create the auth user
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        });

        if (authError) {
            const msg = authError.message.includes("already been registered")
                ? "Este e-mail já está cadastrado no sistema."
                : `Erro ao criar conta: ${authError.message}`;
            return new Response(
                JSON.stringify({ error: msg }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const newUserId = authData.user.id;

        // Step 2: Insert profile in the usuarios table
        const { data: profile, error: profileError } = await adminClient
            .from("usuarios")
            .insert({
                id: newUserId,
                nome,
                email,
                cargo: cargo || null,
                categoria,
                modulos_acesso: modulos_acesso || ["/"],
                foto_url: null,
            })
            .select()
            .single();

        if (profileError) {
            // Rollback: delete the auth user if profile insert fails
            await adminClient.auth.admin.deleteUser(newUserId);
            return new Response(
                JSON.stringify({ error: `Erro ao criar perfil: ${profileError.message}` }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({ success: true, user: profile }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (err) {
        return new Response(
            JSON.stringify({ error: `Erro interno: ${(err as Error).message}` }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
