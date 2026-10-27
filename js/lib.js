import { CONFIG } from './config.js';

export const sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const euros = (cents) => (cents / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 });
export const r2Ready = () => !CONFIG.R2_PUBLIC_URL.includes('PON_AQUI');
export const photoUrl = (key) => `${CONFIG.R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`;
export function errorPage(app, code, title, text, { home = true } = {}) {
  app.innerHTML = `<div class="cmsg"><div class="brand big">${esc(CONFIG.BRAND)}</div><div class="errcode">${esc(code)}</div>
    <h1 class="serif">${esc(title)}</h1><p class="muted">${esc(text)}</p>${home ? '<a class="btn ghost" href="#/">Ir al inicio</a>' : ''}</div>`;
}
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

// Solo números en un campo. decimal=true admite coma o punto con hasta 2 decimales.
export function numericOnly(input, { decimal = false } = {}) {
  input.addEventListener('input', () => {
    let v = input.value;
    if (decimal) {
      v = v.replace(/[^0-9.,]/g, '');
      const m = v.search(/[.,]/);
      if (m !== -1) v = v.slice(0, m + 1) + v.slice(m + 1).replace(/[.,]/g, '').slice(0, 2);
    } else {
      v = v.replace(/\D/g, '');
    }
    if (v !== input.value) input.value = v;
  });
}

// Ventana propia para pedir un número. Devuelve el texto escrito, o null si se cancela.
export function askNumber(title, value = '', { ok = 'Guardar', decimal = true } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    const m = openModal(
      `<form id="nf"><p style="margin:0 0 12px;font-size:16px">${esc(title)}</p>
       <input class="in" id="nv" inputmode="${decimal ? 'decimal' : 'numeric'}" autocomplete="off" value="${esc(value)}" aria-label="${esc(title)}">
       <div class="mactions"><button type="button" class="btn ghost" data-r="0">Cancelar</button><button class="btn">${esc(ok)}</button></div></form>`,
      'small', () => finish(null));
    const input = $('#nv', m.el);
    numericOnly(input, { decimal });
    input.focus(); input.select();
    $('#nf', m.el).onsubmit = (e) => { e.preventDefault(); finish(input.value.trim()); m.close(); };
    m.el.addEventListener('click', (e) => { if (e.target.closest('[data-r="0"]')) m.close(); });
  });
}

// Ventana propia para mostrar un texto seleccionable (por ejemplo, un enlace).
export function showText(title, text) {
  const m = openModal(
    `<p style="margin:0 0 12px;font-size:16px">${esc(title)}</p><input class="in" id="st" readonly value="${esc(text)}">
     <div class="mactions"><button class="btn">Cerrar</button></div>`, 'small');
  const i = $('#st', m.el);
  i.focus(); i.select();
  $('.btn', m.el).onclick = () => m.close();
}
