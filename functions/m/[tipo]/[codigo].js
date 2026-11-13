// Página de un modelo: /m/placas/001 o /m/lapidas/L75
// La usa el mensaje de WhatsApp para que se vea la foto del modelo (vista previa).
// Lee los datos de datos.js, así que no hay que tocar nada al agregar modelos.

const CARPETAS = { placas: 'fotos/placas/', lapidas: 'fotos/lapidas/' };
const NOMBRES = { placas: 'Placa', lapidas: 'Lápida' };

function esc(t) {
  return String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export async function onRequestGet({ params, request, env }) {
  const tipo = String(params.tipo || '');
  const codigo = decodeURIComponent(String(params.codigo || ''));
  const origen = new URL(request.url).origin;
  if (!CARPETAS[tipo] || !/^[A-Za-z0-9-]{1,10}$/.test(codigo)) return Response.redirect(origen + '/', 302);

  let nombre = '', categoria = '', foto = '';
  try {
    const res = await env.ASSETS.fetch(new URL('/datos.js', request.url));
    const txt = await res.text();
    const re = new RegExp('codigo:\\s*"' + codigo.replace(/[-]/g, '\\-') + '",\\s*nombre:\\s*"([^"]*)",\\s*categoria:\\s*"([^"]*)",[^}]*?foto:\\s*"([^"]*)"');
    const m = re.exec(txt);
    if (m) { nombre = m[1]; categoria = m[2]; foto = m[3]; }
  } catch (e) { /* sin datos: igual mostramos algo */ }
  if (!foto) return Response.redirect(origen + '/#' + tipo, 302);

  const titulo = NOMBRES[tipo] + ' #' + codigo + ' · ' + nombre;
  const img = origen + '/' + CARPETAS[tipo] + foto;
  const url = origen + '/m/' + tipo + '/' + encodeURIComponent(codigo);
  const html = `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)} – Recoovare</title>
<meta name="description" content="${esc(categoria)} · Recoovare, placas y lápidas en Mérida.">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Recoovare">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(categoria)} · Recoovare">
<meta property="og:image" content="${esc(img)}">
<meta property="og:image:alt" content="${esc(titulo)}">
<meta property="og:url" content="${esc(url)}">
<meta name="twitter:card" content="summary_large_image">
<style>
  body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:#FAF7F2;color:#3B2A22;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:20px;box-sizing:border-box}
  .c{background:#fff;border:1px solid #E8E0D8;border-radius:20px;max-width:520px;width:100%;overflow:hidden;text-align:center}
  .f{background:#F4EFE9;padding:20px}.f img{width:100%;height:auto;display:block}
  .i{padding:18px 20px 22px}.n{display:inline-block;background:#4A2618;color:#fff;font-weight:800;border-radius:999px;padding:4px 14px}
  h1{font-size:22px;color:#4A2618;margin:10px 0 4px}p{margin:0 0 16px;color:#5E4E45}
  a{display:inline-block;background:#4A2618;color:#fff;text-decoration:none;font-weight:800;border-radius:999px;padding:12px 24px}
</style>
</head><body>
<div class="c">
  <div class="f"><img src="${esc(img)}" alt="${esc(titulo)}"></div>
  <div class="i"><span class="n">#${esc(codigo)}</span><h1>${esc(nombre)}</h1><p>${esc(NOMBRES[tipo])} · ${esc(categoria)}</p>
  <a href="/#${esc(tipo)}">Ver catálogo</a></div>
</div>
</body></html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300' } });
}
