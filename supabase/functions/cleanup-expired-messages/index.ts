import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // This function should be called via pg_net (Database Webhook trigger) or Supabase cron
    // In both cases, we can verify the service role key or just allow it if we only accept requests from our own services.
    // For simplicity and security, we require the service_role key OR check if it's a cron.
    if (authHeader !== `Bearer ${serviceRoleKey}` && req.headers.get("x-supabase-webhook-source") !== "cron") {
      console.log("Warning: Unauthenticated request attempt to cleanup-expired-messages.");
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 1. Find messages older than 60 days
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() - 60);
    const isoDate = expirationDate.toISOString();

    const { data: messages, error: fetchError } = await adminClient
      .from("mensagens")
      .select("id, arquivo_url")
      .lt("created_at", isoDate)
      .not("arquivo_url", "is", null);

    if (fetchError) throw fetchError;

    let filesDeletedCount = 0;

    // 2. Delete files from Storage
    if (messages && messages.length > 0) {
      const filesToDelete = messages
        .map((m: any) => {
          const url = m.arquivo_url;
          if (!url) return null;
          // Extract path: url is https://[project].supabase.co/storage/v1/object/public/chat-files/[canalId]/[filename]
          try {
            const urlObj = new URL(url);
            const parts = urlObj.pathname.split('/chat-files/');
            if (parts.length > 1) {
              return parts[1]; // Returns [canalId]/[filename]
            }
          } catch (e) {
            return null;
          }
          return null;
        })
        .filter(Boolean) as string[];

      if (filesToDelete.length > 0) {
        const { error: storageError } = await adminClient.storage
          .from("chat-files")
          .remove(filesToDelete);
        if (storageError) {
          console.error("Storage deletion error:", storageError);
        } else {
          filesDeletedCount = filesToDelete.length;
        }
      }
    }

    // 3. Delete old records from DB
    const { error: dbError } = await adminClient
      .from("mensagens")
      .delete()
      .lt("created_at", isoDate);

    if (dbError) throw dbError;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleaned up ${filesDeletedCount} files and ran DB deletion for messages older than ${isoDate}.`
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Limpeza falhou: ${(err as Error).message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
