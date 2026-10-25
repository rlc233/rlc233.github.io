// Edge Function: r2-delete
// Solo la administradora. Borra fotos de R2 por su clave.
import { createClient } from "npm:@supabase/supabase-js@2";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const KEY = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.jpg$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: isAdmin } = await supa.rpc("is_admin");
    if (!isAdmin) return json({ error: "No autorizado" }, 403);

    const { keys } = await req.json();
    if (!Array.isArray(keys) || keys.length > 200 || !keys.every((k) => typeof k === "string" && KEY.test(k))) {
      return json({ error: "Datos no válidos" }, 400);
    }
    const account = Deno.env.get("R2_ACCOUNT_ID");
    const bucket = Deno.env.get("R2_BUCKET");
    const keyId = Deno.env.get("R2_ACCESS_KEY_ID");
    const secret = Deno.env.get("R2_SECRET_ACCESS_KEY");
    if (!account || !bucket || !keyId || !secret) return json({ error: "R2 no está configurado todavía" }, 503);

    const aws = new AwsClient({ accessKeyId: keyId, secretAccessKey: secret, service: "s3", region: "auto" });
    let deleted = 0;
    for (let i = 0; i < keys.length; i += 10) {
      const res = await Promise.all(keys.slice(i, i + 10).map((k: string) =>
        aws.fetch(`https://${account}.r2.cloudflarestorage.com/${bucket}/${k}`, { method: "DELETE" })));
      deleted += res.filter((r) => r.ok || r.status === 404).length;
    }
    return json({ deleted });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
