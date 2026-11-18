/* =====================================================================
   Gastos de ESSENTIA (privado, se guarda en línea)
   Reemplaza la hoja de Excel: anotas cada gasto el día que ocurre y
   aquí se suma por mes, por semana, por categoría y por forma de pago.
   ===================================================================== */
(function () {
  var K = 'essentia_gastos', KG = 'essentia_ganancias';
  var PERFUMES = 'Compra de perfumes';
  var CATS = [PERFUMES, 'Insumos y empaque', 'Publicidad', 'Envíos', 'Gasolina y traslados', 'Otros'];
  var PAGOS = ['Tarjeta', 'Transferencia', 'Efectivo', 'Caja del POS'];
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  // Los gastos que ya tenías en tu Excel (TABLA DE GASTOS ESSENTIA 2026), para no capturarlos otra vez
  var INICIALES = [
    ['2026-11-09', 'Bolsitas', 'Insumos y empaque', 251.16, 'Tarjeta', 'ESSENTIA', '400pcs Bolsas Holograficas'],
    ['2026-11-09', 'Publicidad Recoovare', 'Publicidad', 300, 'Transferencia', 'RECOOVARE', 'Lapidas y Placas'],
    ['2026-11-09', 'Uniforme Essentia', 'Publicidad', 1050, 'Transferencia', 'ESSENTIA', 'Uniformes de Essentia'],
    ['2026-11-10', 'Hielo', 'Otros', 32, 'Tarjeta', 'ESSENTIA', 'Hielo'],
    ['2026-11-10', 'Anissa', PERFUMES, 9632, 'Transferencia', 'ESSENTIA', 'Perfumes + Envio'],
    ['2026-11-10', 'Tabloides Recoovare', 'Insumos y empaque', 126, 'Efectivo', 'RECOOVARE', '3 Tabloides Vinil'],
    ['2026-11-10', 'Walmart', PERFUMES, 5270, 'Tarjeta', 'ESSENTIA', 'Perfumes'],
    ['2026-11-10', 'Mercado Libre', PERFUMES, 3011.32, 'Tarjeta', 'ESSENTIA', 'Perfumes'],
    ['2026-11-11', 'Mercado Libre', PERFUMES, 2253.09, 'Tarjeta', 'ESSENTIA', 'Perfumes'],
    ['2026-11-11', 'Broca Recoovare', 'Insumos y empaque', 50, 'Efectivo', 'RECOOVARE', ''],
    ['2026-11-12', 'Mercado Libre', PERFUMES, 2380.5, 'Tarjeta', 'ESSENTIA', 'Perfumes']
  ];

  var $ = function (id) { return document.getElementById(id); };
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function leer(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function guardar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
  function r2(n) { return Math.round(n * 100) / 100; }
  function dinero(n) { return '$' + r2(num(n)).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function fechaDe(s) { var p = String(s).slice(0, 10).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function hoy() { return iso(new Date()); }
  function mesDe(s) { return String(s).slice(0, 7); }
  function nombreMes(m) { var p = m.split('-'); return MESES[+p[1] - 1] + ' ' + p[0]; }
  function moverMes(m, n) { var p = m.split('-'); var d = new Date(+p[0], +p[1] - 1 + n, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
  function corta(s) { var d = fechaDe(s); return d.getDate() + ' ' + MESES[d.getMonth()].slice(0, 3); }
  function uid() { return 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  /* ---------- datos ---------- */
  var gastos = leer(K, null);
  if (!Array.isArray(gastos)) {
    gastos = INICIALES.map(function (r, i) {
      return { id: 'g-excel-' + String(i + 1).padStart(2, '0'), fecha: r[0], concepto: r[1], categoria: r[2], monto: r[3], pago: r[4], negocio: r[5], notas: r[6], creado: '2026-11-14T00:00:00.000Z' };
    });
    guardar(K, gastos);
  }
  var ganancias = leer(KG, []);
  if (!Array.isArray(ganancias)) ganancias = [];
  function vivos() { return gastos.filter(function (g) { return g && !g.borrado; }); }
  function delMes(m) { return vivos().filter(function (g) { return mesDe(g.fecha) === m; }); }
  // Semanas de lunes a domingo, cortadas al mes (así la suma de las semanas es el mes)
  function semanasDe(m) {
    var p = m.split('-'), ini = new Date(+p[0], +p[1] - 1, 1), fin = new Date(+p[0], +p[1], 0);
    var semanas = [], d = new Date(ini);
    while (d <= fin) {
      var a = new Date(d), b = new Date(d); b.setDate(b.getDate() + (7 - ((b.getDay() + 6) % 7)) - 1); if (b > fin) b = new Date(fin);
      semanas.push({ a: iso(a), b: iso(b), k: iso(a) === iso(b) ? corta(iso(a)) : a.getDate() + ' al ' + b.getDate() + ' ' + MESES[b.getMonth()].slice(0, 3) });
      d = new Date(b); d.setDate(d.getDate() + 1);
    }
    return semanas;
  }
  function gananciaSem(a) { var x = ganancias.find(function (g) { return g.id === 's-' + a && !g.borrado; }); return x ? num(x.ganancia) : null; }
  function gananciaDe(m) {
    var hay = false, t = 0;
    semanasDe(m).forEach(function (s) { var v = gananciaSem(s.a); if (v !== null) { hay = true; t += v; } });
    return hay ? r2(t) : null;
  }

  var mes = mesDe(hoy());
  var filtro = 'todos', catFiltro = '', busqueda = '';
  // Periodo: 'mes' (con flechas), '3m', 'anio' o 'rango'. "Mes pasado" es un atajo de 'mes'.
  var per = 'mes', rDesde = '', rHasta = '';
  function finMes(m) { var p = m.split('-'); return iso(new Date(+p[0], +p[1], 0)); }
  function rangoActual() {
    var h = hoy();
    if (per === '3m') return { a: moverMes(mesDe(h), -2) + '-01', b: h, t: 'los últimos 3 meses', corto: 'Últimos 3 meses' };
    if (per === 'anio') return { a: h.slice(0, 4) + '-01-01', b: h, t: h.slice(0, 4), corto: 'Año ' + h.slice(0, 4) };
    if (per === 'rango') {
      var a = rDesde || mes + '-01', b = rHasta || h; if (b < a) { var x = a; a = b; b = x; }
      return { a: a, b: b, t: 'del ' + largoF(a) + ' al ' + largoF(b), corto: corta(a) + ' – ' + corta(b) };
    }
    return { a: mes + '-01', b: finMes(mes), t: nombreMes(mes), corto: nombreMes(mes) };
  }
  function largoF(s) { var d = fechaDe(s); return d.getDate() + ' de ' + MESES[d.getMonth()] + (s.slice(0, 4) !== hoy().slice(0, 4) ? ' de ' + s.slice(0, 4) : ''); }
  function delPeriodo() { var r = rangoActual(); return vivos().filter(function (g) { return g.fecha >= r.a && g.fecha <= r.b; }); }
  function mesesDe(r) { var l = [], m = mesDe(r.a), fin = mesDe(r.b); while (m <= fin) { l.push(m); m = moverMes(m, 1); } return l; }
  function sinAcentos(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }

  function resumen(lista) {
    var total = 0, perf = 0, rec = 0;
    lista.forEach(function (g) {
      var m = num(g.monto); total += m;
      if (g.negocio === 'RECOOVARE') rec += m; else if (g.categoria === PERFUMES) perf += m;
    });
    return { total: r2(total), perf: r2(perf), rec: r2(rec), op: r2(total - perf - rec), n: lista.length };
  }

  /* ---------- pintar ---------- */
  function pintar() {
    var r = rangoActual(), unMes = per === 'mes';
    var lista = unMes ? delMes(mes) : delPeriodo(), s = resumen(lista);
    var pasado = moverMes(mesDe(hoy()), -1);
    document.querySelectorAll('[data-per]').forEach(function (b) {
      var k = b.getAttribute('data-per');
      b.setAttribute('aria-pressed', String(k === 'pasado' ? (unMes && mes === pasado) : k === 'mes' ? (unMes && mes !== pasado) : per === k));
    });
    document.querySelector('.mes-nav').hidden = !unMes;
    $('rango').hidden = per !== 'rango';
    if (per === 'rango') { $('r-desde').value = r.a; $('r-hasta').value = r.b; }
    $('mes-titulo').textContent = nombreMes(mes);
    $('u-mes').parentNode.innerHTML = unMes ? 'La ganancia de Shopify de <span id="u-mes">' + esc(nombreMes(mes)) + '</span> es la suma de las semanas que anotes en la tabla «Utilidad por semana».'
      : 'Suma de la ganancia de Shopify de cada mes de <span id="u-mes">' + esc(r.t) + '</span>, menos sus gastos. Abajo la ves mes por mes.';
    $('mes-sig').disabled = mes >= mesDe(hoy());
    $('k-total').textContent = dinero(s.total);
    $('k-n').textContent = s.n + (s.n === 1 ? ' gasto anotado' : ' gastos anotados');
    $('k-perf').textContent = dinero(s.perf);
    $('k-op').textContent = dinero(s.op);
    $('k-rec').textContent = dinero(s.rec);
    var cuando = unMes ? 'En ' + nombreMes(mes) : per === 'rango' ? 'Del ' + largoF(r.a) + ' al ' + largoF(r.b) : 'En ' + r.t;
    if (!s.n) $('lead').textContent = 'Todavía no hay gastos anotados ' + (unMes ? 'en ' + nombreMes(mes) : per === 'rango' ? r.t : 'en ' + r.t) + '.';
    else $('lead').innerHTML = esc(cuando) + ' llevas <b>' + dinero(s.total) + '</b> en gastos. El <b>' + Math.round(s.perf / (s.total || 1) * 100) + '%</b> fue compra de perfumes. A tu ganancia se le restan <b>' + dinero(r2(s.op + s.rec)) + '</b>: ' + dinero(s.op) + ' de operación de ESSENTIA y ' + dinero(s.rec) + ' de RECOOVARE.';
    // Un mes: utilidad del mes, semanas y reparto. Varios meses: utilidad por mes.
    $('u-titulo').textContent = unMes ? 'Utilidad del mes' : 'Utilidad del periodo';
    $('utilidad-semanal').hidden = !unMes; $('reparto').hidden = !unMes; $('historial').hidden = !unMes;
    $('utilidad-mensual').hidden = unMes;
    if (unMes) { pintarUtilidad(s); pintarTabla(lista); } else pintarMeses(r);
    palabra = unMes ? 'del mes' : 'del periodo';
    barras('g-cat', agrupar(lista, function (g) { return g.categoria || 'Sin categoría'; }), s.total, true);
    barras('g-pago', agrupar(lista, function (g) { return g.pago || 'Sin dato'; }), s.total);
    $('l-titulo').textContent = unMes ? 'Gastos del mes' : 'Gastos del periodo';
    pintarLista(lista);
    if (unMes && window.pintarReparto) window.pintarReparto();
  }
  var palabra = 'del mes';

  // Varios meses: cada mes completo (sus semanas y sus gastos)
  function pintarMeses(r) {
    var tg = 0, hayG = false, top = 0, trec = 0, html = '', faltan = [];
    mesesDe(r).forEach(function (m) {
      var s = resumen(delMes(m)), g = gananciaDe(m), u = g === null ? null : r2(g - s.op - s.rec);
      if (g === null && !s.n && m !== mesDe(hoy())) return; // meses sin nada anotado no se muestran
      if (g !== null) { hayG = true; tg += g; }
      top += s.op; trec += s.rec;
      if (g === null && delMes(m).length) faltan.push(nombreMes(m).split(' ')[0]);
      html += '<tr><td class="sem"><span style="text-transform:capitalize">' + esc(nombreMes(m)) + '</span>' + (m === mesDe(hoy()) ? '<small>Mes en curso</small>' : '') + '</td>' +
        '<td class="num" data-label="Ganancia Shopify">' + (g === null ? '<span class="falta">Sin anotar</span>' : dinero(g)) + '</td>' +
        '<td class="num menos" data-label="− Operación ESSENTIA">' + dinero(s.op) + '</td>' +
        '<td class="num menos" data-label="− Gastos RECOOVARE">' + dinero(s.rec) + '</td>' +
        '<td class="num" data-label="Utilidad">' + celdaU(u) + '</td></tr>';
    });
    $('tm-meses').innerHTML = html;
    tg = r2(tg); top = r2(top); trec = r2(trec);
    var ut = hayG ? r2(tg - top - trec) : null;
    $('tm-total').innerHTML = '<tr><td class="sem">Total</td><td class="num" data-label="Ganancia Shopify">' + (hayG ? dinero(tg) : '—') + '</td>' +
      '<td class="num menos" data-label="− Operación ESSENTIA">' + dinero(top) + '</td><td class="num menos" data-label="− Gastos RECOOVARE">' + dinero(trec) + '</td>' +
      '<td class="num" data-label="Utilidad">' + celdaU(ut) + '</td></tr>';
    var restas = '<div class="r menos"><span>− Operación de ESSENTIA</span><span>' + dinero(top) + '</span></div><div class="r menos"><span>− Gastos de RECOOVARE</span><span>' + dinero(trec) + '</span></div>';
    $('u-cuenta').innerHTML = !hayG ? restas + '<p class="ayuda">Anota la ganancia de Shopify de cada semana para ver tu utilidad.</p>' :
      '<div class="r"><span>Ganancia de Shopify</span><span>' + dinero(tg) + '</span></div>' + restas +
      '<div class="r total ' + (ut >= 0 ? 'pos' : 'neg') + '"><span>Utilidad</span><span>' + (ut < 0 ? '−' : '') + dinero(Math.abs(ut)) + '</span></div>' +
      (faltan.length ? '<p class="ayuda" style="color:var(--aviso)">Falta anotar la ganancia de Shopify de ' + esc(faltan.join(', ')) + '; sus gastos sí se restan.</p>' : '') +
      (per === 'rango' && (r.a.slice(8) !== '01' || r.b !== finMes(mesDe(r.b))) ? '<p class="ayuda">La utilidad cuenta los meses completos de este rango.</p>' : '');
  }

  function pintarUtilidad(s) {
    var val = gananciaDe(mes);
    var restas = '<div class="r menos"><span>− Operación de ESSENTIA</span><span>' + dinero(s.op) + '</span></div>' +
      '<div class="r menos"><span>− Gastos de RECOOVARE</span><span>' + dinero(s.rec) + '</span></div>';
    var html;
    if (val === null) html = restas + '<p class="ayuda">Anota la ganancia de Shopify de cada semana en la tabla de abajo para ver tu utilidad.</p>';
    else {
      var u = r2(val - s.op - s.rec);
      html = '<div class="r"><span>Ganancia de Shopify</span><span>' + dinero(val) + '</span></div>' + restas +
        '<div class="r total ' + (u >= 0 ? 'pos' : 'neg') + '"><span>Utilidad</span><span>' + (u < 0 ? '−' : '') + dinero(Math.abs(u)) + '</span></div>';
    }
    $('u-cuenta').innerHTML = html;
  }

  function agrupar(lista, clave) {
    var m = {};
    lista.forEach(function (g) { var k = clave(g); m[k] = m[k] || { k: k, monto: 0, n: 0, rec: 0 }; m[k].monto += num(g.monto); m[k].n++; if (g.negocio === 'RECOOVARE') m[k].rec += num(g.monto); });
    return Object.keys(m).map(function (k) { return m[k]; }).sort(function (a, b) { return b.monto - a.monto; });
  }
  function barras(id, filas, total, filtrable) {
    var max = filas.reduce(function (x, f) { return Math.max(x, f.monto); }, 0) || 1;
    $(id).innerHTML = filas.length ? filas.map(function (f) {
      var tag = filtrable ? 'button type="button" data-cat="' + esc(f.k) + '" aria-pressed="' + (catFiltro === f.k) + '" title="Ver solo estos gastos"' : 'div';
      return '<' + tag + ' class="barra-f' + (filtrable ? ' filtrable' : '') + '"><div class="top"><span>' + esc(f.k) + '</span><b>' + dinero(f.monto) + '</b></div>' +
        '<div class="pista" aria-hidden="true"><div class="llena" style="width:' + Math.max(1.5, f.monto / max * 100) + '%"></div></div>' +
        '<small>' + (Math.round(f.monto / (total || 1) * 1000) / 10) + '% ' + palabra + ' · ' + f.n + (f.n === 1 ? ' gasto' : ' gastos') + (f.rec > 0 ? ' · ' + dinero(f.rec) + ' de RECOOVARE' : '') + '</small></' + (filtrable ? 'button' : 'div') + '>';
    }).join('') : '<p class="vacio">Sin gastos ' + (palabra === 'del mes' ? 'este mes' : 'en este periodo') + '.</p>';
  }
  function cuentaSem(lista, sem) {
    var l = lista.filter(function (g) { return g.fecha >= sem.a && g.fecha <= sem.b; });
    var r = resumen(l), gan = gananciaSem(sem.a);
    return { op: r.op, rec: r.rec, gan: gan, u: gan === null ? null : r2(gan - r.op - r.rec) };
  }
  function celdaU(u) { return u === null ? '<span class="falta">Falta la ganancia</span>' : '<span class="' + (u >= 0 ? 'pos' : 'neg') + '">' + (u < 0 ? '−' : '') + dinero(Math.abs(u)) + '</span>'; }
  function semanasVisibles() { return semanasDe(mes); }
  function pintarTabla(lista) {
    $('t-sem').innerHTML = semanasVisibles().map(function (sem) {
      var c = cuentaSem(lista, sem), db = fechaDe(sem.b);
      return '<tr data-fila="' + sem.a + '"><td class="sem">' + esc(sem.k) + '<small>' + (sem.a <= hoy() && sem.b >= hoy() ? 'Semana en curso' : sem.a > hoy() ? 'Todavía no empieza' : '') + '</small></td>' +
        '<td class="num" data-label="Ganancia Shopify"><input type="number" min="0" step="0.01" inputmode="decimal" data-sem="' + sem.a + '" data-fin="' + sem.b + '" value="' + (c.gan === null ? '' : c.gan) + '" placeholder="$0.00" aria-label="Ganancia de Shopify del ' + esc(sem.k) + '"></td>' +
        '<td class="num menos" data-label="− Operación ESSENTIA">' + dinero(c.op) + '</td>' +
        '<td class="num menos" data-label="− Gastos RECOOVARE">' + dinero(c.rec) + '</td>' +
        '<td class="num" data-label="Utilidad" data-u="' + sem.a + '">' + celdaU(c.u) + '</td></tr>';
    }).join('');
    pintarTotal(lista);
  }
  function pintarTotal(lista) {
    var s = resumen(lista), g = gananciaDe(mes), u = g === null ? null : r2(g - s.op - s.rec);
    $('t-total').innerHTML = '<tr><td class="sem">Total del mes</td>' +
      '<td class="num" data-label="Ganancia Shopify">' + (g === null ? '—' : dinero(g)) + '</td>' +
      '<td class="num menos" data-label="− Operación ESSENTIA">' + dinero(s.op) + '</td>' +
      '<td class="num menos" data-label="− Gastos RECOOVARE">' + dinero(s.rec) + '</td>' +
      '<td class="num" data-label="Utilidad">' + celdaU(u) + '</td></tr>';
  }

  function pintarLista(lista) {
    var q = sinAcentos(busqueda.trim());
    var fc = $('filtro-cat');
    fc.hidden = !catFiltro;
    if (catFiltro) fc.innerHTML = '<span>Categoría: <b>' + esc(catFiltro) + '</b></span><button type="button" class="btn btn-claro btn-mini" data-quitar-cat>Ver todas</button>';
    var l = lista.filter(function (g) {
      if (filtro !== 'todos' && (g.negocio || 'ESSENTIA') !== filtro) return false;
      if (catFiltro && (g.categoria || 'Sin categoría') !== catFiltro) return false;
      return !q || sinAcentos([g.concepto, g.notas, g.categoria, g.pago].join(' ')).indexOf(q) >= 0;
    })
      .sort(function (a, b) { return a.fecha === b.fecha ? (a.creado < b.creado ? 1 : -1) : (a.fecha < b.fecha ? 1 : -1); });
    $('vacio').hidden = l.length > 0;
    $('vacio').textContent = lista.length && (q || catFiltro || filtro !== 'todos') ? 'Ningún gasto coincide con tu búsqueda o filtro.' : per === 'mes' ? 'No hay gastos en este mes.' : 'No hay gastos en este periodo.';
    if (l.length && (q || catFiltro)) { var tot = l.reduce(function (x, g) { return x + num(g.monto); }, 0); fc.hidden = false; fc.innerHTML = (catFiltro ? '<span>Categoría: <b>' + esc(catFiltro) + '</b></span>' : '<span>Búsqueda</span>') + '<span>' + l.length + (l.length === 1 ? ' gasto' : ' gastos') + ' · <b>' + dinero(tot) + '</b></span>' + (catFiltro ? '<button type="button" class="btn btn-claro btn-mini" data-quitar-cat>Ver todas</button>' : ''); }
    var dias = {}, orden = [];
    l.forEach(function (g) { if (!dias[g.fecha]) { dias[g.fecha] = []; orden.push(g.fecha); } dias[g.fecha].push(g); });
    $('lista').innerHTML = orden.map(function (f) {
      var d = fechaDe(f), tot = dias[f].reduce(function (x, g) { return x + num(g.monto); }, 0);
      return '<div class="dia-g"><h3><span>' + DIAS[d.getDay()].replace(/^./, function (c) { return c.toUpperCase(); }) + ' ' + d.getDate() + ' ' + MESES[d.getMonth()].slice(0, 3) + '</span><b>' + dinero(tot) + '</b></h3><ul>' +
        dias[f].map(function (g) {
          var sub = [g.categoria, g.pago, g.notas].filter(Boolean).join(' · ');
          var dentro = '<span class="g-txt"><b>' + esc(g.concepto) + '</b><small>' + esc(sub) + '</small></span>' +
            (g.negocio === 'RECOOVARE' ? '<span class="tag tag-r">RECOOVARE</span>' : '') +
            '<span class="g-monto">' + dinero(g.monto) + '</span>';
          return '<li><button type="button" class="gasto" data-id="' + esc(g.id) + '" aria-label="Editar ' + esc(g.concepto) + ', ' + esc(dinero(g.monto)) + '">' + dentro + '</button></li>';
        }).join('') + '</ul></div>';
    }).join('');
  }

  /* ---------- navegación ---------- */
  $('mes-ant').addEventListener('click', function () { mes = moverMes(mes, -1); pintar(); });
  document.querySelector('.seg-p').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-per]'); if (!b) return;
    var k = b.getAttribute('data-per');
    if (k === 'pasado') { per = 'mes'; mes = moverMes(mesDe(hoy()), -1); }
    else if (k === 'mes') { per = 'mes'; mes = mesDe(hoy()); }
    else { if (k === 'rango' && per !== 'rango') { var r = rangoActual(); rDesde = r.a; rHasta = r.b > hoy() ? hoy() : r.b; } per = k; }
    catFiltro = ''; pintar();
  });
  $('r-desde').addEventListener('change', function () { rDesde = this.value; pintar(); });
  $('r-hasta').addEventListener('change', function () { rHasta = this.value; pintar(); });
  $('g-cat').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-cat]'); if (!b) return;
    var c = b.getAttribute('data-cat'); catFiltro = catFiltro === c ? '' : c; pintar();
    if (catFiltro) document.getElementById('l-titulo').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('filtro-cat').addEventListener('click', function (ev) { if (ev.target.closest('[data-quitar-cat]')) { catFiltro = ''; pintar(); } });
  var tBus = null;
  $('buscar').addEventListener('input', function () { var v = this.value; clearTimeout(tBus); tBus = setTimeout(function () { busqueda = v; pintarLista(per === 'mes' ? delMes(mes) : delPeriodo()); }, 120); });
  $('mes-sig').addEventListener('click', function () { if (mes < mesDe(hoy())) { mes = moverMes(mes, 1); pintar(); } });
  document.querySelectorAll('input[name="filtro"]').forEach(function (r) { r.addEventListener('change', function () { filtro = this.value; pintar(); }); });
  $('lista').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-id]'); if (!b) return;
    abrir(gastos.find(function (g) { return g.id === b.getAttribute('data-id'); }));
  });

  var tGan = {};
  $('t-sem').addEventListener('input', function (ev) {
    var inp = ev.target.closest('[data-sem]'); if (!inp) return;
    var a = inp.getAttribute('data-sem'), b = inp.getAttribute('data-fin'), v = inp.value, m = mes;
    var x = ganancias.find(function (g) { return g.id === 's-' + a; });
    if (!x) { x = { id: 's-' + a, semana: a, fin: b, mes: m }; ganancias.push(x); }
    if (v === '') x.borrado = true; else { x.ganancia = r2(num(v)); delete x.borrado; }
    x.editado = new Date().toISOString();
    var lista = delMes(mes), c = cuentaSem(lista, { a: a, b: b });
    var celda = document.querySelector('[data-u="' + a + '"]'); if (celda) celda.innerHTML = celdaU(c.u);
    pintarTotal(lista); pintarUtilidad(resumen(lista));
    clearTimeout(tGan[a]);
    tGan[a] = setTimeout(function () { guardar(KG, ganancias); if (window.pintarReparto) window.pintarReparto(); }, 600);
  });

  /* ---------- formulario ---------- */
  var actual = null;
  function categorias() {
    var extra = [];
    vivos().forEach(function (g) { if (g.categoria && CATS.indexOf(g.categoria) < 0 && extra.indexOf(g.categoria) < 0) extra.push(g.categoria); });
    return CATS.concat(extra);
  }
  function pintarOpciones(selCat, selPago) {
    var cats = categorias();
    $('m-cats').innerHTML = cats.map(function (c) { return '<label><input type="radio" name="cat" value="' + esc(c) + '"' + (c === selCat ? ' checked' : '') + '><span>' + esc(c) + '</span></label>'; }).join('') +
      '<label><input type="radio" name="cat" value="__otra"><span>Otra…</span></label>';
    $('m-pagos').innerHTML = PAGOS.map(function (p) { return '<label><input type="radio" name="pago" value="' + esc(p) + '"' + (p === selPago ? ' checked' : '') + '><span>' + esc(p) + '</span></label>'; }).join('');
    var conceptos = []; vivos().slice().reverse().forEach(function (g) { if (conceptos.indexOf(g.concepto) < 0) conceptos.push(g.concepto); });
    $('conceptos').innerHTML = conceptos.slice(0, 60).map(function (c) { return '<option value="' + esc(c) + '">'; }).join('');
  }
  function radio(name) { var r = document.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : ''; }
  function setRadio(name, v) { document.querySelectorAll('input[name="' + name + '"]').forEach(function (r) { r.checked = r.value === v; }); }

  var tocado = {};
  function abrir(g) {
    actual = g || null; tocado = {};
    var d = g || {};
    $('m-titulo').textContent = g ? 'Editar gasto' : 'Anotar gasto';
    $('m-borrar').hidden = !g;
    pintarOpciones(d.categoria || '', d.pago || '');
    $('m-cat-otra').hidden = true; $('m-cat-otra').value = '';
    $('m-monto').value = g ? d.monto : '';
    $('m-concepto').value = d.concepto || '';
    setRadio('negocio', d.negocio || 'ESSENTIA');
    var hoyMes = mesDe(hoy()) === mes;
    $('m-fecha').value = d.fecha || (hoyMes ? hoy() : mes + '-01');
    $('m-notas').value = d.notas || '';
    $('modal').hidden = false; document.body.style.overflow = 'hidden';
    setTimeout(function () { $('m-monto').focus(); }, 30);
  }
  function cerrar() { $('modal').hidden = true; document.body.style.overflow = ''; actual = null; }
  $('btn-nuevo').addEventListener('click', function () { abrir(null); });
  $('m-cerrar').addEventListener('click', cerrar);
  $('modal').addEventListener('click', function (ev) { if (ev.target === $('modal')) cerrar(); });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !$('modal').hidden) cerrar(); });

  $('form').addEventListener('change', function (ev) {
    var t = ev.target;
    if (t.name) tocado[t.name] = true;
    if (t.name === 'cat') { $('m-cat-otra').hidden = t.value !== '__otra'; if (t.value === '__otra') $('m-cat-otra').focus(); }
  });
  // Al escribir un concepto que ya usaste, propone su categoría, forma de pago y negocio
  $('m-concepto').addEventListener('input', function () {
    var c = this.value.trim().toLowerCase(); if (!c) return;
    if (!tocado.negocio && /recoovare/.test(c)) setRadio('negocio', 'RECOOVARE');
    var prev = vivos().filter(function (g) { return String(g.concepto).toLowerCase() === c; }).sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; })[0];
    if (!prev) return;
    if (!tocado.cat && prev.categoria) { setRadio('cat', prev.categoria); $('m-cat-otra').hidden = true; }
    if (!tocado.pago && prev.pago) setRadio('pago', prev.pago);
    if (!tocado.negocio && prev.negocio) setRadio('negocio', prev.negocio);
  });

  $('form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var monto = num($('m-monto').value), concepto = $('m-concepto').value.trim();
    var cat = radio('cat'); if (cat === '__otra') cat = $('m-cat-otra').value.trim();
    var pago = radio('pago'), fecha = $('m-fecha').value;
    var falta = !(monto > 0) ? 'Escribe el monto.' : !concepto ? 'Escribe el concepto.' : !cat ? 'Elige la categoría.' : !pago ? 'Elige con qué pagaste.' : !fecha ? 'Pon la fecha.' : '';
    if (falta) { alert(falta); return; }
    var g = actual || { id: uid(), creado: new Date().toISOString() };
    g.fecha = fecha; g.concepto = concepto; g.categoria = cat; g.monto = r2(monto); g.pago = pago;
    g.negocio = radio('negocio') || 'ESSENTIA'; g.notas = $('m-notas').value.trim(); g.editado = new Date().toISOString();
    if (!actual) gastos.push(g);
    if (!guardar(K, gastos)) { alert('No se pudo guardar en este navegador.'); return; }
    var editando = !!actual;
    if (per === 'mes') mes = mesDe(fecha);
    cerrar(); pintar(); aviso(editando ? 'Gasto actualizado' : 'Gasto anotado: ' + dinero(g.monto));
  });
  $('m-borrar').addEventListener('click', function () {
    if (!actual || !confirm('¿Borrar este gasto?')) return;
    actual.borrado = true; actual.editado = new Date().toISOString();
    guardar(K, gastos); cerrar(); pintar(); aviso('Gasto borrado');
  });

  /* ---------- Excel ---------- */
  function csv(lista, nombre) {
    var q = function (v) { v = String(v == null ? '' : v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var filas = [['Fecha', 'Concepto', 'Categoría', 'Monto (MXN)', 'Pagado con', 'Negocio', 'Notas']].concat(
      lista.slice().sort(function (a, b) { return a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0; }).map(function (g) {
        var p = g.fecha.split('-'); return [p[2] + '/' + p[1] + '/' + p[0], g.concepto, g.categoria, r2(num(g.monto)).toFixed(2), g.pago, g.negocio || 'ESSENTIA', g.notas || ''];
      }));
    var blob = new Blob(['﻿' + filas.map(function (f) { return f.map(q).join(','); }).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  $('csv-mes').addEventListener('click', function () {
    if (per === 'mes') { csv(delMes(mes), 'gastos-essentia-' + mes + '.csv'); return; }
    var r = rangoActual(); csv(delPeriodo(), 'gastos-essentia-' + r.a + '-al-' + r.b + '.csv');
  });
  $('csv-todo').addEventListener('click', function () { csv(vivos(), 'gastos-essentia-todo.csv'); });

  var tt = null;
  function aviso(t) { var x = $('toast'); x.textContent = t; x.hidden = false; clearTimeout(tt); tt = setTimeout(function () { x.hidden = true; }, 2600); }

  // Lo que usa el reparto de utilidad (reparto.js)
  window.EGastos = {
    mes: function () { return mes; },
    irAMes: function (m) { mes = m; pintar(); },
    semanasDe: semanasDe,
    cuentaSem: function (sem) { return cuentaSem(delMes(mesDe(sem.a)), sem); },
    gastosSemana: function (sem) { return vivos().filter(function (g) { return g.fecha >= sem.a && g.fecha <= sem.b; }); },
    nombreMes: nombreMes, dinero: dinero, r2: r2, num: num, esc: esc, hoy: hoy, mesDe: mesDe, corta: corta, aviso: aviso
  };
  pintar();
  var abrirG = new URLSearchParams(location.search).get('abrir');
  if (abrirG) { history.replaceState(null, '', location.pathname); var gx = vivos().find(function (x) { return x.id === abrirG; }); if (gx) { mes = mesDe(gx.fecha); pintar(); abrir(gx); } }
})();
