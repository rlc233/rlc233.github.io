import { CONFIG } from './config.js';
import { sb, $, $$, esc, euros, r2Ready, photoUrl, toast, ask, askNumber, showText, numericOnly, openModal, refresh, goto } from './lib.js';
import { watermark } from './watermark.js';

const shell = (inner) => `
<header class="top"><a class="brand" href="#/">RLC233</a><span class="sub">Panel de administración</span><button class="btn ghost" id="logout">Cerrar sesión</button></header>
<main class="wrap">${inner}</main>`;

function bindShell() {
  $('#logout').onclick = async () => { await sb.auth.signOut(); goto('#/'); };
}

const extraTxt = (c) => (c == null ? 'Sin extras' : `Extra ${euros(c)}`);
const genPin = () => String(crypto.getRandomValues(new Uint32Array(1))[0] % 10000).padStart(4, '0');
const b64ToU8 = (b64) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

async function fnError(error) {
  try { const j = await error.context.json(); return j.error || error.message; } catch (_) { return error.message; }
}

async function r2Delete(keys) {
  if (!r2Ready() || !keys.length) return;
  for (let i = 0; i < keys.length; i += 200) {
    const { error } = await sb.functions.invoke('r2-delete', { body: { keys: keys.slice(i, i + 200) } });
    if (error) throw new Error(await fnError(error));
  }
}

// ---------------- LOGIN ----------------
export function renderLogin(app, msg = '') {
  app.innerHTML = `
  <div class="login"><div class="brand big">RLC233</div>
  <form class="cd lform" id="lf">
    <h1 class="serif">Acceso administradora</h1>
    ${msg ? `<p class="err">${esc(msg)}</p>` : ''}
    <label class="lb" for="em">Email</label><input class="in" id="em" type="email" autocomplete="username" required>
    <label class="lb" for="pw" style="margin-top:16px">Contraseña</label><input class="in" id="pw" type="password" autocomplete="current-password" required>
    <p class="err" id="lerr" hidden></p>
    <button class="btn full" style="margin-top:22px">Entrar</button>
  </form></div>`;
  $('#lf').onsubmit = async (e) => {
    e.preventDefault();
    const btn = $('button', e.target);
    btn.disabled = true;
    const { error } = await sb.auth.signInWithPassword({ email: $('#em').value.trim(), password: $('#pw').value });
    if (error) {
      const el = $('#lerr');
      el.textContent = 'Email o contraseña incorrectos.';
      el.hidden = false;
      btn.disabled = false;
      return;
    }
    refresh();
  };
}

// ---------------- LISTA DE GALERÍAS ----------------
export async function renderAdminHome(app) {
  app.innerHTML = shell('<p class="muted">Cargando…</p>');
  bindShell();
  const { data: gs, error } = await sb.from('gallery_overview').select('*').order('created_at', { ascending: false });
  if (error) { $('.wrap').innerHTML = `<p class="err">${esc(error.message)}</p>`; return; }
  const covers = await Promise.all(gs.map((g) => sb.from('photos').select('r2_key').eq('gallery_id', g.id).order('position').limit(1)));
  const card = (g, i) => {
    const key = covers[i].data?.[0]?.r2_key;
    const cover = key && r2Ready() ? `<img src="${esc(photoUrl(key))}" alt="" loading="lazy">` : '';
    const state = g.access_count === 0 ? 'Crea los accesos'
      : g.submitted_count ? `${g.submitted_count} de ${g.access_count} selecciones enviadas` : 'Esperando selección';
    return `<a class="gcard cd" href="#/galeria/${g.id}" data-name="${esc(g.name.toLowerCase())}">
      <div class="cover">${cover}</div>
      <div class="gbody"><div class="gname serif">${esc(g.name)}</div>
      <div class="muted sm">${g.photo_count} fotos · ${g.access_count} accesos · ${extraTxt(g.extra_price_cents)}</div>
      <span class="tag ${g.submitted_count ? 'ok' : ''}">${esc(state)}</span></div></a>`;
  };
  $('.wrap').innerHTML = `
    <div class="rowhead"><h1 class="serif">Galerías</h1>
      <div class="tools"><input class="in" id="q" placeholder="Buscar galería…" aria-label="Buscar"><a class="btn" href="#/nueva">+ Nueva galería</a></div></div>
    <div class="ggrid" id="gg">${gs.map(card).join('') || '<p class="muted">Aún no hay galerías. Crea la primera.</p>'}</div>
    <section class="cd pushbox"><div><b>Avisos en el móvil</b>
      <div class="muted sm">Recibe una notificación cuando un cliente envíe su selección. En iPhone, añade antes esta web a la pantalla de inicio.</div></div>
      <button class="btn ghost" id="pushbtn">Activar avisos en este dispositivo</button></section>`;
  $('#q').oninput = (e) => {
    const q = e.target.value.trim().toLowerCase();
    $$('.gcard').forEach((c) => { c.hidden = q && !c.dataset.name.includes(q); });
  };
  $('#pushbtn').onclick = enablePush;
}

