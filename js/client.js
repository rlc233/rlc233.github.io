import { CONFIG } from './config.js';
import { sb, $, esc, euros, photoUrl, r2Ready, toast, ask, errorPage } from './lib.js';

const PAGE = 24;

// preview = true: vista previa de la administradora (solo lectura, no guarda nada)
export async function renderClient(app, token, preview = false) {
  const pinKey = 'pin:' + token;
  let pin = preview ? null : (sessionStorage.getItem(pinKey) || null);
  let info, page = 1, total = 0, photos = [], closed = false, busy = false;
  let lbIdx = -1, lbList = null;            // lbList: null = fotos de la página; si no, lista de elegidas
  let accessId = null, galleryId = null;
  const selected = new Map();               // photo_id -> r2_key

  // Protección básica: sin menú contextual ni arrastrar
  app.oncontextmenu = (e) => e.preventDefault();
  app.ondragstart = (e) => e.preventDefault();

  // ---- acceso a datos (real para el cliente, lectura directa para la vista previa)
  const api = {
    async open() {
      if (!preview) {
        const { data, error } = await sb.rpc('client_open', { p_token: token, p_pin: pin });
        return error ? { error: 'conn' } : data;
      }
      const { data: a, error } = await sb.from('accesses').select('*, galleries(name, extra_price_cents)').eq('token', token).maybeSingle();
      if (error || !a) return { error: 'preview' };
      const { count } = await sb.from('photos').select('id', { count: 'exact', head: true }).eq('gallery_id', a.gallery_id);
      accessId = a.id; galleryId = a.gallery_id;
      const price = a.galleries.extra_price_cents;
      return {
        access: { name: a.name, max_selections: a.max_selections, allow_extras: a.allow_extras && price != null, max_extras: a.max_extras, submitted: !!a.submitted_at },
        gallery: { name: a.galleries.name, extra_price_cents: price, photo_count: count ?? 0 },
      };
    },
    async selected() {
      if (!preview) {
        const r = await sb.rpc('client_selected', { p_token: token, p_pin: pin });
        return r.data?.photos || [];
      }
      const { data } = await sb.from('selections').select('photo_id, photos(r2_key, position)').eq('access_id', accessId);
      return (data || []).filter((r) => r.photos).sort((x, y) => x.photos.position - y.photos.position)
        .map((r) => ({ id: r.photo_id, r2_key: r.photos.r2_key }));
    },
    async photos(p) {
      if (!preview) {
        const { data, error } = await sb.rpc('client_photos', { p_token: token, p_pin: pin, p_page: p, p_size: PAGE });
        return error || data.error ? null : data;
      }
      const { data, count, error } = await sb.from('photos').select('id, r2_key, position', { count: 'exact' })
        .eq('gallery_id', galleryId).order('position').order('id').range((p - 1) * PAGE, p * PAGE - 1);
      return error ? null : { total: count ?? 0, photos: data };
    },
  };

  const box = (html) => { app.innerHTML = `<div class="cmsg"><div class="brand big">${esc(CONFIG.BRAND)}</div>${html}</div>`; };

  function askPin(wrong) {
    sessionStorage.removeItem(pinKey);
    box(`<form class="cd lform" id="pf"><h1 class="serif">Introduce tu PIN</h1>${wrong ? '<p class="err">PIN incorrecto</p>' : ''}
      <input class="in pin" id="pin" inputmode="numeric" autocomplete="one-time-code" aria-label="PIN" required>
      <button class="btn full" style="margin-top:20px">Entrar</button></form>`);
    $('#pf').onsubmit = (e) => { e.preventDefault(); pin = $('#pin').value.trim(); open(); };
    $('#pin').focus();
  }

  async function open() {
    app.innerHTML = '<div class="cmsg"><p class="muted">Cargando…</p></div>';
    const data = await api.open();
    if (data.error === 'conn') return box('<p>No se ha podido cargar la galería. Inténtalo de nuevo en unos minutos.</p>');
    if (data.error === 'preview') return errorPage(app, '401', 'Acceso no autorizado', 'La vista previa solo está disponible con la sesión de administradora abierta. Inicia sesión e inténtalo de nuevo.');
    if (data.error === 'not_found') return errorPage(app, '404', 'Enlace no disponible', 'Este enlace ya no está disponible. Puede que la galería se haya eliminado o que el enlace esté incompleto. Si crees que es un error, ponte en contacto con quien te lo envió.', { home: false });
    if (data.error === 'locked') return box('<p>Demasiados intentos. Vuelve a probar dentro de 15 minutos.</p>');
    if (data.error === 'pin') return askPin(!!pin);
    if (pin) sessionStorage.setItem(pinKey, pin);
    info = data;
    closed = data.access.submitted;
    selected.clear();
    (await api.selected()).forEach((p) => selected.set(p.id, p.r2_key));
    buildLayout();
    await loadPage(1);
  }

  function buildLayout() {
    const a = info.access, g = info.gallery;
    app.innerHTML = `
    <header class="chead"><div class="brand">${esc(CONFIG.BRAND)}</div>
      <div class="ctitle"><div class="serif gtitle">${esc(g.name)}</div><div class="muted sm">${esc(a.name)}</div></div>
      <div class="pill" id="pill"></div></header>
    <div id="banner"></div>
    <div class="cwrap noprot">
      <main class="cmain"><div class="rowhead"><h1 class="upper">Todas las fotos · ${g.photo_count}</h1><span class="muted sm" id="pginfo"></span></div>
        <div class="grid" id="grid"></div><nav class="pager" id="pager" aria-label="Páginas"></nav></main>
      <aside class="side cd" id="side"></aside>
    </div>
    <div class="mbar" id="mbar"></div><div id="lbx"></div>`;

    $('#grid').onclick = (e) => {
      const t = e.target.closest('[data-tog]');
      if (t) return toggle(t.dataset.tog);
      const o = e.target.closest('[data-open]');
      if (o) showLb(parseInt(o.dataset.open, 10), null);
    };
    $('#pager').onclick = (e) => {
      const b = e.target.closest('[data-p]');
      if (b) { loadPage(parseInt(b.dataset.p, 10)); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    };
    $('#side').onclick = (e) => {
      const r = e.target.closest('[data-rm]');
      if (r) return toggle(r.dataset.rm);
      const v = e.target.closest('[data-view]');
      if (v) return showLb(parseInt(v.dataset.view, 10), [...selected].map(([id, r2_key]) => ({ id, r2_key })));
      if (e.target.closest('#send')) submit();
    };
    $('#mbar').onclick = () => $('#side').scrollIntoView({ behavior: 'smooth' });
    $('#lbx').onclick = lbClick;
    document.onkeydown = (e) => {
      if (lbIdx < 0) return;
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft') lbMove(-1);
      if (e.key === 'ArrowRight') lbMove(1);
    };
    paintAll();
  }

  async function loadPage(p) {
    const data = await api.photos(p);
    if (!data) return toast('No se han podido cargar las fotos');
    page = p; total = data.total; photos = data.photos;
    paintGrid(); paintPager();
  }

  function paintAll() { paintGrid(); paintPager(); paintSide(); }

  function paintGrid() {
    if (!r2Ready()) {
      $('#grid').innerHTML = '<p class="muted" style="grid-column:1/-1">Las fotos aún no están disponibles.</p>';
      return;
    }
    $('#grid').innerHTML = photos.map((p, i) => `<div class="tile" data-id="${p.id}">
      <button class="timg" data-open="${i}" aria-label="Ver la foto ${(page - 1) * PAGE + i + 1} en grande"><img src="${esc(photoUrl(p.r2_key))}" alt="Foto ${(page - 1) * PAGE + i + 1}" draggable="false" loading="lazy"></button>
      ${closed ? (selected.has(p.id) ? '<span class="badge on">✓</span>' : '') : `<button class="badge ${selected.has(p.id) ? 'on' : ''}" data-tog="${p.id}" aria-label="Elegir esta foto">${selected.has(p.id) ? '✓' : '+'}</button>`}</div>`).join('');
  }

  function paintTile(id) {
    const t = $(`.tile[data-id="${id}"]`);
    if (!t) return;
    const b = $('.badge', t), on = selected.has(id);
    if (b) { b.classList.toggle('on', on); b.textContent = on ? '✓' : '+'; }
  }

  function paintPager() {
    const pages = Math.max(1, Math.ceil(total / PAGE));
    $('#pginfo').textContent = `Página ${page} de ${pages}`;
    if (pages <= 1) { $('#pager').innerHTML = ''; return; }
    const nums = [...new Set([1, pages, page - 1, page, page + 1])].filter((n) => n >= 1 && n <= pages).sort((x, y) => x - y);
    let html = '', prev = 0;
    for (const n of nums) {
      if (n - prev > 1) html += '<span class="muted">…</span>';
      html += `<button class="pg ${n === page ? 'cur' : ''}" data-p="${n}" aria-label="Página ${n}">${n}</button>`;
      prev = n;
    }
    $('#pager').innerHTML = html;
  }

  function paintSide() {
    const a = info.access, g = info.gallery, count = selected.size, max = a.max_selections;
    const extras = Math.max(0, count - max), price = g.extra_price_cents;
    const readOnly = closed || preview;
    $('#banner').innerHTML = preview
      ? `<div class="banner">Vista previa de «${esc(a.name)}»: así lo ve el cliente y aquí no se guarda nada. <a href="#/galeria/${galleryId}">Volver al panel</a></div>`
      : closed ? '<div class="banner">Tu selección ya se ha enviado. ¡Gracias! Si necesitas cambiar algo, escríbeme.</div>' : '';
    $('#pill').textContent = `${count} de ${max} elegidas${extras ? ` · ${extras} extra` : ''}`;
    $('#mbar').innerHTML = closed ? '' : `<span>${count} de ${max} elegidas${extras ? ` · ${extras} extra` : ''}</span><span class="btn sm">Ver mis fotos</span>`;
    $('#mbar').hidden = closed;
    $('#side').innerHTML = `<h2 class="serif">Mis fotos</h2>
      <p class="muted sm">${closed ? 'Selección enviada' : preview ? 'Toca una foto para verla en grande' : 'Toca una foto para verla en grande · quita con la ×'}</p>
      <div class="sgrid">${[...selected].map(([id, key], i) => `<div class="sth"><button class="sthb" data-view="${i}" aria-label="Ver foto en grande"><img src="${esc(photoUrl(key))}" alt="" draggable="false"></button>${readOnly ? '' : `<button class="x" data-rm="${id}" aria-label="Quitar foto">×</button>`}</div>`).join('') || '<p class="muted sm" style="grid-column:1/-1">Todavía no has elegido ninguna.</p>'}</div>
      <div class="sum"><div><span>Incluidas</span><b>${Math.min(count, max)} / ${max}</b></div>
      ${a.allow_extras ? `<div><span>Extras (${euros(price)} c/u)</span><b>${extras} × ${euros(price)} = ${euros(extras * price)}</b></div>` : ''}</div>
      ${readOnly ? '' : `<button class="btn full" id="send" ${count ? '' : 'disabled'}>Enviar mi selección</button><p class="muted sm c">Al enviar, la selección queda cerrada</p>`}`;
  }

  async function toggle(id) {
    if (preview) return toast('Vista previa: aquí no se puede cambiar la selección.');
    if (closed) return toast('La selección ya se ha enviado.');
    if (busy) return;
    const a = info.access, g = info.gallery, count = selected.size, max = a.max_selections;
    if (!selected.has(id) && count >= max) {
      if (!a.allow_extras) return toast(`Ya has elegido tus ${max} fotos. Quita alguna para poder elegir otra.`);
      if (a.max_extras != null && count >= max + a.max_extras) return toast('Has llegado al máximo de fotos extra.');
      if (!(await ask(`Esta foto será un extra (+${euros(g.extra_price_cents)}). ¿Quieres añadirla?`, { ok: 'Añadir extra' }))) return;
    }
    busy = true;
    const { data, error } = await sb.rpc('client_toggle', { p_token: token, p_pin: pin, p_photo: id });
    busy = false;
    if (error || !data) return toast('Error de conexión. Inténtalo de nuevo.');
    if (data.error === 'limit') return toast('Has alcanzado el límite de fotos.');
    if (data.error === 'closed') { closed = true; paintAll(); return toast('La selección ya se había enviado.'); }
    if (data.error) return toast('No se pudo cambiar la foto.');
    if (data.selected) {
      const key = photos.find((p) => p.id === id)?.r2_key ?? lbList?.find((p) => p.id === id)?.r2_key;
      if (key) selected.set(id, key);
    } else {
      selected.delete(id);
    }
    paintTile(id);
    paintSide();
    if (lbIdx >= 0) showLb(lbIdx);
  }

  async function submit() {
    if (preview) return toast('Vista previa: no se envía nada.');
    const a = info.access, g = info.gallery, count = selected.size, max = a.max_selections;
    if (!count) return toast('Elige al menos una foto.');
    const extras = Math.max(0, count - max);
    const msg = `Vas a enviar ${count} fotos${extras ? ` (${max} incluidas + ${extras} extra · ${euros(extras * g.extra_price_cents)})` : ''}. Después ya no podrás cambiarlas. ¿Enviar?`;
    if (!(await ask(msg, { ok: 'Enviar selección' }))) return;
    try {
      const r = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/submit-selection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: CONFIG.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + CONFIG.SUPABASE_ANON_KEY },
        body: JSON.stringify({ token, pin }),
      });
      const j = await r.json();
      if (!r.ok || j.error) throw new Error(j.error || 'error');
      closed = true;
      paintAll();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      toast('No se pudo enviar la selección. Inténtalo de nuevo.');
    }
  }

  // ---- visor grande (fotos de la página, o las elegidas desde "Mis fotos")
  const lbItems = () => lbList || photos;
  function showLb(i, list) {
    if (list !== undefined) lbList = list;
    lbIdx = i;
    const items = lbItems(), p = items[i];
    if (!p) return closeLb();
    const on = selected.has(p.id);
    const label = lbList ? `${i + 1} / ${items.length}` : `${(page - 1) * PAGE + i + 1} / ${total}`;
    const canPick = !closed && !preview;
    $('#lbx').innerHTML = `<div class="lbback noprot"><button class="lbc" data-c="1" aria-label="Cerrar">×</button>
      <button class="lbn prev" data-n="-1" aria-label="Anterior">‹</button>
      <img src="${esc(photoUrl(p.r2_key))}" alt="" draggable="false">
      <button class="lbn next" data-n="1" aria-label="Siguiente">›</button>
      <div class="lbfoot"><span>${label}</span>${canPick ? `<button class="btn ${on ? '' : 'light'}" data-s="1">${on ? '✓ Elegida · quitar' : 'Elegir esta foto'}</button>` : ''}</div></div>`;
  }
  function closeLb() { lbIdx = -1; lbList = null; $('#lbx').innerHTML = ''; }
  async function lbMove(d) {
    const items = lbItems();
    if (lbList) return showLb((lbIdx + d + items.length) % items.length);
    const j = lbIdx + d;
    if (j >= 0 && j < photos.length) return showLb(j);
    const np = page + d;
    if (np < 1 || np > Math.ceil(total / PAGE)) return;
    await loadPage(np);
    showLb(d > 0 ? 0 : photos.length - 1);
  }
  function lbClick(e) {
    if (e.target.closest('[data-c]') || e.target.classList.contains('lbback')) return closeLb();
    const n = e.target.closest('[data-n]');
    if (n) return lbMove(parseInt(n.dataset.n, 10));
    if (e.target.closest('[data-s]')) toggle(lbItems()[lbIdx].id);
  }

  await open();
}
