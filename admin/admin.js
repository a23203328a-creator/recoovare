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
      deHoy.length ? (pendHoy ? pendHoy + (pendHoy === 1 ? ' por hacer' : ' por hacer') : 'Todo hecho') : 'Agenda libre', pendHoy ? 'azul' : '') +
    kpi('../pedidos/', 'Por cobrar', dinero(porCobrar), conSaldo.length + (conSaldo.length === 1 ? ' pedido con saldo' : ' pedidos con saldo'), porCobrar > 0 ? 'rojo' : '');

  // Pagos de tarjeta (los pone Tarjetas en la agenda): vencen en 7 días o menos
  var tarj = agenda.filter(function (e) { return e.tarjetaId && e.tipo === 'pago' && !e.hecho && e.fecha <= FIN7; })
    .sort(function (a, b) { return a.fecha.localeCompare(b.fecha); });
  if (tarj.length) {
    $('aviso-tj').hidden = false;
    $('aviso-tj').innerHTML = '<b>Pago de tarjeta:</b> ' + tarj.map(function (e) {
      var d = Math.round((fechaDe(e.fecha) - fechaDe(HOY)) / 86400000);
      return esc(String(e.asunto || '').replace(/^Tarjeta /, '')) + ' ' + dinero(e.monto) + ' ' + (d < 0 ? '(vencido)' : d === 0 ? 'vence hoy' : d === 1 ? 'vence mañana' : 'vence en ' + d + ' días');
    }).join(' · ') + ' <a href="../pedidos/tarjetas/">Ver tarjetas</a>';
    if (tarj.some(function (e) { return Math.round((fechaDe(e.fecha) - fechaDe(HOY)) / 86400000) <= 3; })) $('aviso-tj').classList.add('urgente');
  }
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

  /* ---------- ventas de RECOOVARE (mismas cuentas que Pedidos › Reparto y comisiones) ---------- */
  var cfgR = Object.assign({ modo: 'porcentaje', pct: 50, fijo: 0 }, leer('recoovare_config_pedidos', {}));
  function calcR(p) {
    var total = num(p.precioProducto) + num(p.extras);
    var pagado = (p.pagos || []).reduce(function (s, x) { return s + num(x.monto); }, 0);
    var inter = num(p.intermediario && p.intermediario.monto);
    var base = Math.max(0, num(p.precioProducto) - inter);
    var r = p.regla || cfgR;
    var parteCalc = r.modo === 'fijo' ? num(r.fijo) : base * num(r.pct) / 100;
    var ajustada = p.ajuste !== null && p.ajuste !== '' && p.ajuste !== undefined;
    var parte = ajustada ? num(p.ajuste) : parteCalc;
    var m = p.mama || {};
    var tieneMonto = m.monto !== null && m.monto !== '' && m.monto !== undefined;
    var recibido = m.pagado ? (tieneMonto ? num(m.monto) : parte) : (tieneMonto ? num(m.monto) : 0);
    var meDebe = Math.max(0, Math.round((parte - recibido) * 100) / 100);
    return { total: total, pagado: pagado, inter: inter, parte: parte, recibido: recibido, meDebe: meDebe };
  }
  function mesDe(f) { return String(f || '').slice(0, 7); }
  function moverMes(m, n) { var p = m.split('-'); var d = new Date(+p[0], +p[1] - 1 + n, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
  function nombreMes(m) { var p = m.split('-'); return MESES[+p[1] - 1] + ' ' + p[0]; }
  var vivosR = pedidos.filter(function (p) { return p.estado !== 'Cancelado'; });
  var VEND = ((window.CATALOGO && window.CATALOGO.vendedores) || []);
  var mesV = mesDe(HOY);
  function cuentasMes(m) {
    var del = vivosR.filter(function (p) { return mesDe(p.fecha) === m; });
    var o = { n: del.length, ventas: 0, parte: 0, mama: 0, cobrado: 0 };
    del.forEach(function (p) { var c = calcR(p); o.ventas += c.total; o.parte += c.parte; o.mama += c.recibido; });
    vivosR.forEach(function (p) { (p.pagos || []).forEach(function (x) { if (mesDe(x.fecha) === m) o.cobrado += num(x.monto); }); });
    o.lista = del; return o;
  }
  function pintarVentas() {
    if (!pedidos.length) return;
    $('ventas').hidden = false;
    var c = cuentasMes(mesV), ant = cuentasMes(moverMes(mesV, -1));
    var mamaDebe = vivosR.reduce(function (s, p) { return s + calcR(p).meDebe; }, 0);
    var comPend = vivosR.reduce(function (s, p) { return s + (p.intermediario && !p.intermediario.pagado ? num(p.intermediario.monto) : 0); }, 0);
    $('v-mes').textContent = nombreMes(mesV);
    $('v-sig').disabled = mesV >= mesDe(HOY);
    var comp = '';
    if (ant.ventas > 0) { var pct = Math.round((c.ventas - ant.ventas) / ant.ventas * 100); comp = (pct >= 0 ? '▲ ' : '▼ ') + Math.abs(pct) + '% vs. ' + MESES[+moverMes(mesV, -1).split('-')[1] - 1]; }
    var k = function (t, v, sub, cls, alc) { return '<div class="ad-v' + (cls ? ' ' + cls : '') + '"><span>' + t + (alc ? ' <em>' + alc + '</em>' : '') + '</span><strong>' + v + '</strong><small>' + sub + '</small></div>'; };
    $('v-kpis').innerHTML =
      k('Ventas', dinero(c.ventas), c.n + (c.n === 1 ? ' pedido' : ' pedidos') + (comp ? ' · ' + comp : ''), comp.indexOf('▼') === 0 ? 'baja' : comp ? 'sube' : '') +
      k('Cobrado a clientes', dinero(c.cobrado), 'Pagos recibidos en el mes') +
      k('Mi parte', dinero(c.parte), 'De los pedidos del mes') +
      k('Mi mamá me pagó', dinero(c.mama), 'De los pedidos del mes') +
      k('Mi mamá me debe', dinero(mamaDebe), 'Saldo pendiente conmigo', mamaDebe > 0 ? 'rojo' : 'verde', 'Total') +
      k('Comisiones por pagar', dinero(comPend), 'A asesores', comPend > 0 ? 'ambar' : '', 'Total');
    // últimos 6 meses
    var meses = [], i; for (i = 5; i >= 0; i--) meses.push(moverMes(mesV, -i));
    var datos = meses.map(function (m) { var x = cuentasMes(m); return { m: m, v: x.ventas, p: x.parte }; });
    var max = Math.max.apply(null, datos.map(function (d) { return d.v; }).concat([1]));
    $('v-meses').innerHTML = datos.map(function (d) {
      return '<button type="button" class="ad-mb' + (d.m === mesV ? ' sel' : '') + '" data-mes="' + d.m + '" aria-label="' + esc(nombreMes(d.m) + ': ventas ' + dinero(d.v) + ', mi parte ' + dinero(d.p)) + '">' +
        '<span class="ad-mb-val">' + (d.v ? dinero(d.v) : '—') + '</span>' +
        '<span class="ad-mb-col"><i class="v" style="height:' + Math.max(d.v ? 4 : 0, d.v / max * 100) + '%"></i><i class="p" style="height:' + Math.max(d.p ? 3 : 0, d.p / max * 100) + '%"></i></span>' +
        '<span class="ad-mb-mes">' + MESES[+d.m.split('-')[1] - 1].slice(0, 3) + '</span></button>';
    }).join('') + '<p class="ad-ley"><i class="v"></i>Ventas <i class="p"></i>Mi parte</p>';
    // por quién llegó
    var grupos = {};
    c.lista.forEach(function (p) {
      var i2 = p.intermediario || {}, v = VEND.find(function (x) { return x.codigo === i2.codigo || (i2.nombre && x.nombre.toLowerCase() === String(i2.nombre).trim().toLowerCase()); });
      var key = v ? v.nombre : (i2.nombre ? i2.nombre : 'Directo (tú)');
      grupos[key] = grupos[key] || { n: 0, v: 0, com: 0 }; grupos[key].n++; grupos[key].v += calcR(p).total; grupos[key].com += num(i2.monto);
    });
    var gl = Object.keys(grupos).map(function (k2) { return { k: k2, d: grupos[k2] }; }).sort(function (a, b) { return b.d.v - a.d.v; });
    $('v-vend').innerHTML = gl.length ? gl.map(function (g) {
      return '<li><span><b>' + esc(g.k) + '</b><small>' + g.d.n + (g.d.n === 1 ? ' pedido' : ' pedidos') + (g.d.com ? ' · comisión ' + dinero(g.d.com) : '') + '</small></span><b>' + dinero(g.d.v) + '</b></li>';
    }).join('') : '<li class="ad-vacio">Sin ventas este mes.</li>';
  }
  $('v-ant').addEventListener('click', function () { mesV = moverMes(mesV, -1); pintarVentas(); });
  $('v-sig').addEventListener('click', function () { if (mesV < mesDe(HOY)) { mesV = moverMes(mesV, 1); pintarVentas(); } });
  $('v-meses').addEventListener('click', function (e) { var b = e.target.closest('[data-mes]'); if (b) { mesV = b.getAttribute('data-mes'); pintarVentas(); } });
  pintarVentas();

  /* ---------- buscador general ---------- */
  function norm(t) { return String(t == null ? '' : t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
  function digitos(t) { return String(t || '').replace(/\D/g, ''); }
  var notas = leer('recoovare_notas', []); if (!Array.isArray(notas)) notas = [];
  var gastos = leer('essentia_gastos', []); if (!Array.isArray(gastos)) gastos = [];
  var agendaTodo = leer('recoovare_agenda', []); if (!Array.isArray(agendaTodo)) agendaTodo = [];
  function totalNota(n) { return (n.items || []).reduce(function (s, i) { return s + num(i.cant) * num(i.precio); }, 0); }
  var GRUPOS = [];
  function grupo(clave, titulo, items) { GRUPOS.push({ k: clave, t: titulo, items: items }); }
  grupo('pedidos', 'Pedidos', pedidos.map(function (p) {
    return { txt: [p.folio, p.notaFolio, p.cliente, p.producto, p.notas, p.ubicacion, p.intermediario && p.intermediario.nombre].join(' '), tel: p.tel, folio: [p.folio, p.notaFolio],
      orden: p.fecha || '', href: '../pedidos/?abrir=' + encodeURIComponent(p.id),
      tit: (p.folio || '') + ' · ' + (p.cliente || 'Sin nombre'), sub: [p.producto, p.estado, p.entrega ? 'Entrega ' + corta(p.entrega) : '', saldo(p) > 0 ? 'Debe ' + dinero(saldo(p)) : ''].filter(Boolean).join(' · '),
      tag: p.estado === 'Cancelado' ? 'Cancelado' : p.estado === 'Entregado' ? 'Entregado' : '' };
  }));
  grupo('notas', 'Notas de venta', notas.filter(function (n) { return n && n.folio; }).map(function (n) {
    var c = n.cliente || {};
    return { txt: [n.folio, c.nombre, (n.items || []).map(function (i) { return i.desc + ' ' + (i.detalle || ''); }).join(' '), n.notas, n.envio && n.envio.direccion].join(' '), tel: c.tel, folio: [n.folio],
      orden: n.fecha || '', href: '../notas/?abrir=' + encodeURIComponent(n.id),
      tit: n.folio + ' · ' + (c.nombre || 'Sin nombre'), sub: [(n.items || []).map(function (i) { return i.desc; }).join(', '), 'Total ' + dinero(totalNota(n)), n.fecha ? corta(String(n.fecha).slice(0, 10)) : ''].filter(Boolean).join(' · ') };
  }));
  grupo('agenda', 'Agenda', agendaTodo.filter(function (e) { return e && !e.borrado && e.fecha; }).map(function (e) {
    var et = etiqueta(e), q = quien(e);
    return { txt: [et.t, q, e.cliente, e.asunto, e.razon, e.detalle, e.lugar, e.notas, e.motivo].join(' '), tel: e.tel, folio: [],
      orden: e.fecha + ' ' + (e.hora || ''), href: '../pedidos/agenda/#' + e.fecha,
      tit: et.t + (q ? ' · ' + q : ''), sub: [corta(e.fecha) + (e.hora ? ' ' + String(e.hora).slice(0, 5) : ''), et.n === 'e' ? 'ESSENTIA' : et.n === 'r' ? 'RECOOVARE' : '', e.hecho ? 'Hecho' : ''].filter(Boolean).join(' · ') };
  }));
  grupo('apuntes', 'Apuntes', apuntes.filter(function (a) { return a && !a.borrado; }).map(function (a) {
    return { txt: [a.titulo, a.texto].join(' '), tel: a.texto, folio: [], orden: a.editado || a.creado || '', href: 'apuntes/?abrir=' + encodeURIComponent(a.id),
      tit: (a.importante ? '★ ' : '') + (a.titulo || 'Sin título'), sub: String(a.texto || '').replace(/\s+/g, ' ').slice(0, 90) };
  }));
  grupo('gastos', 'Gastos ESSENTIA', gastos.filter(function (g) { return g && !g.borrado; }).map(function (g) {
    return { txt: [g.concepto, g.categoria, g.notas, g.pago, g.negocio].join(' '), tel: '', folio: [], orden: g.fecha || '', href: '../pedidos/gastos/?abrir=' + encodeURIComponent(g.id),
      tit: (g.concepto || 'Gasto') + ' · ' + dinero(g.monto), sub: [g.fecha ? corta(g.fecha) : '', g.categoria, g.negocio === 'RECOOVARE' ? 'RECOOVARE' : ''].filter(Boolean).join(' · ') };
  }));
  GRUPOS.forEach(function (g) { g.items.forEach(function (it) { it.n = norm(it.txt); it.d = digitos(it.tel); it.f = (it.folio || []).filter(Boolean).map(norm); }); });

  function buscar(q) {
    var nq = norm(q).trim(), palabras = nq.split(/\s+/).filter(Boolean), dq = digitos(q);
    var soloNum = dq.length >= 3 && dq.length === q.replace(/[\s\-()+]/g, '').length;
    return GRUPOS.map(function (g) {
      var l = g.items.map(function (it) {
        var exacto = it.f.indexOf(nq) >= 0 ? 3 : it.f.some(function (f) { return f.indexOf(nq) >= 0; }) ? 2 : 0;
        var porTel = dq.length >= 3 && it.d.indexOf(dq) >= 0;
        var porTxt = palabras.every(function (w) { return it.n.indexOf(w) >= 0; });
        if (!(exacto || porTel || (!soloNum && porTxt) || (soloNum && porTxt))) return null;
        return { it: it, p: exacto + (porTel ? 1 : 0) };
      }).filter(Boolean).sort(function (a, b) { return b.p - a.p || String(b.it.orden).localeCompare(String(a.it.orden)); });
      return { g: g, l: l };
    }).filter(function (x) { return x.l.length; });
  }
  var abiertos = {};
  function pintarRes() {
    var q = $('buscar').value, box = $('resultados');
    if (q.trim().length < 2) { box.hidden = true; box.innerHTML = ''; return; }
    var res = buscar(q), total = res.reduce(function (s, x) { return s + x.l.length; }, 0);
    box.hidden = false;
    if (!total) { box.innerHTML = '<p class="ad-vacio">Nada coincide con «' + esc(q.trim()) + '». Prueba con otra parte del nombre o el teléfono.</p>'; return; }
    box.innerHTML = '<p class="ad-res-cab">' + total + (total === 1 ? ' resultado' : ' resultados') + ' para «' + esc(q.trim()) + '»</p>' +
      '<div class="ad-res-grid">' + res.map(function (x) {
        var max = abiertos[x.g.k] ? 50 : 5;
        return '<section class="ad-res-g"><h3>' + esc(x.g.t) + ' <span>' + x.l.length + '</span></h3><ul>' +
          x.l.slice(0, max).map(function (r) {
            return '<li><a href="' + r.it.href + '"><b>' + esc(r.it.tit) + '</b>' + (r.it.tag ? ' <span class="ad-res-tag">' + esc(r.it.tag) + '</span>' : '') + (r.it.sub ? '<small>' + esc(r.it.sub) + '</small>' : '') + '</a></li>';
          }).join('') + '</ul>' +
          (x.l.length > max ? '<button type="button" class="btn btn-claro btn-mini" data-mas="' + x.g.k + '">Ver ' + (x.l.length - max) + ' más</button>' : '') + '</section>';
      }).join('') + '</div>';
  }
  var tB = null;
  $('buscar').addEventListener('input', function () { abiertos = {}; clearTimeout(tB); tB = setTimeout(pintarRes, 120); });
  $('buscar').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { var a = $('resultados').querySelector('a'); if (a) { e.preventDefault(); location.href = a.href; } }
    if (e.key === 'Escape') { this.value = ''; pintarRes(); }
  });
  $('resultados').addEventListener('click', function (e) { var b = e.target.closest('[data-mas]'); if (b) { abiertos[b.getAttribute('data-mas')] = true; pintarRes(); } });
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && document.activeElement !== $('buscar') && !/input|textarea|select/i.test((document.activeElement || {}).tagName || '')) { e.preventDefault(); $('buscar').focus(); }
  });
})();
