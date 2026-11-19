/* =====================================================================
   Interesados de ESSENTIA (privado, se guarda en línea).
   Clientes que esperan un perfume (botella completa): nombre, teléfono,
   perfume, precio que se le dio, fecha aproximada de llegada, origen y notas.
   Agrupado por perfume, con aviso por WhatsApp y "Lo más pedido".
   Solo es una lista: no crea eventos en la Agenda ni movimientos de dinero.
   ===================================================================== */
(function () {
  var K = 'essentia_interesados';
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var EST = { esperando: 'Esperando', avisado: 'Avisado', vendido: 'Vendido', no: 'Ya no le interesa' };
  var $ = function (id) { return document.getElementById(id); };
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function leer() { try { var v = JSON.parse(localStorage.getItem(K) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function guardar() { try { localStorage.setItem(K, JSON.stringify(lista)); return true; } catch (e) { alert('No se pudo guardar. Intenta de nuevo.'); return false; } }
  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
  function dinero(n) { n = Math.round(num(n) * 100) / 100; return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); }
  function uid() { return 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function fechaDe(s) { var p = String(s).slice(0, 10).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function hoy() { return iso(new Date()); }
  function dias(a, b) { return Math.round((fechaDe(b) - fechaDe(a)) / 86400000); }
  function corta(s) { var d = fechaDe(s); return d.getDate() + ' ' + MESES[d.getMonth()].slice(0, 3); }
  function larga(s) { var d = fechaDe(s); return d.getDate() + ' de ' + MESES[d.getMonth()]; }
  function norm(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim(); }
  function digitos(t) { return String(t || '').replace(/\D/g, ''); }
  function telBonito(t) { var d = digitos(t); if (d.length === 12 && d.indexOf('52') === 0) d = d.slice(2); return d.length === 10 ? d.slice(0, 3) + ' ' + d.slice(3, 6) + ' ' + d.slice(6) : t; }
  function telWa(t) { var d = digitos(t); if (d.length === 10) d = '52' + d; return d; }
  function aviso(t) { var el = $('toast'); el.textContent = t; el.hidden = false; clearTimeout(aviso.t); aviso.t = setTimeout(function () { el.hidden = true; }, 2400); }
  function primerNombre(n) { return String(n || '').trim().split(/\s+/)[0] || ''; }

  var lista = leer();
  var filtro = 'activos', actual = null;
  function vivos() { return lista.filter(function (x) { return x && !x.borrado; }); }
  function activo(x) { return x.estado === 'esperando' || x.estado === 'avisado'; }

  function mensaje(x) {
    var n = primerNombre(x.nombre), saludo = 'Hola' + (n ? ' ' + n : '') + ', ';
    if (x.llego) {
      var ant = num(x.anticipo), falta = num(x.precio) - ant;
      if (ant) return saludo + 'ya me llegó el ' + x.perfume + ' que apartaste. ' + (num(x.precio) ? (falta > 0 ? 'Con tu anticipo de ' + dinero(ant) + ' te faltan ' + dinero(falta) + '. ' : 'Ya está pagado completo. ') : '') + '¿Cuándo pasas por él o te lo envío?';
      return saludo + 'ya me llegó el ' + x.perfume + ' que me pediste' + (num(x.precio) ? ' (' + dinero(x.precio) + ')' : '') + '. ¿Te lo aparto?';
    }
    return saludo + 'te escribo por el ' + x.perfume + '. ' + (x.llega && x.llega >= hoy() ? 'Me llega aproximadamente el ' + larga(x.llega) + ' y' : 'Aún no me llega, pero') + ' en cuanto lo tenga te aviso.';
  }

  function pintar() {
    var v = vivos(), act = v.filter(activo);
    var esperando = act.filter(function (x) { return x.estado === 'esperando'; });
    var porAvisar = esperando.filter(function (x) { return x.llego; });
    var mes = hoy().slice(0, 7), vendMes = v.filter(function (x) { return x.estado === 'vendido' && String(x.vendido || x.editado || '').slice(0, 7) === mes; });
    var perfumesAct = {}; act.forEach(function (x) { perfumesAct[norm(x.perfume)] = 1; });
    var antTot = act.reduce(function (s, x) { return s + num(x.anticipo); }, 0);
    var k = function (t, val, sub, cls) { return '<div class="in-kpi' + (cls ? ' ' + cls : '') + '"><span>' + t + '</span><strong>' + val + '</strong><small>' + sub + '</small></div>'; };
    $('kpis').innerHTML =
      k('Esperando', act.length, Object.keys(perfumesAct).length + ' ' + (Object.keys(perfumesAct).length === 1 ? 'perfume' : 'perfumes') + (antTot ? ' · ' + dinero(antTot) + ' en anticipos' : '')) +
      k('Ya llegó, falta avisar', porAvisar.length, porAvisar.length ? 'Avísales por WhatsApp' : 'Nadie pendiente', porAvisar.length ? 'ambar' : '') +
      k('Avisados', act.filter(function (x) { return x.estado === 'avisado'; }).length, 'Esperando su respuesta') +
      k('Vendidos este mes', vendMes.length, vendMes.length ? dinero(vendMes.reduce(function (s, x) { return s + num(x.precio); }, 0)) : 'De esta lista', vendMes.length ? 'verde' : '');

    // Lo más pedido
    var cuenta = {};
    act.forEach(function (x) { var kk = norm(x.perfume); (cuenta[kk] = cuenta[kk] || { n: 0, nom: x.perfume }).n++; });
    var top = Object.keys(cuenta).map(function (kk) { return cuenta[kk]; }).sort(function (a, b) { return b.n - a.n || a.nom.localeCompare(b.nom); }).slice(0, 8);
    $('top').innerHTML = top.length ? top.map(function (t) { return '<li><span>' + esc(t.nom) + '</span><b>' + t.n + (t.n === 1 ? ' cliente' : ' clientes') + '</b></li>'; }).join('') : '<li class="nada">Aún no hay clientes esperando.</li>';

    // datalist de perfumes
    var noms = {}; v.forEach(function (x) { if (x.perfume) noms[norm(x.perfume)] = x.perfume; });
    $('perfumes').innerHTML = Object.keys(noms).sort().map(function (kk) { return '<option value="' + esc(noms[kk]) + '">'; }).join('');

    // lista filtrada y agrupada por perfume
    var q = norm($('buscar').value), qd = digitos($('buscar').value);
    var l = v.filter(function (x) {
      if (filtro === 'activos' && !activo(x)) return false;
      if (filtro === 'vendido' && x.estado !== 'vendido') return false;
      if (filtro === 'no' && x.estado !== 'no') return false;
      if (!q) return true;
      return norm([x.nombre, x.perfume, x.notas, x.origen].join(' ')).indexOf(q) >= 0 || (qd.length >= 3 && digitos(x.tel).indexOf(qd) >= 0);
    });
    var grupos = {};
    l.forEach(function (x) { var kk = norm(x.perfume); (grupos[kk] = grupos[kk] || { nom: x.perfume, l: [] }).l.push(x); });
    var orden = Object.keys(grupos).map(function (kk) { return grupos[kk]; });
    orden.forEach(function (g) {
      g.l.sort(function (a, b) { return String(a.creado).localeCompare(String(b.creado)); });
      g.llego = g.l.some(function (x) { return x.llego && activo(x); });
      g.llega = g.l.filter(function (x) { return x.llega && activo(x); }).map(function (x) { return x.llega; }).sort()[0] || '';
    });
    orden.sort(function (a, b) { return (b.llego - a.llego) || (b.l.length - a.l.length) || a.nom.localeCompare(b.nom); });

    if (!orden.length) {
      $('grupos').innerHTML = '<div class="in-vacio">' + (v.length ? 'No hay clientes con ese filtro.' : '<b>Anota a tu primer cliente interesado</b><p>Por ejemplo: Memo quiere el 9PM Night Out. Cuando te llegue, aquí le avisas por WhatsApp con un toque.</p><button type="button" class="btn btn-principal" data-nuevo>+ Interesado</button>') + '</div>';
      return;
    }
    $('grupos').innerHTML = orden.map(function (g) {
      var esperan = g.l.filter(function (x) { return x.estado === 'esperando'; }).length;
      var sub = g.llego ? '✓ Ya llegó' : g.llega ? (g.llega < hoy() ? 'Debía llegar el ' + corta(g.llega) : 'Llega aprox. el ' + corta(g.llega) + (dias(hoy(), g.llega) <= 7 ? ' · en ' + dias(hoy(), g.llega) + (dias(hoy(), g.llega) === 1 ? ' día' : ' días') : '')) : 'Sin fecha de llegada';
      return '<section class="in-grupo' + (g.llego ? ' llego' : '') + '"><div class="in-gcab"><div><h3>' + esc(g.nom) + '</h3><small>' + g.l.length + (g.l.length === 1 ? ' cliente' : ' clientes') + ' · ' + sub + '</small></div>' +
        '<div class="in-gacc">' + (esperan && !g.llego ? '<button type="button" class="btn btn-claro btn-mini" data-llego="' + esc(norm(g.nom)) + '">Ya llegó</button>' : '') +
        '<button type="button" class="btn btn-claro btn-mini" data-agregar="' + esc(g.nom) + '">+ Cliente</button></div></div>' +
        '<ul class="in-lista">' + g.l.map(function (x) {
          var ant = num(x.anticipo), falta = num(x.precio) - ant;
          var det = [x.tel ? telBonito(x.tel) : 'Sin teléfono', num(x.precio) ? dinero(x.precio) : '', ant ? 'Anticipo ' + dinero(ant) + (num(x.precio) && x.estado !== 'vendido' ? (falta > 0 ? ' · resta ' + dinero(falta) : ' · pagado completo') : '') : '', x.origen, 'Desde ' + corta(String(x.creado || hoy()).slice(0, 10))].filter(Boolean).join(' · ');
          return '<li><button type="button" class="in-cli" data-editar="' + esc(x.id) + '"><b>' + esc(x.nombre || 'Sin nombre') + '<span class="in-est ' + x.estado + '">' + EST[x.estado] + '</span></b><small>' + esc(det) + '</small>' + (x.notas ? '<small class="nota">' + esc(x.notas) + '</small>' : '') + (ant && x.estado === 'no' ? '<small class="in-ojo">Dejó ' + dinero(ant) + ' de anticipo: devuélveselo o acuérdalo con él.</small>' : '') + '</button>' +
            '<span class="in-acc">' + (x.tel && activo(x) ? '<button type="button" class="btn btn-mini in-wa" data-wa="' + esc(x.id) + '">' + (x.llego ? 'Avisar' : 'WhatsApp') + '</button>' : '') +
            (activo(x) ? '<button type="button" class="btn btn-claro btn-mini" data-vendido="' + esc(x.id) + '">Vendido</button>' : '') + '</span></li>';
        }).join('') + '</ul></section>';
    }).join('');
  }

  /* ---------- formulario ---------- */
  function radio(n) { var r = document.querySelector('input[name="' + n + '"]:checked'); return r ? r.value : ''; }
  function setRadio(n, v) { document.querySelectorAll('input[name="' + n + '"]').forEach(function (r) { r.checked = r.value === v; }); }
  function abrir(x, perfume) {
    actual = x || null;
    $('m-tit').textContent = x ? 'Editar interesado' : 'Nuevo interesado';
    $('m-nombre').value = x ? x.nombre || '' : '';
    $('m-tel').value = x ? x.tel || '' : '';
    $('m-perfume').value = x ? x.perfume || '' : perfume || '';
    $('m-precio').value = x && num(x.precio) ? x.precio : ''; $('m-anticipo').value = x && num(x.anticipo) ? x.anticipo : ''; resta();
    var otro = !x && perfume ? vivos().find(function (y) { return norm(y.perfume) === norm(perfume) && activo(y) && y.llega; }) : null;
    $('m-llega').value = x ? x.llega || '' : otro ? otro.llega : '';
    setRadio('m-origen', x ? x.origen || 'WhatsApp' : 'WhatsApp');
    setRadio('m-estado', x ? x.estado : 'esperando');
    $('m-estado-c').hidden = !x;
    $('m-notas').value = x ? x.notas || '' : '';
    $('m-fechas').textContent = x ? 'Anotado el ' + larga(String(x.creado).slice(0, 10)) + (x.llego ? ' · el perfume ya llegó' : '') : '';
    $('m-borrar').hidden = !x; $('m-error').hidden = true;
    $('modal').hidden = false;
    setTimeout(function () { (perfume && !x ? $('m-nombre') : x ? $('m-nombre') : $('m-nombre')).focus(); }, 30);
  }
  function resta() {
    var p = num($('m-precio').value), a = num($('m-anticipo').value);
    $('m-resta').textContent = a > 0 && p > 0 ? (a >= p ? 'Ya pagó completo.' : 'Le falta pagar ' + dinero(p - a) + '.') : '';
  }
  $('m-precio').addEventListener('input', resta); $('m-anticipo').addEventListener('input', resta);
  function cerrar() { $('modal').hidden = true; actual = null; }
  $('form').addEventListener('submit', function (e) {
    e.preventDefault();
    var nombre = $('m-nombre').value.trim(), perfume = $('m-perfume').value.trim().replace(/\s+/g, ' ');
    var err = !nombre ? 'Escribe el nombre del cliente.' : !perfume ? 'Escribe qué perfume le interesa.' : num($('m-anticipo').value) > 0 && num($('m-precio').value) > 0 && num($('m-anticipo').value) > num($('m-precio').value) ? 'El anticipo no puede ser mayor que el precio.' : '';
    if (err) { $('m-error').textContent = err; $('m-error').hidden = false; return; }
    // si ya existe ese perfume con otra escritura, usar la misma para agrupar bonito
    var igual = vivos().find(function (y) { return norm(y.perfume) === norm(perfume); });
    if (igual) perfume = igual.perfume;
    var ahora = new Date().toISOString(), estado = actual ? radio('m-estado') : 'esperando';
    var datos = { nombre: nombre, tel: $('m-tel').value.trim(), perfume: perfume, precio: num($('m-precio').value) || null, anticipo: num($('m-anticipo').value) || null, llega: $('m-llega').value || '', origen: radio('m-origen'), notas: $('m-notas').value.trim(), estado: estado, editado: ahora };
    if (actual) {
      var o = lista.find(function (y) { return y.id === actual.id; });
      if (estado === 'vendido' && o.estado !== 'vendido') datos.vendido = ahora;
      if (norm(o.perfume) !== norm(perfume)) datos.llego = false;
      Object.assign(o, datos);
    } else {
      var yaLlego = vivos().some(function (y) { return norm(y.perfume) === norm(perfume) && y.llego && activo(y); });
      lista.push(Object.assign({ id: uid(), creado: ahora, llego: yaLlego }, datos));
    }
    if (guardar()) { var nuevo = !actual; cerrar(); pintar(); aviso(nuevo ? 'Cliente anotado' : 'Cambios guardados'); }
  });
  $('m-borrar').addEventListener('click', function () {
    if (!actual || !confirm('¿Borrar a ' + (actual.nombre || 'este cliente') + ' de la lista?')) return;
    var o = lista.find(function (y) { return y.id === actual.id; });
    o.borrado = true; o.editado = new Date().toISOString();
    if (guardar()) { cerrar(); pintar(); aviso('Borrado'); }
  });

  /* ---------- acciones ---------- */
  function por(id) { return lista.find(function (y) { return y.id === id; }); }
  $('nuevo').addEventListener('click', function () { abrir(null); });
  document.querySelectorAll('.in-filtros button').forEach(function (b) {
    b.addEventListener('click', function () {
      filtro = b.getAttribute('data-f');
      document.querySelectorAll('.in-filtros button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      pintar();
    });
  });
  $('buscar').addEventListener('input', pintar);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('modal').hidden) cerrar(); });
  document.addEventListener('click', function (e) {
    var b, x;
    if (e.target.closest('[data-cerrar]') || e.target.id === 'modal') { cerrar(); return; }
    if (e.target.closest('[data-nuevo]')) { abrir(null); return; }
    if ((b = e.target.closest('[data-agregar]'))) { abrir(null, b.getAttribute('data-agregar')); return; }
    if ((b = e.target.closest('[data-editar]'))) { abrir(por(b.getAttribute('data-editar'))); return; }
    if ((b = e.target.closest('[data-llego]'))) {
      var kk = b.getAttribute('data-llego'), ahora = new Date().toISOString(), n = 0;
      lista.forEach(function (y) { if (y && !y.borrado && norm(y.perfume) === kk && activo(y)) { y.llego = true; y.editado = ahora; n++; } });
      if (guardar()) { pintar(); aviso('Listo: avísale a ' + (n === 1 ? 'tu cliente' : 'tus ' + n + ' clientes')); }
      return;
    }
    if ((b = e.target.closest('[data-wa]'))) {
      x = por(b.getAttribute('data-wa'));
      window.open('https://wa.me/' + telWa(x.tel) + '?text=' + encodeURIComponent(mensaje(x)), '_blank', 'noopener');
      if (x.llego && x.estado === 'esperando') { x.estado = 'avisado'; x.avisado = new Date().toISOString(); x.editado = x.avisado; if (guardar()) { pintar(); aviso('Marcado como avisado'); } }
      return;
    }
    if ((b = e.target.closest('[data-vendido]'))) {
      x = por(b.getAttribute('data-vendido'));
      x.estado = 'vendido'; x.vendido = new Date().toISOString(); x.editado = x.vendido;
      if (guardar()) { pintar(); aviso('¡Vendido! ' + (x.nombre || '')); }
      return;
    }
  });

  var abrirId = new URLSearchParams(location.search).get('abrir');
  pintar();
  if (abrirId) { history.replaceState(null, '', location.pathname); var a = por(abrirId); if (a && !a.borrado) abrir(a); }
})();
