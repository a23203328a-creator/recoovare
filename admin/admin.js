/* =====================================================================
   Panel de inicio (privado). Solo LEE los datos de Pedidos, Agenda y
   Apuntes; no cambia nada.
   ===================================================================== */
(function () {
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var $ = function (id) { return document.getElementById(id); };
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function leer(k, d) { try { var v = localStorage.getItem(k); var j = v ? JSON.parse(v) : d; return j == null ? d : j; } catch (e) { return d; } }
  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
  function dinero(n) { n = Math.round(num(n)); return '$' + n.toLocaleString('es-MX'); }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function fechaDe(s) { var p = String(s).slice(0, 10).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function sumarDias(s, n) { var d = fechaDe(s); d.setDate(d.getDate() + n); return iso(d); }
  function aMin(h) { var p = String(h || '0:0').split(':'); return (+p[0] || 0) * 60 + (+p[1] || 0); }
  function corta(s) { var d = fechaDe(s); return DIAS[d.getDay()].slice(0, 3) + ' ' + d.getDate() + ' ' + MESES[d.getMonth()].slice(0, 3); }
  var HOY = iso(new Date()), FIN7 = sumarDias(HOY, 6);

  var pedidos = leer('recoovare_pedidos', []); if (!Array.isArray(pedidos)) pedidos = [];
  var agenda = leer('recoovare_agenda', []); if (!Array.isArray(agenda)) agenda = [];
  var apuntes = leer('admin_apuntes', []); if (!Array.isArray(apuntes)) apuntes = [];
  agenda = agenda.filter(function (e) { return e && !e.borrado && e.fecha; });
  var SIN_TIEMPO = ['pago', 'pendiente', 'recordatorio'];

  function activo(p) { return p.estado !== 'Entregado' && p.estado !== 'Cancelado'; }
  function saldo(p) {
    var total = num(p.precioProducto) + num(p.extras);
    var pagado = (p.pagos || []).reduce(function (s, x) { return s + num(x.monto); }, 0);
    return Math.max(0, total - pagado);
  }
  function pedidoPorId(id) { return pedidos.find(function (p) { return p.id === id; }) || null; }
  // Igual que la agenda: entregas de pedidos cancelados o borrados no se muestran; la fecha la manda el pedido.
  // Pendientes sin hacer de días pasados se muestran hoy como atrasados.
  agenda = agenda.filter(function (e) {
    if (e.tipo !== 'entrega_r' || !pedidos.length) return true;
    var p = pedidoPorId(e.pedidoId); return p && p.estado !== 'Cancelado';
  }).map(function (e) {
    if (e.tipo === 'entrega_r' && !e.hecho) { var p = pedidoPorId(e.pedidoId); if (p && p.entrega && p.entrega !== e.fecha) e = Object.assign({}, e, { fecha: p.entrega }); }
    if (e.tipo === 'pendiente' && !e.hecho && e.fecha < HOY) e = Object.assign({}, e, { fecha: HOY, atrasadoDe: e.fecha });
    return e;
  });
  function etiqueta(e) {
    if (e.tipo === 'cita_r') return { t: 'Cita de diseño', n: 'r' };
    if (e.tipo === 'entrega_r') return { t: e.metodo === 'instalacion' ? 'Instalación' : e.metodo === 'recoge' ? 'Recoge en el local' : 'Entrega', n: 'r' };
    if (e.tipo === 'essentia') return { t: e.modo === 'local' ? 'Visita al local' : 'Entrega', n: 'e' };
    if (e.tipo === 'ocupado') return { t: 'Ocupado', n: 'o' };
    var n = e.negocio === 'e' ? 'e' : 'r';
    return { t: { reunion: 'Reunión', pendiente: 'Pendiente', recordatorio: 'Recordatorio', pago: e.dir === 'cobrar' ? 'Cobrar' + (num(e.monto) ? ' ' + dinero(e.monto) : '') : 'Pagar' + (num(e.monto) ? ' ' + dinero(e.monto) : '') }[e.tipo] || 'Evento', n: n };
  }
  function quien(e) {
    if (e.tipo === 'ocupado') return e.razon || '';
    if (e.tipo === 'reunion' || SIN_TIEMPO.indexOf(e.tipo) >= 0) return e.asunto || '';
    if (e.tipo === 'entrega_r') { var p = pedidoPorId(e.pedidoId); return p ? (p.cliente || 'Sin nombre') + (p.folio ? ' · ' + p.folio : '') : (e.cliente || ''); }
    return e.cliente || '';
  }

  /* ---------- saludo ---------- */
  var ahora = new Date(), h = ahora.getHours();
  $('saludo').textContent = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  $('saludo-fecha').textContent = DIAS[ahora.getDay()] + ' ' + ahora.getDate() + ' de ' + MESES[ahora.getMonth()];

  /* ---------- indicadores ---------- */
  var activos = pedidos.filter(activo);
  var sinBoceto = activos.filter(function (p) { return p.estado === 'Pendiente de boceto'; });
  var enRevision = activos.filter(function (p) { return p.estado === 'En revisión'; });
  var entregasAg = agenda.filter(function (e) { return e.tipo === 'entrega_r' && !e.hecho && e.fecha >= HOY && e.fecha <= FIN7; });
  var agendados = {}; agenda.forEach(function (e) { if (e.tipo === 'entrega_r' && !e.hecho) agendados[e.pedidoId] = 1; });
  var acordadasSinAgendar = activos.filter(function (p) { return p.entrega && p.entrega >= HOY && p.entrega <= FIN7 && !agendados[p.id]; });
  var sinAgendar = activos.filter(function (p) { return !agendados[p.id]; });
  var deHoy = agenda.filter(function (e) { return e.fecha === HOY; }).sort(function (a, b) { return (a.hora ? 1 : 0) - (b.hora ? 1 : 0) || aMin(a.hora) - aMin(b.hora); });
  var conSaldo = pedidos.filter(function (p) { return p.estado !== 'Cancelado' && saldo(p) > 0; });
  var porCobrar = conSaldo.reduce(function (s, p) { return s + saldo(p); }, 0);
  var atrasados = activos.filter(function (p) { return p.entrega && p.entrega < HOY; });
  var pendHoy = deHoy.filter(function (e) { return !e.hecho; }).length;

  function kpi(href, titulo, valor, sub, color) {
    return '<a class="ad-kpi' + (color ? ' ' + color : '') + '" href="' + href + '"><span>' + titulo + '</span><strong>' + valor + '</strong><small>' + sub + '</small></a>';
  }
  var nEntregas = entregasAg.length + acordadasSinAgendar.length;
  $('kpis').innerHTML =
    kpi('../pedidos/', 'Pedidos activos', activos.length, 'RECOOVARE, sin entregar') +
    kpi('../pedidos/', 'Bocetos pendientes', sinBoceto.length + enRevision.length,
      sinBoceto.length + ' por hacer · ' + enRevision.length + ' por aprobar', (sinBoceto.length + enRevision.length) ? 'ambar' : '') +
    kpi('../pedidos/agenda/', 'Entregas en 7 días', nEntregas,
      acordadasSinAgendar.length ? acordadasSinAgendar.length + ' sin hora en la agenda' : 'Entregas e instalaciones') +
    kpi('../pedidos/agenda/#' + HOY, 'Para hoy', deHoy.length,
      deHoy.length ? (pendHoy ? pendHoy + ' pendientes' : 'Todo hecho') : 'Agenda libre', pendHoy ? 'azul' : '') +
    kpi('../pedidos/', 'Por cobrar', dinero(porCobrar), conSaldo.length + (conSaldo.length === 1 ? ' pedido con saldo' : ' pedidos con saldo'), porCobrar > 0 ? 'rojo' : '');

  if (atrasados.length) {
    $('aviso').hidden = false;
    $('aviso').innerHTML = '<b>' + atrasados.length + (atrasados.length === 1 ? ' pedido ya pasó' : ' pedidos ya pasaron') + ' su fecha de entrega.</b> <a href="../pedidos/">Revisarlos</a>';
  }

  /* ---------- próximas actividades ---------- */
  var minAhora = ahora.getHours() * 60 + ahora.getMinutes();
  var proximas = agenda.filter(function (e) { return e.fecha > HOY || (e.fecha === HOY); })
    .sort(function (a, b) { return a.fecha.localeCompare(b.fecha) || (a.hora ? 1 : 0) - (b.hora ? 1 : 0) || aMin(a.hora) - aMin(b.hora); });
  var hoyTodas = proximas.filter(function (e) { return e.fecha === HOY; });
  var futuras = proximas.filter(function (e) { return e.fecha > HOY && !e.hecho; }).slice(0, Math.max(3, 7 - hoyTodas.length));
  var lista = hoyTodas.concat(futuras);
  var fechaPrev = '';
  $('eventos').innerHTML = lista.length ? lista.map(function (e) {
    var et = etiqueta(e), cab = '';
    if (e.fecha !== fechaPrev) { fechaPrev = e.fecha; cab = '<li class="ad-dia">' + (e.fecha === HOY ? 'Hoy' : e.fecha === sumarDias(HOY, 1) ? 'Mañana' : corta(e.fecha)) + '</li>'; }
    var pasado = e.fecha === HOY && !!e.hora && SIN_TIEMPO.indexOf(e.tipo) < 0 && aMin(e.hora) + num(e.dur || 30) < minAhora;
    return cab + '<li class="ad-ev' + (e.hecho ? ' hecho' : pasado ? ' pasado' : '') + '"><a href="../pedidos/agenda/#' + e.fecha + '">' +
      '<span class="ad-hora">' + (e.hora ? esc(String(e.hora).slice(0, 5)) : '<small>Día</small>') + '</span>' +
      '<span class="ad-tag t-' + et.n + '">' + (et.n === 'r' ? 'RECOOVARE' : et.n === 'e' ? 'ESSENTIA' : 'Ocupado') + '</span>' +
      '<span class="ad-txt"><b>' + esc(et.t) + '</b>' + (quien(e) ? ' · ' + esc(quien(e)) : '') + '</span>' +
      (e.atrasadoDe ? '<span class="ad-atr">Atrasado</span>' : '') + (e.hecho ? '<span class="ad-ok">Hecho</span>' : '') + '</a></li>';
  }).join('') : '<li class="ad-vacio">No tienes nada agendado de hoy en adelante.</li>';

  if (sinAgendar.length) {
    $('sin-agendar').hidden = false;
    $('sin-agendar').innerHTML = '<span>' + sinAgendar.length + (sinAgendar.length === 1 ? ' pedido activo sin fecha en la agenda' : ' pedidos activos sin fecha en la agenda') + '</span><a class="btn btn-claro btn-mini" href="../pedidos/agenda/">Agendar</a>';
  }

  /* ---------- pedidos que requieren atención ---------- */
  var orden = { 'Pendiente de boceto': 1, 'En revisión': 2, 'Listo para entregar': 3 };
  var aten = activos.filter(function (p) { return orden[p.estado] || (p.entrega && p.entrega < HOY); })
    .sort(function (a, b) {
      var ra = (a.entrega && a.entrega < HOY) ? 0 : orden[a.estado], rb = (b.entrega && b.entrega < HOY) ? 0 : orden[b.estado];
      return ra - rb || (a.entrega || '9999').localeCompare(b.entrega || '9999');
    }).slice(0, 8);
  function motivo(p) {
    if (p.entrega && p.entrega < HOY) return ['Atrasado', 'rojo'];
    if (p.estado === 'Pendiente de boceto') return ['Hacer boceto', 'ambar'];
    if (p.estado === 'En revisión') return ['Boceto por aprobar', 'azul'];
    return ['Listo: avisar al cliente', 'verde'];
  }
  $('atencion').innerHTML = aten.length ? aten.map(function (p) {
    var m = motivo(p), s = saldo(p);
    return '<li><a href="../pedidos/"><span class="ad-mot ' + m[1] + '">' + m[0] + '</span>' +
      '<span class="ad-txt"><b>' + esc(p.cliente || 'Sin nombre') + '</b> · ' + esc(p.producto || p.folio || '') +
      '<small>' + esc(p.folio || '') + (p.entrega ? ' · Entrega ' + corta(p.entrega) : '') + (s > 0 ? ' · Debe ' + dinero(s) : '') + '</small></span></a></li>';
  }).join('') : '<li class="ad-vacio">Todo en orden: no hay bocetos pendientes ni pedidos atrasados.</li>';

  /* ---------- apuntes ---------- */
  var vivos = apuntes.filter(function (a) { return a && !a.borrado; }), imp = vivos.filter(function (a) { return a.importante; }).length;
  if (vivos.length) $('apuntes-sub').textContent = vivos.length + (vivos.length === 1 ? ' apunte' : ' apuntes') + (imp ? ' · ' + imp + (imp === 1 ? ' importante' : ' importantes') : '');

  $('cargando').hidden = true; $('kpis').hidden = false; $('cuerpo').hidden = false;
})();
