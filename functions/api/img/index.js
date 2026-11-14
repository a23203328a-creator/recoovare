// Lista de imágenes guardadas (solo los ids)
export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare('SELECT id FROM imgs').all();
  return new Response(JSON.stringify({ ids: (results || []).map((r) => r.id) }), { headers: { 'content-type': 'application/json' } });
}
