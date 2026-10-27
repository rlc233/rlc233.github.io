import { sb, $, errorPage } from './lib.js';
import { renderLogin, renderAdminHome, renderNewGallery, renderGalleryAdmin } from './admin.js';
import { renderClient } from './client.js';
import { renderHelp } from './help.js';

async function route() {
  const app = $('#app');
  document.onkeydown = null;
  app.oncontextmenu = null;
  app.ondragstart = null;
  const parts = (location.hash.replace(/^#/, '') || '/').split('/').filter(Boolean);
  window.scrollTo(0, 0);
  try {
    const known = ['g', 'nueva', 'galeria', 'ayuda'];
    if (parts.length && (!known.includes(parts[0]) || (['g', 'galeria'].includes(parts[0]) && !parts[1]))) {
      return errorPage(app, '404', 'Página no encontrada', 'Esta dirección no existe o ya no está disponible.');
    }
    if (parts[0] === 'g' && parts[1]) return await renderClient(app, parts[1], parts[2] === 'preview');
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return renderLogin(app);
    const { data: ok } = await sb.rpc('is_admin');
    if (!ok) { await sb.auth.signOut(); return renderLogin(app, 'Esta cuenta no tiene permisos de administradora.'); }
    if (parts[0] === 'ayuda') return renderHelp(app);
    if (parts[0] === 'nueva') return renderNewGallery(app);
    if (parts[0] === 'galeria' && parts[1]) return await renderGalleryAdmin(app, parts[1]);
    return await renderAdminHome(app);
  } catch (e) {
    console.error(e);
    app.innerHTML = '<div class="cmsg"><p>Algo ha fallado. Recarga la página.</p></div>';
  }
}
window.addEventListener('hashchange', route);
route();