async function enablePush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return toast('Este navegador no admite avisos. En iPhone, añade primero la web a la pantalla de inicio.');
  }
  if (CONFIG.VAPID_PUBLIC_KEY.includes('PON_AQUI')) return toast('Falta la clave pública VAPID en js/config.js');
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return toast('Has denegado el permiso de notificaciones.');
    const reg = await navigator.serviceWorker.register('sw.js');
    await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription())
      || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(CONFIG.VAPID_PUBLIC_KEY) }));
    const j = sub.toJSON();
    const { error } = await sb.from('push_subscriptions').upsert({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }, { onConflict: 'endpoint' });
    if (error) throw error;
    toast('Avisos activados en este dispositivo ✓');
  } catch (e) {
    toast('No se pudieron activar los avisos: ' + e.message);
  }
}

// ---------------- SUBIDA DE FOTOS ----------------
async function uploadPhotos(galleryId, files, onProgress) {
  files = [...files].filter((f) => f.type.startsWith('image/'))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  if (!files.length) return { ok: 0, failed: [] };
  const { data: last } = await sb.from('photos').select('position').eq('gallery_id', galleryId).order('position', { ascending: false }).limit(1);
  const base = last?.length ? last[0].position + 1 : 0;
  const { data: slots, error } = await sb.functions.invoke('r2-upload', { body: { gallery_id: galleryId, count: files.length } });
  if (error) throw new Error(await fnError(error));
  const rows = [], failed = [];
  let next = 0, done = 0;
  async function worker() {
    while (next < files.length) {
      const n = next++;
      const f = files[n];
      try {
        const { blob } = await watermark(f);
        const r = await fetch(slots.uploads[n].url, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: blob });
        if (!r.ok) throw new Error('R2 ' + r.status);
        rows.push({ gallery_id: galleryId, r2_key: slots.uploads[n].key, filename: f.name, position: base + n });
      } catch (e) {
        console.error(f.name, e);
        failed.push(f.name);
      }
      onProgress(++done, files.length);
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  for (let i = 0; i < rows.length; i += 100) {
    const { error: e2 } = await sb.from('photos').insert(rows.slice(i, i + 100));
    if (e2) throw e2;
  }
  return { ok: rows.length, failed };
}

async function uploadWithUI(galleryId, files) {
  const box = $('#prog');
  box.hidden = false;
  const res = await uploadPhotos(galleryId, files, (d, t) => {
    $('#ptxt').textContent = `Subiendo ${d} de ${t} fotos…`;
    $('#ppct').textContent = Math.round((d / t) * 100) + ' %';
    $('#pfill').style.width = (d / t) * 100 + '%';
  });
  if (res.failed.length) toast(`${res.failed.length} fotos no se pudieron subir: ${res.failed.slice(0, 3).join(', ')}…`);
  return res;
}

const progressHtml = '<div id="prog" hidden><div class="pl"><span id="ptxt"></span><b id="ppct"></b></div><div class="pbar"><div id="pfill"></div></div></div>';

// ---------------- NUEVA GALERÍA ----------------
export function renderNewGallery(app) {
  const ready = r2Ready();
  app.innerHTML = shell(`
    <a class="btn ghost" href="#/">← Galerías</a>
    <h1 class="serif" style="margin:20px 0 28px">Nueva galería</h1>
    <div class="cd form">
      <div class="two"><div><label class="lb" for="gn">Nombre</label><input class="in" id="gn" placeholder="Boda Juan y Pepa"></div>
      <div class="w200"><label class="lb" for="gp">Precio foto extra (€)</label><input class="in" id="gp" inputmode="decimal" autocomplete="off" placeholder="Sin extras" value="8"></div></div>
      <p class="muted sm" style="margin:-14px 0 24px">Deja el precio vacío si esta galería no admite fotos extra.</p>
      <span class="lb">Fotos (hasta 500)</span>
      <label class="drop ${ready ? '' : 'off'}" id="drop"><input type="file" id="gf" accept="image/*" multiple hidden ${ready ? '' : 'disabled'}>
        <b>Arrastra aquí las fotos o elige archivos</b>
        <span class="muted sm" id="dinfo">${ready ? `Se reducen a ${CONFIG.MAX_SIDE} px y se les graba la marca ${esc(CONFIG.BRAND)} antes de subirse` : 'La subida está desactivada: falta configurar Cloudflare R2 en js/config.js. Puedes crear la galería vacía.'}</span></label>
      ${progressHtml}
      <div class="actions end"><span class="muted sm">Los accesos de clientes se crean después, cuando la galería esté lista.</span><button class="btn" id="go">Crear galería</button></div>
    </div>`);
  bindShell();
  numericOnly($('#gp'), { decimal: true });
  let files = [];
  const setFiles = (list) => {
    files = [...list].filter((f) => f.type.startsWith('image/'));
    $('#dinfo').textContent = files.length ? `${files.length} fotos seleccionadas` : 'No hay fotos válidas';
  };
  $('#gf').onchange = (e) => setFiles(e.target.files);
  const drop = $('#drop');
  drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('over'); if (ready) setFiles(e.dataTransfer.files); };
  $('#go').onclick = async () => {
    const name = $('#gn').value.trim();
    if (!name) return toast('Ponle un nombre a la galería');
    const rawPrice = $('#gp').value.trim().replace(',', '.');
    const price = rawPrice === '' ? null : parseFloat(rawPrice);
    if (price !== null && !(price >= 0)) return toast('El precio no es válido');
    if (files.length > 500) return toast('Máximo 500 fotos por galería');
    const btn = $('#go');
    btn.disabled = true;
    const { data: g, error } = await sb.from('galleries').insert({ name, extra_price_cents: price === null ? null : Math.round(price * 100) }).select().single();
    if (error) { toast(error.message); btn.disabled = false; return; }
    if (files.length) {
      try { await uploadWithUI(g.id, files); } catch (e) { toast('Error al subir: ' + e.message); }
    }
    goto('#/galeria/' + g.id);
  };
}

