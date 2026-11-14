// Todo /api/* solo funciona con una sesión válida de Cloudflare Access (inicio de sesión con tu correo).
// Se verifica la firma del token de Access (no basta con que exista el encabezado).
// Variables del proyecto: ACCESS_TEAM (ej. recoovare.cloudflareaccess.com) y ACCESS_AUD (etiqueta de la aplicación).
let listo = false, llaves = null, llavesT = 0;
const json = (o, s) => new Response(JSON.stringify(o), { status: s || 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

async function crearTablas(db) {
  if (listo) return;
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL, t INTEGER NOT NULL)'),
    db.prepare('CREATE TABLE IF NOT EXISTS imgs (id TEXT PRIMARY KEY, data TEXT NOT NULL, t INTEGER NOT NULL)')
  ]);
  listo = true;
}
function b64url(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const b = atob(s); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
async function certs(team) {
  if (llaves && Date.now() - llavesT < 3600000) return llaves;
  const r = await fetch('https://' + team + '/cdn-cgi/access/certs');
  const j = await r.json();
  llaves = j.keys || []; llavesT = Date.now();
  return llaves;
}
async function verificar(token, env) {
  const partes = token.split('.');
  if (partes.length !== 3) return null;
  const cab = JSON.parse(new TextDecoder().decode(b64url(partes[0])));
  const datos = JSON.parse(new TextDecoder().decode(b64url(partes[1])));
  const ks = await certs(env.ACCESS_TEAM);
  const k = ks.find((x) => x.kid === cab.kid);
  if (!k) return null;
  const llave = await crypto.subtle.importKey('jwk', k, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', llave, b64url(partes[2]), new TextEncoder().encode(partes[0] + '.' + partes[1]));
  if (!ok) return null;
  const aud = Array.isArray(datos.aud) ? datos.aud : [datos.aud];
  if (!aud.includes(env.ACCESS_AUD)) return null;
  if (datos.exp && datos.exp * 1000 < Date.now()) return null;
  return datos;
}
export async function onRequest(ctx) {
  const { request, env, next } = ctx;
  if (!env.ACCESS_TEAM || !env.ACCESS_AUD) return json({ error: 'Acceso privado sin configurar' }, 503);
  const token = request.headers.get('Cf-Access-Jwt-Assertion') || '';
  let usuario = null;
  try { usuario = token ? await verificar(token, env) : null; } catch (e) { usuario = null; }
  if (!usuario) return json({ error: 'Sin acceso' }, 401);
  if (!env.DB) return json({ error: 'Base de datos no conectada' }, 500);
  await crearTablas(env.DB);
  const r = await next();
  const h = new Headers(r.headers); h.set('cache-control', 'no-store');
  return new Response(r.body, { status: r.status, headers: h });
}
