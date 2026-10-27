import { sb, $ } from './lib.js';
import { renderLogin, renderAdminHome, renderNewGallery, renderGalleryAdmin } from './admin.js';
import { renderClient } from './client.js';

async function route() {
  const app = $('#app');
  document.onkeydown = null;
  app.oncontextmenu = null;
  app.ondragstart = null;
  const parts = (location.hash.replace(/^#/, '') || '/').split('/').filter(Boolean);
  window.scrollTo(0, 0);
  try {
    if (parts[0] === 'g' && parts[1]) return await renderClient(app, parts[1], parts[2] === 'preview');
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return renderLogin(app);
    const { data: ok } = await sb.rpc('is_admin');
    if (!ok) { await sb.auth.signOut(); return renderLogin(app, 'Esta cuenta no tiene permisos de administradora.'); }
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
