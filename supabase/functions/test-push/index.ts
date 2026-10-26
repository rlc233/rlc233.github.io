// Edge Function: test-push
// Solo la administradora. Manda un aviso de prueba a todos tus dispositivos registrados
// y devuelve qué ha pasado, para saber por qué falla algo.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: isAdmin } = await supa.rpc("is_admin");
    if (!isAdmin) return json({ error: "No autorizado" }, 403);

    const pub = Deno.env.get("VAPID_PUBLIC_KEY"), priv = Deno.env.get("VAPID_PRIVATE_KEY");
    const subject = Deno.env.get("VAPID_SUBJECT");
    const missing = [["VAPID_PUBLIC_KEY", pub], ["VAPID_PRIVATE_KEY", priv], ["VAPID_SUBJECT", subject]]
      .filter(([, v]) => !v).map(([k]) => k);
    if (missing.length) return json({ error: "Faltan secretos en Supabase: " + missing.join(", ") });

    try {
      webpush.setVapidDetails(subject!, pub!, priv!);
    } catch (e) {
      return json({ error: "Las claves VAPID no son válidas: " + String(e).slice(0, 120) });
    }

    const { data: subs, error } = await supa.from("push_subscriptions").select("id,endpoint,p256dh,auth");
    if (error) return json({ error: "No se pudo leer la tabla de dispositivos: " + error.message });
    if (!subs?.length) {
      return json({ error: "No hay ningún dispositivo registrado. Pulsa «Activar avisos en este dispositivo» primero." });
    }

    const payload = JSON.stringify({ title: "Aviso de prueba", body: "Si ves esto, los avisos funcionan ✓", url: "./" });
    let sent = 0;
    const failed: string[] = [];
    await Promise.all(subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
        sent++;
      } catch (e) {
        const err = e as { statusCode?: number; body?: string };
        failed.push(`${err.statusCode ?? "error"} ${String(err.body ?? e).slice(0, 80)}`);
        if (err.statusCode === 404 || err.statusCode === 410) await supa.from("push_subscriptions").delete().eq("id", s.id);
      }
    }));
    return json({ sent, failed });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
