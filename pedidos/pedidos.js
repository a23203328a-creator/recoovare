/* =====================================================================
   Control de pedidos – Recoovare (privado, se guarda en este navegador)
   ===================================================================== */
(function () {
  var S = window.RecoovareSync;
  var num = S.num, leer = S.leer, guardar = S.guardar;
  var KC = 'recoovare_config_pedidos', KNOTAS = 'recoovare_notas';
  var ESTADOS = S.ORDEN;
  var METODOS = { recoge: 'Recoge en el local', envio: 'Envío a domicilio', instalacion: 'Instalación' };
  var D = window.CATALOGO || { tipos: {} };
  var $ = function (id) { return document.getElementById(id); };
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function dinero(n) { n = Math.round(num(n) * 100) / 100; return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); }
  function hoy() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function fechaCorta(iso) {
    if (!iso) return '–';
    if (String(iso).length > 10) { var d = new Date(iso); if (!isNaN(d)) return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear(); }
    var p = String(iso).slice(0, 10).split('-'); return p[2] + '/' + p[1] + '/' + p[0];
  }
  function diasHasta(iso) { if (!iso) return null; var a = new Date(hoy() + 'T00:00:00'), b = new Date(String(iso).slice(0, 10) + 'T00:00:00'); return Math.round((b - a) / 86400000); }
  function telWA(t) { var d = String(t || '').replace(/\D/g, ''); if (d.length === 10) d = '52' + d; return d; }
  function uid() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  S.inicializar();
  S.sincronizarNotas();
  var cfg = Object.assign({ modo: 'porcentaje', pct: 50, fijo: 0 }, leer(KC, {}));
  var pedidos = leer(S.K, []);
  if (S.migrar(pedidos)) guardar(S.K, pedidos);
  var filtro = { estado: 'activos', texto: '', kpi: '', orden: 'entrega', periodo: 'este', mama: 'todos' };
  var vista = 'pedidos';

  /* ---------- notas vinculadas ---------- */
  function notas() { return leer(KNOTAS, []); }
  function notaDe(p) { return p && p.notaId ? notas().find(function (n) { return n.id === p.notaId; }) || null : null; }

  /* ---------- cálculos ---------- */
  function reglaDe(p) { return p.regla || cfg; }
  function calc(p) {
    var total = num(p.precioProducto) + num(p.extras);
    var pagado = (p.pagos || []).reduce(function (s, x) { return s + num(x.monto); }, 0);
    var saldo = Math.max(0, total - pagado);
    var pago = total > 0 && pagado >= total ? 'Liquidado' : pagado > 0 ? 'Pago parcial' : 'Sin pago';
    var inter = num(p.intermediario && p.intermediario.monto);
    var base = Math.max(0, num(p.precioProducto) - inter);
    var r = reglaDe(p);
    var parteCalc = r.modo === 'fijo' ? num(r.fijo) : base * num(r.pct) / 100;
    var ajustada = p.ajuste !== null && p.ajuste !== '' && p.ajuste !== undefined;
    var parte = ajustada ? num(p.ajuste) : parteCalc;
    var m = p.mama || {};
    var tieneMonto = m.monto !== null && m.monto !== '' && m.monto !== undefined;
    var recibido = m.pagado ? (tieneMonto ? num(m.monto) : parte) : (tieneMonto ? num(m.monto) : 0);
    var meDebe = Math.max(0, Math.round((parte - recibido) * 100) / 100);
    var estadoMi = parte > 0 && meDebe <= 0 ? 'Pagado' : recibido > 0 ? 'Pago parcial' : pago !== 'Liquidado' ? 'Esperando pago del cliente' : 'Por cobrar a mi mamá';
    var costos = (p.costos || []).reduce(function (s, x) { return s + num(x.monto); }, 0);
    return { total: total, pagado: pagado, saldo: saldo, pago: pago, inter: inter, base: base, parteCalc: parteCalc, parte: parte, recibido: recibido, meDebe: meDebe, estadoMi: estadoMi, costos: costos, utilidad: total - inter - costos };
  }
  function activo(p) { return p.estado !== 'Entregado' && p.estado !== 'Cancelado'; }
  function atrasado(p) { var d = diasHasta(p.entrega); return activo(p) && d !== null && d < 0; }
  function entregaHoy(p) { return activo(p) && diasHasta(p.entrega) === 0; }
  function tagPago(t) { return '<span class="tag ' + (t === 'Liquidado' ? 'b-liquidado' : t === 'Pago parcial' ? 'b-parcial' : 'b-sinpago') + '">' + esc(t) + '</span>'; }
  function tagEntrega(p) {
    if (p.estado === 'Entregado') return '<span class="tag t-ok">Entregado</span>';
    if (p.estado === 'Cancelado') return '<span class="tag t-normal">Cancelado</span>';
    var d = diasHasta(p.entrega);
    if (d === null) return '<span class="tag t-normal">Sin fecha</span>';
    if (d < 0) return '<span class="tag t-atrasado">Atrasado ' + (-d) + (d === -1 ? ' día' : ' días') + '</span>';
    if (d === 0) return '<span class="tag t-hoy">Hoy</span>';
    if (d === 1) return '<span class="tag t-pronto">Mañana</span>';
    if (d <= 3) return '<span class="tag t-pronto">En ' + d + ' días</span>';
    return '';
  }
  function celdaEntrega(p) {
    return '<div class="entrega-celda">' + tagEntrega(p) + '<small>' + (p.entrega ? fechaCorta(p.entrega) : '') + (p.metodoEntrega ? ' · ' + esc(METODOS[p.metodoEntrega] || '') : '') + '</small></div>';
  }
  function guardarTodo() { if (!guardar(S.K, pedidos)) alert('No se pudo guardar en este navegador.'); }
  function porId(id) { return pedidos.find(function (x) { return x.id === id; }); }

  /* ---------- vista: pedidos ---------- */
  var KPI = {
    activos: { t: 'Pedidos activos', f: activo },
    hoy: { t: 'Entregas de hoy', f: entregaHoy },
    atrasados: { t: 'Atrasados', f: atrasado },
    listos: { t: 'Listos para entregar', f: function (p) { return p.estado === 'Listo para entregar'; } },
    saldo: { t: 'Saldo por cobrar', f: function (p) { return p.estado !== 'Cancelado' && calc(p).saldo > 0; } }
  };
  function visibles() {
    var q = filtro.texto.trim().toLowerCase();
    return pedidos.filter(function (p) {
      if (filtro.kpi) { if (!KPI[filtro.kpi].f(p)) return false; }
      else {
        if (filtro.estado === 'activos' && !activo(p)) return false;
        if (filtro.estado !== 'activos' && filtro.estado !== 'todos' && p.estado !== filtro.estado) return false;
      }
      if (q) {
        var txt = [p.folio, p.cliente, p.producto, p.tel, p.notaFolio, p.notas, p.intermediario && p.intermediario.nombre].join(' ').toLowerCase();
        if (txt.indexOf(q) < 0) return false;
      }
      return true;
    }).sort(function (a, b) {
      if (filtro.orden === 'entrega') {
        var fa = activo(a) ? (a.entrega || '9999') : 'zzzz' + (a.entrega || ''), fb = activo(b) ? (b.entrega || '9999') : 'zzzz' + (b.entrega || '');
        return fa.localeCompare(fb) || (a.folio || '').localeCompare(b.folio || '');
      }
      return (b.fecha || '').localeCompare(a.fecha || '') || (b.folio || '').localeCompare(a.folio || '');
    });
  }
  function pintarKPIs() {
    var c = function (k) { return pedidos.filter(KPI[k].f).length; };
    var saldo = pedidos.filter(function (p) { return p.estado !== 'Cancelado'; }).reduce(function (s, p) { return s + calc(p).saldo; }, 0);
    var at = c('atrasados'), hy = c('hoy');
    var tarjeta = function (k, valor, sub, color) {
      return '<button type="button" class="kpi' + (color ? ' ' + color : '') + '" data-kpi="' + k + '" aria-pressed="' + (filtro.kpi === k) + '"><span>' + KPI[k].t + '</span><strong>' + valor + '</strong><small>' + sub + '</small></button>';
    };
    $('kpis').innerHTML =
      tarjeta('activos', c('activos'), 'Sin entregar ni cancelar') +
      tarjeta('hoy', hy, hy ? 'Para entregar hoy' : 'Ninguna hoy', hy ? 'ambar' : '') +
      tarjeta('atrasados', at, at ? 'Ya pasó su fecha' : 'Todo a tiempo', at ? 'rojo' : 'verde') +
      tarjeta('listos', c('listos'), 'Avísale al cliente') +
      tarjeta('saldo', dinero(saldo), c('saldo') + ' pedidos con saldo', saldo > 0 ? 'rojo' : '');
  }
  function pintarChips() {
    var cuenta = function (e) { return pedidos.filter(function (p) { return p.estado === e; }).length; };
    var opciones = [['activos', 'Activos', pedidos.filter(activo).length], ['todos', 'Todos', pedidos.length]].concat(ESTADOS.map(function (e) { return [e, e, cuenta(e)]; }));
    $('chips-estado').innerHTML = opciones.map(function (o) {
      return '<button type="button" data-estado="' + esc(o[0]) + '" aria-pressed="' + (!filtro.kpi && filtro.estado === o[0]) + '">' + esc(o[1]) + ' (' + o[2] + ')</button>';
    }).join('');
    var fa = $('filtro-activo');
    fa.hidden = !filtro.kpi;
    if (filtro.kpi) fa.innerHTML = '<span>Mostrando: ' + esc(KPI[filtro.kpi].t) + '</span><button type="button" data-quitar-kpi>Ver todos los activos</button>';
  }
  function selectEstado(p) {
    return '<select data-cambiar-estado="' + esc(p.id) + '" aria-label="Estado del pedido ' + esc(p.folio) + '">' +
      ESTADOS.map(function (e) { return '<option' + (e === p.estado ? ' selected' : '') + '>' + e + '</option>'; }).join('') + '</select>';
  }
  function pintarTabla() {
    var lista = visibles();
    $('vacio').hidden = lista.length > 0;
    $('tbody').innerHTML = lista.map(function (p) {
      var c = calc(p);
      return '<tr data-ver="' + esc(p.id) + '" class="' + (p.estado === 'Cancelado' ? 'e-cancelado' : '') + '">' +
        '<td class="folio">' + esc(p.folio) + (p.notaFolio ? '<span class="sub">Nota ' + esc(p.notaFolio) + '</span>' : '') + '</td>' +
        '<td class="cliente"><b>' + esc(p.cliente || '–') + '</b>' + (p.intermediario && p.intermediario.nombre ? '<span class="sub">Asesora: ' + esc(p.intermediario.nombre) + '</span>' : '') + '</td>' +
        '<td class="producto">' + esc(p.producto || '–') + (num(p.extras) ? '<span class="sub">+ ' + esc(p.extrasDetalle || 'extras') + '</span>' : '') + '</td>' +
        '<td>' + selectEstado(p) + '</td>' +
        '<td>' + celdaEntrega(p) + '</td>' +
        '<td>' + tagPago(c.pago) + '</td>' +
        '<td class="num' + (c.saldo > 0 && p.estado !== 'Cancelado' ? ' debe' : '') + '">' + dinero(c.saldo) + '</td>' +
        '<td><button type="button" class="btn-ver" data-ver="' + esc(p.id) + '">Ver pedido</button></td></tr>';
    }).join('');
    $('tarjetas').innerHTML = lista.map(function (p) {
      var c = calc(p);
      return '<li class="tarjeta">' +
        '<div class="t-arriba"><strong>' + esc(p.folio + ' · ' + (p.cliente || 'Sin nombre')) + '</strong>' + tagPago(c.pago) + '</div>' +
        '<div class="t-fila">' + esc(p.producto || '–') + '</div>' +
        '<div class="t-entrega">' + tagEntrega(p) + '<span class="sub">' + (p.entrega ? 'Entrega ' + fechaCorta(p.entrega) : '') + '</span></div>' +
        '<div class="t-fila">' + selectEstado(p) + (c.saldo > 0 ? '<span class="debe"><b>Saldo ' + dinero(c.saldo) + '</b></span>' : '') + '</div>' +
        '<button type="button" class="btn btn-claro" data-ver="' + esc(p.id) + '">Ver pedido</button></li>';
    }).join('');
  }
  function pintarPedidos() { pintarKPIs(); pintarChips(); pintarTabla(); }

  $('kpis').addEventListener('click', function (e) {
    var b = e.target.closest('[data-kpi]'); if (!b) return;
    var k = b.getAttribute('data-kpi'); filtro.kpi = filtro.kpi === k ? '' : k; pintarPedidos();
  });
  $('filtro-activo').addEventListener('click', function (e) { if (e.target.closest('[data-quitar-kpi]')) { filtro.kpi = ''; filtro.estado = 'activos'; pintarPedidos(); } });
  $('buscar').addEventListener('input', function () { filtro.texto = this.value; pintarTabla(); });
  $('f-orden').addEventListener('change', function () { filtro.orden = this.value; pintarTabla(); });
  $('chips-estado').addEventListener('click', function (e) {
    var b = e.target.closest('[data-estado]'); if (!b) return; filtro.kpi = ''; filtro.estado = b.getAttribute('data-estado'); pintarPedidos();
  });
  function cambiarEstado(p, nuevo) {
    if (!p || p.estado === nuevo) return;
    S.hist(p, 'Estado: ' + p.estado + ' → ' + nuevo);
    p.estado = nuevo; guardarTodo();
  }
  document.querySelector('.contenedor').addEventListener('change', function (e) {
    var s = e.target.closest('[data-cambiar-estado]'); if (!s) return;
    cambiarEstado(porId(s.getAttribute('data-cambiar-estado')), s.value); pintar();
  });
  document.querySelector('.contenedor').addEventListener('click', function (e) {
    if (e.target.closest('select')) return;
    var a = e.target.closest('[data-ver]'); if (a) { abrirFicha(a.getAttribute('data-ver')); return; }
    var r = e.target.closest('[data-editar]'); if (r) abrir(r.getAttribute('data-editar'));
  });

  /* ---------- ficha del pedido ---------- */
  var fichaId = null;
  function fotoDe(it) {
    if (!it.codigo || !D.tipos[it.tipo]) return '';
    var t = D.tipos[it.tipo], m = t.modelos.find(function (x) { return x.codigo === it.codigo; });
    return m ? '../' + t.carpeta + m.foto : '';
  }
  function abrirFicha(id) {
    var p = porId(id); if (!p) return;
    fichaId = id;
    var c = calc(p), n = notaDe(p);
    $('f-titulo').textContent = 'Pedido ' + p.folio + ' · ' + (p.cliente || 'Sin nombre');
    $('f-etiquetas').innerHTML = '<span class="tag t-normal">' + esc(p.estado) + '</span>' + tagEntrega(p) + tagPago(c.pago);
    var tel = telWA(p.tel);
    var wa = $('f-wa');
    wa.hidden = !tel;
    wa.href = 'https://wa.me/' + tel + '?text=' + encodeURIComponent('Hola' + (p.cliente ? ' ' + p.cliente.split(' ')[0] : '') + ', te escribimos de Recoovare sobre tu pedido ' + p.folio + '. ' +
      (p.estado === 'Listo para entregar' ? '¡Ya está listo! ' : '') + (c.saldo > 0 ? 'Saldo pendiente: ' + dinero(c.saldo) + '. ' : '') + '¡Gracias!');
    var fn = $('f-nota');
    fn.textContent = n ? 'Ver nota ' + n.folio : 'Crear nota';
    fn.href = n ? '../notas/?abrir=' + encodeURIComponent(n.id) : '../notas/?pedido=' + encodeURIComponent(p.id);
    $('f-abono').hidden = true;

    // Productos
    var prods;
    if (n && n.items && n.items.length) {
      prods = n.items.map(function (it) {
        var f = fotoDe(it);
        return '<div class="f-prod">' + (f ? '<img src="' + esc(f) + '" alt="">' : '<span class="sin"></span>') +
          '<div><b>' + esc(it.cant + ' × ' + it.desc) + '</b>' + (it.detalle ? '<small>' + esc(it.detalle) + '</small>' : '') + '</div><span class="p">' + dinero(num(it.cant) * num(it.precio)) + '</span></div>';
      }).join('');
    } else {
      prods = '<div class="f-prod"><span class="sin"></span><div><b>' + esc(p.producto || 'Sin producto') + '</b>' + (num(p.extras) ? '<small>+ ' + esc(p.extrasDetalle || 'Extras') + ' ' + dinero(p.extras) + '</small>' : '') + '</div><span class="p">' + dinero(p.precioProducto) + '</span></div>';
    }
    // Bocetos
    var bocs = n ? n.items.filter(function (it) { return it.boceto && (it.boceto.versiones.length || it.boceto.estado !== 'pendiente'); }) : [];
    var ESTB = { pendiente: 'Pendiente', revision: 'En revisión', aprobado: 'Aprobado' };
    var boc = bocs.length ? bocs.map(function (it) {
      var b = it.boceto, ap = b.versiones.find(function (v) { return v.id === b.aprobadaId; }), ult = ap || b.versiones[b.versiones.length - 1];
      return '<div class="f-boceto">' + (ult ? '<img data-img="' + esc(ult.id) + '" alt="Boceto">' : '') + '<div><b>' + esc(it.desc) + '</b><br>' +
        '<span class="tag ' + (b.estado === 'aprobado' ? 't-ok' : b.estado === 'revision' ? 't-hoy' : 't-normal') + '">' + ESTB[b.estado] + '</span>' +
        (b.estado === 'aprobado' && b.aprobadoFecha ? ' <small>el ' + fechaCorta(b.aprobadoFecha) + (ap ? ' · V' + ap.n : '') + '</small>' : '') +
        (b.textos ? '<small>Textos: ' + esc(b.textos) + '</small>' : '') + '</div></div>';
    }).join('') : '<p class="ayuda">' + (n ? 'Sin boceto registrado en la nota.' : 'Los bocetos se registran en la nota de venta.') + '</p>';
    // Pagos
    var pagos = (p.pagos || []).length ? '<ul class="lista">' + p.pagos.map(function (x) {
      return '<li><span>' + esc(fechaCorta(x.fecha) + ' · ' + (x.concepto || 'Pago').replace(/\s*\(nota.*\)$/, '') + ' · ' + (x.metodo || '')) + '</span><b>' + dinero(x.monto) + '</b></li>';
    }).join('') + '</ul>' : '<p class="ayuda">Sin pagos registrados.</p>';
    var hist = (p.historial || []).slice().reverse();
    $('ficha').innerHTML =
      '<section class="f-bloque"><h3>Cliente y asesor</h3>' +
        '<div class="f-dato"><span>Cliente</span><b>' + esc(p.cliente || '–') + '</b></div>' +
        '<div class="f-dato"><span>WhatsApp</span><b>' + esc(p.tel || '–') + '</b></div>' +
        '<div class="f-dato"><span>Asesora</span><b>' + esc((p.intermediario && p.intermediario.nombre) || 'Venta directa') + '</b></div>' +
        '<div class="f-dato"><span>Fecha del pedido</span><b>' + fechaCorta(p.fecha) + '</b></div></section>' +
      '<section class="f-bloque"><h3>Entrega</h3>' +
        '<div class="f-dato"><span>Método</span><b>' + esc(METODOS[p.metodoEntrega] || 'Sin definir') + '</b></div>' +
        (p.ubicacion ? '<div class="f-dato"><span>Ubicación</span><b>' + esc(p.ubicacion) + '</b></div>' : '') +
        '<div class="f-dato"><span>Fecha acordada</span><b>' + (p.entrega ? fechaCorta(p.entrega) : 'Sin fecha') + ' ' + tagEntrega(p) + '</b></div>' +
        '<div class="f-dato"><span>Estado del trabajo</span><b>' + selectEstado(p) + '</b></div></section>' +
      '<section class="f-bloque ancho"><h3>Productos</h3>' + prods + '</section>' +
      '<section class="f-bloque"><h3>Boceto</h3>' + boc + '</section>' +
      '<section class="f-bloque"><h3>Pagos</h3><div class="f-montos"><div><span>Total</span><b>' + dinero(c.total) + '</b></div><div><span>Pagado</span><b>' + dinero(c.pagado) + '</b></div>' +
        '<div class="saldo' + (c.saldo <= 0 ? ' cero' : '') + '"><span>Saldo</span><b>' + dinero(c.saldo) + '</b></div></div>' + pagos + '</section>' +
      '<section class="f-bloque"><h3>Nota de venta</h3>' + (n ? '<p>Vinculada a la nota <a href="../notas/?abrir=' + encodeURIComponent(n.id) + '"><b>' + esc(n.folio) + '</b></a>. Los pagos y el boceto se registran en la nota.</p>' : '<p class="ayuda">Este pedido no tiene nota. <a href="../notas/?pedido=' + encodeURIComponent(p.id) + '">Crear nota con estos datos</a>.</p>') +
        (p.notas ? '<p><b>Notas:</b> ' + esc(p.notas) + '</p>' : '') + '</section>' +
      '<section class="f-bloque"><h3>Historial</h3>' + (hist.length ? '<ul class="historial">' + hist.map(function (h) { return '<li><time>' + fechaCorta(h.fecha) + '</time><span>' + esc(h.txt) + '</span></li>'; }).join('') + '</ul>' : '<p class="ayuda">Todavía no hay cambios registrados.</p>') + '</section>';
    if (window.RecoovareImg) $('ficha').querySelectorAll('img[data-img]').forEach(function (im) { window.RecoovareImg.leer(im.getAttribute('data-img')).then(function (d) { if (d) im.src = d; }).catch(function () {}); });
    $('modal-ficha').hidden = false;
  }
  function cerrarFicha() { $('modal-ficha').hidden = true; fichaId = null; }
  $('f-cerrar').addEventListener('click', cerrarFicha);
  $('f-editar').addEventListener('click', function () { var id = fichaId; cerrarFicha(); abrir(id); });
  $('ficha').addEventListener('change', function (e) {
    var s = e.target.closest('[data-cambiar-estado]'); if (!s) return;
    cambiarEstado(porId(s.getAttribute('data-cambiar-estado')), s.value); pintar(); abrirFicha(fichaId);
  });
  $('f-abono-btn').addEventListener('click', function () {
    var p = porId(fichaId); if (!p) return;
    var c = calc(p), caja = $('f-abono');
    caja.hidden = !caja.hidden;
    $('ab-concepto').value = (p.pagos || []).length ? 'Abono' : 'Anticipo';
    $('ab-monto').value = c.saldo || ''; $('ab-fecha').value = hoy();
    $('ab-ayuda').textContent = p.notaId ? 'Se guarda en la nota ' + p.notaFolio + ' para no contarlo dos veces.' : '';
    if (!caja.hidden) $('ab-monto').focus();
  });
  $('ab-concepto').addEventListener('change', function () { var p = porId(fichaId); if (p && this.value === 'Liquidación') $('ab-monto').value = calc(p).saldo || ''; });
  $('ab-guardar').addEventListener('click', function () {
    var p = porId(fichaId); if (!p) return;
    var m = num($('ab-monto').value); if (m <= 0) { $('ab-monto').focus(); return; }
    var pago = { concepto: $('ab-concepto').value, monto: m, metodo: $('ab-metodo').value, fecha: $('ab-fecha').value || hoy() };
    if (!registrarPago(p, pago)) return;
    pintar(); abrirFicha(p.id);
  });
  // Un solo lugar para los pagos: si hay nota, en la nota; si no, en el pedido
  function registrarPago(p, pago) {
    if (p.notaId) {
      var todas = notas(), n = todas.find(function (x) { return x.id === p.notaId; });
      if (!n) { alert('No encontré la nota ' + p.notaFolio + ' en este navegador.'); return false; }
      n.pagos = Array.isArray(n.pagos) ? n.pagos : [];
      n.pagos.push({ id: uid(), concepto: pago.concepto, monto: pago.monto, metodo: pago.metodo, fecha: pago.fecha });
      var tot = (n.items || []).reduce(function (s, i) { return s + num(i.cant) * num(i.precio); }, 0), pag = n.pagos.reduce(function (s, x) { return s + num(x.monto); }, 0);
      n.anticipo = num(n.pagos[0].monto); n.metodo = n.pagos[0].metodo; n.pagado = tot > 0 && pag >= tot;
      guardar(KNOTAS, todas);
      var b = leer('recoovare_borrador', null); if (b && b.id === n.id) guardar('recoovare_borrador', n);
      S.desdeNota(n);
      pedidos = leer(S.K, []);
      p = porId(p.id);
    } else {
      p.pagos = p.pagos || [];
      p.pagos.push({ fecha: pago.fecha, monto: pago.monto, metodo: pago.metodo, concepto: pago.concepto, origen: 'manual' });
    }
    S.hist(p, pago.concepto + ' ' + dinero(pago.monto) + ' (' + pago.metodo + ')');
    guardarTodo();
    return true;
  }

  /* ---------- editor ---------- */
  var actual = null;
  $('m-estado').innerHTML = ESTADOS.map(function (e) { return '<option>' + e + '</option>'; }).join('');
  var ASESORES = D.vendedores || [], COMIS = D.comisiones || {};
  $('lista-asesores').innerHTML = ASESORES.map(function (v) { return '<option value="' + esc(v.nombre) + '">'; }).join('');
  function abrir(id) {
    var p = id ? porId(id) : null;
    actual = p ? JSON.parse(JSON.stringify(p)) : S.pedidoVacio();
    actual._nuevo = !p;
    actual._antes = p ? { estado: p.estado, entrega: p.entrega } : null;
    $('m-titulo').textContent = (p ? 'Editar pedido ' : 'Nuevo pedido ') + actual.folio;
    $('m-fecha').value = actual.fecha || hoy();
    $('m-estado').value = actual.estado || ESTADOS[0];
    $('m-entrega').value = actual.entrega || '';
    $('m-metodo').value = actual.metodoEntrega || '';
    $('m-ubicacion').value = actual.ubicacion || '';
    $('m-cliente').value = actual.cliente || '';
    $('m-tel').value = actual.tel || '';
    $('m-producto').value = actual.producto || '';
    $('m-precio').value = actual.precioProducto || '';
    $('m-extras').value = actual.extras || '';
    $('m-extras-det').value = actual.extrasDetalle || '';
    $('m-int-nombre').value = (actual.intermediario && actual.intermediario.nombre) || '';
    $('m-int-monto').value = (actual.intermediario && actual.intermediario.monto) || '';
    $('m-int-pagado').checked = !!(actual.intermediario && actual.intermediario.pagado);
    actual._intAntes = JSON.stringify([$('m-int-nombre').value, $('m-int-monto').value]);
    $('m-ajuste').value = actual.ajuste === null || actual.ajuste === undefined ? '' : actual.ajuste;
    $('m-mama-pagado').checked = !!(actual.mama && actual.mama.pagado);
    $('m-mama-fecha').value = (actual.mama && actual.mama.fecha) || '';
    $('m-mama-monto').value = actual.mama && actual.mama.monto !== null && actual.mama.monto !== undefined ? actual.mama.monto : '';
    $('m-notas').value = actual.notas || '';
    var conNota = !!actual.notaId;
    $('m-nota').innerHTML = conNota ? 'Viene de la nota <a href="../notas/?abrir=' + encodeURIComponent(actual.notaId) + '">' + esc(actual.notaFolio) + '</a>. Si cambias la nota, el cliente, producto, precios y pagos se actualizan aquí.' :
      (p ? 'Este pedido no tiene nota de venta. <a href="../notas/?pedido=' + encodeURIComponent(actual.id) + '">Crear nota con estos datos</a>.' : '');
    $('m-pago-form').hidden = conNota;
    $('m-pagos-ayuda').textContent = conNota ? 'Los pagos de este pedido se registran en la nota ' + actual.notaFolio + ' (o con “Registrar abono” en la ficha), para no contarlos dos veces.' : '';
    $('pg-fecha').value = hoy(); $('pg-monto').value = '';
    $('m-borrar').hidden = !p;
    pintarEditor();
    $('modal').hidden = false;
    $('m-cliente').focus();
  }
  function leerEditor() {
    actual.fecha = $('m-fecha').value; actual.estado = $('m-estado').value; actual.entrega = $('m-entrega').value;
    actual.metodoEntrega = $('m-metodo').value; actual.ubicacion = $('m-ubicacion').value.trim();
    actual.cliente = $('m-cliente').value.trim(); actual.tel = $('m-tel').value.trim(); actual.producto = $('m-producto').value.trim();
    actual.precioProducto = num($('m-precio').value); actual.extras = num($('m-extras').value); actual.extrasDetalle = $('m-extras-det').value.trim();
    var prevI = actual.intermediario || {};
    var nombreI = $('m-int-nombre').value.trim();
    var asesorI = ASESORES.find(function (v) { return v.nombre.toLowerCase() === nombreI.toLowerCase(); });
    var cambio = JSON.stringify([$('m-int-nombre').value, $('m-int-monto').value]) !== actual._intAntes;
    actual.intermediario = { nombre: nombreI, codigo: asesorI ? asesorI.codigo : '', monto: num($('m-int-monto').value), pagado: $('m-int-pagado').checked, fecha: prevI.fecha || '', manual: !!(prevI.manual || cambio) };
    if (actual.intermediario.pagado && !actual.intermediario.fecha) actual.intermediario.fecha = hoy();
    actual.ajuste = $('m-ajuste').value === '' ? null : num($('m-ajuste').value);
    actual.mama = { pagado: $('m-mama-pagado').checked, fecha: $('m-mama-fecha').value, monto: $('m-mama-monto').value === '' ? null : num($('m-mama-monto').value) };
    actual.notas = $('m-notas').value.trim();
  }
  function pintarEditor() {
    var c = calc(actual);
    $('m-pagos').innerHTML = (actual.pagos || []).length ? actual.pagos.map(function (x, i) {
      return '<li><span>' + esc(fechaCorta(x.fecha) + ' · ' + (x.concepto || 'Pago') + ' · ' + (x.metodo || '')) + '</span><span><b>' + dinero(x.monto) + '</b>' +
        (x.origen === 'nota' ? ' <small class="sub">desde la nota</small>' : ' <button type="button" class="quitar" data-quitar-pago="' + i + '">Quitar</button>') + '</span></li>';
    }).join('') : '<li class="vacia">Sin pagos registrados.</li>';
    $('m-costos').innerHTML = (actual.costos || []).length ? actual.costos.map(function (x, i) {
      return '<li><span>' + esc(x.concepto) + '</span><span><b>' + dinero(x.monto) + '</b> <button type="button" class="quitar" data-quitar-costo="' + i + '">Quitar</button></span></li>';
    }).join('') : '<li class="vacia">Sin costos registrados.</li>';
    var ia = actual.intermediario || {};
    $('m-int-ayuda').textContent = ia.codigo && !ia.manual && actual.notaFolio ? 'Comisión calculada desde la nota ' + actual.notaFolio + ' según la medida.' :
      ia.nombre ? 'Tabla de comisiones: ' + Object.keys(COMIS).map(function (k) { return k + ' $' + COMIS[k]; }).join(' · ') : '';
    var r = reglaDe(actual);
    $('m-parte-calc').textContent = dinero(c.parteCalc) + (r.modo === 'fijo' ? ' (monto fijo)' : ' (' + r.pct + '% de ' + dinero(c.base) + ')');
    $('m-parte').textContent = dinero(c.parte);
    $('m-resumen').innerHTML =
      '<div><span>Total del pedido</span><b>' + dinero(c.total) + '</b></div>' +
      '<div><span>Pagado por el cliente</span><b>' + dinero(c.pagado) + '</b></div>' +
      '<div class="' + (c.saldo > 0 ? 'rojo' : '') + '"><span>Saldo del cliente</span><b>' + dinero(c.saldo) + '</b></div>' +
      '<div><span>Estado del pago</span><b style="font-size:16px">' + esc(c.pago) + '</b></div>';
  }
  $('form').addEventListener('input', function (e) { if (e.target.closest('.fila-agregar')) return; leerEditor(); pintarEditor(); });
  $('form').addEventListener('change', function (e) {
    if (e.target.id === 'm-mama-pagado' && e.target.checked && !$('m-mama-fecha').value) $('m-mama-fecha').value = hoy();
    if (e.target.closest('.fila-agregar')) return; leerEditor(); pintarEditor();
  });
  $('pg-agregar').addEventListener('click', function () {
    var m = num($('pg-monto').value); if (m <= 0) { $('pg-monto').focus(); return; }
    leerEditor();
    var concepto = actual.pagos.length ? 'Abono' : 'Anticipo';
    actual.pagos.push({ fecha: $('pg-fecha').value || hoy(), monto: m, metodo: $('pg-metodo').value, concepto: concepto, origen: 'manual' });
    S.hist(actual, concepto + ' ' + dinero(m) + ' (' + $('pg-metodo').value + ')');
    $('pg-monto').value = ''; pintarEditor();
  });
  $('cs-agregar').addEventListener('click', function () {
    var con = $('cs-concepto').value.trim(), m = num($('cs-monto').value);
    if (!con) { $('cs-concepto').focus(); return; } if (m <= 0) { $('cs-monto').focus(); return; }
    leerEditor(); actual.costos = actual.costos || []; actual.costos.push({ concepto: con, monto: m });
    $('cs-concepto').value = ''; $('cs-monto').value = ''; pintarEditor();
  });
  $('form').addEventListener('click', function (e) {
    var b;
    if ((b = e.target.closest('[data-quitar-pago]'))) { actual.pagos.splice(Number(b.getAttribute('data-quitar-pago')), 1); pintarEditor(); }
    else if ((b = e.target.closest('[data-quitar-costo]'))) { actual.costos.splice(Number(b.getAttribute('data-quitar-costo')), 1); pintarEditor(); }
  });
  $('form').addEventListener('submit', function (e) {
    e.preventDefault(); leerEditor();
    var nuevo = actual._nuevo, antes = actual._antes;
    if (nuevo) S.hist(actual, 'Pedido creado');
    else {
      if (antes.estado !== actual.estado) S.hist(actual, 'Estado: ' + antes.estado + ' → ' + actual.estado);
      if ((antes.entrega || '') !== (actual.entrega || '')) S.hist(actual, 'Fecha de entrega: ' + (antes.entrega ? fechaCorta(antes.entrega) : 'sin fecha') + ' → ' + (actual.entrega ? fechaCorta(actual.entrega) : 'sin fecha'));
    }
    delete actual._nuevo; delete actual._intAntes; delete actual._antes;
    var i = pedidos.findIndex(function (x) { return x.id === actual.id; });
    if (i >= 0) pedidos[i] = actual; else pedidos.unshift(actual);
    var id = actual.id;
    guardarTodo(); cerrar(); pintar();
    if (nuevo) { filtro.kpi = ''; filtro.estado = 'todos'; pintar(); }
    if (vista === 'pedidos') abrirFicha(id);
  });
  function cerrar() { $('modal').hidden = true; actual = null; }
  $('m-cerrar').addEventListener('click', cerrar);
  $('m-borrar').addEventListener('click', function () {
    if (!actual) return;
    if (!confirm('¿Borrar el pedido ' + actual.folio + '? No se puede deshacer.')) return;
    if (actual.notaId) { var ign = leer(S.KI, []); ign.push(actual.notaId); guardar(S.KI, ign); }
    pedidos = pedidos.filter(function (x) { return x.id !== actual.id; });
    guardarTodo(); cerrar(); pintar();
  });
  $('btn-nuevo').addEventListener('click', function () { abrir(null); });

  /* ---------- vista: reparto y comisiones ---------- */
  function enPeriodo(fecha) {
    if (filtro.periodo === 'todos') return true;
    var f = String(fecha || ''), d = new Date();
    if (filtro.periodo === 'anio') return f.slice(0, 4) === String(d.getFullYear());
    if (filtro.periodo === 'pasado') d.setMonth(d.getMonth() - 1);
    return f.slice(0, 7) === d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }
  var NOMBRE_PER = { este: 'Este mes', pasado: 'Mes pasado', anio: 'Este año', todos: 'Todo el historial' };
  function textoRegla(r) { return r.modo === 'fijo' ? dinero(r.fijo) + ' fijo' : r.pct + '%'; }
  function pintarReparto() {
    var vivos = pedidos.filter(function (p) { return p.estado !== 'Cancelado'; });
    var enPer = vivos.filter(function (p) { return enPeriodo(p.fecha); });
    var ventas = enPer.reduce(function (s, p) { return s + calc(p).total; }, 0);
    var cobrado = 0; vivos.forEach(function (p) { (p.pagos || []).forEach(function (x) { if (enPeriodo(x.fecha)) cobrado += num(x.monto); }); });
    var miParte = enPer.reduce(function (s, p) { return s + calc(p).parte; }, 0);
    var mamaPago = enPer.reduce(function (s, p) { return s + calc(p).recibido; }, 0);
    var mamaDebe = vivos.reduce(function (s, p) { return s + calc(p).meDebe; }, 0);
    var comPend = vivos.reduce(function (s, p) { return s + (p.intermediario && !p.intermediario.pagado ? num(p.intermediario.monto) : 0); }, 0);
    var conCostos = enPer.filter(function (p) { return (p.costos || []).length; });
    var per = NOMBRE_PER[filtro.periodo];
    var k = function (t, v, sub, alc, cls) { return '<div class="kpi' + (cls ? ' ' + cls : '') + '"><span class="alcance">' + alc + '</span><span>' + t + '</span><strong>' + v + '</strong><small>' + sub + '</small></div>'; };
    $('r-kpis').innerHTML =
      k('Ventas', dinero(ventas), enPer.length + ' pedidos (por fecha del pedido)', per) +
      k('Cobrado a clientes', dinero(cobrado), 'Pagos recibidos (por fecha del pago)', per) +
      k('Mi parte', dinero(miParte), 'De los pedidos del periodo', per) +
      k('Mi mamá me pagó', dinero(mamaPago), 'De los pedidos del periodo', per) +
      k('Mi mamá me debe', dinero(mamaDebe), 'Saldo pendiente conmigo', 'Todo el historial', mamaDebe > 0 ? 'rojo' : 'verde') +
      k('Comisiones por pagar', dinero(comPend), 'A asesores', 'Todo el historial', comPend > 0 ? 'ambar' : '') +
      (conCostos.length ? k('Utilidad estimada', dinero(conCostos.reduce(function (s, p) { return s + calc(p).utilidad; }, 0)), 'Ventas − comisiones − costos de ' + conCostos.length + ' pedidos con costos', per) : '');
    $('regla-txt').textContent = 'Regla actual para pedidos nuevos: ' + (cfg.modo === 'fijo' ? 'mi parte = ' + dinero(cfg.fijo) + ' por pedido.' : 'mi parte = ' + cfg.pct + '% × (precio del producto − comisión del asesor). La instalación y el envío no se reparten.') + ' Cada pedido conserva la regla con la que se creó.';
    // tabla
    var lista = enPer.filter(function (p) {
      var c = calc(p);
      if (filtro.mama === 'debe') return c.meDebe > 0;
      if (filtro.mama === 'pagado') return c.estadoMi === 'Pagado';
      return true;
    }).sort(function (a, b) { return (b.fecha || '').localeCompare(a.fecha || '') || (b.folio || '').localeCompare(a.folio || ''); });
    $('r-vacio').hidden = lista.length > 0;
    var estMi = function (c) { return '<span class="tag ' + (c.estadoMi === 'Pagado' ? 'b-liquidado' : c.estadoMi === 'Pago parcial' ? 'b-parcial' : c.estadoMi === 'Por cobrar a mi mamá' ? 't-hoy' : 't-normal') + '">' + esc(c.estadoMi) + '</span>'; };
    $('r-tbody').innerHTML = lista.map(function (p) {
      var c = calc(p);
      return '<tr data-editar="' + esc(p.id) + '"><td class="folio">' + esc(p.folio) + '</td><td>' + fechaCorta(p.fecha) + '</td><td>' + esc(p.cliente || '–') + '</td>' +
        '<td class="num">' + dinero(p.precioProducto) + '</td><td class="num">' + (c.inter ? '−' + dinero(c.inter) : '–') + '</td><td class="num"><b>' + dinero(c.parte) + '</b></td>' +
        '<td>' + (p.ajuste !== null && p.ajuste !== undefined && p.ajuste !== '' ? 'Ajustada' : textoRegla(reglaDe(p))) + '</td><td>' + estMi(c) + '</td><td class="num' + (c.meDebe > 0 ? ' debe' : '') + '">' + dinero(c.meDebe) + '</td></tr>';
    }).join('');
    $('r-tarjetas').innerHTML = lista.map(function (p) {
      var c = calc(p);
      return '<li class="tarjeta"><div class="t-arriba"><strong>' + esc(p.folio + ' · ' + (p.cliente || 'Sin nombre')) + '</strong>' + estMi(c) + '</div>' +
        '<div class="t-montos"><div>Mi parte<b>' + dinero(c.parte) + '</b></div><div class="' + (c.meDebe > 0 ? 'debe' : '') + '">Me debe<b>' + dinero(c.meDebe) + '</b></div></div>' +
        '<button type="button" class="btn btn-claro" data-editar="' + esc(p.id) + '">Editar reparto</button></li>';
    }).join('');
    pintarAsesores();
  }
  function deAsesor(p, v) { var i = p.intermediario || {}; return i.codigo === v.codigo || (i.nombre || '').trim().toLowerCase() === v.nombre.toLowerCase(); }
  function pintarAsesores() {
    var base = location.origin + location.pathname.replace(/pedidos\/?(index\.html)?$/, '');
    var porPagarTotal = 0;
    $('asesores-tbody').innerHTML = ASESORES.map(function (v) {
      var ps = pedidos.filter(function (p) { return p.estado !== 'Cancelado' && enPeriodo(p.fecha) && deAsesor(p, v); });
      var ventas = ps.reduce(function (s, p) { return s + num(p.precioProducto); }, 0);
      var com = ps.reduce(function (s, p) { return s + num(p.intermediario.monto); }, 0);
      var pag = ps.reduce(function (s, p) { return s + (p.intermediario.pagado ? num(p.intermediario.monto) : 0); }, 0);
      porPagarTotal += com - pag;
      var link = base + v.codigo;
      return '<tr><td><b>' + esc(v.nombre) + '</b></td><td><span class="link-asesor"><code>' + esc(link.replace(/^https?:\/\//, '')) + '</code><button type="button" class="btn-copiar" data-copiar="' + esc(link) + '">Copiar</button></span></td>' +
        '<td class="num">' + ps.length + '</td><td class="num">' + dinero(ventas) + '</td><td class="num">' + dinero(com) + '</td><td class="num">' + dinero(pag) + '</td><td class="num' + (com - pag > 0 ? ' debe' : '') + '">' + dinero(com - pag) + '</td></tr>';
    }).join('');
    $('asesores-sub').textContent = NOMBRE_PER[filtro.periodo] + ' · Comisiones por pagar: ' + dinero(porPagarTotal);
  }
  $('asesores').addEventListener('click', function (e) {
    var b = e.target.closest('[data-copiar]'); if (!b) return;
    var t = b.getAttribute('data-copiar');
    var ok = function () { b.textContent = '¡Copiado!'; setTimeout(function () { b.textContent = 'Copiar'; }, 1500); };
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(ok, function () { prompt('Copia el link:', t); });
    else prompt('Copia el link:', t);
  });
  $('r-periodo').addEventListener('change', function () { filtro.periodo = this.value; pintarReparto(); });
  $('f-mama').addEventListener('change', function () { filtro.mama = this.value; pintarReparto(); });
  // Regla de reparto: cambiarla no toca pedidos anteriores salvo que lo elijas
  function formRegla(abrirla) {
    $('regla-form').hidden = !abrirla; $('r-cambiar').hidden = abrirla;
    if (!abrirla) return;
    $('cfg-modo').value = cfg.modo; $('cfg-valor').value = cfg.modo === 'fijo' ? cfg.fijo : cfg.pct;
    $('cfg-unidad').textContent = cfg.modo === 'fijo' ? 'Monto por pedido ($)' : 'Porcentaje (%)';
    document.querySelector('input[name="aplicar"][value="nuevos"]').checked = true;
  }
  $('r-cambiar').addEventListener('click', function () { formRegla(true); });
  $('r-cancelar').addEventListener('click', function () { formRegla(false); });
  $('cfg-modo').addEventListener('change', function () { $('cfg-unidad').textContent = this.value === 'fijo' ? 'Monto por pedido ($)' : 'Porcentaje (%)'; });
  $('r-guardar').addEventListener('click', function () {
    var modo = $('cfg-modo').value, v = Math.max(0, num($('cfg-valor').value));
    var nueva = { modo: modo, pct: modo === 'fijo' ? cfg.pct : Math.min(100, v), fijo: modo === 'fijo' ? v : cfg.fijo };
    var aplicar = document.querySelector('input[name="aplicar"]:checked').value;
    if (aplicar === 'todos' && !confirm('Esto recalcula “mi parte” de TODOS los pedidos anteriores con la nueva regla (' + textoRegla(nueva) + '). Las partes ajustadas a mano no cambian. ¿Continuar?')) return;
    cfg.modo = nueva.modo; cfg.pct = nueva.pct; cfg.fijo = nueva.fijo; guardar(KC, cfg);
    if (aplicar === 'todos') { pedidos.forEach(function (p) { p.regla = { modo: nueva.modo, pct: nueva.pct, fijo: nueva.fijo }; S.hist(p, 'Regla de reparto cambiada a ' + textoRegla(nueva)); }); guardarTodo(); }
    formRegla(false); pintar();
  });

  /* ---------- vistas ---------- */
  function ponerVista(v) {
    vista = v;
    document.querySelectorAll('.vista-tab').forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-vista') === v)); });
    $('vista-pedidos').hidden = v !== 'pedidos'; $('vista-reparto').hidden = v !== 'reparto';
    pintar();
  }
  document.querySelector('.vistas-in').addEventListener('click', function (e) { var b = e.target.closest('[data-vista]'); if (b) ponerVista(b.getAttribute('data-vista')); });
  function pintar() { if (vista === 'pedidos') pintarPedidos(); else pintarReparto(); }

  /* ---------- respaldo y Excel ---------- */
  function descargar(contenido, nombre, tipo) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([contenido], { type: tipo })); a.download = nombre;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }
  $('btn-datos').addEventListener('click', function () { $('modal-datos').hidden = false; $('d-estado').textContent = ''; });
  $('d-cerrar').addEventListener('click', function () { $('modal-datos').hidden = true; });
  $('d-excel').addEventListener('click', function () {
    var cab = ['Folio', 'Fecha del pedido', 'Cliente', 'WhatsApp', 'Producto', 'Estado del trabajo', 'Fecha de entrega', 'Entrega', 'Ubicación', 'Pago del cliente', 'Precio del producto', 'Instalación / envío', 'Total', 'Pagado', 'Saldo cliente',
      'Asesor / intermediario', 'Comisión', 'Comisión pagada', 'Regla de reparto', 'Mi parte calculada', 'Mi parte ajustada', 'Mi parte', '¿Ya me pagó mi mamá?', 'Fecha en que me pagó', 'Monto recibido', 'Me debe', 'Estado de mi pago',
      'Costos', 'Utilidad estimada', 'Folio de nota', 'Notas'];
    var cel = function (v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var filas = pedidos.slice().sort(function (a, b) { return (a.folio || '').localeCompare(b.folio || ''); }).map(function (p) {
      var c = calc(p);
      return [p.folio, fechaCorta(p.fecha), p.cliente, p.tel, p.producto, p.estado, p.entrega ? fechaCorta(p.entrega) : '', METODOS[p.metodoEntrega] || '', p.ubicacion || '', c.pago, p.precioProducto, p.extras, c.total, c.pagado, c.saldo,
        p.intermediario && p.intermediario.nombre, c.inter, p.intermediario && p.intermediario.pagado ? 'Sí' : 'No', textoRegla(reglaDe(p)), c.parteCalc, p.ajuste === null || p.ajuste === undefined ? '' : p.ajuste, c.parte, p.mama && p.mama.pagado ? 'Sí' : 'No',
        p.mama && p.mama.fecha ? fechaCorta(p.mama.fecha) : '', c.recibido, c.meDebe, c.estadoMi, c.costos, (p.costos || []).length ? c.utilidad : '', p.notaFolio || '', p.notas].map(cel).join(',');
    });
    descargar('﻿' + [cab.map(cel).join(',')].concat(filas).join('\r\n'), 'RECOOVARE-pedidos-' + hoy() + '.csv', 'text/csv;charset=utf-8');
    $('d-estado').textContent = 'Archivo para Excel descargado.';
  });
  var CLAVES = ['recoovare_pedidos', 'recoovare_folio_pedidos', 'recoovare_pedidos_ignorados', 'recoovare_config_pedidos', 'recoovare_pedidos_init', 'recoovare_notas', 'recoovare_folio', 'recoovare_ajuste_ticket', 'recoovare_ancho'];
  $('d-respaldo').addEventListener('click', function () {
    var datos = { app: 'recoovare', fecha: new Date().toISOString(), datos: {}, imagenes: {} };
    CLAVES.forEach(function (k) { var v = localStorage.getItem(k); if (v !== null) datos.datos[k] = v; });
    var listo = function () {
      descargar(JSON.stringify(datos), 'RECOOVARE-respaldo-' + hoy() + '.json', 'application/json');
      var n = Object.keys(datos.imagenes).length;
      $('d-estado').textContent = 'Respaldo descargado' + (n ? ' (incluye ' + n + ' imagen' + (n === 1 ? '' : 'es') + ' de bocetos)' : '') + '. Guárdalo en un lugar seguro.';
    };
    if (window.RecoovareImg) window.RecoovareImg.todas().then(function (t) { datos.imagenes = t || {}; listo(); }).catch(listo); else listo();
  });
  $('d-restaurar').addEventListener('change', function () {
    var f = this.files && this.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var j = JSON.parse(r.result);
        if (!j || j.app !== 'recoovare' || !j.datos) throw new Error('No es un respaldo de Recoovare');
        if (!confirm('Esto reemplaza los pedidos y notas de este navegador con los del respaldo del ' + new Date(j.fecha).toLocaleDateString('es-MX') + '. ¿Continuar?')) return;
        Object.keys(j.datos).forEach(function (k) { if (CLAVES.indexOf(k) >= 0) localStorage.setItem(k, j.datos[k]); });
        var imgs = j.imagenes || {}, ids = Object.keys(imgs);
        if (!ids.length || !window.RecoovareImg) { location.reload(); return; }
        Promise.all(ids.map(function (id) { return window.RecoovareImg.poner(id, imgs[id]); })).then(function () { location.reload(); }, function () { location.reload(); });
      } catch (e) { $('d-estado').textContent = 'No se pudo restaurar: ' + e.message; $('d-estado').style.color = 'var(--rojo)'; }
    };
    r.readAsText(f);
    this.value = '';
  });

  /* ---------- cerrar ventanas ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!$('modal').hidden) cerrar(); else if (!$('modal-ficha').hidden) cerrarFicha(); else if (!$('modal-datos').hidden) $('modal-datos').hidden = true;
  });
  [$('modal'), $('modal-datos'), $('modal-ficha')].forEach(function (m) { m.addEventListener('click', function (e) { if (e.target === m) { if (m.id === 'modal') cerrar(); else if (m.id === 'modal-ficha') cerrarFicha(); else m.hidden = true; } }); });

  // Abrir un pedido desde un link (?abrir=id)
  var q = new URLSearchParams(location.search).get('abrir');
  pintar();
  if (q && porId(q)) abrirFicha(q);
})();
