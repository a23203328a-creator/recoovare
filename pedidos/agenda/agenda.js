/* =====================================================================
   Agenda única de ESSENTIA y RECOOVARE (privada, se guarda en línea)
   - Citas presenciales de RECOOVARE, entregas e instalaciones ligadas
     a los pedidos, y entregas o visitas de ESSENTIA.
   - Avisa si algo choca, contando el tiempo para trasladarte.
   ===================================================================== */
(function () {
  var K = 'recoovare_agenda', KP = 'recoovare_pedidos', KN = 'recoovare_notas', KMARGEN = 'agenda_margen', KFILTRO = 'agenda_filtro', KVISTA = 'agenda_vista';
  var D = window.CATALOGO || {};
  var CITA = D.cita || {};
  var HORARIO_ESSENTIA = '10:00-19:30';
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var DIAS_K = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  var DIAS_C = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var METODOS = { recoge: 'Recoge en el local', envio: 'Envío a domicilio', instalacion: 'Instalación' };
  var DUR_DEF = { cita_r: 45, entrega_r: 30, essentia: 30, ocupado: 60, reunion: 60, pago: 15, pendiente: 30, recordatorio: 15 };
  // Pago, pendiente y recordatorio no ocupan tiempo: no cuentan para choques ni horarios libres
  var SIN_TIEMPO = ['pago', 'pendiente', 'recordatorio'];
  var NEG = { r: 'RECOOVARE', e: 'ESSENTIA' };

  var $ = function (id) { return document.getElementById(id); };
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function leer(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function guardar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
  function dinero(n) { n = Math.round(num(n) * 100) / 100; return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function fechaDe(s) { var p = String(s).slice(0, 10).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function sumarDias(s, n) { var d = fechaDe(s); d.setDate(d.getDate() + n); return iso(d); }
  function hoy() { return iso(new Date()); }
  function aMin(h) { var p = String(h || '0:0').split(':'); return (+p[0] || 0) * 60 + (+p[1] || 0); }
  function aHora(m) { m = Math.max(0, Math.round(m)); return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
  function durTxt(m) { var h = Math.floor(m / 60), r = m % 60; return (h ? h + ' h' : '') + (h && r ? ' ' : '') + (r ? r + ' min' : ''); }
  function largo(s) { var d = fechaDe(s); return DIAS[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()]; }
  function cap(t) { return String(t).replace(/^./, function (c) { return c.toUpperCase(); }); }
  function corta(s) { if (!s) return ''; var d = fechaDe(s); return d.getDate() + ' ' + MESES[d.getMonth()].slice(0, 3); }
  function telWA(t) { var d = String(t || '').replace(/\D/g, ''); if (d.length === 10) d = '52' + d; return d; }
  function uid() { return 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function rango(txt) { var m = /(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/.exec(txt || ''); return m ? [aMin(m[1]), aMin(m[2])] : null; }
  function horarioR(fecha) { var h = CITA.horario || {}; return rango(h[DIAS_K[fechaDe(fecha).getDay()]]); }
  function mapsUrl(lugar) { if (/^https?:\/\//i.test(lugar)) return lugar; return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(lugar + ', Mérida, Yucatán'); }

  var eventos = leer(K, []);
  if (!Array.isArray(eventos)) eventos = [];
  function pedidos() { var p = leer(KP, []); return Array.isArray(p) ? p : []; }
  function vivos() { return eventos.filter(function (e) { return e && !e.borrado; }); }
  // Pendiente sin hacer de un día pasado: se pasa a hoy marcado como atrasado
  function arrastrado(e) { return e.tipo === 'pendiente' && !e.hecho && e.fecha < hoy(); }
  function ordenar(l) { return l.sort(function (a, b) { return (a.hora ? 1 : 0) - (b.hora ? 1 : 0) || aMin(a.hora) - aMin(b.hora); }); }
  function delDiaTodos(f) {
    var h = hoy();
    return ordenar(vivos().filter(function (e) { return f === h ? (e.fecha === f || arrastrado(e)) : (e.fecha === f && !arrastrado(e)); }));
  }
  function negocioDe(e) {
    if (e.tipo === 'cita_r' || e.tipo === 'entrega_r') return 'r';
    if (e.tipo === 'essentia') return 'e';
    if (e.tipo === 'ocupado') return 'o';
    return e.negocio === 'e' ? 'e' : 'r';
  }
  var filtroNeg = localStorage.getItem(KFILTRO) || 'ambos';
  function pasaFiltro(e) { var n = negocioDe(e); return filtroNeg === 'ambos' || n === 'o' || n === filtroNeg; }
  function delDia(f) { return delDiaTodos(f).filter(pasaFiltro); }
  function ocupa(e) { return SIN_TIEMPO.indexOf(e.tipo) < 0 && !!e.hora; }
  function guardarEventos() { if (!guardar(K, eventos)) alert('No se pudo guardar en este navegador.'); }
  var margen = (function () { var m = localStorage.getItem(KMARGEN); return m === null ? 30 : num(m); })();

  /* ---------- pedidos ---------- */
  function activo(p) { return p.estado !== 'Entregado' && p.estado !== 'Cancelado'; }
  function cuentas(p) {
    var total = num(p.precioProducto) + num(p.extras);
    var pagado = (p.pagos || []).reduce(function (s, x) { return s + num(x.monto); }, 0);
    return { total: total, pagado: pagado, saldo: Math.max(0, total - pagado) };
  }
  function pedidoPorId(id) { return pedidos().find(function (p) { return p.id === id; }) || null; }
  function nombrePedido(p) { return (p.folio || '') + ' · ' + (p.cliente || 'Sin nombre') + (p.producto ? ' · ' + p.producto : ''); }

  /* ---------- lugar, horario y choques ---------- */
  function lugarDe(e) {
    if (e.tipo === 'cita_r') return 'local_r';
    if (e.tipo === 'ocupado' || SIN_TIEMPO.indexOf(e.tipo) >= 0) return 'otro';
    if (e.tipo === 'reunion' && !String(e.lugar || '').trim()) return 'otro';
    if (e.tipo === 'essentia' && e.modo === 'local') return 'local_e';
    if (e.tipo === 'entrega_r' && e.metodo === 'recoge') return 'local_r';
    var l = String(e.lugar || '').trim().toLowerCase();
    return 'dom:' + (l || e.id || Math.random());
  }
  function nombreLugar(e) {
    var l = lugarDe(e);
    if (l === 'local_r') return 'local RECOOVARE';
    if (l === 'local_e') return 'local ESSENTIA';
    if (l === 'otro') return '';
    return e.lugar ? 'domicilio' : 'domicilio (sin dirección)';
  }
  function pideMargen(a, b) { return a !== 'otro' && b !== 'otro' && a !== b; }
  function etiqueta(e) {
    if (e.tipo === 'cita_r') return { t: 'Cita RECOOVARE', c: 'tag-r', b: 'r' };
    if (e.tipo === 'entrega_r') return { t: e.metodo === 'instalacion' ? 'Instalación RECOOVARE' : 'Entrega RECOOVARE', c: 'tag-r', b: 'r' };
    if (e.tipo === 'essentia') return { t: e.modo === 'local' ? 'ESSENTIA · Visita al local' : 'ESSENTIA · Entrega', c: 'tag-e', b: 'e' };
    if (e.tipo === 'ocupado') return { t: 'Ocupado', c: 'tag-o', b: 'o' };
    var n = negocioDe(e), base = { reunion: 'Reunión', pendiente: 'Pendiente', recordatorio: 'Recordatorio', pago: e.dir === 'cobrar' ? 'Cobro' : 'Pago' }[e.tipo] || 'Evento';
    return { t: base + ' ' + NEG[n], c: n === 'e' ? 'tag-e' : 'tag-r', b: n };
  }
  function quien(e) {
    if (e.tipo === 'ocupado') return e.razon || 'Ocupado';
    if (SIN_TIEMPO.indexOf(e.tipo) >= 0 || e.tipo === 'reunion') return e.asunto || etiqueta(e).t;
    if (e.tipo === 'entrega_r') { var p = pedidoPorId(e.pedidoId); return p ? (p.cliente || 'Sin nombre') : (e.cliente || 'Pedido borrado'); }
    return e.cliente || 'Sin nombre';
  }
  // Devuelve con qué choca un evento (mismo día). directo = se enciman; si no, falta tiempo para trasladarse.
  function choquesDe(e, lista) {
    var s1 = aMin(e.hora), f1 = s1 + num(e.dur || 30), l1 = lugarDe(e), res = [];
    if (!ocupa(e)) return res;
    (lista || delDiaTodos(e.fecha)).forEach(function (o) {
      if (o.id === e.id || o.borrado || o.fecha !== e.fecha || !ocupa(o)) return;
      var s2 = aMin(o.hora), f2 = s2 + num(o.dur || 30);
      var directo = s1 < f2 && s2 < f1;
      var m = pideMargen(l1, lugarDe(o)) ? margen : 0;
      var cerca = !directo && m > 0 && s1 < f2 + m && s2 < f1 + m;
      if (directo || cerca) res.push({ o: o, directo: directo, hueco: directo ? 0 : Math.max(s2 - f1, s1 - f2) });
    });
    return res;
  }
  function textoChoque(c) {
    var o = c.o, ini = aHora(aMin(o.hora));
    return (c.directo ? 'Choca con ' : c.hueco > 0 ? 'Solo ' + c.hueco + ' min para trasladarte: ' : 'Sin tiempo para trasladarte: ') + ini + ' ' + etiqueta(o).t + ' · ' + quien(o);
  }
  function fueraDeHorario(e) {
    var r = e.tipo === 'cita_r' ? horarioR(e.fecha) : e.tipo === 'essentia' ? rango(HORARIO_ESSENTIA) : null;
    if (e.tipo === 'cita_r' && !r) return 'Ese día el local de RECOOVARE no abre para citas.';
    if (!r) return '';
    var s = aMin(e.hora), f = s + num(e.dur || 30);
    if (s < r[0] || f > r[1]) return 'Queda fuera del horario de ' + (e.tipo === 'cita_r' ? 'citas de RECOOVARE' : 'ESSENTIA') + ' (' + aHora(r[0]) + ' a ' + aHora(r[1]) + ').';
    return '';
  }

  /* ---------- horarios libres para citas en el local RECOOVARE ---------- */
  function libres(fecha) {
    var r = horarioR(fecha); if (!r) return null;
    var ini = r[0], fin = r[1];
    if (fecha === hoy()) { var d = new Date(); ini = Math.max(ini, Math.ceil((d.getHours() * 60 + d.getMinutes()) / 30) * 30); }
    if (fecha < hoy()) return [];
    var ocup = delDiaTodos(fecha).filter(ocupa).map(function (o) {
      var m = pideMargen('local_r', lugarDe(o)) ? margen : 0, s = aMin(o.hora);
      return [s - m, s + num(o.dur || 30) + m];
    }).sort(function (a, b) { return a[0] - b[0]; });
    var res = [], t = ini;
    ocup.forEach(function (x) { if (x[0] > t) res.push([t, Math.min(x[0], fin)]); t = Math.max(t, x[1]); });
    if (t < fin) res.push([t, fin]);
    return res.filter(function (x) { return x[1] - x[0] >= 30; });
  }

  /* ---------- estado de la vista ---------- */
  var sel = /^#\d{4}-\d{2}-\d{2}$/.test(location.hash) ? location.hash.slice(1) : hoy();
  function lunesDe(f) { var d = fechaDe(f); var w = (d.getDay() + 6) % 7; return sumarDias(f, -w); }

  function pintar() { pintarSemana(); pintarDia(); pintarLibres(); pintarPendientes(); try { history.replaceState(null, '', '#' + sel); } catch (e) {} }

  var vista = localStorage.getItem(KVISTA) === 'mes' ? 'mes' : 'semana';
  function puntos(ev) { return ev.slice(0, 5).map(function (e) { return '<i class="pt pt-' + (e.tipo === 'ocupado' ? 'o' : negocioDe(e)) + '"></i>'; }).join(''); }
  function pintarSemana() {
    document.querySelectorAll('[data-vista]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-vista') === vista)); });
    document.querySelectorAll('[data-filtro]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-filtro') === filtroNeg)); });
    $('sem-ant').setAttribute('aria-label', vista === 'mes' ? 'Mes anterior' : 'Semana anterior');
    $('sem-sig').setAttribute('aria-label', vista === 'mes' ? 'Mes siguiente' : 'Semana siguiente');
    $('dias').hidden = vista === 'mes'; $('mes').hidden = vista !== 'mes';
    if (vista === 'mes') { pintarMes(); return; }
    var lun = lunesDe(sel), dom = sumarDias(lun, 6), a = fechaDe(lun), b = fechaDe(dom);
    $('sem-titulo').textContent = a.getMonth() === b.getMonth()
      ? a.getDate() + ' al ' + b.getDate() + ' de ' + MESES[b.getMonth()] + ' ' + b.getFullYear()
      : a.getDate() + ' ' + MESES[a.getMonth()].slice(0, 3) + ' al ' + b.getDate() + ' ' + MESES[b.getMonth()].slice(0, 3) + ' ' + b.getFullYear();
    var h = hoy(), html = '';
    for (var i = 0; i < 7; i++) {
      var f = sumarDias(lun, i), d = fechaDe(f), ev = delDia(f);
      var lbl = largo(f) + (ev.length ? ', ' + ev.length + (ev.length === 1 ? ' cosa agendada' : ' cosas agendadas') : ', libre');
      html += '<button type="button" role="tab" class="dia' + (f === h ? ' hoy' : '') + (f < h ? ' pasado' : '') + '" data-dia="' + f + '" aria-selected="' + (f === sel) + '" aria-label="' + esc(lbl) + '">' +
        '<span class="d-sem">' + DIAS_C[d.getDay()] + '</span><span class="d-num">' + d.getDate() + '</span><span class="d-pts">' + puntos(ev) + '</span></button>';
    }
    $('dias').innerHTML = html;
  }
  function pintarMes() {
    var d0 = fechaDe(sel), primero = iso(new Date(d0.getFullYear(), d0.getMonth(), 1)), mes = d0.getMonth();
    $('sem-titulo').textContent = cap(MESES[mes]) + ' ' + d0.getFullYear();
    var ini = lunesDe(primero), h = hoy(), html = '';
    ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'].forEach(function (x) { html += '<span class="m-sem" aria-hidden="true">' + x + '</span>'; });
    for (var i = 0; i < 42; i++) {
      var f = sumarDias(ini, i), d = fechaDe(f);
      if (i % 7 === 0 && i >= 28 && d.getMonth() !== mes) break;
      var ev = delDia(f), fuera = d.getMonth() !== mes;
      var lbl = largo(f) + (ev.length ? ', ' + ev.length + (ev.length === 1 ? ' cosa agendada' : ' cosas agendadas') : ', libre');
      html += '<button type="button" class="m-dia' + (fuera ? ' fuera' : '') + (f === h ? ' hoy' : '') + (f < h ? ' pasado' : '') + '" data-dia="' + f + '" aria-pressed="' + (f === sel) + '" aria-label="' + esc(lbl) + '">' +
        '<span class="m-num">' + d.getDate() + '</span><span class="d-pts">' + puntos(ev) + '</span>' + (ev.length > 1 ? '<span class="m-cuenta">' + ev.length + '</span>' : '') + '</button>';
    }
    $('mes').innerHTML = html;
  }

  function lineaDatos(e) {
    var out = [], p;
    if (e.tipo === 'cita_r') {
      out.push('<span><b>' + esc(e.motivo || 'Cita') + '</b> · en el local RECOOVARE</span>');
      if (e.asesor) { var v = (D.vendedores || []).find(function (x) { return x.codigo === e.asesor; }); out.push('<span>La consiguió: <b>' + esc(v ? v.nombre : e.asesor) + '</b></span>'); }
    } else if (e.tipo === 'entrega_r') {
      p = pedidoPorId(e.pedidoId);
      if (p) {
        var c = cuentas(p);
        out.push('<span><b>' + esc(p.folio) + '</b> · ' + esc(p.producto || '') + ' · ' + esc(p.estado || '') + '</span>');
        out.push('<span>' + esc(METODOS[e.metodo] || '') + ' · ' + (c.saldo > 0 ? 'Por cobrar: <b>' + dinero(c.saldo) + '</b>' : '<b>Pagado</b>') + '</span>');
      } else out.push('<span>El pedido ligado ya no existe.</span>');
    } else if (e.tipo === 'pago') {
      out.push('<span>' + (e.dir === 'cobrar' ? 'Por cobrar' : 'Por pagar') + (num(e.monto) > 0 ? ': <b>' + dinero(e.monto) + '</b>' : '') + ' · Solo recordatorio: no se anota en Gastos ni en Pedidos</span>');
    } else if (e.tipo === 'essentia') {
      if (e.detalle) out.push('<span><b>' + esc(e.detalle) + '</b></span>');
      out.push('<span>' + (e.modo === 'local' ? 'En el local ESSENTIA' : 'Entrega a domicilio') + (num(e.cobrar) > 0 ? ' · Por cobrar: <b>' + dinero(e.cobrar) + '</b>' : '') + '</span>');
    }
    if (e.lugar && lugarDe(e).indexOf('dom:') === 0) out.push('<span>📍 <a href="' + esc(mapsUrl(e.lugar)) + '" target="_blank" rel="noopener">' + esc(/^https?:/i.test(e.lugar) ? 'Abrir ubicación' : e.lugar) + '</a></span>');
    if (e.notas) out.push('<span>' + esc(e.notas) + '</span>');
    return out.join('');
  }

  function telDe(e) { if (e.tipo === 'entrega_r') { var p = pedidoPorId(e.pedidoId); return p ? p.tel : ''; } return e.tel || ''; }
  // Entregas a domicilio: avisar que vas en camino. Citas y visitas al local: confirmar.
  function vaEnCamino(e) { return lugarDe(e).indexOf('dom:') === 0; }
  function mensajeWA(e) {
    var dia = largo(e.fecha), h = aHora(aMin(e.hora)), nom = quien(e).split(' ')[0];
    if (e.tipo === 'essentia' && e.modo !== 'local') return 'Hola ' + nom + ', ya estoy en camino con tu pedido de ESSENTIA' + (e.detalle ? ' (' + e.detalle + ')' : '') + '.' + (num(e.cobrar) > 0 ? '\nTotal a pagar: ' + dinero(e.cobrar) + '.' : '') + '\n¡Nos vemos en un momento!';
    if (e.tipo === 'entrega_r') {
      var p = pedidoPorId(e.pedidoId), c = p ? cuentas(p) : { saldo: 0 };
      if (e.metodo === 'recoge') return 'Hola ' + nom + ', te confirmo que puedes pasar por tu pedido' + (p ? ' ' + p.folio : '') + ' el ' + dia + ' a las ' + h + '.' + (CITA.direccion ? '\nDirección: ' + CITA.direccion : '') + (c.saldo > 0 ? '\nSaldo pendiente: ' + dinero(c.saldo) + '.' : '') + '\n¡Gracias!';
      return 'Hola ' + nom + ', ya estoy en camino ' + (e.metodo === 'instalacion' ? 'para la instalación de tu pedido' : 'con tu pedido') + (p ? ' ' + p.folio : '') + '.' + (c.saldo > 0 ? '\nSaldo pendiente: ' + dinero(c.saldo) + '.' : '') + '\n¡Nos vemos en un momento!';
    }
    if (e.tipo === 'cita_r') return 'Hola ' + nom + ', te confirmo tu cita en RECOOVARE el ' + dia + ' a las ' + h + ' para ' + String(e.motivo || 'tu diseño').toLowerCase() + '.' + (CITA.direccion ? '\nDirección: ' + CITA.direccion : '') + (CITA.mapa ? '\n' + CITA.mapa : '') + '\n¡Te esperamos!';
    if (e.tipo === 'essentia') return 'Hola ' + nom + ', te confirmo tu visita al local de ESSENTIA el ' + dia + ' a las ' + h + '. ¡Te espero!';
    return '';
  }

  function pintarDia() {
    $('dia-titulo').textContent = cap(largo(sel)) + (sel === hoy() ? ' · hoy' : '');
    var ev = delDia(sel), todos = delDiaTodos(sel);
    $('dia-vacio').hidden = ev.length > 0;
    $('dia-vacio').textContent = filtroNeg !== 'ambos' && todos.length ? 'Nada de ' + NEG[filtroNeg] + ' este día.' : 'Nada agendado este día.';
    var html = '', prevFin = null;
    ev.forEach(function (e) {
      var et = etiqueta(e), s = aMin(e.hora), f = s + num(e.dur || 30), conTiempo = ocupa(e);
      if (conTiempo) {
        if (prevFin !== null && s - prevFin > 0) html += '<li class="ev-traslado" aria-hidden="true">' + durTxt(s - prevFin) + ' libres</li>';
        prevFin = Math.max(prevFin || 0, f);
      }
      var ch = choquesDe(e, todos);
      var tel = telWA(telDe(e));
      var hora = !e.hora ? 'Todo el día' : conTiempo ? aHora(s) + '–' + aHora(f) : aHora(s);
      var atras = arrastrado(e) ? '<span class="tag tag-alerta">Atrasado · era del ' + esc(corta(e.fecha)) + '</span>' : '';
      var lblHecho = e.tipo === 'pago' ? (e.hecho ? 'Deshacer' : e.dir === 'cobrar' ? 'Marcar cobrado' : 'Marcar pagado') : (e.hecho ? 'Deshacer' : 'Marcar hecho');
      html += '<li class="ev e-' + et.b + (e.hecho ? ' hecho' : '') + (arrastrado(e) ? ' atrasado' : '') + (conTiempo || e.tipo === 'ocupado' ? '' : ' sin-tiempo') + '" data-id="' + esc(e.id) + '">' +
        '<div class="ev-cab"><span class="ev-hora">' + hora + '</span><span class="tag ' + et.c + '">' + esc(et.t) + '</span>' + atras + (e.hecho ? '<span class="tag tag-ok">✓ ' + (e.tipo === 'pago' ? (e.dir === 'cobrar' ? 'Cobrado' : 'Pagado') : 'Hecho') + '</span>' : '') + '</div>' +
        '<div class="ev-quien">' + esc(quien(e)) + '</div>' +
        '<div class="ev-datos">' + lineaDatos(e) + '</div>' +
        ch.map(function (c) { return '<div class="ev-choque">⚠ ' + esc(textoChoque(c)) + '</div>'; }).join('') +
        '<div class="ev-acciones">' +
          (tel.length >= 12 && e.tipo !== 'ocupado' ? '<a class="btn btn-verde btn-mini" target="_blank" rel="noopener" href="https://wa.me/' + tel + '?text=' + encodeURIComponent(mensajeWA(e)) + '">' + (vaEnCamino(e) ? 'Ya estoy en camino' : 'Confirmar por WhatsApp') + '</a>' : '') +
          (e.tipo !== 'ocupado' ? '<button type="button" class="btn btn-claro btn-mini" data-hecho="' + esc(e.id) + '">' + lblHecho + '</button>' : '') +
          '<button type="button" class="btn btn-claro btn-mini" data-editar="' + esc(e.id) + '">Editar</button>' +
        '</div></li>';
    });
    $('eventos').innerHTML = html;
  }

  var textoLibres = '';
  function pintarLibres() {
    var l = libres(sel), r = horarioR(sel), ayuda = $('libres-ayuda'), ul = $('libres');
    var dur = DUR_DEF.cita_r;
    if (!l) { ayuda.textContent = 'El ' + largo(sel) + ' el local no abre para citas.'; ul.innerHTML = ''; textoLibres = ''; }
    else {
      ayuda.textContent = cap(largo(sel)) + ', dentro del horario de citas (' + aHora(r[0]) + ' a ' + aHora(r[1]) + ')' + (margen ? ', dejando ' + margen + ' min para trasladarte a tus entregas.' : '.');
      ul.innerHTML = l.length ? l.map(function (x) { return '<li>' + aHora(x[0]) + ' a ' + aHora(x[1]) + '</li>'; }).join('') : '<li class="nada">Sin horarios libres</li>';
      textoLibres = l.length ? '📅 Horarios libres para citas en RECOOVARE\n' + cap(largo(sel)) + ':\n' + l.map(function (x) { return '• ' + aHora(x[0]) + ' a ' + aHora(x[1]); }).join('\n') + '\n(Las citas duran unos ' + dur + ' min)' : '';
    }
    $('libres-copiar').disabled = !textoLibres;
    $('libres-wa').hidden = !textoLibres;
    $('libres-wa').href = 'https://wa.me/?text=' + encodeURIComponent(textoLibres);
  }

  function pendientes() {
    var ag = vivos().filter(function (e) { return e.tipo === 'entrega_r' && !e.hecho; }).map(function (e) { return e.pedidoId; });
    return pedidos().filter(function (p) { return activo(p) && ag.indexOf(p.id) < 0; }).sort(function (a, b) {
      var la = a.estado === 'Listo para entregar' ? 0 : 1, lb = b.estado === 'Listo para entregar' ? 0 : 1;
      if (la !== lb) return la - lb;
      return (a.entrega || '9999') < (b.entrega || '9999') ? -1 : 1;
    });
  }
  function pintarPendientes() {
    var l = pendientes();
    $('pend-vacio').hidden = l.length > 0;
    $('pendientes').innerHTML = l.map(function (p) {
      var c = cuentas(p);
      return '<li><div class="p-txt"><b>' + esc(p.folio) + ' · ' + esc(p.cliente || 'Sin nombre') + '</b><small>' + esc(p.producto || '') + '</small>' +
        '<span><span class="tag ' + (p.estado === 'Listo para entregar' ? 'tag-ok' : 'tag-o') + '">' + esc(p.estado) + '</span>' +
        (p.entrega ? ' <small>Acordado: ' + corta(p.entrega) + '</small>' : '') + (c.saldo > 0 ? ' <small>· Debe ' + dinero(c.saldo) + '</small>' : '') + '</span></div>' +
        '<button type="button" class="btn btn-claro btn-mini" data-agendar="' + esc(p.id) + '">Agendar</button></li>';
    }).join('');
  }

  /* ---------- eventos de la vista ---------- */
  $('dias').addEventListener('click', function (ev) { var b = ev.target.closest('[data-dia]'); if (b) { sel = b.getAttribute('data-dia'); pintar(); } });
  $('mes').addEventListener('click', function (ev) { var b = ev.target.closest('[data-dia]'); if (b) { sel = b.getAttribute('data-dia'); pintar(); } });
  function moverMes(n) { var d = fechaDe(sel), dia = d.getDate(), x = new Date(d.getFullYear(), d.getMonth() + n, 1); x.setDate(Math.min(dia, new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate())); sel = iso(x); }
  $('sem-ant').addEventListener('click', function () { if (vista === 'mes') moverMes(-1); else sel = sumarDias(sel, -7); pintar(); });
  $('sem-sig').addEventListener('click', function () { if (vista === 'mes') moverMes(1); else sel = sumarDias(sel, 7); pintar(); });
  document.querySelector('.cal-herr').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-vista]');
    if (b) { vista = b.getAttribute('data-vista'); localStorage.setItem(KVISTA, vista); pintar(); return; }
    b = ev.target.closest('[data-filtro]');
    if (b) { filtroNeg = b.getAttribute('data-filtro'); localStorage.setItem(KFILTRO, filtroNeg); pintar(); }
  });
  $('btn-hoy').addEventListener('click', function () { sel = hoy(); pintar(); });
  $('btn-nuevo').addEventListener('click', function () { abrir(null, {}); });
  $('margen').value = String(margen);
  $('margen').addEventListener('change', function () { margen = num(this.value); localStorage.setItem(KMARGEN, String(margen)); pintar(); });
  $('pendientes').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-agendar]'); if (!b) return;
    var p = pedidoPorId(b.getAttribute('data-agendar')); if (!p) return;
    abrir(null, { tipo: 'entrega_r', pedidoId: p.id, fecha: p.entrega && p.entrega >= hoy() ? p.entrega : sel });
  });
  $('eventos').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-editar]');
    if (b) { abrir(eventos.find(function (e) { return e.id === b.getAttribute('data-editar'); })); return; }
    b = ev.target.closest('[data-hecho]');
    if (b) marcarHecho(eventos.find(function (e) { return e.id === b.getAttribute('data-hecho'); }));
  });
  $('libres-copiar').addEventListener('click', function () { copiar(textoLibres); });

  function marcarHecho(e) {
    if (!e) return;
    e.hecho = !e.hecho; e.editado = new Date().toISOString();
    guardarEventos();
    if (e.hecho && e.tipo === 'entrega_r') {
      var lista = pedidos(), p = lista.find(function (x) { return x.id === e.pedidoId; });
      if (p && p.estado !== 'Entregado' && p.estado !== 'Cancelado' && confirm('¿También marcar el pedido ' + p.folio + ' como Entregado?')) {
        hist(p, 'Estado: ' + p.estado + ' → Entregado (desde la agenda)');
        p.estado = 'Entregado';
        guardar(KP, lista);
      }
    }
    pintar();
    aviso(e.hecho ? 'Marcado como hecho' : 'Marcado como pendiente');
  }
  function hist(p, txt) { p.historial = p.historial || []; p.historial.push({ fecha: new Date().toISOString(), txt: txt }); }

  function copiar(t) {
    if (!t) return;
    var ok = function () { aviso('Copiado. Pégalo en el chat de tus asesoras.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, function () { viejo(); });
    else viejo();
    function viejo() { var a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); ok(); } catch (e) {} a.remove(); }
  }
  var tt = null;
  function aviso(t) { var x = $('toast'); x.textContent = t; x.hidden = false; clearTimeout(tt); tt = setTimeout(function () { x.hidden = true; }, 2600); }

  /* ---------- formulario ---------- */
  var actual = null, durTocada = false;
  var vend = D.vendedores || [];
  $('m-asesor').innerHTML = '<option value="">Yo (directo)</option>' + vend.map(function (v) { return '<option value="' + esc(v.codigo) + '">' + esc(v.nombre) + '</option>'; }).join('');

  function tipoSel() { var r = document.querySelector('input[name="tipo"]:checked'); return r ? r.value : ''; }
  function modoSel() { var r = document.querySelector('input[name="modo-e"]:checked'); return r ? r.value : 'domicilio'; }
  function setRadio(name, v) { document.querySelectorAll('input[name="' + name + '"]').forEach(function (r) { r.checked = r.value === v; }); }

  function opcionesPedido(idActual) {
    var l = pedidos().filter(function (p) { return activo(p) || p.id === idActual; });
    $('m-pedido').innerHTML = '<option value="">Elige un pedido…</option>' + l.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(nombrePedido(p)) + '</option>'; }).join('');
    $('m-pedido').value = idActual || '';
  }
  function infoPedido() {
    var p = pedidoPorId($('m-pedido').value), box = $('m-pedido-info');
    if (!p) { box.innerHTML = ''; return; }
    var c = cuentas(p);
    box.innerHTML = '<span><b>' + esc(p.estado) + '</b>' + (p.entrega ? ' · Fecha acordada: ' + corta(p.entrega) : '') + '</span>' +
      '<span>' + (p.tel ? 'WhatsApp ' + esc(p.tel) + ' · ' : '') + (c.saldo > 0 ? 'Por cobrar: <b>' + dinero(c.saldo) + '</b>' : 'Pagado') + '</span>' +
      (p.ubicacion ? '<span>📍 ' + esc(p.ubicacion) + '</span>' : '');
  }
  function negSel() { var r = document.querySelector('input[name="neg"]:checked'); return r ? r.value : 'r'; }
  function dirSel() { var r = document.querySelector('input[name="dir"]:checked'); return r ? r.value : 'pagar'; }
  var PH = { reunion: 'Ej. Reunión con proveedor de losas', pago: 'Ej. Proveedor de losas, renta, Ricardo (resto del pedido)', pendiente: 'Ej. Comprar resina, subir fotos a Facebook', recordatorio: 'Ej. Renovar dominio, llamar a la imprenta' };
  function visibles() {
    var t = tipoSel(), extra = [];
    var sinT = SIN_TIEMPO.indexOf(t) >= 0;
    $('caja-dur').hidden = sinT;
    $('caja-hora').hidden = sinT && $('m-todo').checked;
    if (PH[t]) { $('m-asunto').placeholder = PH[t]; $('lbl-asunto').textContent = t === 'pago' ? 'Concepto' : t === 'reunion' ? 'Asunto' : '¿Qué es?'; }
    if (t === 'reunion') extra.push('reunion-lugar');
    if (t === 'essentia' && modoSel() === 'domicilio') extra.push('essentia-dom');
    if (t === 'entrega_r' && $('m-metodo').value !== 'recoge') extra.push('entrega_r-dom');
    document.querySelectorAll('#form .grupo').forEach(function (g) {
      var para = g.getAttribute('data-para').split(' ');
      g.hidden = !(para.indexOf(t) >= 0 || para.some(function (x) { return extra.indexOf(x) >= 0; }));
    });
  }
  function leerForm() {
    var t = tipoSel();
    var e = {
      id: actual ? actual.id : uid(), tipo: t, fecha: $('m-fecha').value, hora: $('m-hora').value, dur: num($('m-dur').value) || 30,
      cliente: $('m-cliente').value.trim(), tel: $('m-tel').value.trim(), notas: $('m-notas').value.trim(),
      creado: actual && actual.creado ? actual.creado : new Date().toISOString(), editado: new Date().toISOString(), hecho: actual ? !!actual.hecho : false
    };
    if (t === 'cita_r') { e.motivo = $('m-motivo').value; e.asesor = $('m-asesor').value; }
    if (t === 'essentia') { e.modo = modoSel(); e.detalle = $('m-detalle').value.trim(); e.cobrar = num($('m-cobrar').value); if (e.modo === 'domicilio') e.lugar = $('m-lugar').value.trim(); }
    if (t === 'entrega_r') {
      e.pedidoId = $('m-pedido').value; e.metodo = $('m-metodo').value;
      if (e.metodo !== 'recoge') e.lugar = $('m-lugar').value.trim();
      var p = pedidoPorId(e.pedidoId); if (p) { e.cliente = p.cliente || ''; e.tel = p.tel || ''; }
    }
    if (t === 'ocupado') { e.razon = $('m-razon').value.trim(); e.cliente = ''; e.tel = ''; }
    if (t === 'reunion' || SIN_TIEMPO.indexOf(t) >= 0) {
      e.negocio = negSel(); e.asunto = $('m-asunto').value.trim(); e.cliente = ''; e.tel = '';
      if (t === 'reunion') e.lugar = $('m-lugar').value.trim();
      if (t === 'pago') { e.dir = dirSel(); e.monto = num($('m-monto').value); }
      if (SIN_TIEMPO.indexOf(t) >= 0) { e.todoDia = $('m-todo').checked; if (e.todoDia) e.hora = ''; }
    }
    return e;
  }
  function revisar() {
    visibles();
    var e = leerForm(), box = $('m-avisos'), html = '';
    if (e.fecha && e.hora && e.tipo && ocupa(e)) {
      var lista = vivos().filter(function (o) { return o.fecha === e.fecha; });
      choquesDe(e, lista).forEach(function (c) { html += '<div class="aviso ' + (c.directo ? 'aviso-alerta' : 'aviso-aviso') + '"><b>⚠ ' + esc(textoChoque(c)) + '</b></div>'; });
      var fh = fueraDeHorario(e); if (fh) html += '<div class="aviso aviso-aviso">' + esc(fh) + '</div>';
      if (!html) html = '<div class="aviso aviso-ok">Este horario está libre.</div>';
    }
    box.innerHTML = html;
  }

  function abrir(e, pre) {
    actual = e || null; pre = pre || {};
    var d = e || {};
    $('m-titulo').textContent = e ? 'Editar' : 'Agendar';
    $('m-borrar').hidden = !e;
    var t = d.tipo || pre.tipo || 'cita_r';
    setRadio('tipo', t);
    $('m-fecha').value = d.fecha || pre.fecha || sel;
    $('m-hora').value = d.hora || pre.hora || (SIN_TIEMPO.indexOf(t) >= 0 ? '' : sugerirHora($('m-fecha').value)) || sugerirHora($('m-fecha').value);
    $('m-dur').value = String(d.dur || DUR_DEF[t]); durTocada = !!e;
    $('m-cliente').value = d.cliente || ''; $('m-tel').value = d.tel || '';
    $('m-motivo').value = d.motivo || 'Diseñar placa'; $('m-asesor').value = d.asesor || '';
    setRadio('modo-e', d.modo || 'domicilio');
    $('m-detalle').value = d.detalle || ''; $('m-cobrar').value = d.cobrar ? d.cobrar : '';
    $('m-lugar').value = d.lugar || ''; $('m-razon').value = d.razon || ''; $('m-notas').value = d.notas || '';
    setRadio('neg', d.negocio || pre.negocio || (filtroNeg === 'e' ? 'e' : 'r'));
    $('m-asunto').value = d.asunto || ''; setRadio('dir', d.dir || 'pagar'); $('m-monto').value = d.monto ? d.monto : '';
    $('m-todo').checked = e ? (!!d.todoDia || (SIN_TIEMPO.indexOf(t) >= 0 && !d.hora)) : false;
    opcionesPedido(d.pedidoId || pre.pedidoId || '');
    $('m-metodo').value = d.metodo || 'recoge';
    if (!e && pre.pedidoId) desdePedido();
    infoPedido();
    $('modal').hidden = false;
    document.body.style.overflow = 'hidden';
    revisar();
    setTimeout(function () { var r = document.querySelector('input[name="tipo"]:checked'); if (r) r.focus(); }, 30);
  }
  function cerrar() { $('modal').hidden = true; document.body.style.overflow = ''; actual = null; }
  function sugerirHora(f) {
    var l = libres(f); if (l && l.length) return aHora(Math.ceil(l[0][0] / 15) * 15);
    return '11:00';
  }
  function desdePedido() {
    var p = pedidoPorId($('m-pedido').value); if (!p) return;
    if (p.metodoEntrega) $('m-metodo').value = p.metodoEntrega;
    if (p.ubicacion && !$('m-lugar').value) $('m-lugar').value = p.ubicacion;
    if (!durTocada) $('m-dur').value = $('m-metodo').value === 'instalacion' ? '60' : '30';
  }

  $('form').addEventListener('change', function (ev) {
    var t = ev.target;
    if (t.id === 'm-todo' && !t.checked && !$('m-hora').value) $('m-hora').value = sugerirHora($('m-fecha').value);
    if (t.name === 'tipo' && !durTocada) $('m-dur').value = String(DUR_DEF[t.value] || 30);
    if (t.id === 'm-dur') durTocada = true;
    if (t.id === 'm-pedido') { desdePedido(); infoPedido(); }
    if (t.id === 'm-metodo' && !durTocada) $('m-dur').value = t.value === 'instalacion' ? '60' : '30';
    revisar();
  });
  $('form').addEventListener('input', function (ev) { if (ev.target.id === 'm-lugar' || ev.target.id === 'm-hora') revisar(); });
  $('m-cerrar').addEventListener('click', cerrar);
  $('modal').addEventListener('click', function (ev) { if (ev.target === $('modal')) cerrar(); });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !$('modal').hidden) cerrar(); });

  $('m-borrar').addEventListener('click', function () {
    if (!actual || !confirm('¿Borrar esto de la agenda?')) return;
    actual.borrado = true; actual.editado = new Date().toISOString();
    guardarEventos(); cerrar(); pintar(); aviso('Borrado de la agenda');
  });

  $('form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var e = leerForm(), falta = '';
    if (!e.tipo) falta = 'Elige qué vas a agendar.';
    else if (!e.fecha) falta = 'Pon la fecha.';
    else if (!e.hora && !(SIN_TIEMPO.indexOf(e.tipo) >= 0 && e.todoDia)) falta = SIN_TIEMPO.indexOf(e.tipo) >= 0 ? 'Pon la hora o marca «Sin hora».' : 'Pon la hora.';
    else if ((e.tipo === 'reunion' || SIN_TIEMPO.indexOf(e.tipo) >= 0) && !e.asunto) falta = e.tipo === 'pago' ? 'Escribe el concepto del pago.' : 'Escribe de qué se trata.';
    else if (e.tipo === 'entrega_r' && !e.pedidoId) falta = 'Elige el pedido.';
    else if ((e.tipo === 'cita_r' || e.tipo === 'essentia') && !e.cliente) falta = 'Escribe el nombre del cliente.';
    if (falta) { alert(falta); return; }
    var ch = choquesDe(e, vivos().filter(function (o) { return o.fecha === e.fecha; })).filter(function (c) { return c.directo; });
    if (ch.length && !confirm(textoChoque(ch[0]) + '.\n¿Guardar de todos modos?')) return;

    var i = eventos.findIndex(function (x) { return x.id === e.id; });
    if (i >= 0) eventos[i] = e; else eventos.push(e);
    guardarEventos();
    if (e.tipo === 'entrega_r') ligarPedido(e);
    sel = e.fecha;
    cerrar(); pintar(); aviso('Guardado en la agenda');
  });

  // La fecha, forma de entrega y ubicación del pedido quedan iguales a lo agendado
  function ligarPedido(e) {
    var lista = pedidos(), p = lista.find(function (x) { return x.id === e.pedidoId; });
    if (!p) return;
    var cambio = false;
    if ((p.entrega || '') !== e.fecha) { hist(p, 'Fecha de entrega: ' + (p.entrega ? corta(p.entrega) : 'sin fecha') + ' → ' + corta(e.fecha) + ' (desde la agenda)'); p.entrega = e.fecha; cambio = true; }
    if (e.metodo && p.metodoEntrega !== e.metodo) { p.metodoEntrega = e.metodo; cambio = true; }
    if (e.lugar && p.ubicacion !== e.lugar) { p.ubicacion = e.lugar; cambio = true; }
    if (cambio) guardar(KP, lista);
    // La nota de venta toma la misma fecha (si no, al abrir Pedidos la nota regresaría la fecha anterior)
    if (p.notaId) {
      var notas = leer(KN, []), n = Array.isArray(notas) ? notas.find(function (x) { return x && x.id === p.notaId; }) : null;
      if (n && n.entrega !== e.fecha) { n.entrega = e.fecha; guardar(KN, notas); }
    }
  }

  // Al abrir: la entrega de cada pedido queda en la fecha del pedido (si la cambiaste en Pedidos o en la nota),
  // y se quitan las entregas de pedidos cancelados o borrados. Nunca se crea un evento nuevo.
  function reconciliar() {
    var lista = pedidos(); if (!lista.length) return;
    var cambio = false, ahora = new Date().toISOString();
    eventos.forEach(function (e) {
      if (!e || e.borrado || e.tipo !== 'entrega_r') return;
      var p = pedidoPorId(e.pedidoId);
      if (!p || p.estado === 'Cancelado') { e.borrado = true; e.editado = ahora; cambio = true; return; }
      if (!e.hecho && p.entrega && e.fecha !== p.entrega) { e.fecha = p.entrega; e.editado = ahora; cambio = true; }
    });
    if (cambio) guardarEventos();
  }
  reconciliar();

  pintar();
})();
