// Datos de pedidos y notas: GET los entrega todos; PUT guarda los que cambiaron.
const CLAVES = ['recoovare_pedidos', 'recoovare_folio_pedidos', 'recoovare_pedidos_ignorados', 'recoovare_config_pedidos', 'recoovare_pedidos_init', 'recoovare_notas', 'recoovare_folio'];
const json = (o, s) => new Response(JSON.stringify(o), { status: s || 200, headers: { 'content-type': 'application/json' } });

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare('SELECT k, v, t FROM kv').all();
  const datos = {}, versiones = {};
  (results || []).forEach((r) => { datos[r.k] = r.v; versiones[r.k] = r.t; });
  return json({ datos, versiones });
}

// body: { cambios: { clave: valorTexto }, base: { clave: versionQueTenía } }
// Si otra computadora o celular guardó esa clave después, responde 409 con lo actual para mezclar.
export async function onRequestPut({ request, env }) {
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'JSON inválido' }, 400); }
  const cambios = body.cambios || {}, base = body.base || {};
  const claves = Object.keys(cambios).filter((k) => CLAVES.includes(k));
  if (!claves.length) return json({ versiones: {} });
  const ph = claves.map(() => '?').join(',');
  const { results } = await env.DB.prepare('SELECT k, v, t FROM kv WHERE k IN (' + ph + ')').bind(...claves).all();
  const actual = {}; (results || []).forEach((r) => { actual[r.k] = r; });
  const choques = claves.filter((k) => actual[k] && base[k] !== undefined && base[k] !== null && actual[k].t !== base[k]);
  if (choques.length && !body.forzar) {
    const datos = {}, versiones = {};
    choques.forEach((k) => { datos[k] = actual[k].v; versiones[k] = actual[k].t; });
    return json({ choque: true, datos, versiones }, 409);
  }
  const t = Date.now();
  await env.DB.batch(claves.map((k) => env.DB.prepare('INSERT INTO kv (k, v, t) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, t = excluded.t').bind(k, String(cambios[k]), t)));
  const versiones = {}; claves.forEach((k) => { versiones[k] = t; });
  return json({ versiones });
}
