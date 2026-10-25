# RLC233 · Galerías para clientes

Web estática (sin compilar) para GitHub Pages + Supabase + Cloudflare R2.

## 1. Subir la web a GitHub
1. En GitHub, repositorio **público** llamado exactamente `rlc233.github.io`.
2. Sube **todo el contenido de esta carpeta** a la raíz del repositorio (`index.html`, `js/`, `css/`, `icons/`, `sw.js`, `manifest.webmanifest`, `robots.txt`...).
3. Settings → Pages → Source: *Deploy from a branch* → rama `main`, carpeta `/ (root)`.
4. En unos minutos estará en https://rlc233.github.io (el panel de administradora). Los clientes entran por los enlaces `https://rlc233.github.io/#/g/CÓDIGO`.

## 2. Edge Functions en Supabase
Supabase → Edge Functions → *Deploy a new function* (editor). Crea tres funciones con **estos nombres exactos** y pega el código de `supabase/functions/<nombre>/index.ts`:
- `r2-upload`
- `r2-delete`
- `submit-selection`

## 3. Secretos (Edge Functions → Secrets)
| Secreto | Valor |
|---|---|
| `R2_ACCOUNT_ID` | Account ID de Cloudflare |
| `R2_BUCKET` | nombre del bucket |
| `R2_ACCESS_KEY_ID` | clave de acceso del token de R2 |
| `R2_SECRET_ACCESS_KEY` | clave secreta del token de R2 |
| `VAPID_PUBLIC_KEY` | clave pública VAPID |
| `VAPID_PRIVATE_KEY` | clave privada VAPID |
| `VAPID_SUBJECT` | `mailto:tu-email@ejemplo.com` |

(`SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` ya los pone Supabase solo.)

## 4. Claves VAPID (avisos al móvil)
En un terminal con Node instalado: `npx web-push generate-vapid-keys`. La **pública** va en `js/config.js` (`VAPID_PUBLIC_KEY`) y en los secretos; la **privada** solo en los secretos.

## 5. Pendiente: Cloudflare R2
- En `js/config.js`, cambia `R2_PUBLIC_URL` por la URL pública del bucket (la de `r2.dev`).
- Añade los cuatro secretos `R2_*`.
- CORS del bucket: permitir `PUT` desde `https://rlc233.github.io` (y `http://localhost:5173` si pruebas en local).
Hasta entonces, la web funciona pero la subida de fotos está desactivada.
