import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Edge Function: check-deadlines
 * 
 * Runs daily via pg_cron or external webhook to check for tasks
 * nearing their deadline and create notifications for the responsible users.
 * 
 * Setup in Supabase Dashboard:
 *   SELECT cron.schedule(
 *     'check-deadlines',
 *     '0 8 * * *',  -- Every day at 8:00 AM
 *     $$SELECT net.http_post(
 *       url := 'https://YOUR_PROJECT.supabase.co/functions/v1/check-deadlines',
 *       headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
 *     );$$
 *   );
 */

Deno.serve(async (req: Request) => {
    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get current date in Bahia timezone
        const now = new Date();
        const bahiaOffset = -3; // America/Bahia UTC-3
        const bahiaDate = new Date(now.getTime() + bahiaOffset * 60 * 60 * 1000);
        const todayStr = bahiaDate.toISOString().split("T")[0];

        // Check days: 1, 2, 3, 5, 7 days ahead
        const checkDays = [1, 2, 3, 5, 7];
        let notificationsCreated = 0;

        for (const daysAhead of checkDays) {
            const targetDate = new Date(bahiaDate.getTime() + daysAhead * 24 * 60 * 60 * 1000);
            const targetStr = targetDate.toISOString().split("T")[0];

            // Get operational tasks with deadline on targetDate that are not done
            const { data: opTasks } = await supabase
                .from("tarefas_operacionais")
                .select("*")
                .eq("data_termino", targetStr)
                .neq("status", "Finalizado");

            if (opTasks) {
                for (const task of opTasks) {
                    if (!task.responsavel_id) continue;

                    // Find team member by name (responsavel_id stores the name)
                    const { data: member } = await supabase
                        .from("team_members")
                        .select("id")
                        .eq("name", task.responsavel_id)
                        .maybeSingle();

                    if (!member) continue;

                    // Check if target user has this notification type enabled
                    const { data: settings } = await supabase
                        .from("notification_settings")
                        .select("*")
                        .eq("usuario_id", member.id)
                        .maybeSingle();

                    if (settings && !settings.notif_tarefa_vencimento) continue;

                    // Check configured days
                    const configuredDays = settings?.vencimento_dias_antes
                        ? settings.vencimento_dias_antes.split(",").map(Number)
                        : [5, 3, 1];

                    if (!configuredDays.includes(daysAhead)) continue;

                    // Check if this notification already exists (avoid duplicates)
                    const { data: existing } = await supabase
                        .from("notificacoes")
                        .select("id")
                        .eq("usuario_id", member.id)
                        .eq("tipo", "tarefa_vencimento")
                        .like("mensagem", `%${task.titulo}%${daysAhead} dia%`)
                        .maybeSingle();

                    if (existing) continue;

                    // Create notification
                    const urgency =
                        daysAhead === 1 ? "⚠️ URGENTE" : daysAhead <= 3 ? "⏰ Atenção" : "📅 Lembrete";
                    const titulo = `${urgency}: Tarefa vence em ${daysAhead} dia${daysAhead > 1 ? "s" : ""}`;
                    const mensagem = `A tarefa '${task.titulo}' vence em ${daysAhead} dia${daysAhead > 1 ? "s" : ""} (${targetStr}).`;

                    await supabase.from("notificacoes").insert({
                        usuario_id: member.id,
                        tipo: "tarefa_vencimento",
                        titulo,
                        mensagem,
                        lida: false,
                        redirecionamento: "/operacional",
                        modulo_origem: "operacional",
                    });

                    notificationsCreated++;
                }
            }

        }

        return new Response(
            JSON.stringify({
                success: true,
                message: `Checked deadlines. Created ${notificationsCreated} notification(s).`,
                date: todayStr,
            }),
            {
                headers: {
                    "Content-Type": "application/json",
                    "Connection": "keep-alive",
                },
            }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ error: (error as Error).message }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
});
