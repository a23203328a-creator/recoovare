/* =====================================================================
   Tarjetas de ESSENTIA (privado, se guarda en línea).
   - Tarjetas: nombre, últimos 4 dígitos, día de corte, fecha de pago, límite.
   - Compras: contado o MSI (cada mes entra solo la mensualidad).
   - Pagos a la tarjeta y, opcional, el "pago para no generar intereses"
     del estado de cuenta (si lo anotas, manda sobre el cálculo).
   - La fecha límite de cada corte se pone sola en la Agenda (un evento
     por tarjeta y corte; se actualiza, no se duplica).
   No toca Gastos ESSENTIA.
   ===================================================================== */
(function () {
  var KT = 'essentia_tarjetas', KC = 'essentia_tarjeta_compras', KP = 'essentia_tarjeta_pagos', KE = 'essentia_tarjeta_estados', KA = 'recoovare_agenda';
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var $ = function (id) { return document.getElementById(id); };
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function leer(k) { try { var v = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function guardar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { alert('No se pudo guardar. Intenta de nuevo.'); return false; } }
  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
  function r2(n) { return Math.round(n * 100) / 100; }
  function dinero(n) { n = r2(num(n)); return (n < 0 ? '−$' : '$') + Math.abs(n).toLocaleString('es-MX', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); }
  function uid(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function fechaDe(s) { var p = String(s).slice(0, 10).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function hoy() { return iso(new Date()); }
  function sumarDias(s, n) { var d = fechaDe(s); d.setDate(d.getDate() + n); return iso(d); }
  function diasEntre(a, b) { return Math.round((fechaDe(b) - fechaDe(a)) / 86400000); }
  function diasMes(y, m) { return new Date(y, m + 1, 0).getDate(); }
  function corta(s) { var d = fechaDe(s); return d.getDate() + ' ' + MESES[d.getMonth()].slice(0, 3); }
  function larga(s) { var d = fechaDe(s); return d.getDate() + ' de ' + MESES[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? ' de ' + d.getFullYear() : ''); }
  function aviso(t) { var el = $('toast'); el.textContent = t; el.hidden = false; clearTimeout(aviso.t); aviso.t = setTimeout(function () { el.hidden = true; }, 2400); }

  var tarjetas = leer(KT), compras = leer(KC), pagos = leer(KP), estados = leer(KE);
  function vivas(l) { return l.filter(function (x) { return x && !x.borrado; }); }
  function tarjetaPorId(id) { return tarjetas.find(function (t) { return t.id === id; }) || null; }
  function nombreT(t) { return t ? t.nombre + (t.ult ? ' ···· ' + t.ult : '') : 'Tarjeta borrada'; }

  /* ---------- cortes y fechas de pago ---------- */
  function corteEn(t, y, m) { return iso(new Date(y, m, Math.min(+t.corte || 1, diasMes(y, m)))); }
  function limiteDe(t, corte) {
    if (t.modo === 'dia') {
      var d = fechaDe(corte), dia = +t.diaPago || 1, y = d.getFullYear(), m = d.getMonth();
      if (dia <= d.getDate()) { m++; if (m > 11) { m = 0; y++; } }
      return iso(new Date(y, m, Math.min(dia, diasMes(y, m))));
    }
    return sumarDias(corte, +t.dias || 20);
  }
  // Lista de cortes de la tarjeta, desde antes de la primera compra hasta 26 meses adelante
  function cortesDe(t, desde) {
    var a = fechaDe(desde || hoy()), fin = new Date(); fin.setMonth(fin.getMonth() + 26);
    var d = new Date(a.getFullYear(), a.getMonth() - 1, 1), l = [];
    while (d <= fin) { l.push(corteEn(t, d.getFullYear(), d.getMonth())); d.setMonth(d.getMonth() + 1); }
    return l;
  }
  function indiceCorte(cortes, fecha) { for (var i = 0; i < cortes.length; i++) if (fecha <= cortes[i]) return i; return cortes.length - 1; }
  function mensualidades(c) {
    var n = +c.msi || 0, tot = num(c.monto);
    if (!n) return [tot];
    var base = Math.floor(tot / n * 100) / 100, l = [];
    for (var i = 0; i < n; i++) l.push(i === n - 1 ? r2(tot - base * (n - 1)) : base);
    return l;
  }

  /* ---------- cálculo por tarjeta ---------- */
  function calcular(t) {
    var h = hoy();
    var cs = vivas(compras).filter(function (c) { return c.tarjetaId === t.id; });
    var ps = vivas(pagos).filter(function (p) { return p.tarjetaId === t.id; });
    var desde = cs.reduce(function (m, c) { return c.fecha < m ? c.fecha : m; }, h);
    var cortes = cortesDe(t, desde);
    var cargos = cortes.map(function () { return 0; }), msiPorCorte = cortes.map(function () { return 0; });
    cs.forEach(function (c) {
      var i0 = indiceCorte(cortes, c.fecha);
      mensualidades(c).forEach(function (mto, j) {
        var i = i0 + j; if (i >= cortes.length) return;
        cargos[i] = r2(cargos[i] + mto);
        if (+c.msi) msiPorCorte[i] = r2(msiPorCorte[i] + mto);
      });
    });
    // último corte cerrado: el día del corte todavía cuenta como abierto
    var k = -1; for (var i = 0; i < cortes.length; i++) if (cortes[i] < h) k = i;
    var pagado = r2(ps.reduce(function (s, p) { return s + num(p.monto); }, 0));
    var cargosHasta = function (idx) { var s = 0; for (var j = 0; j <= idx; j++) s += cargos[j]; return r2(s); };
    var pagosHasta = function (f) { return r2(ps.filter(function (p) { return p.fecha <= f; }).reduce(function (s, p) { return s + num(p.monto); }, 0)); };
    var pagosDespues = function (f) { return r2(ps.filter(function (p) { return p.fecha > f; }).reduce(function (s, p) { return s + num(p.monto); }, 0)); };
    var r = { t: t, cortes: cortes, cargos: cargos, msiPorCorte: msiPorCorte, k: k, pagado: pagado };
    r.totalCargos = r2(cargos.reduce(function (s, x) { return s + x; }, 0));
    r.deuda = Math.max(0, r2(r.totalCargos - pagado));
    r.disponible = num(t.limite) ? r2(num(t.limite) - r.deuda) : null;
    r.proxCorte = cortes[k + 1] || null;
    r.periodo = k + 1 < cortes.length ? cargos[k + 1] : 0;
    if (k >= 0) {
      var C = cortes[k];
      r.corte = C; r.limite = limiteDe(t, C);
      r.calculado = Math.max(0, r2(cargosHasta(k) - pagosHasta(C)));
      var est = t.compartida ? null : vivas(estados).find(function (e) { return e.tarjetaId === t.id && e.corte === C; }) || null;
      r.estado = est;
      r.aPagar = est ? Math.max(0, r2(num(est.monto) - pagosDespues(C))) : Math.max(0, r2(cargosHasta(k) - pagado));
      r.diferencia = est ? r2(num(est.monto) - r.calculado) : 0;
      r.dias = diasEntre(h, r.limite);
      r.vencido = r.aPagar > 0 && r.dias < 0;
    } else { r.aPagar = 0; r.calculado = 0; }
    // MSI activos
    r.msi = cs.filter(function (c) { return +c.msi; }).map(function (c) {
      var i0 = indiceCorte(cortes, c.fecha), n = +c.msi, mens = mensualidades(c);
      var cobradas = Math.max(0, Math.min(n, k - i0 + 1));
      var falta = r2(mens.slice(cobradas).reduce(function (s, x) { return s + x; }, 0));
      return { c: c, n: n, mens: mens[0], cobradas: cobradas, falta: falta, fin: cortes[Math.min(cortes.length - 1, i0 + n - 1)] };
    }).filter(function (x) { return x.falta > 0.009; });
    return r;
  }

  /* ---------- agenda: un recordatorio por tarjeta y corte ---------- */
  function sincronizarAgenda(calcs) {
    var ag; try { ag = JSON.parse(localStorage.getItem(KA) || '[]'); } catch (e) { return; }
    if (!Array.isArray(ag)) return;
    var cambio = false, ahora = new Date().toISOString(), h = hoy(), vigentes = {};
    calcs.forEach(function (r) {
      if (r.k < 0 || r.t.borrado) return;
      var deuda = r.aPagar, tuvoCargos = r.calculado > 0 || r.estado || deuda > 0;
      if (!tuvoCargos) return;
      var id = 'tj-' + r.t.id + '-' + r.corte; vigentes[id] = 1;
      var e = ag.find(function (x) { return x.id === id; });
      var datos = { tipo: 'pago', negocio: 'e', dir: 'pagar', asunto: 'Tarjeta ' + nombreT(r.t), monto: deuda > 0 ? deuda : r.calculado, fecha: r.limite, hora: '', todoDia: true, dur: 15, tarjetaId: r.t.id, notas: 'Se actualiza solo desde Tarjetas.', hecho: deuda <= 0 };
      if (!e) { e = Object.assign({ id: id, creado: ahora }, datos); ag.push(e); cambio = true; }
      else {
        var dif = Object.keys(datos).some(function (k2) { return e[k2] !== datos[k2]; }) || e.borrado;
        if (dif) { Object.assign(e, datos); e.borrado = false; e.editado = ahora; cambio = true; }
      }
      // Aviso para anotar el estado de cuenta: el día siguiente al corte (pendiente: si no lo anotas, sigue saliendo como atrasado)
      if (!r.t.compartida) avisoEstado(r.t, r.corte, !!r.estado);
    });
    calcs.forEach(function (r) {
      if (r.t.borrado || r.t.compartida || !r.proxCorte) return;
      if (r.periodo > 0 || r.deuda > 0) avisoEstado(r.t, r.proxCorte, false);
    });
    function avisoEstado(t, corte, listo) {
      var id = 'tje-' + t.id + '-' + corte; vigentes[id] = 1;
      var e = ag.find(function (x) { return x.id === id; });
      var datos = { tipo: 'pendiente', negocio: 'e', asunto: 'Anotar estado de cuenta ' + nombreT(t) + ' (corte ' + corta(corte) + ')', fecha: sumarDias(corte, 1), hora: '', todoDia: true, dur: 15, tarjetaId: t.id, notas: 'Revisa en la app del banco el pago para no generar intereses y el pago mínimo, y anótalos en Tarjetas → Anotar estado de cuenta. Se marca hecho solo al anotarlo.' };
      if (listo) datos.hecho = true;
      if (!e) { e = Object.assign({ id: id, creado: ahora, hecho: false }, datos); ag.push(e); cambio = true; }
      else {
        var dif = Object.keys(datos).some(function (k2) { return e[k2] !== datos[k2]; }) || e.borrado;
        if (dif) { Object.assign(e, datos); e.borrado = false; e.editado = ahora; cambio = true; }
      }
    }
    // recordatorios viejos de una tarjeta (cambió su corte o se borró): se quitan si aún no pasan
    ag.forEach(function (e) {
      if (!e || e.borrado || !e.tarjetaId || vigentes[e.id] || e.hecho) return;
      var t = tarjetaPorId(e.tarjetaId);
      if (!t || t.borrado || e.fecha >= h || (t.compartida && /^tje-/.test(e.id))) { e.borrado = true; e.editado = ahora; cambio = true; }
    });
    if (cambio) { try { localStorage.setItem(KA, JSON.stringify(ag)); } catch (e2) {} }
  }

  /* ---------- pintar ---------- */
  var maxMovs = 25;
  function pintar() {
    var ts = vivas(tarjetas);
    var calcs = ts.map(calcular);
    sincronizarAgenda(calcs.concat(tarjetas.filter(function (t) { return t.borrado; }).map(function (t) { return { t: t, k: -1 }; })));

    // resumen
    var aPagar = r2(calcs.reduce(function (s, r) { return s + r.aPagar; }, 0));
    var deuda = r2(calcs.reduce(function (s, r) { return s + r.deuda; }, 0));
    var nMsi = calcs.reduce(function (s, r) { return s + r.msi.length; }, 0);
    var prox = calcs.filter(function (r) { return r.aPagar > 0; }).sort(function (a, b) { return a.limite.localeCompare(b.limite); })[0];
    var k = function (t, v, sub, cls) { return '<div class="tj-kpi' + (cls ? ' ' + cls : '') + '"><span>' + t + '</span><strong>' + v + '</strong><small>' + sub + '</small></div>'; };
    $('kpis').innerHTML = !ts.length ? '' :
      k('Por pagar ahora', dinero(aPagar), 'De los cortes ya cerrados', aPagar > 0 ? 'rojo' : 'verde') +
      k('Deuda total', dinero(deuda), 'Incluye MSI que faltan') +
      k('MSI activos', nMsi, nMsi === 1 ? 'compra a meses' : 'compras a meses') +
      k('Próximo vencimiento', prox ? (prox.vencido ? 'Vencido' : prox.dias === 0 ? 'Hoy' : prox.dias === 1 ? 'Mañana' : 'En ' + prox.dias + ' días') : '—',
        prox ? esc(prox.t.nombre) + ' · ' + dinero(prox.aPagar) + ' · ' + corta(prox.limite) : 'Nada pendiente', prox ? (prox.vencido || prox.dias <= 3 ? 'rojo' : prox.dias <= 7 ? 'ambar' : '') : '');

    // próximos pagos (por fecha límite)
    var prox2 = [];
    calcs.forEach(function (r) {
      if (r.k >= 0 && r.aPagar > 0) prox2.push({ r: r, fecha: r.limite, monto: r.aPagar, est: false });
      if (r.proxCorte && r.periodo > 0) prox2.push({ r: r, fecha: limiteDe(r.t, r.proxCorte), monto: r.periodo, est: true, corte: r.proxCorte });
    });
    prox2.sort(function (a, b) { return a.fecha.localeCompare(b.fecha) || (a.est - b.est); });
    $('prox-sec').hidden = !prox2.length;
    if (prox2.length) {
      var conf = r2(prox2.filter(function (x) { return !x.est; }).reduce(function (s2, x) { return s2 + x.monto; }, 0));
      $('prox').innerHTML = prox2.map(function (x) {
        var dd = diasEntre(hoy(), x.fecha), d0 = fechaDe(x.fecha);
        var cls = x.est ? 'est' : (dd <= 3 ? 'r' : dd <= 7 ? 'a' : '');
        var cuando = dd < 0 ? 'Vencido hace ' + (-dd) + (dd === -1 ? ' día' : ' días') : dd === 0 ? 'Vence hoy' : dd === 1 ? 'Vence mañana' : 'Faltan ' + dd + ' días';
        return '<li class="' + cls + '"><span class="fch"><b>' + d0.getDate() + '</b><small>' + MESES[d0.getMonth()].slice(0, 3) + '</small></span>' +
          '<span class="qui"><b>' + esc(x.r.t.nombre) + (x.r.t.ult ? ' ···· ' + esc(x.r.t.ult) : '') + '</b><small>' + (x.est ? 'Estimado · corta el ' + corta(x.corte) : cuando) + '</small></span>' +
          '<span class="cuanto"><b>' + dinero(x.monto) + '</b><small>' + (x.est ? 'hasta hoy' : 'sin intereses') + '</small></span>' +
          '<span class="acc">' + (x.est ? '' : '<button type="button" class="btn btn-claro btn-mini" data-pagar="' + esc(x.r.t.id) + '" data-monto="' + x.monto + '">Pagar</button>') + '</span></li>';
      }).join('') + (conf ? '<li class="tot"><span>Total de cortes ya cerrados</span><span>' + dinero(conf) + '</span></li>' : '');
    }

    // tarjetas
    $('tarjetas').innerHTML = ts.length ? calcs.map(function (r) {
      var t = r.t, est, cls;
      if (r.k < 0 || (r.aPagar <= 0 && !r.calculado && !r.estado)) { est = 'Sin pagos pendientes'; cls = 'v'; }
      else if (r.aPagar <= 0) { est = 'Pagado ✓'; cls = 'v'; }
      else if (r.vencido) { est = 'Vencido hace ' + Math.abs(r.dias) + (Math.abs(r.dias) === 1 ? ' día' : ' días'); cls = 'r'; }
      else if (r.dias === 0) { est = 'Vence hoy'; cls = 'r'; }
      else if (r.dias <= 3) { est = 'Vence en ' + r.dias + (r.dias === 1 ? ' día' : ' días'); cls = 'r'; }
      else if (r.dias <= 7) { est = 'Vence en ' + r.dias + ' días'; cls = 'a'; }
      else { est = 'Faltan ' + r.dias + ' días'; cls = 'v'; }
      var reglas = 'Corte día ' + t.corte + ' · ' + (t.modo === 'dia' ? 'paga el día ' + t.diaPago : 'paga ' + (t.dias || 20) + ' días después');
      var uso = num(t.limite) ? Math.max(0, Math.min(100, r.deuda / num(t.limite) * 100)) : 0;
      return '<article class="tj-card">' +
        '<div class="tj-card-cab"><h3>' + esc(nombreT(t)) + (t.compartida ? '<span class="tj-comp">Compartida</span>' : '') + '</h3><button type="button" class="btn btn-claro btn-mini" data-editar-t="' + esc(t.id) + '">Editar</button></div>' +
        '<small>' + esc(reglas) + '</small>' +
        (r.k >= 0 && (r.calculado || r.estado || r.aPagar) ?
          '<p class="tj-monto">' + dinero(r.aPagar) + '</p><small>' + (r.aPagar > 0 ? 'Pago sin intereses · vence ' + larga(r.limite) : 'Corte del ' + corta(r.corte) + ' pagado') + '</small>' :
          '<p class="tj-monto tj-cero">$0</p><small>Sin cortes con saldo</small>') +
        '<span class="tj-tag ' + cls + '">' + est + '</span>' +
        (r.estado ? (Math.abs(r.diferencia) >= 1 ? '<p class="tj-dif">El banco dice ' + dinero(r.estado.monto) + ' y el cálculo ' + dinero(r.calculado) + ': diferencia de ' + dinero(Math.abs(r.diferencia)) + '. Revisa comisiones, intereses o compras sin anotar.</p>' : '<p class="tj-ok">✓ Cuadra con tu estado de cuenta</p>') : '') +
        (r.proxCorte ? '<small class="tj-per">Este periodo llevas <b>' + dinero(r.periodo) + '</b> · próximo corte ' + corta(r.proxCorte) + '</small>' : '') +
        (num(t.limite) && !t.compartida ? '<div class="tj-bar" aria-hidden="true"><i style="width:' + uso + '%"></i></div><small>Disponible ' + dinero(r.disponible) + ' de ' + dinero(t.limite) + '</small>' : '<small>Deuda total ' + dinero(r.deuda) + '</small>') +
        '<div class="tj-card-acc">' +
          '<button type="button" class="btn btn-claro btn-mini" data-pagar="' + esc(t.id) + '"' + (r.aPagar > 0 ? ' data-monto="' + r.aPagar + '"' : '') + '>+ Pago</button>' +
          '<button type="button" class="btn btn-claro btn-mini" data-comprar="' + esc(t.id) + '">+ Compra</button>' +
          (r.k >= 0 && !t.compartida ? '<button type="button" class="btn btn-claro btn-mini" data-estado="' + esc(t.id) + '">' + (r.estado ? 'Estado de cuenta ✓' : 'Anotar estado de cuenta') + '</button>' : '') +
        '</div></article>';
    }).join('') : '<div class="tj-vacio"><b>Agrega tus tarjetas</b><p>Con el día de corte y la fecha de pago, aquí verás cuánto pagar, cuándo vence y tus meses sin intereses.</p><button type="button" class="btn btn-principal" id="vacio-tarjeta">+ Tarjeta</button></div>';

    // MSI activos
    var msi = [];
    calcs.forEach(function (r) { r.msi.forEach(function (x) { msi.push({ r: r, x: x }); }); });
    msi.sort(function (a, b) { return a.x.fin.localeCompare(b.x.fin); });
    $('msi').innerHTML = msi.length ? msi.map(function (o) {
      var c = o.x.c;
      return '<li><button type="button" data-compra="' + esc(c.id) + '"><span><b>' + esc(c.concepto || 'Compra') + '</b><small>' + esc(nombreT(o.r.t)) + ' · ' + o.x.n + ' MSI de ' + dinero(c.monto) + ' · compra del ' + corta(c.fecha) + '</small></span>' +
        '<span class="der"><b>' + dinero(o.x.mens) + '/mes</b><small>' + (o.x.cobradas ? 'Mensualidad ' + o.x.cobradas + ' de ' + o.x.n : 'Empieza en el próximo corte') + ' · faltan ' + dinero(o.x.falta) + '</small></span></button></li>';
    }).join('') : '<li class="tj-nada">No tienes compras a meses activas.</li>';

    // proyección MSI 6 meses (por mes de la fecha límite)
    var porMes = {}, h = hoy();
    calcs.forEach(function (r) {
      r.cortes.forEach(function (C, i) {
        if (i <= r.k || !r.msiPorCorte[i]) return;
        var m = limiteDe(r.t, C).slice(0, 7); porMes[m] = r2((porMes[m] || 0) + r.msiPorCorte[i]);
      });
    });
    var meses = [], d = fechaDe(h); d.setDate(1);
    for (var i = 0; i < 6; i++) { meses.push(iso(d).slice(0, 7)); d.setMonth(d.getMonth() + 1); }
    var max = Math.max.apply(null, meses.map(function (m) { return porMes[m] || 0; }).concat([1]));
    $('proy').innerHTML = meses.map(function (m) {
      var v = porMes[m] || 0;
      return '<div class="tj-mes"><span class="v">' + (v ? dinero(v) : '—') + '</span><span class="col"><i style="height:' + (v ? Math.max(4, v / max * 100) : 0) + '%"></i></span><span class="m">' + MESES[+m.slice(5) - 1].slice(0, 3) + '</span></div>';
    }).join('');

    // lo que pagarás cada mes (por mes de la fecha límite)
    var mesAct = h.slice(0, 7), tabla = {};
    function sumar(m, r, monto, msiM) {
      if (monto <= 0.009) return;
      if (m < mesAct) m = mesAct; // vencido: se paga ya
      var f = tabla[m] || (tabla[m] = { tot: 0, msi: 0, tj: {} });
      f.tot = r2(f.tot + monto); f.msi = r2(f.msi + (msiM || 0));
      f.tj[r.t.id] = r2((f.tj[r.t.id] || 0) + monto);
    }
    calcs.forEach(function (r) {
      // corte ya cerrado: lo que falta pagar de él
      if (r.k >= 0 && r.aPagar > 0) sumar(r.limite.slice(0, 7), r, r.aPagar, Math.min(r.aPagar, r.msiPorCorte[r.k] || 0));
      // pagos adelantados (de más) se descuentan de los siguientes cortes
      var credito = r.estado ? 0 : Math.max(0, r2(r.pagado - r.cargos.slice(0, r.k + 1).reduce(function (s, x) { return s + x; }, 0)));
      r.cortes.forEach(function (C, i) {
        if (i <= r.k || !r.cargos[i]) return;
        var v = r.cargos[i], q = Math.min(v, credito); credito = r2(credito - q); v = r2(v - q);
        sumar(limiteDe(r.t, C).slice(0, 7), r, v, Math.min(v, r.msiPorCorte[i]));
      });
    });
    var mesesT = Object.keys(tabla).sort();
    if (!mesesT.length) $('por-mes').innerHTML = '<tbody><tr><td class="tj-nada">No tienes pagos pendientes en tus tarjetas.</td></tr></tbody>';
    else {
      var lista = [], dm = fechaDe(mesAct + '-01'), ult = mesesT[mesesT.length - 1];
      while (iso(dm).slice(0, 7) <= ult) { lista.push(iso(dm).slice(0, 7)); dm.setMonth(dm.getMonth() + 1); }
      var gran = 0, granMsi = 0;
      $('por-mes').innerHTML = '<thead><tr><th>Mes</th><th class="n">Total</th><th class="n msi">De MSI</th><th>Por tarjeta</th></tr></thead><tbody>' +
        lista.map(function (m) {
          var f = tabla[m] || { tot: 0, msi: 0, tj: {} }; gran += f.tot; granMsi += f.msi;
          var y = +m.slice(0, 4), nom = MESES[+m.slice(5) - 1] + (y !== new Date().getFullYear() ? ' ' + y : '');
          var des = ts.filter(function (t) { return f.tj[t.id]; }).map(function (t) {
            var r = calcs.find(function (x) { return x.t.id === t.id; });
            var C = r.cortes.find(function (c) { var l = limiteDe(t, c); return l.slice(0, 7) === m || (m === mesAct && l.slice(0, 7) < m && c === r.corte); });
            var lim = C ? limiteDe(t, C) : '';
            return '<span><b>' + esc(t.nombre) + '</b><span>' + dinero(f.tj[t.id]) + (lim ? ' <small>· ' + corta(lim) + '</small>' : '') + '</span></span>';
          }).join('');
          return '<tr' + (m === mesAct ? ' class="actual"' : '') + '><td class="mes">' + nom + '</td><td class="n tot">' + (f.tot ? dinero(f.tot) : '—') + '</td><td class="n msi">' + (f.msi ? dinero(f.msi) : '—') + '</td><td>' + (des ? '<div class="des">' + des + '</div>' : '<small>Nada por pagar</small>') + '</td></tr>';
        }).join('') + '</tbody><tfoot><tr><td>Total</td><td class="n">' + dinero(gran) + '</td><td class="n msi">' + dinero(granMsi) + '</td><td></td></tr></tfoot>';
    }

    // movimientos
    var ft = $('f-tarjeta').value, fx = $('f-tipo').value;
    var sel = $('f-tarjeta'), opciones = '<option value="">Todas las tarjetas</option>' + ts.map(function (t) { return '<option value="' + esc(t.id) + '">' + esc(nombreT(t)) + '</option>'; }).join('');
    if (sel.innerHTML !== opciones) { sel.innerHTML = opciones; sel.value = ft; }
    var movs = vivas(compras).map(function (c) { return { tipo: 'compra', o: c }; }).concat(vivas(pagos).map(function (p) { return { tipo: 'pago', o: p }; }))
      .filter(function (m) { return (!ft || m.o.tarjetaId === ft) && (!fx || m.tipo === fx); })
      .sort(function (a, b) { return b.o.fecha.localeCompare(a.o.fecha) || String(b.o.creado || '').localeCompare(String(a.o.creado || '')); });
    $('movs').innerHTML = movs.length ? movs.slice(0, maxMovs).map(function (m) {
      var o = m.o, t = tarjetaPorId(o.tarjetaId);
      return '<li><button type="button" data-' + m.tipo + '="' + esc(o.id) + '"><span><b>' + (m.tipo === 'pago' ? 'Pago' + (o.nota ? ' · ' + esc(o.nota) : '') : esc(o.concepto || 'Compra')) + '</b><small>' + corta(o.fecha) + ' · ' + esc(nombreT(t)) + (m.tipo === 'compra' ? ' · ' + (+o.msi ? o.msi + ' MSI' : 'Contado') : '') + '</small></span>' +
        '<span class="der ' + (m.tipo === 'pago' ? 'pos' : '') + '"><b>' + (m.tipo === 'pago' ? '− ' : '') + dinero(o.monto) + '</b></span></button></li>';
    }).join('') : '<li class="tj-nada">' + (ts.length ? 'Todavía no hay movimientos.' : 'Primero agrega una tarjeta.') + '</li>';
    $('mas-movs').hidden = movs.length <= maxMovs;
  }

  /* ---------- modales ---------- */
  var actual = null;
  function abrirModal(id) { document.querySelectorAll('.modal').forEach(function (m) { m.hidden = true; }); $(id).hidden = false; }
  function cerrar() { document.querySelectorAll('.modal').forEach(function (m) { m.hidden = true; }); actual = null; }
  function radio(name) { var r = document.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : ''; }
  function setRadio(name, v) { document.querySelectorAll('input[name="' + name + '"]').forEach(function (r) { r.checked = r.value === String(v); }); }
  // Meses de la compra: de la lista o "Otro" con número
  function msiSel() { var v = radio('mc-msi'); if (v !== 'otro') return +v || 0; var n = Math.round(num($('mc-otro').value)); return n >= 2 ? n : 0; }
  function msiPoner(n) {
    n = +n || 0; var fijos = ['0', '3', '6', '9', '12', '18', '24'], esFijo = fijos.indexOf(String(n)) >= 0;
    setRadio('mc-msi', esFijo ? n : 'otro'); $('mc-otro').value = esFijo ? '' : n; $('mc-otro-c').hidden = esFijo;
  }
  function error(id, t) { $(id).textContent = t; $(id).hidden = !t; }
  function opcionesTarjeta(sel, v) {
    var ts = vivas(tarjetas);
    $(sel).innerHTML = ts.map(function (t) { return '<option value="' + esc(t.id) + '">' + esc(nombreT(t)) + '</option>'; }).join('');
    if (v) $(sel).value = v;
  }
  function necesitaTarjeta() { if (vivas(tarjetas).length) return false; aviso('Primero agrega una tarjeta'); abrirTarjeta(null); return true; }

  // Tarjeta
  function ejemploTarjeta() {
    var t = { corte: +$('mt-corte').value, modo: radio('mt-modo'), dias: +$('mt-dias').value || 20, diaPago: +$('mt-dia').value };
    $('mt-caja-dias').hidden = t.modo !== 'dias'; $('mt-caja-dia').hidden = t.modo !== 'dia';
    if (!(t.corte >= 1 && t.corte <= 31) || (t.modo === 'dia' && !(t.diaPago >= 1 && t.diaPago <= 31))) { $('mt-ejemplo').textContent = ''; return; }
    var d = new Date(), C = corteEn(t, d.getFullYear(), d.getMonth());
    if (C < hoy()) { d.setMonth(d.getMonth() + 1); C = corteEn(t, d.getFullYear(), d.getMonth()); }
    $('mt-ejemplo').textContent = 'Ejemplo: corte el ' + larga(C) + ' → pagas a más tardar el ' + larga(limiteDe(t, C)) + '. Lo que compres a partir del día siguiente al corte se paga hasta el mes siguiente.';
  }
  function abrirTarjeta(t) {
    actual = t;
    $('mt-tit').textContent = t ? 'Editar tarjeta' : 'Nueva tarjeta';
    $('mt-nombre').value = t ? t.nombre : ''; $('mt-ult').value = t ? t.ult || '' : '';
    $('mt-corte').value = t ? t.corte : ''; $('mt-limite').value = t && t.limite ? t.limite : ''; $('mt-compartida').checked = !!(t && t.compartida);
    setRadio('mt-modo', t ? t.modo || 'dias' : 'dias'); $('mt-dias').value = t ? t.dias || 20 : 20; $('mt-dia').value = t && t.diaPago ? t.diaPago : '';
    $('mt-borrar').hidden = !t; error('mt-error', ''); ejemploTarjeta();
    abrirModal('modal-tarjeta'); setTimeout(function () { $('mt-nombre').focus(); }, 30);
  }
  ['mt-corte', 'mt-dias', 'mt-dia'].forEach(function (id) { $(id).addEventListener('input', ejemploTarjeta); });
  document.querySelectorAll('input[name="mt-modo"]').forEach(function (r) { r.addEventListener('change', ejemploTarjeta); });
  $('form-tarjeta').addEventListener('submit', function (e) {
    e.preventDefault();
    var nombre = $('mt-nombre').value.trim(), ult = $('mt-ult').value.replace(/\D/g, ''), corte = +$('mt-corte').value, modo = radio('mt-modo');
    var dias = +$('mt-dias').value, dia = +$('mt-dia').value;
    if (!nombre) return error('mt-error', 'Escribe el nombre de la tarjeta.');
    if (ult && ult.length !== 4) return error('mt-error', 'Pon solo los últimos 4 dígitos.');
    if (!(corte >= 1 && corte <= 31)) return error('mt-error', 'El día de corte va del 1 al 31.');
    if (modo === 'dias' && !(dias >= 1 && dias <= 60)) return error('mt-error', 'Pon cuántos días después del corte se paga.');
    if (modo === 'dia' && !(dia >= 1 && dia <= 31)) return error('mt-error', 'El día de pago va del 1 al 31.');
    var datos = { nombre: nombre, ult: ult, corte: corte, modo: modo, dias: modo === 'dias' ? dias : 20, diaPago: modo === 'dia' ? dia : null, limite: num($('mt-limite').value) || null, compartida: $('mt-compartida').checked, editado: new Date().toISOString() };
    var nuevo = !actual;
    if (actual) Object.assign(tarjetaPorId(actual.id), datos);
    else tarjetas.push(Object.assign({ id: uid('t'), creado: datos.editado }, datos));
    if (guardar(KT, tarjetas)) { cerrar(); pintar(); aviso(nuevo ? 'Tarjeta agregada' : 'Tarjeta actualizada'); }
  });
  $('mt-borrar').addEventListener('click', function () {
    if (!actual) return;
    var n = vivas(compras).filter(function (c) { return c.tarjetaId === actual.id; }).length;
    if (!confirm('¿Borrar la tarjeta ' + nombreT(actual) + '?' + (n ? ' También se ocultan sus ' + n + ' compras y sus pagos.' : '') + ' No se puede deshacer.')) return;
    var id = actual.id, ahora = new Date().toISOString();
    var t = tarjetaPorId(id); t.borrado = true; t.editado = ahora;
    [compras, pagos, estados].forEach(function (l) { l.forEach(function (x) { if (x.tarjetaId === id && !x.borrado) { x.borrado = true; x.editado = ahora; } }); });
    guardar(KT, tarjetas); guardar(KC, compras); guardar(KP, pagos); guardar(KE, estados);
    cerrar(); pintar(); aviso('Tarjeta borrada');
  });

  // Compra
  function infoCompra() {
    var monto = num($('mc-monto').value), n = msiSel(), t = tarjetaPorId($('mc-tarjeta').value), f = $('mc-fecha').value;
    if (!t || !f || !monto) { $('mc-info').textContent = ''; return; }
    var cortes = cortesDe(t, f), i = indiceCorte(cortes, f), C = cortes[i];
    $('mc-info').textContent = (n ? n + ' mensualidades de ' + dinero(mensualidades({ monto: monto, msi: n })[0]) + '. La primera' : 'Esta compra') + ' entra en el corte del ' + larga(C) + ' y se paga a más tardar el ' + larga(limiteDe(t, C)) + '.';
  }
  function abrirCompra(c, tarjetaId) {
    if (!c && necesitaTarjeta()) return;
    actual = c;
    $('mc-tit').textContent = c ? 'Editar compra' : 'Nueva compra';
    opcionesTarjeta('mc-tarjeta', c ? c.tarjetaId : tarjetaId || $('f-tarjeta').value);
    $('mc-monto').value = c ? c.monto : ''; $('mc-fecha').value = c ? c.fecha : hoy(); $('mc-concepto').value = c ? c.concepto || '' : '';
    msiPoner(c ? c.msi : 0);
    $('mc-borrar').hidden = !c; error('mc-error', ''); infoCompra();
    abrirModal('modal-compra'); setTimeout(function () { $('mc-monto').focus(); }, 30);
  }
  ['mc-monto', 'mc-fecha', 'mc-tarjeta'].forEach(function (id) { $(id).addEventListener('input', infoCompra); $(id).addEventListener('change', infoCompra); });
  $('mc-msi').addEventListener('change', function () { var o = radio('mc-msi') === 'otro'; $('mc-otro-c').hidden = !o; if (o) $('mc-otro').focus(); infoCompra(); });
  $('mc-otro').addEventListener('input', infoCompra);
  $('form-compra').addEventListener('submit', function (e) {
    e.preventDefault();
    var monto = r2(num($('mc-monto').value)), f = $('mc-fecha').value, concepto = $('mc-concepto').value.trim(), tid = $('mc-tarjeta').value;
    if (!tid) return error('mc-error', 'Elige la tarjeta.');
    if (!(monto > 0)) return error('mc-error', 'Escribe el monto de la compra.');
    if (!f) return error('mc-error', 'Pon la fecha de la compra.');
    if (!concepto) return error('mc-error', 'Escribe qué compraste.');
    if (radio('mc-msi') === 'otro' && !msiSel()) return error('mc-error', 'Escribe cuántos meses (2 o más).');
    var datos = { tarjetaId: tid, monto: monto, fecha: f, concepto: concepto, msi: msiSel(), editado: new Date().toISOString() };
    var nuevo = !actual;
    if (actual) Object.assign(compras.find(function (x) { return x.id === actual.id; }), datos);
    else compras.push(Object.assign({ id: uid('c'), creado: datos.editado }, datos));
    if (guardar(KC, compras)) { cerrar(); pintar(); aviso(nuevo ? 'Compra anotada' : 'Compra actualizada'); }
  });
  $('mc-borrar').addEventListener('click', function () {
    if (!actual || !confirm('¿Borrar la compra «' + (actual.concepto || 'Compra') + '» de ' + dinero(actual.monto) + '? No se puede deshacer.')) return;
    var c = compras.find(function (x) { return x.id === actual.id; }); c.borrado = true; c.editado = new Date().toISOString();
    guardar(KC, compras); cerrar(); pintar(); aviso('Compra borrada');
  });

  // Pago
  function abrirPago(p, tarjetaId, monto) {
    if (!p && necesitaTarjeta()) return;
    actual = p;
    $('mp-tit').textContent = p ? 'Editar pago' : 'Registrar pago a tarjeta';
    opcionesTarjeta('mp-tarjeta', p ? p.tarjetaId : tarjetaId || $('f-tarjeta').value);
    $('mp-monto').value = p ? p.monto : (monto || ''); $('mp-fecha').value = p ? p.fecha : hoy(); $('mp-nota').value = p ? p.nota || '' : '';
    $('mp-borrar').hidden = !p; error('mp-error', ''); infoPago();
    abrirModal('modal-pago'); setTimeout(function () { $('mp-monto').focus(); }, 30);
  }
  function infoPago() {
    var t = tarjetaPorId($('mp-tarjeta').value); if (!t) { $('mp-info').textContent = ''; return; }
    var r = calcular(t);
    $('mp-info').textContent = r.aPagar > 0 ? 'Pago sin intereses de esta tarjeta: ' + dinero(r.aPagar) + ', vence el ' + larga(r.limite) + '.' : 'Esta tarjeta no tiene pagos pendientes de cortes cerrados. Deuda total: ' + dinero(r.deuda) + '.';
  }
  $('mp-tarjeta').addEventListener('change', infoPago);
  $('form-pago').addEventListener('submit', function (e) {
    e.preventDefault();
    var monto = r2(num($('mp-monto').value)), f = $('mp-fecha').value, tid = $('mp-tarjeta').value;
    if (!tid) return error('mp-error', 'Elige la tarjeta.');
    if (!(monto > 0)) return error('mp-error', 'Escribe cuánto pagaste.');
    if (!f) return error('mp-error', 'Pon la fecha del pago.');
    var datos = { tarjetaId: tid, monto: monto, fecha: f, nota: $('mp-nota').value.trim(), editado: new Date().toISOString() };
    var nuevo = !actual;
    if (actual) Object.assign(pagos.find(function (x) { return x.id === actual.id; }), datos);
    else pagos.push(Object.assign({ id: uid('p'), creado: datos.editado }, datos));
    if (guardar(KP, pagos)) { cerrar(); pintar(); aviso(nuevo ? 'Pago registrado' : 'Pago actualizado'); }
  });
  $('mp-borrar').addEventListener('click', function () {
    if (!actual || !confirm('¿Borrar este pago de ' + dinero(actual.monto) + '? No se puede deshacer.')) return;
    var p = pagos.find(function (x) { return x.id === actual.id; }); p.borrado = true; p.editado = new Date().toISOString();
    guardar(KP, pagos); cerrar(); pintar(); aviso('Pago borrado');
  });

  // Estado de cuenta (del último corte cerrado)
  var estadoT = null;
  function abrirEstado(t) {
    var r = calcular(t); if (r.k < 0) return;
    estadoT = { t: t, corte: r.corte };
    var e = r.estado;
    $('me-tit').textContent = 'Estado de cuenta · ' + nombreT(t);
    $('me-info').textContent = 'Corte del ' + larga(r.corte) + ' (fecha límite ' + larga(r.limite) + '). Según tus compras y pagos anotados serían ' + dinero(r.calculado) + '.';
    $('me-monto').value = e ? e.monto : ''; $('me-minimo').value = e && e.minimo ? e.minimo : '';
    $('me-borrar').hidden = !e; error('me-error', '');
    abrirModal('modal-estado'); setTimeout(function () { $('me-monto').focus(); }, 30);
  }
  $('form-estado').addEventListener('submit', function (e) {
    e.preventDefault();
    var monto = $('me-monto').value === '' ? NaN : r2(num($('me-monto').value));
    if (!(monto >= 0)) return error('me-error', 'Escribe el pago para no generar intereses que dice tu estado de cuenta.');
    var ex = estados.find(function (x) { return !x.borrado && x.tarjetaId === estadoT.t.id && x.corte === estadoT.corte; });
    var datos = { monto: monto, minimo: num($('me-minimo').value) || null, editado: new Date().toISOString() };
    if (ex) Object.assign(ex, datos); else estados.push(Object.assign({ id: uid('e'), tarjetaId: estadoT.t.id, corte: estadoT.corte, creado: datos.editado }, datos));
    if (guardar(KE, estados)) { cerrar(); pintar(); aviso('Estado de cuenta guardado'); }
  });
  $('me-borrar').addEventListener('click', function () {
    var ex = estados.find(function (x) { return !x.borrado && x.tarjetaId === estadoT.t.id && x.corte === estadoT.corte; });
    if (!ex || !confirm('¿Quitar el estado de cuenta? Se volverá a usar el cálculo.')) return;
    ex.borrado = true; ex.editado = new Date().toISOString(); guardar(KE, estados); cerrar(); pintar();
  });

  /* ---------- eventos ---------- */
  $('btn-tarjeta').addEventListener('click', function () { abrirTarjeta(null); });
  $('btn-compra').addEventListener('click', function () { abrirCompra(null); });
  $('btn-pago').addEventListener('click', function () { abrirPago(null); });
  document.addEventListener('click', function (e) {
    var b;
    if (e.target.closest('[data-cerrar]')) { cerrar(); return; }
    if (e.target.classList && e.target.classList.contains('modal')) { cerrar(); return; }
    if (e.target.id === 'vacio-tarjeta') { abrirTarjeta(null); return; }
    if ((b = e.target.closest('[data-editar-t]'))) { abrirTarjeta(tarjetaPorId(b.getAttribute('data-editar-t'))); return; }
    if ((b = e.target.closest('[data-pagar]'))) { abrirPago(null, b.getAttribute('data-pagar'), b.getAttribute('data-monto')); return; }
    if ((b = e.target.closest('[data-comprar]'))) { abrirCompra(null, b.getAttribute('data-comprar')); return; }
    if ((b = e.target.closest('[data-estado]'))) { abrirEstado(tarjetaPorId(b.getAttribute('data-estado'))); return; }
    if ((b = e.target.closest('[data-compra]'))) { abrirCompra(compras.find(function (x) { return x.id === b.getAttribute('data-compra'); })); return; }
    if ((b = e.target.closest('[data-pago]'))) { abrirPago(pagos.find(function (x) { return x.id === b.getAttribute('data-pago'); })); return; }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrar(); });
  $('f-tarjeta').addEventListener('change', function () { maxMovs = 25; pintar(); });
  $('f-tipo').addEventListener('change', function () { maxMovs = 25; pintar(); });
  $('mas-movs').addEventListener('click', function () { maxMovs += 50; pintar(); });

  pintar();
  // Cambia de día mientras está abierta: vuelve a calcular
  setInterval(function () { if (document.visibilityState === 'visible' && !document.querySelector('.modal:not([hidden])')) pintar(); }, 60000);
})();
