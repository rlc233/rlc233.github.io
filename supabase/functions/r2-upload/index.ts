// Edge Function: r2-upload
// Solo la administradora. Devuelve URLs firmadas (15 min) para subir fotos a R2.
import { createClient } from "npm:@supabase/supabase-js@2";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: isAdmin } = await supa.rpc("is_admin");
    if (!isAdmin) return json({ error: "No autorizado" }, 403);

    const { gallery_id, count } = await req.json();
    if (!UUID.test(gallery_id) || !Number.isInteger(count) || count < 1 || count > 500) {
      return json({ error: "Datos no válidos" }, 400);
    }
    const account = Deno.env.get("R2_ACCOUNT_ID");
    const bucket = Deno.env.get("R2_BUCKET");
    const keyId = Deno.env.get("R2_ACCESS_KEY_ID");
    const secret = Deno.env.get("R2_SECRET_ACCESS_KEY");
    if (!account || !bucket || !keyId || !secret) return json({ error: "R2 no está configurado todavía" }, 503);

    const aws = new AwsClient({ accessKeyId: keyId, secretAccessKey: secret, service: "s3", region: "auto" });
    const uploads: { key: string; url: string }[] = [];
    for (let i = 0; i < count; i++) {
      const key = `${gallery_id}/${crypto.randomUUID()}.jpg`;
      const url = new URL(`https://${account}.r2.cloudflarestorage.com/${bucket}/${key}`);
      url.searchParams.set("X-Amz-Expires", "900");
      const signed = await aws.sign(new Request(url, { method: "PUT" }), { aws: { signQuery: true } });
      uploads.push({ key, url: signed.url });
    }
    return json({ uploads });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
