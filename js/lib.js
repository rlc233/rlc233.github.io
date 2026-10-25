import { CONFIG } from './config.js';

export const sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const euros = (cents) => (cents / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 });
export const r2Ready = () => !CONFIG.R2_PUBLIC_URL.includes('PON_AQUI');
export const photoUrl = (key) => `${CONFIG.R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`;
export const refresh = () => window.dispatchEvent(new Event('hashchange'));
export const goto = (h) => { if (location.hash === h) refresh(); else location.hash = h; };

let tt;
export function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(tt);
  tt = setTimeout(() => el.classList.remove('show'), 4000);
}

export function openModal(html, cls = '', onClose) {
  const back = document.createElement('div');
  back.className = 'mback';
  back.innerHTML = `<div class="modal ${cls}" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(back);
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  function close() {
    document.removeEventListener('keydown', onKey);
    back.remove();
    if (onClose) onClose();
  }
  document.addEventListener('keydown', onKey);
  back.addEventListener('mousedown', (e) => { if (e.target === back) close(); });
  return { el: back, close };
}

export function ask(message, { ok = 'Aceptar', cancel = 'Cancelar' } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    const m = openModal(
      `<p>${esc(message)}</p><div class="mactions"><button class="btn ghost" data-r="0">${esc(cancel)}</button><button class="btn" data-r="1">${esc(ok)}</button></div>`,
      'small', () => finish(false));
    m.el.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-r]');
      if (!b) return;
      finish(b.dataset.r === '1');
      m.close();
    });
  });
}
