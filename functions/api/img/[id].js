// Una imagen de boceto (data URL JPEG reducida)
const ok = (id) => /^[A-Za-z0-9_-]{3,60}$/.test(id);
export async function onRequestGet({ params, env }) {
  if (!ok(params.id)) return new Response('', { status: 400 });
  const r = await env.DB.prepare('SELECT data FROM imgs WHERE id = ?').bind(params.id).first();
  if (!r) return new Response('', { status: 404 });
  return new Response(r.data, { headers: { 'content-type': 'text/plain' } });
}
export async function onRequestPut({ params, request, env }) {
  if (!ok(params.id)) return new Response('', { status: 400 });
  const data = await request.text();
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(data) || data.length > 1900000) return new Response('Imagen no válida o muy grande', { status: 400 });
  await env.DB.prepare('INSERT INTO imgs (id, data, t) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, t = excluded.t').bind(params.id, data, Date.now()).run();
  return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
}
export async function onRequestDelete({ params, env }) {
  if (!ok(params.id)) return new Response('', { status: 400 });
  await env.DB.prepare('DELETE FROM imgs WHERE id = ?').bind(params.id).run();
  return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
}
