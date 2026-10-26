import { CONFIG } from './config.js';

// Ajustes de la marca de agua (súbelos para más marca, bájalos para menos)
const WM = {
  tileSize: 0.04,   // tamaño del texto del mosaico (fracción del lado corto)
  tileAlpha: 0.16,  // opacidad del mosaico
  gapX: 11,         // separación horizontal (en tamaños de texto)
  gapY: 7.5,        // separación vertical
  bigSize: 0.12,    // tamaño de la marca central
  bigAlpha: 0.12,   // opacidad de la marca central
};

// Reduce la foto y le graba la marca de agua en mosaico (queda dentro de la imagen).
export async function watermark(file) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, CONFIG.MAX_SIDE / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(bmp, 0, 0, w, h);
  if (bmp.close) bmp.close();

  const text = CONFIG.BRAND;
  const mark = (size, fill, stroke) => {
    g.font = `600 ${size}px Inter, Arial, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = Math.max(1, size / 14);
    g.fillStyle = fill;
    g.strokeStyle = stroke;
    return () => { g.strokeText(text, 0, 0); g.fillText(text, 0, 0); };
  };

  // Mosaico diagonal por toda la imagen
  const size = Math.max(12, Math.round(Math.min(w, h) * WM.tileSize));
  const draw = mark(size, `rgba(255,255,255,${WM.tileAlpha})`, `rgba(0,0,0,${WM.tileAlpha * 0.6})`);
  const stepX = size * WM.gapX, stepY = size * WM.gapY;
  const R = Math.hypot(w, h) / 2;
  g.save();
  g.translate(w / 2, h / 2);
  g.rotate(-Math.PI / 7);
  let row = 0;
  for (let y = -R; y <= R; y += stepY, row++) {
    for (let x = -R + (row % 2 ? stepX / 2 : 0); x <= R; x += stepX) {
      g.save(); g.translate(x, y); draw(); g.restore();
    }
  }
  g.restore();

  // Marca grande en el centro
  const big = mark(Math.round(Math.min(w, h) * WM.bigSize), `rgba(255,255,255,${WM.bigAlpha})`, `rgba(0,0,0,${WM.bigAlpha * 0.6})`);
  g.save(); g.translate(w / 2, h / 2); g.rotate(-Math.PI / 7); big(); g.restore();

  const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', CONFIG.JPEG_QUALITY));
  if (!blob) throw new Error('No se pudo procesar ' + file.name);
  return { blob, width: w, height: h };
}