// ---------------- DETALLE DE GALERÍA ----------------
export async function renderGalleryAdmin(app, id) {
  app.innerHTML = shell('<p class="muted">Cargando…</p>');
  bindShell();
  const [g, ph, ac] = await Promise.all([
    sb.from('galleries').select('*').eq('id', id).single(),
    sb.from('photos').select('id,r2_key,filename,position').eq('gallery_id', id).order('position').limit(1000),
    sb.from('access_overview').select('*').eq('gallery_id', id).order('created_at'),
  ]);
  if (g.error) {
    $('.wrap').innerHTML = '<p class="err">No se encontró la galería.</p><a class="btn ghost" href="#/">← Galerías</a>';
    return;
  }
  const gal = g.data, photos = ph.data || [], accs = ac.data || [], n = photos.length;
  const ready = r2Ready();

  const accRow = (a) => `<div class="arow" data-id="${a.id}">
    <div class="a1"><b>${esc(a.name)}</b><div class="muted sm">PIN ${a.pin ? esc(a.pin) : 'sin PIN'} · límite ${a.max_selections}${a.allow_extras ? ' + extras' : ''}</div></div>
    <div class="a2"><span class="tag ${a.submitted_at ? 'ok' : ''}">${a.submitted_at ? 'Enviada · ' : ''}${a.selected_count} elegidas${a.extra_count ? ` (${a.extra_count} extra · ${euros(a.extra_total_cents)})` : ''}</span></div>
    <div class="a3"><button class="btn ghost sm" data-act="copy">Copiar enlace</button><button class="btn ghost sm" data-act="view">Ver selección</button>${a.submitted_at ? '<button class="btn ghost sm" data-act="reopen">Reabrir</button>' : ''}<button class="btn ghost sm danger" data-act="del">Eliminar</button></div></div>`;

  const form = n === 0
    ? '<h2 class="serif">Nuevo acceso</h2><p class="muted">Sube primero las fotos de la galería. Después podrás crear los accesos.</p>'
    : `<h2 class="serif">Nuevo acceso</h2>
      <label class="lb" for="an">Nombre</label><input class="in" id="an" placeholder="Padres de Juan" required>
      <label class="lb" style="margin-top:18px">Fotos a elegir</label>
      <div class="chips">${[7, 10, 15, 20, 30].filter((v) => v <= n).map((v) => `<button type="button" class="chip" data-v="${v}">${v}</button>`).join('')}</div>
      <label class="lb" for="al" style="margin-top:14px">Otro número (1–${n})</label>
      <input class="in" id="al" inputmode="numeric" autocomplete="off" value="${Math.min(15, n)}" required>
      <label class="lb" for="ap" style="margin-top:18px">PIN (vacío = sin PIN)</label>
      <div class="pinrow"><input class="in" id="ap" inputmode="numeric" maxlength="8" placeholder="Sin PIN" value="${genPin()}"><button type="button" class="btn ghost sm" id="newpin">Otro PIN</button></div>
      ${gal.extra_price_cents == null ? '<p class="muted sm" style="margin-top:18px">Esta galería no admite fotos extra.</p>' : `<label class="chk"><input type="checkbox" id="ax"> Permitir fotos extra (${euros(gal.extra_price_cents)} cada una)</label>
      <div id="axm" hidden><label class="lb" for="axn">Máximo de extras (vacío = sin tope)</label><input class="in" id="axn" inputmode="numeric" autocomplete="off"></div>`}
      <button class="btn full" style="margin-top:24px">Crear acceso</button>`;

  $('.wrap').innerHTML = `
    <a class="btn ghost" href="#/">← Galerías</a>
    <div class="rowhead" style="margin-top:20px"><h1 class="serif">${esc(gal.name)}</h1>
      <div class="tools"><span class="muted">${n} fotos · ${extraTxt(gal.extra_price_cents)}</span>
      <button class="btn ghost sm" id="eprice">Cambiar precio extra</button><button class="btn ghost sm danger" id="delg">Eliminar galería</button></div></div>
    <div class="cols">
      <section class="cd pad"><h2 class="upper">Accesos</h2><div id="alist">${accs.map(accRow).join('') || '<p class="muted">Todavía no hay accesos.</p>'}</div></section>
      <form class="cd pad aform" id="af">${form}</form>
    </div>
    <section class="cd pad" style="margin-top:28px"><div class="rowhead"><h2 class="upper">Fotos</h2>
      <div class="tools"><span class="muted sm">${ready ? 'Haz clic en una foto para eliminarla' : 'Subida desactivada: falta configurar R2'}</span>
      <label class="btn ghost sm ${ready ? '' : 'off'}">+ Añadir fotos<input type="file" id="addf" accept="image/*" multiple hidden ${ready ? '' : 'disabled'}></label></div></div>
      ${progressHtml}
      <div class="pgrid">${photos.map((p) => `<button class="pth" data-id="${p.id}" data-key="${esc(p.r2_key)}" title="${esc(p.filename || '')}">${ready ? `<img src="${esc(photoUrl(p.r2_key))}" alt="" loading="lazy">` : esc(p.filename || '')}</button>`).join('') || '<p class="muted">Aún no hay fotos.</p>'}</div>
    </section>`;

  const reload = () => renderGalleryAdmin(app, id);

  // --- crear acceso
  if (n > 0) {
    $$('.chip').forEach((c) => { c.onclick = () => { $('#al').value = c.dataset.v; }; });
    $('#newpin').onclick = () => { $('#ap').value = genPin(); };
    numericOnly($('#al')); numericOnly($('#ap')); if ($('#axn')) numericOnly($('#axn'));
    if ($('#ax')) $('#ax').onchange = (e) => { $('#axm').hidden = !e.target.checked; };
    $('#af').onsubmit = async (e) => {
      e.preventDefault();
      const max = parseInt($('#al').value, 10);
      if (!(max >= 1 && max <= n)) return toast(`El límite debe estar entre 1 y ${n}`);
      const { error } = await sb.rpc('admin_create_access', {
        p_gallery: id,
        p_name: $('#an').value.trim(),
        p_max: max,
        p_pin: $('#ap').value.trim() || null,
        p_allow_extras: $('#ax')?.checked ?? false,
        p_max_extras: !$('#axn') || $('#axn').value === '' ? null : parseInt($('#axn').value, 10),
      });
      if (error) return toast(error.message);
      toast('Acceso creado');
      reload();
    };
  }

  // --- acciones de cada acceso
  $('#alist').onclick = async (e) => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const a = accs.find((x) => x.id === b.closest('.arow').dataset.id);
    if (b.dataset.act === 'copy') {
      const url = `${location.origin}${location.pathname}#/g/${a.token}`;
      navigator.clipboard.writeText(url).then(() => toast('Enlace copiado'), () => showText('Copia el enlace', url));
    } else if (b.dataset.act === 'view') {
      viewSelection(a);
    } else if (b.dataset.act === 'reopen') {
      if (!(await ask(`¿Reabrir la selección de "${a.name}"? Podrá volver a cambiarla.`, { ok: 'Reabrir' }))) return;
      const { error } = await sb.from('accesses').update({ submitted_at: null }).eq('id', a.id);
      if (error) return toast(error.message);
      reload();
    } else if (b.dataset.act === 'del') {
      if (!(await ask(`¿Eliminar el acceso "${a.name}" y su selección?`, { ok: 'Eliminar' }))) return;
      const { error } = await sb.from('accesses').delete().eq('id', a.id);
      if (error) return toast(error.message);
      reload();
    }
  };

  async function viewSelection(a) {
    const { data, error } = await sb.from('selections').select('photos(r2_key,filename,position)').eq('access_id', a.id);
    if (error) return toast(error.message);
    const items = (data || []).map((r) => r.photos).filter(Boolean).sort((x, y) => x.position - y.position);
    const names = items.map((i) => i.filename).join('\n');
    const m = openModal(`<h2 class="serif">${esc(a.name)}</h2>
      <p class="muted">${items.length} fotos${a.extra_count ? ` · ${a.extra_count} extra = ${euros(a.extra_total_cents)}` : ''}${a.submitted_at ? ' · enviada' : ' · sin enviar aún'}</p>
      <div class="thumbs">${items.map((i) => `<figure>${ready ? `<img src="${esc(photoUrl(i.r2_key))}" alt="" loading="lazy">` : ''}<figcaption>${esc(i.filename || '')}</figcaption></figure>`).join('')}</div>
      <textarea class="in names" readonly rows="5">${esc(names)}</textarea>
      <div class="mactions"><button class="btn ghost" data-r="copy">Copiar lista de nombres</button><button class="btn" data-r="close">Cerrar</button></div>`, 'wide');
    m.el.addEventListener('click', (ev) => {
      const r = ev.target.closest('button[data-r]')?.dataset.r;
      if (r === 'copy') navigator.clipboard.writeText(names).then(() => toast('Lista copiada'));
      if (r === 'close') m.close();
    });
  }

  // --- galería: precio, borrar, añadir fotos, borrar foto
  $('#eprice').onclick = async () => {
    const v = await askNumber('Precio por foto extra (€). Déjalo vacío para no permitir extras.', gal.extra_price_cents == null ? '' : String(gal.extra_price_cents / 100));
    if (v === null) return;
    const raw = v.replace(',', '.');
    const price = raw === '' ? null : parseFloat(raw);
    if (price !== null && !(price >= 0)) return toast('Escribe un precio válido');
    const { error } = await sb.from('galleries').update({ extra_price_cents: price === null ? null : Math.round(price * 100) }).eq('id', id);
    if (error) return toast(error.message);
    if (price === null) await sb.from('accesses').update({ allow_extras: false, max_extras: null }).eq('gallery_id', id);
    reload();
  };
  $('#delg').onclick = async () => {
    if (!(await ask(`¿Eliminar la galería "${gal.name}" con sus ${n} fotos, accesos y selecciones? No se puede deshacer.`, { ok: 'Eliminar galería' }))) return;
    try {
      await r2Delete(photos.map((p) => p.r2_key));
      const { error } = await sb.from('galleries').delete().eq('id', id);
      if (error) throw error;
      goto('#/');
    } catch (e) { toast('No se pudo eliminar: ' + e.message); }
  };
  if (ready) {
    $('#addf').onchange = async (e) => {
      const files = [...e.target.files];
      if (n + files.length > 500) return toast('Una galería admite como máximo 500 fotos');
      try { await uploadWithUI(id, files); } catch (err) { toast('Error al subir: ' + err.message); }
      reload();
    };
  }
  $('.pgrid').onclick = async (e) => {
    const b = e.target.closest('.pth');
    if (!b) return;
    if (!(await ask('¿Eliminar esta foto? También se quitará de las selecciones.', { ok: 'Eliminar' }))) return;
    try {
      await r2Delete([b.dataset.key]);
      const { error } = await sb.from('photos').delete().eq('id', b.dataset.id);
      if (error) throw error;
      reload();
    } catch (err) { toast('No se pudo eliminar: ' + err.message); }
  };
}
