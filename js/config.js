// ============================================================
//  CONFIGURACIÓN · RLC233
//  Todo lo de aquí es público (se ve en el navegador).
//  Las claves SECRETAS (R2, VAPID privada) NUNCA van aquí:
//  van en los secretos de las Edge Functions de Supabase.
// ============================================================
export const CONFIG = {
  SUPABASE_URL: 'https://gbydpnsgdbethjqtgzsg.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieWRwbnNnZGJldGhqcXRnenNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MzczNDMsImV4cCI6MjEwODQxMzM0M30.qm6mNyKA5I0DSgGtvhHXzjlTvMm_GGwR56FkUFl4fWc',

  // PENDIENTE · URL pública del bucket de R2 (la que acaba en r2.dev), sin barra final.
  R2_PUBLIC_URL: 'https://pub-b8e103bd388f475e85da756d219de699.r2.dev',

  // PENDIENTE · clave pública VAPID para los avisos al móvil (ver README).
  VAPID_PUBLIC_KEY: 'BE1JYgvs2z9icJ7XdGRTdxoc8LSzTRwQICHoXwuPHcwRi-ZSB6P1nfyQJVpjn-UZdTE5knhn4_C3u7HrFsHnVos',

  BRAND: 'RLC233',
  MAX_SIDE: 1000,       // lado largo máximo de las fotos subidas (px)
  JPEG_QUALITY: 0.8,
};
