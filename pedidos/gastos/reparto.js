/* =====================================================================
   Reparto de utilidad semanal (ESSENTIA)
   La utilidad neta de una semana (ganancia de Shopify − gastos) se
   reparte entre: Mi salario, Ahorro del negocio y Colchón del negocio.
   - No es un gasto: no se vuelve a restar en ningún lado.
   - Cada reparto confirmado se guarda con sus montos (no cambia aunque
     después cambies los porcentajes) y solo hay uno por semana.
   - Lo asignado y lo realmente pagado/separado van por separado.
   ===================================================================== */
(function () {
  var G = window.EGastos;
  if (!G) return;
  var K = 'essentia_reparto';
  var $ = function (id) { return document.getElementById(id); };
  var esc = G.esc, dinero = G.dinero, r2 = G.r2, num = G.num;
  var CATS = [
    { k: 'salario', n: 'Mi salario', d: 'Lo que te pagas esta semana', verbo: 'Registrar pago', hecho: 'Cobrado', falta: 'Falta pagarte' },
    { k: 'ahorro', n: 'Ahorro del negocio', d: 'Crecimiento, equipo o inversiones', verbo: 'Separar dinero', hecho: 'Separado', falta: 'Falta separar' },
    { k: 'colchon', n: 'Colchón del negocio', d: 'Para imprevistos o semanas bajas', verbo: 'Separar dinero', hecho: 'Separado', falta: 'Falta separar' }
  ];
  var NOMBRE = { salario: 'Mi salario', ahorro: 'Ahorro del negocio', colchon: 'Colchón del negocio' };
  var SALARIO_GASTO = /(salario|sueldo|n[oó]mina|mi pago|pago a m[ií]|me pagu[eé])/i;
  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  function leer(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function guardarDatos() { try { localStorage.setItem(K, JSON.stringify(datos)); return true; } catch (e) { alert('No se pudo guardar en este navegador.'); return false; } }
  function uid() { return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function ahora() { return new Date().toISOString(); }
  function fechaCorta(iso) { var d = new Date(iso); return d.getDate() + ' ' + MESES[d.getMonth()]; }
  function fechaTxt(s) { if (!s) return ''; var p = String(s).slice(0, 10).split('-'); return +p[2] + ' ' + MESES[+p[1] - 1] + ' ' + p[0]; }

  var datos = leer(K, []);
  if (!Array.isArray(datos)) datos = [];
  function vivos(tipo) { return datos.filter(function (x) { return x && !x.borrado && x.tipo === tipo; }); }
  function repartoDe(a) { return datos.find(function (x) { return x && x.id === 'r-' + a && !x.borrado; }) || null; }
  function movsDe(rid, cat) { return vivos('mov').filter(function (m) { return m.reparto === rid && (!cat || m.cat === cat); }); }
  function suma(l) { return r2(l.reduce(function (t, m) { return t + num(m.monto); }, 0)); }
  function hechoDe(r, cat) { return suma(movsDe(r.id, cat)); }
  function faltaDe(r, cat) { return r2(Math.max(0, num(r.asignado[cat]) - hechoDe(r, cat))); }

  function config() {
    var c = datos.find(function (x) { return x && x.id === 'config'; });
    if (!c) { c = { id: 'config', tipo: 'config' }; CATS.forEach(function (k) { c[k.k] = { modo: 'pct', valor: '' }; }); datos.push(c); }
    CATS.forEach(function (k) { if (!c[k.k]) c[k.k] = { modo: 'pct', valor: '' }; });
    return c;
  }
  function calcular(base, cfg) {
    var out = { total: 0 };
    CATS.forEach(function (c) {
      var x = cfg[c.k] || {}, v = num(x.valor);
      var m = x.modo === 'monto' ? v : base * v / 100;
      out[c.k] = r2(Math.max(0, m)); out.total += out[c.k];
    });
    out.total = r2(out.total); out.resto = r2(base - out.total);
    return out;
  }
  function salarioEnGastos(sem) { return G.gastosSemana(sem).filter(function (g) { return SALARIO_GASTO.test([g.concepto, g.categoria, g.notas].join(' ')); }); }

  /* ---------- semana seleccionada ---------- */
  var selA = null;
  function semanas() { return G.semanasDe(G.mes()); }
  function semSel() {
    var l = semanas(), h = G.hoy();
    var s = l.find(function (x) { return x.a === selA; });
    if (!s) {
      s = l.filter(function (x) { return x.a <= h && G.cuentaSem(x).gan !== null && !repartoDe(x.a); }).pop() ||
          l.find(function (x) { return x.a <= h && x.b >= h; }) || l[0];
      selA = s.a;
    }
    return s;
  }

  /* ---------- pintar todo ---------- */
  function pintar() {
    var sem = semSel();
    $('r-semana').innerHTML = semanas().map(function (s) {
      var r = repartoDe(s.a), c = G.cuentaSem(s);
      var est = r ? ' · ✓ Repartida' : s.a > G.hoy() ? ' · Todavía no empieza' : c.gan === null ? ' · Falta la ganancia' : c.u <= 0 ? ' · Sin utilidad' : ' · Utilidad ' + dinero(c.u);
      return '<option value="' + s.a + '"' + (s.a === sem.a ? ' selected' : '') + '>' + esc(s.k) + est + '</option>';
    }).join('');
    pintarTop(); pintarCuerpo(sem); pintarReservas(); pintarHistorial();
  }
  window.pintarReparto = pintar;

  function repartosDelMes(m) { return vivos('reparto').filter(function (r) { return r.mes === m; }); }

  function pintarTop() {
    var m = G.mes(), rs = repartosDelMes(m);
    var asig = 0, cob = 0; rs.forEach(function (r) { asig += num(r.asignado.salario); cob += hechoDe(r, 'salario'); });
    var html = '<div class="r-tile r-tile-main"><span>Mi salario de ' + esc(G.nombreMes(m).split(' ')[0]) + '</span><strong>' + dinero(asig) + '</strong>' +
      '<small>Cobrado <b>' + dinero(cob) + '</b> · Falta <b>' + dinero(Math.max(0, asig - cob)) + '</b></small></div>';
    ['ahorro', 'colchon'].forEach(function (k) {
      var s = saldo(k);
      html += '<div class="r-tile"><span>' + (k === 'ahorro' ? 'Ahorro acumulado' : 'Colchón acumulado') + '</span><strong>' + dinero(s.saldo) + '</strong>' +
        '<small>' + (s.pendiente > 0 ? 'Falta separar <b>' + dinero(s.pendiente) + '</b>' : 'Todo lo asignado ya está separado') + '</small></div>';
    });
    $('r-top').innerHTML = html;
  }

  function saldo(k) {
    var sep = 0, pend = 0;
    vivos('reparto').forEach(function (r) { sep += hechoDe(r, k); pend += faltaDe(r, k); });
    var sal = suma(vivos('salida').filter(function (x) { return x.cat === k; }));
    return { separado: r2(sep), salidas: sal, saldo: r2(sep - sal), pendiente: r2(pend) };
  }

  /* ---------- cuerpo: la semana elegida ---------- */
  function pintarCuerpo(sem) {
    var c = G.cuentaSem(sem), r = repartoDe(sem.a), box = $('r-cuerpo');
    var linea = '<div class="r-util"><div><span>Utilidad neta de la semana</span><small>' +
      (c.gan === null ? 'Falta la ganancia de Shopify' : 'Ganancia ' + dinero(c.gan) + ' − operación ' + dinero(c.op) + ' − RECOOVARE ' + dinero(c.rec)) +
      '</small></div><b class="' + (c.u === null ? '' : c.u > 0 ? 'pos' : 'neg') + '">' + (c.u === null ? '—' : (c.u < 0 ? '−' : '') + dinero(Math.abs(c.u))) + '</b></div>';
    var sal = salarioEnGastos(sem);
    var avisoSal = sal.length ? '<div class="aviso aviso-aviso"><b>Ojo: parece que tu salario ya está anotado como gasto esta semana</b>' +
      sal.map(function (g) { return esc(g.concepto) + ' · ' + dinero(g.monto); }).join('<br>') +
      '<span>Ese gasto ya bajó la utilidad. Si además te asignas salario aquí, te lo estarías pagando dos veces. Borra ese gasto o no asignes salario.</span></div>' : '';

    if (r) { box.innerHTML = linea + avisoSal + vistaConfirmada(r, c); return; }
    if (sem.a > G.hoy()) { box.innerHTML = linea + '<div class="aviso aviso-aviso">Esta semana todavía no empieza.</div>'; return; }
    if (c.gan === null) { box.innerHTML = linea + '<div class="aviso aviso-aviso"><b>Falta capturar la ganancia de Shopify de esta semana.</b>Anótala en la tabla «Utilidad por semana». Sin ella no se puede repartir.</div>'; return; }
    if (c.u <= 0) { box.innerHTML = linea + '<div class="aviso aviso-alerta"><b>Esta semana no hubo utilidad.</b>Los gastos fueron iguales o mayores que la ganancia, así que no hay nada que repartir.</div>'; return; }

    var cfg = config();
    box.innerHTML = linea + avisoSal +
      '<div class="campo"><label for="r-disp">Dinero realmente disponible para repartir ($)</label>' +
      '<input id="r-disp" type="number" min="0" step="0.01" inputmode="decimal" value="' + c.u + '">' +
      '<small class="ayuda">Si en tu cuenta o en caja hay menos de la utilidad, pon lo que de verdad hay. Se reparte el menor de los dos.</small></div>' +
      '<div class="r-cats">' + CATS.map(function (k) {
        var x = cfg[k.k];
        return '<div class="r-cat"><div class="r-cat-txt"><b>' + k.n + '</b><small>' + k.d + '</small></div>' +
          '<div class="r-cat-in"><div class="seg" role="radiogroup" aria-label="Cómo calcular ' + k.n + '">' +
          '<label><input type="radio" name="modo-' + k.k + '" value="pct"' + (x.modo !== 'monto' ? ' checked' : '') + '><span>%</span></label>' +
          '<label><input type="radio" name="modo-' + k.k + '" value="monto"' + (x.modo === 'monto' ? ' checked' : '') + '><span>$</span></label></div>' +
          '<input type="number" min="0" step="0.01" inputmode="decimal" class="r-val" data-cat="' + k.k + '" value="' + esc(x.valor) + '" placeholder="0" aria-label="' + k.n + (x.modo === 'monto' ? ' en pesos' : ' en porcentaje') + '">' +
          '<b class="r-monto" data-monto="' + k.k + '">$0.00</b></div></div>';
      }).join('') + '</div>' +
      '<div class="r-tot" id="r-tot" aria-live="polite"></div>' +
      '<button type="button" class="btn btn-principal btn-grande r-confirmar" id="r-confirmar">Confirmar reparto</button>' +
      '<p class="ayuda">Al confirmar, este reparto se guarda con estos montos. Si después cambias los porcentajes, no cambia.</p>';
    recalcular();
  }

  function baseActual() {
    var c = G.cuentaSem(semSel()), inp = $('r-disp');
    var disp = inp && inp.value !== '' ? Math.max(0, num(inp.value)) : null;
    return { c: c, disp: disp, base: disp === null ? 0 : r2(Math.min(c.u, disp)) };
  }
  function recalcular() {
    if (!$('r-tot')) return;
    var b = baseActual(), cfg = config(), x = calcular(b.base, cfg);
    CATS.forEach(function (k) { var el = document.querySelector('[data-monto="' + k.k + '"]'); if (el) el.textContent = dinero(x[k.k]); });
    var error = '';
    if (b.disp === null) error = 'Escribe cuánto dinero tienes disponible.';
    else if (b.base <= 0) error = 'No hay dinero disponible para repartir.';
    else if (x.total > b.base + 0.004) error = 'Te pasas por ' + dinero(x.total - b.base) + '. Baja algún porcentaje o monto.';
    else if (x.total <= 0) error = 'Pon cuánto va a cada categoría.';
    $('r-tot').innerHTML =
      '<div class="r-fila"><span>Se reparte' + (b.disp !== null && b.disp < b.c.u ? ' (lo disponible)' : '') + '</span><b>' + dinero(b.base) + '</b></div>' +
      '<div class="r-fila"><span>Total asignado</span><b>' + dinero(x.total) + '</b></div>' +
      '<div class="r-fila ' + (x.resto < -0.004 ? 'neg' : '') + '"><span>' + (x.resto < -0.004 ? 'Te pasas' : 'Queda por repartir') + '</span><b>' + dinero(Math.abs(x.resto)) + '</b></div>' +
      (error ? '<div class="aviso ' + (x.total > b.base + 0.004 ? 'aviso-alerta' : 'aviso-aviso') + '">' + esc(error) + '</div>' : '');
    $('r-confirmar').disabled = !!error;
  }

  function vistaConfirmada(r, c) {
    var html = '<div class="aviso aviso-ok"><b>Reparto confirmado el ' + fechaCorta(r.confirmado) + '</b>' +
      'Se repartieron ' + dinero(r.base) + (num(r.base) - num(r.total) > 0.004 ? ' · Sin asignar ' + dinero(r.base - r.total) : '') + '</div>';
    if (c.u !== null && Math.abs(num(c.u) - num(r.utilidad)) > 0.004 || c.u === null) {
      html += '<div class="aviso aviso-aviso"><b>La utilidad de esta semana cambió después de confirmar.</b>Era ' + dinero(r.utilidad) + ' y ahora es ' + (c.u === null ? 'desconocida (falta la ganancia)' : dinero(c.u)) + '. El reparto se queda como estaba.' +
        (movsDe(r.id).length ? '' : ' Si quieres rehacerlo, anúlalo y vuelve a repartir.') + '</div>';
    }
    html += '<div class="r-cards">' + CATS.map(function (k) {
      var a = num(r.asignado[k.k]), h = hechoDe(r, k.k), f = faltaDe(r, k.k), movs = movsDe(r.id, k.k);
      var cfg = r.config && r.config[k.k];
      var como = cfg && num(cfg.valor) ? (cfg.modo === 'monto' ? 'Monto fijo' : num(cfg.valor) + '%') : '';
      return '<div class="r-card r-' + k.k + '"><div class="r-card-cab"><b>' + k.n + '</b>' +
        (a <= 0 ? '<span class="tag tag-o">Sin asignar</span>' : f <= 0 ? '<span class="tag tag-ok">✓ Completo</span>' : '<span class="tag tag-aviso">Pendiente</span>') + '</div>' +
        '<div class="r-nums"><div><small>Asignado' + (como ? ' (' + como + ')' : '') + '</small><b>' + dinero(a) + '</b></div><div><small>' + k.hecho + '</small><b>' + dinero(h) + '</b></div><div><small>' + k.falta + '</small><b class="' + (f > 0 ? 'falta' : '') + '">' + dinero(f) + '</b></div></div>' +
        (a > 0 ? '<div class="pista" aria-hidden="true"><div class="llena" style="width:' + Math.min(100, h / a * 100) + '%"></div></div>' : '') +
        (movs.length ? '<ul class="movs">' + movs.map(function (m) {
          return '<li><span>' + fechaTxt(m.fecha) + (m.nota ? ' · ' + esc(m.nota) : '') + '</span><b>' + dinero(m.monto) + '</b><button type="button" class="btn-x" data-borrar="' + esc(m.id) + '" aria-label="Borrar este movimiento">✕</button></li>';
        }).join('') + '</ul>' : '') +
        (f > 0 ? '<button type="button" class="btn btn-claro btn-mini" data-mov="' + k.k + '" data-reparto="' + esc(r.id) + '">+ ' + k.verbo + '</button>' : '') +
        '</div>';
    }).join('') + '</div>';
    html += movsDe(r.id).length ? '<p class="ayuda">Para anular este reparto, primero borra sus pagos y separaciones.</p>'
      : '<button type="button" class="btn btn-rojo btn-mini" id="r-anular" data-reparto="' + esc(r.id) + '">Anular reparto</button>';
    return html;
  }

  /* ---------- reservas ---------- */
  function pintarReservas() {
    $('res-cuerpo').innerHTML = ['ahorro', 'colchon'].map(function (k) {
      var s = saldo(k);
      var entradas = [];
      vivos('reparto').forEach(function (r) { movsDe(r.id, k).forEach(function (m) { entradas.push({ m: m, sem: r.etiqueta, signo: 1 }); }); });
      vivos('salida').filter(function (x) { return x.cat === k; }).forEach(function (m) { entradas.push({ m: m, signo: -1 }); });
      entradas.sort(function (a, b) { return a.m.fecha === b.m.fecha ? (a.m.creado < b.m.creado ? 1 : -1) : (a.m.fecha < b.m.fecha ? 1 : -1); });
      return '<div class="res"><div class="res-cab"><b>' + NOMBRE[k] + '</b>' + (s.saldo > 0 ? '<button type="button" class="btn btn-claro btn-mini" data-salida="' + k + '">Registrar salida</button>' : '') + '</div>' +
        '<strong class="res-saldo">' + dinero(s.saldo) + '</strong>' +
        '<small>Separado ' + dinero(s.separado) + ' · Salidas ' + dinero(s.salidas) + (s.pendiente > 0 ? ' · Falta separar ' + dinero(s.pendiente) : '') + '</small>' +
        (entradas.length ? '<details><summary>Movimientos (' + entradas.length + ')</summary><ul class="movs">' + entradas.map(function (e) {
          return '<li><span>' + fechaTxt(e.m.fecha) + ' · ' + (e.signo > 0 ? 'Separado de ' + esc(e.sem || 'reparto') : 'Salida') + (e.m.nota ? ' · ' + esc(e.m.nota) : '') + '</span>' +
            '<b class="' + (e.signo > 0 ? 'pos' : 'neg') + '">' + (e.signo > 0 ? '+' : '−') + dinero(e.m.monto) + '</b>' +
            (e.signo < 0 ? '<button type="button" class="btn-x" data-borrar="' + esc(e.m.id) + '" aria-label="Borrar esta salida">✕</button>' : '') + '</li>';
        }).join('') + '</ul></details>' : '') + '</div>';
    }).join('');
  }

  /* ---------- historial y resumen del mes ---------- */
  function pintarHistorial() {
    var m = G.mes(), rs = repartosDelMes(m);
    if (!rs.length) $('h-mes').innerHTML = '<p class="vacio">Todavía no hay repartos confirmados en ' + esc(G.nombreMes(m)) + '.</p>';
    else {
      var t = { util: 0, base: 0, total: 0 }, por = {};
      CATS.forEach(function (k) { por[k.k] = { a: 0, h: 0 }; });
      rs.forEach(function (r) { t.util += num(r.utilidad); t.base += num(r.base); t.total += num(r.total); CATS.forEach(function (k) { por[k.k].a += num(r.asignado[k.k]); por[k.k].h += hechoDe(r, k.k); }); });
      $('h-mes').innerHTML = '<div class="h-resumen"><h3>Resumen de ' + esc(G.nombreMes(m)) + ' · ' + rs.length + (rs.length === 1 ? ' semana' : ' semanas') + '</h3>' +
        '<div class="r-fila"><span>Utilidad de esas semanas</span><b>' + dinero(t.util) + '</b></div>' +
        '<div class="r-fila"><span>Repartido</span><b>' + dinero(t.total) + '</b></div>' +
        CATS.map(function (k) { return '<div class="r-fila sub"><span>' + k.n + ': ' + k.hecho.toLowerCase() + ' ' + dinero(por[k.k].h) + ' de</span><b>' + dinero(por[k.k].a) + '</b></div>'; }).join('') +
        (t.base - t.total > 0.004 ? '<div class="r-fila sub"><span>Sin asignar</span><b>' + dinero(t.base - t.total) + '</b></div>' : '') + '</div>';
    }
    var todos = vivos('reparto').sort(function (a, b) { return a.semana < b.semana ? 1 : -1; });
    $('h-lista').innerHTML = todos.length ? todos.map(function (r) {
      var falta = CATS.reduce(function (x, k) { return x + faltaDe(r, k.k); }, 0);
      return '<button type="button" class="h-item" data-ir="' + esc(r.semana) + '"><span class="h-txt"><b>' + esc(r.etiqueta) + ' ' + String(r.semana).slice(0, 4) + '</b>' +
        '<small>Salario ' + dinero(r.asignado.salario) + ' · Ahorro ' + dinero(r.asignado.ahorro) + ' · Colchón ' + dinero(r.asignado.colchon) + '</small></span>' +
        '<span class="h-der"><b>' + dinero(r.total) + '</b>' + (falta > 0.004 ? '<span class="tag tag-aviso">Pendiente ' + dinero(falta) + '</span>' : '<span class="tag tag-ok">✓ Completo</span>') + '</span></button>';
    }).join('') : '';
  }

  /* ---------- acciones ---------- */
  $('r-semana').addEventListener('change', function () { selA = this.value; pintar(); });
  var tCfg = null;
  $('r-cuerpo').addEventListener('input', function (ev) {
    var t = ev.target;
    if (t.classList.contains('r-val')) { config()[t.getAttribute('data-cat')].valor = t.value; guardarCfg(); }
    recalcular();
  });
  $('r-cuerpo').addEventListener('change', function (ev) {
    var t = ev.target;
    if (t.name && t.name.indexOf('modo-') === 0) {
      var k = t.name.slice(5); config()[k].modo = t.value;
      var inp = document.querySelector('.r-val[data-cat="' + k + '"]'); if (inp) inp.setAttribute('aria-label', NOMBRE[k] + (t.value === 'monto' ? ' en pesos' : ' en porcentaje'));
      guardarCfg(); recalcular();
    }
  });
  function guardarCfg() { var c = config(); c.editado = ahora(); clearTimeout(tCfg); tCfg = setTimeout(guardarDatos, 500); }

  $('r-cuerpo').addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    if (b.id === 'r-confirmar') return confirmar();
    if (b.id === 'r-anular') return anular(b.getAttribute('data-reparto'));
    if (b.hasAttribute('data-mov')) return abrirMov({ tipo: 'mov', cat: b.getAttribute('data-mov'), reparto: b.getAttribute('data-reparto') });
    if (b.hasAttribute('data-borrar')) return borrarMov(b.getAttribute('data-borrar'));
  });
  $('res-cuerpo').addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-salida')) return abrirMov({ tipo: 'salida', cat: b.getAttribute('data-salida') });
    if (b.hasAttribute('data-borrar')) return borrarMov(b.getAttribute('data-borrar'));
  });
  $('h-lista').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-ir]'); if (!b) return;
    selA = b.getAttribute('data-ir');
    var m = G.mesDe(selA);
    if (m !== G.mes()) G.irAMes(m); else pintar();
    $('reparto').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  function confirmar() {
    var sem = semSel();
    // Releer por si otro dispositivo ya lo confirmó
    datos = leer(K, datos); if (!Array.isArray(datos)) datos = [];
    if (repartoDe(sem.a)) { G.aviso('Esta semana ya tiene un reparto confirmado.'); pintar(); return; }
    var b = baseActual(), cfg = config(), x = calcular(b.base, cfg);
    if (b.c.gan === null || !(b.c.u > 0) || !(b.base > 0) || x.total <= 0 || x.total > b.base + 0.004) { recalcular(); return; }
    var sal = salarioEnGastos(sem);
    if (sal.length && x.salario > 0 && !confirm('Parece que tu salario ya está anotado como gasto esta semana. ¿Confirmar de todos modos?')) return;
    if (!confirm('¿Confirmar el reparto de ' + sem.k + '?\n\nMi salario: ' + dinero(x.salario) + '\nAhorro: ' + dinero(x.ahorro) + '\nColchón: ' + dinero(x.colchon) + '\n\nTotal: ' + dinero(x.total))) return;
    var r = { id: 'r-' + sem.a, tipo: 'reparto', semana: sem.a, fin: sem.b, mes: G.mesDe(sem.a), etiqueta: sem.k,
      ganancia: b.c.gan, op: b.c.op, rec: b.c.rec, utilidad: b.c.u, disponible: b.disp, base: b.base,
      asignado: { salario: x.salario, ahorro: x.ahorro, colchon: x.colchon }, total: x.total,
      config: JSON.parse(JSON.stringify({ salario: cfg.salario, ahorro: cfg.ahorro, colchon: cfg.colchon })),
      confirmado: ahora(), editado: ahora() };
    var i = datos.findIndex(function (y) { return y && y.id === r.id; });
    if (i >= 0) datos[i] = r; else datos.push(r);
    if (guardarDatos()) { G.aviso('Reparto confirmado'); pintar(); }
  }
  function anular(id) {
    var r = datos.find(function (y) { return y && y.id === id; }); if (!r) return;
    if (movsDe(id).length) { alert('Primero borra los pagos y separaciones de este reparto.'); return; }
    if (!confirm('¿Anular el reparto de ' + r.etiqueta + '? Podrás volver a repartir esa semana.')) return;
    r.borrado = true; r.editado = ahora();
    if (guardarDatos()) { G.aviso('Reparto anulado'); pintar(); }
  }
  function borrarMov(id) {
    var m = datos.find(function (y) { return y && y.id === id; }); if (!m) return;
    if (m.tipo === 'mov' && m.cat !== 'salario') {
      // No dejar que una reserva quede en negativo por borrar lo que se separó
      var s = saldo(m.cat);
      if (s.saldo - num(m.monto) < -0.004) { alert('No se puede borrar: ya sacaste ese dinero del ' + (m.cat === 'ahorro' ? 'ahorro' : 'colchón') + '. Borra primero la salida.'); return; }
    }
    if (!confirm('¿Borrar este movimiento de ' + dinero(m.monto) + '?')) return;
    m.borrado = true; m.editado = ahora();
    if (guardarDatos()) { G.aviso('Movimiento borrado'); pintar(); }
  }

  /* ---------- ventana de pago / separación / salida ---------- */
  var mov = null;
  function abrirMov(o) {
    mov = o;
    var max;
    if (o.tipo === 'mov') {
      var r = datos.find(function (y) { return y && y.id === o.reparto; }); if (!r) return;
      max = faltaDe(r, o.cat);
      $('mv-titulo').textContent = o.cat === 'salario' ? 'Registrar pago de mi salario' : 'Separar para ' + (o.cat === 'ahorro' ? 'el ahorro' : 'el colchón');
      $('mv-info').textContent = r.etiqueta + ' · ' + (o.cat === 'salario' ? 'Falta pagarte ' : 'Falta separar ') + dinero(max) + '. Puedes registrar una parte.';
    } else {
      max = saldo(o.cat).saldo;
      $('mv-titulo').textContent = 'Salida del ' + (o.cat === 'ahorro' ? 'ahorro' : 'colchón');
      $('mv-info').textContent = 'Saldo actual: ' + dinero(max) + '. Anota en qué se usó.';
    }
    mov.max = max;
    $('mv-monto').value = o.tipo === 'mov' ? max : '';
    $('mv-fecha').value = G.hoy(); $('mv-nota').value = '';
    $('modal-mov').hidden = false; document.body.style.overflow = 'hidden';
    setTimeout(function () { $('mv-monto').focus(); $('mv-monto').select && $('mv-monto').select(); }, 30);
  }
  function cerrarMov() { $('modal-mov').hidden = true; document.body.style.overflow = ''; mov = null; }
  $('mv-cerrar').addEventListener('click', cerrarMov);
  $('modal-mov').addEventListener('click', function (ev) { if (ev.target === $('modal-mov')) cerrarMov(); });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !$('modal-mov').hidden) cerrarMov(); });
  $('form-mov').addEventListener('submit', function (ev) {
    ev.preventDefault(); if (!mov) return;
    var monto = r2(num($('mv-monto').value)), fecha = $('mv-fecha').value;
    if (!(monto > 0)) { alert('Escribe el monto.'); return; }
    if (monto > mov.max + 0.004) { alert('No puede ser más de ' + dinero(mov.max) + '.'); return; }
    if (!fecha) { alert('Pon la fecha.'); return; }
    if (mov.tipo === 'salida' && !$('mv-nota').value.trim()) { alert('Anota en qué se usó el dinero.'); return; }
    var x = { id: uid(), tipo: mov.tipo, cat: mov.cat, monto: monto, fecha: fecha, nota: $('mv-nota').value.trim(), creado: ahora() };
    if (mov.tipo === 'mov') x.reparto = mov.reparto;
    datos.push(x);
    var txt = mov.tipo === 'salida' ? 'Salida registrada' : mov.cat === 'salario' ? 'Pago registrado' : 'Dinero separado';
    if (guardarDatos()) { cerrarMov(); pintar(); G.aviso(txt + ': ' + dinero(monto)); }
  });

  pintar();
})();
