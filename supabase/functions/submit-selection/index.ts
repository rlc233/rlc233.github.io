// Edge Function: submit-selection
// La llama el cliente al pulsar "Enviar mi selección".
// Cierra la selección en la base de datos y te manda el aviso al móvil (Web Push).
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
    const { token, pin } = await req.json();
    if (typeof token !== "string") return json({ error: "Datos no válidos" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await admin.rpc("submit_selection", { p_token: token, p_pin: pin ?? null });
    if (error) throw error;
    if (data?.error) return json({ error: data.error }, 400);

    // Aviso al móvil (si falla, la selección ya está enviada igualmente)
    try {
      const pub = Deno.env.get("VAPID_PUBLIC_KEY"), priv = Deno.env.get("VAPID_PRIVATE_KEY");
      const subject = Deno.env.get("VAPID_SUBJECT");
      if (!pub || !priv || !subject) console.warn("push: faltan secretos VAPID, no se envía aviso");
      if (pub && priv && subject) {
        webpush.setVapidDetails(subject, pub, priv);
        const { data: subs } = await admin.from("push_subscriptions").select("id,endpoint,p256dh,auth");
        console.log("push: dispositivos registrados =", subs?.length ?? 0);
        const payload = JSON.stringify({
          title: "Nueva selección",
          body: `${data.gallery_name} · ${data.access_name}`,
          url: "./",
        });
        await Promise.allSettled((subs ?? []).map(async (s) => {
          try {
            await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
          } catch (e) {
            const code = (e as { statusCode?: number }).statusCode;
            if (code === 404 || code === 410) await admin.from("push_subscriptions").delete().eq("id", s.id);
            else console.error("push", code, String(e));
          }
        }));
      }
    } catch (e) {
      console.error("push error", String(e));
    }
    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
