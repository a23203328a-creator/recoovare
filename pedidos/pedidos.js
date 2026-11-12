/* =====================================================================
   Control de pedidos – Recoovare (privado, se guarda en este navegador)
   ===================================================================== */
(function () {
  var S = window.RecoovareSync;
  var num = S.num, leer = S.leer, guardar = S.guardar;
  var KC = 'recoovare_config_pedidos', KINIT = 'recoovare_pedidos_init';
  var ESTADOS = ['Pendiente', 'En producción', 'Listo para entregar', 'Entregado', 'Cancelado'];
  var $ = function (id) { return document.getElementById(id); };
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function dinero(n) { n = Math.round(num(n) * 100) / 100; return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); }
  function hoy() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function fechaCorta(iso) { if (!iso) return '–'; var p = iso.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }

  S.inicializar();
  S.sincronizarNotas();

  var cfg = Object.assign({ modo: 'porcentaje', pct: 50, fijo: 0 }, leer(KC, {}));
  var pedidos = leer(S.K, []);
  var filtro = { estado: 'activos', texto: '', periodo: 'todos', mama: 'todos' };

  /* ---------- cálculos ---------- */
  function calc(p) {
    var total = num(p.precioProducto) + num(p.extras);
    var pagado = (p.pagos || []).reduce(function (s, x) { return s + num(x.monto); }, 0);
    var saldo = Math.max(0, total - pagado);
    var pagoCliente = total > 0 && pagado >= total ? 'Pagado' : pagado > 0 ? 'Anticipo recibido' : 'Pendiente';
    var inter = num(p.intermediario && p.intermediario.monto);
    var baseCalc = Math.max(0, num(p.precioProducto) - inter);
    var parteCalc = cfg.modo === 'fijo' ? num(cfg.fijo) : baseCalc * num(cfg.pct) / 100;
    var ajustada = p.ajuste !== null && p.ajuste !== '' && p.ajuste !== undefined;
    var parte = ajustada ? num(p.ajuste) : parteCalc;
    var m = p.mama || {};
    var tieneMonto = m.monto !== null && m.monto !== '' && m.monto !== undefined;
    var recibido = m.pagado ? (tieneMonto ? num(m.monto) : parte) : (tieneMonto ? num(m.monto) : 0);
    var meDebe = Math.max(0, Math.round((parte - recibido) * 100) / 100);
    var estadoMi = parte > 0 && meDebe <= 0 ? 'Pagado' : recibido > 0 ? 'Pago parcial' : pagoCliente !== 'Pagado' ? 'Esperando pago del cliente' : 'Por cobrar a mi mamá';
    var costos = (p.costos || []).reduce(function (s, x) { return s + num(x.monto); }, 0);
    var ganancia = total - inter - costos;
    return { total: total, pagado: pagado, saldo: saldo, pagoCliente: pagoCliente, inter: inter, base: baseCalc, parteCalc: parteCalc, parte: parte, recibido: recibido, meDebe: meDebe, estadoMi: estadoMi, costos: costos, ganancia: ganancia };
  }
  function badgePago(t) { return '<span class="badge ' + (t === 'Pagado' ? 'b-pagado' : t === 'Anticipo recibido' ? 'b-anticipo' : 'b-pendiente') + '">' + esc(t) + '</span>'; }
  function badgeMi(t) {
    var c = t === 'Pagado' ? 'b-pagado' : t === 'Pago parcial' ? 'b-anticipo' : t === 'Por cobrar a mi mamá' ? 'b-cobrar' : 'b-espera';
    return '<span class="badge ' + c + '">' + esc(t === 'Pagado' ? 'Sí' : t === 'Pago parcial' ? 'Parcial' : 'No') + '</span><span class="sub">' + esc(t) + '</span>';
  }

  /* ---------- filtros ---------- */
  function enPeriodo(p) {
    if (filtro.periodo === 'todos') return true;
    var d = new Date(); if (filtro.periodo === 'pasado') d.setMonth(d.getMonth() - 1);
    var mes = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    return (p.fecha || '').slice(0, 7) === mes;
  }
  function visibles() {
    var q = filtro.texto.trim().toLowerCase();
    return pedidos.filter(function (p) {
      if (filtro.estado === 'activos' && (p.estado === 'Entregado' || p.estado === 'Cancelado')) return false;
      if (filtro.estado !== 'activos' && filtro.estado !== 'todos' && p.estado !== filtro.estado) return false;
      if (!enPeriodo(p)) return false;
      var c = calc(p);
      if (filtro.mama === 'debe' && !(c.meDebe > 0 && p.estado !== 'Cancelado')) return false;
      if (filtro.mama === 'pagado' && c.estadoMi !== 'Pagado') return false;
      if (q) {
        var txt = [p.folio, p.cliente, p.producto, p.tel, p.notaFolio, p.notas, p.intermediario && p.intermediario.nombre].join(' ').toLowerCase();
        if (txt.indexOf(q) < 0) return false;
      }
      return true;
    }).sort(function (a, b) { return (b.fecha || '').localeCompare(a.fecha || '') || (b.folio || '').localeCompare(a.folio || ''); });
  }

  /* ---------- pintar ---------- */
  function pintarKPIs() {
    var vivos = pedidos.filter(function (p) { return p.estado !== 'Cancelado'; });
    var enPer = vivos.filter(enPeriodo);
    var activos = vivos.filter(function (p) { return p.estado !== 'Entregado'; });
    var listos = activos.filter(function (p) { return p.estado === 'Listo para entregar'; }).length;
    var cliente = vivos.reduce(function (s, p) { return s + calc(p).saldo; }, 0);
    var mama = vivos.reduce(function (s, p) { return s + calc(p).meDebe; }, 0);
    var ventas = enPer.reduce(function (s, p) { return s + calc(p).total; }, 0);
    var gan = enPer.reduce(function (s, p) { return s + calc(p).ganancia; }, 0);
    var miParte = enPer.reduce(function (s, p) { return s + calc(p).parte; }, 0);
    var per = { todos: 'en total', este: 'este mes', pasado: 'el mes pasado' }[filtro.periodo];
    $('kpis').innerHTML =
      '<div class="kpi"><span>Pedidos activos</span><strong>' + activos.length + '</strong><small>' + listos + ' listos para entregar</small></div>' +
      '<div class="kpi' + (cliente > 0 ? ' alerta' : '') + '"><span>Clientes me deben</span><strong>' + dinero(cliente) + '</strong><small>Saldo de pedidos sin liquidar</small></div>' +
      '<div class="kpi' + (mama > 0 ? ' alerta' : '') + '"><span>Mi mamá me debe</span><strong>' + dinero(mama) + '</strong><small>De todos los pedidos</small></div>' +
      '<div class="kpi"><span>Mi parte ' + per + '</span><strong>' + dinero(miParte) + '</strong><small>Ventas ' + dinero(ventas) + ' · Ganancia ' + dinero(gan) + '</small></div>';
  }
  function pintarChips() {
    var cuenta = function (e) { return pedidos.filter(function (p) { return p.estado === e; }).length; };
    var activos = pedidos.filter(function (p) { return p.estado !== 'Entregado' && p.estado !== 'Cancelado'; }).length;
    var opciones = [['activos', 'Activos', activos], ['todos', 'Todos', pedidos.length]].concat(ESTADOS.map(function (e) { return [e, e, cuenta(e)]; }));
    $('chips-estado').innerHTML = opciones.map(function (o) {
      return '<button type="button" data-estado="' + esc(o[0]) + '" aria-pressed="' + (filtro.estado === o[0]) + '">' + esc(o[1]) + ' (' + o[2] + ')</button>';
    }).join('');
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
      return '<tr data-abrir="' + esc(p.id) + '">' +
        '<td class="folio"><button type="button" class="abrir" data-abrir="' + esc(p.id) + '">' + esc(p.folio) + '</button>' + (p.notaFolio ? '<span class="sub">Nota ' + esc(p.notaFolio) + '</span>' : '') + '</td>' +
        '<td>' + fechaCorta(p.fecha) + '</td>' +
        '<td>' + esc(p.cliente || '–') + '</td>' +
        '<td class="producto">' + esc(p.producto || '–') + (num(p.extras) ? '<span class="sub">+ ' + esc(p.extrasDetalle || 'extras') + ' ' + dinero(p.extras) + '</span>' : '') + '</td>' +
        '<td>' + selectEstado(p) + '</td>' +
        '<td>' + badgePago(c.pagoCliente) + '</td>' +
        '<td class="num">' + dinero(c.total) + '</td>' +
        '<td class="num' + (c.saldo > 0 ? ' debe' : '') + '">' + dinero(c.saldo) + '</td>' +
        '<td class="num"><b>' + dinero(c.parte) + '</b>' + (c.inter ? '<span class="sub">Interm. −' + dinero(c.inter) + '</span>' : '') + '</td>' +
        '<td>' + badgeMi(c.estadoMi) + '</td>' +
        '<td class="num' + (c.meDebe > 0 ? ' debe' : '') + '">' + dinero(c.meDebe) + '</td></tr>';
    }).join('');
    $('tarjetas').innerHTML = lista.map(function (p) {
      var c = calc(p);
      return '<li class="tarjeta">' +
        '<div class="t-arriba"><strong>' + esc(p.folio + ' · ' + (p.cliente || 'Sin nombre')) + '</strong><button type="button" class="btn btn-claro btn-mini" data-abrir="' + esc(p.id) + '">Abrir</button></div>' +
        '<div class="t-fila">' + esc(fechaCorta(p.fecha)) + ' · ' + esc(p.producto || '–') + '</div>' +
        '<div class="t-fila">' + selectEstado(p) + badgePago(c.pagoCliente) + '</div>' +
        '<div class="t-montos"><div>Total<b>' + dinero(c.total) + '</b></div><div class="' + (c.saldo > 0 ? 'debe' : '') + '">Saldo cliente<b>' + dinero(c.saldo) + '</b></div>' +
        '<div>Mi parte<b>' + dinero(c.parte) + '</b></div><div class="' + (c.meDebe > 0 ? 'debe' : '') + '">Mi mamá me debe<b>' + dinero(c.meDebe) + '</b></div></div></li>';
    }).join('');
  }
  function pintarRegla() {
    $('cfg-modo').value = cfg.modo;
    $('cfg-valor').value = cfg.modo === 'fijo' ? cfg.fijo : cfg.pct;
    $('cfg-unidad').textContent = cfg.modo === 'fijo' ? '$ por pedido' : '%';
    $('regla-txt').textContent = cfg.modo === 'fijo'
      ? 'Mi parte = ' + dinero(cfg.fijo) + ' por pedido (o la que ajustes en cada pedido).'
      : 'Mi parte = ' + cfg.pct + '% × (precio del producto − pago al intermediario). La instalación y el envío no se reparten.';
  }
  var ASESORES = (window.CATALOGO && window.CATALOGO.vendedores) || [];
  var COMIS = (window.CATALOGO && window.CATALOGO.comisiones) || {};
  $('lista-asesores').innerHTML = ASESORES.map(function (v) { return '<option value="' + esc(v.nombre) + '">'; }).join('');
  function deAsesor(p, v) { var i = p.intermediario || {}; return i.codigo === v.codigo || (i.nombre || '').trim().toLowerCase() === v.nombre.toLowerCase(); }
  function pintarAsesores() {
    var base = location.origin + location.pathname.replace(/pedidos\/?(index\.html)?$/, '');
    var porPagarTotal = 0;
    $('asesores-tbody').innerHTML = ASESORES.map(function (v) {
      var ps = pedidos.filter(function (p) { return p.estado !== 'Cancelado' && enPeriodo(p) && deAsesor(p, v); });
      var ventas = ps.reduce(function (s, p) { return s + num(p.precioProducto); }, 0);
      var com = ps.reduce(function (s, p) { return s + num(p.intermediario.monto); }, 0);
      var pag = ps.reduce(function (s, p) { return s + (p.intermediario.pagado ? num(p.intermediario.monto) : 0); }, 0);
      porPagarTotal += com - pag;
      var link = base + v.codigo;
      return '<tr><td><b>' + esc(v.nombre) + '</b></td><td><span class="link-asesor"><code>' + esc(link.replace(/^https?:\/\//, '')) + '</code><button type="button" class="btn-copiar" data-copiar="' + esc(link) + '">Copiar</button></span></td>' +
        '<td class="num">' + ps.length + '</td><td class="num">' + dinero(ventas) + '</td><td class="num">' + dinero(com) + '</td><td class="num">' + dinero(pag) + '</td><td class="num' + (com - pag > 0 ? ' debe' : '') + '">' + dinero(com - pag) + '</td></tr>';
    }).join('');
    $('asesores-sub').textContent = ASESORES.length + ' asesores · Comisiones por pagar: ' + dinero(porPagarTotal);
  }
  $('asesores').addEventListener('click', function (e) {
    var b = e.target.closest('[data-copiar]'); if (!b) return;
    var t = b.getAttribute('data-copiar');
    var ok = function () { b.textContent = '¡Copiado!'; setTimeout(function () { b.textContent = 'Copiar'; }, 1500); };
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(ok, function () { prompt('Copia el link:', t); });
    else prompt('Copia el link:', t);
  });
  function pintar() { pintarKPIs(); pintarChips(); pintarTabla(); pintarRegla(); pintarAsesores(); }
  function guardarTodo() { if (!guardar(S.K, pedidos)) alert('No se pudo guardar en este navegador.'); }

  /* ---------- eventos de la lista ---------- */
  $('buscar').addEventListener('input', function () { filtro.texto = this.value; pintarTabla(); });
  $('f-periodo').addEventListener('change', function () { filtro.periodo = this.value; pintar(); });
  $('f-mama').addEventListener('change', function () { filtro.mama = this.value; pintarTabla(); });
  $('chips-estado').addEventListener('click', function (e) {
    var b = e.target.closest('[data-estado]'); if (!b) return; filtro.estado = b.getAttribute('data-estado'); pintarChips(); pintarTabla();
  });
  function cambiarRegla() {
    cfg.modo = $('cfg-modo').value;
    var v = Math.max(0, num($('cfg-valor').value));
    if (cfg.modo === 'fijo') cfg.fijo = v; else cfg.pct = Math.min(100, v);
    guardar(KC, cfg); pintar();
  }
  $('cfg-modo').addEventListener('change', function () { cfg.modo = this.value; guardar(KC, cfg); pintar(); });
  $('cfg-valor').addEventListener('change', cambiarRegla);
  document.querySelector('.contenedor').addEventListener('change', function (e) {
    var s = e.target.closest('[data-cambiar-estado]'); if (!s) return;
    var p = pedidos.find(function (x) { return x.id === s.getAttribute('data-cambiar-estado'); });
    if (p) { p.estado = s.value; guardarTodo(); pintar(); }
  });
  document.querySelector('.contenedor').addEventListener('click', function (e) {
    if (e.target.closest('select')) return;
    var a = e.target.closest('[data-abrir]'); if (a) abrir(a.getAttribute('data-abrir'));
  });

  /* ---------- editor ---------- */
  var actual = null; // copia de trabajo
  $('m-estado').innerHTML = ESTADOS.map(function (e) { return '<option>' + e + '</option>'; }).join('');
  function abrir(id) {
    var p = id ? pedidos.find(function (x) { return x.id === id; }) : null;
    actual = p ? JSON.parse(JSON.stringify(p)) : S.pedidoVacio();
    actual._nuevo = !p;
    $('m-titulo').textContent = (p ? 'Pedido ' : 'Nuevo pedido ') + actual.folio;
    $('m-fecha').value = actual.fecha || hoy();
    $('m-estado').value = actual.estado || 'Pendiente';
    $('m-entrega').value = actual.entrega || '';
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
    $('m-nota').innerHTML = actual.notaFolio ? 'Viene de la nota <a href="../notas/?abrir=' + encodeURIComponent(actual.notaId) + '">' + esc(actual.notaFolio) + '</a>. Si cambias la nota, el cliente, producto, precios y anticipo se actualizan aquí.' : '';
    $('pg-fecha').value = hoy(); $('pg-monto').value = '';
    $('m-borrar').hidden = !p;
    pintarEditor();
    $('modal').hidden = false;
    $('m-cliente').focus();
  }
  function leerEditor() {
    actual.fecha = $('m-fecha').value; actual.estado = $('m-estado').value; actual.entrega = $('m-entrega').value;
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
    $('m-parte-calc').textContent = dinero(c.parteCalc) + (cfg.modo === 'fijo' ? ' (monto fijo)' : ' (' + cfg.pct + '% de ' + dinero(c.base) + ')');
    $('m-parte').textContent = dinero(c.parte);
    $('m-resumen').innerHTML =
      '<div><span>Total del pedido</span><b>' + dinero(c.total) + '</b></div>' +
      '<div><span>Pagado por el cliente</span><b>' + dinero(c.pagado) + '</b></div>' +
      '<div class="' + (c.saldo > 0 ? 'rojo' : '') + '"><span>Saldo del cliente</span><b>' + dinero(c.saldo) + '</b></div>' +
      '<div><span>Costos</span><b>' + dinero(c.costos) + '</b></div>' +
      '<div><span>Ganancia</span><b>' + dinero(c.ganancia) + '</b></div>' +
      '<div><span>Mi parte</span><b>' + dinero(c.parte) + '</b></div>' +
      '<div class="' + (c.meDebe > 0 ? 'rojo' : '') + '"><span>Mi mamá me debe</span><b>' + dinero(c.meDebe) + '</b></div>' +
      '<div><span>Estado de mi pago</span><b style="font-size:15px">' + esc(c.estadoMi) + '</b></div>';
    $('pg-liquidar').hidden = !(c.saldo > 0);
    var tel = String(actual.tel || '').replace(/\D/g, ''); if (tel.length === 10) tel = '52' + tel;
    $('m-wa').hidden = !(c.saldo > 0 && tel);
    $('m-wa').href = 'https://wa.me/' + tel + '?text=' + encodeURIComponent('Hola' + (actual.cliente ? ' ' + actual.cliente : '') + ', te escribimos de Recoovare sobre tu pedido ' + actual.folio + ' (' + (actual.producto || '') + '). ' +
      (actual.estado === 'Listo para entregar' ? '¡Ya está listo! ' : '') + 'Saldo pendiente: ' + dinero(c.saldo) + '. ¡Gracias!');
  }
  $('form').addEventListener('input', function (e) { if (e.target.closest('.fila-agregar')) return; leerEditor(); pintarEditor(); });
  $('form').addEventListener('change', function (e) {
    if (e.target.id === 'm-mama-pagado' && e.target.checked && !$('m-mama-fecha').value) $('m-mama-fecha').value = hoy();
    if (e.target.closest('.fila-agregar')) return; leerEditor(); pintarEditor();
  });
  $('pg-agregar').addEventListener('click', function () {
    var m = num($('pg-monto').value); if (m <= 0) { $('pg-monto').focus(); return; }
    leerEditor();
    actual.pagos.push({ fecha: $('pg-fecha').value || hoy(), monto: m, metodo: $('pg-metodo').value, concepto: actual.pagos.length ? 'Abono' : 'Anticipo', origen: 'manual' });
    $('pg-monto').value = ''; pintarEditor();
  });
  $('pg-liquidar').addEventListener('click', function () {
    leerEditor(); var c = calc(actual); if (c.saldo <= 0) return;
    actual.pagos.push({ fecha: hoy(), monto: c.saldo, metodo: $('pg-metodo').value, concepto: 'Liquidación', origen: 'manual' });
    pintarEditor();
  });
  $('cs-agregar').addEventListener('click', function () {
    var con = $('cs-concepto').value.trim(), m = num($('cs-monto').value);
    if (!con) { $('cs-concepto').focus(); return; } if (m <= 0) { $('cs-monto').focus(); return; }
    leerEditor(); actual.costos.push({ concepto: con, monto: m });
    $('cs-concepto').value = ''; $('cs-monto').value = ''; pintarEditor();
  });
  $('form').addEventListener('click', function (e) {
    var b;
    if ((b = e.target.closest('[data-quitar-pago]'))) { actual.pagos.splice(Number(b.getAttribute('data-quitar-pago')), 1); pintarEditor(); }
    else if ((b = e.target.closest('[data-quitar-costo]'))) { actual.costos.splice(Number(b.getAttribute('data-quitar-costo')), 1); pintarEditor(); }
  });
  $('form').addEventListener('submit', function (e) {
    e.preventDefault(); leerEditor();
    var nuevo = actual._nuevo; delete actual._nuevo; delete actual._intAntes;
    var i = pedidos.findIndex(function (x) { return x.id === actual.id; });
    if (i >= 0) pedidos[i] = actual; else pedidos.unshift(actual);
    guardarTodo(); cerrar(); pintar();
    if (nuevo) { filtro.estado = 'todos'; pintar(); }
  });
  function cerrar() {
    if (actual && actual._nuevo) { /* el folio ya se usó; se queda reservado */ }
    $('modal').hidden = true; actual = null;
  }
  $('m-cerrar').addEventListener('click', cerrar);
  $('m-borrar').addEventListener('click', function () {
    if (!actual) return;
    if (!confirm('¿Borrar el pedido ' + actual.folio + '? No se puede deshacer.')) return;
    if (actual.notaId) { var ign = leer(S.KI, []); ign.push(actual.notaId); guardar(S.KI, ign); }
    pedidos = pedidos.filter(function (x) { return x.id !== actual.id; });
    guardarTodo(); cerrar(); pintar();
  });
  $('btn-nuevo').addEventListener('click', function () { abrir(null); });

  /* ---------- respaldo y Excel ---------- */
  function descargar(contenido, nombre, tipo) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([contenido], { type: tipo })); a.download = nombre;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }
  $('btn-datos').addEventListener('click', function () { $('modal-datos').hidden = false; $('d-estado').textContent = ''; });
  $('d-cerrar').addEventListener('click', function () { $('modal-datos').hidden = true; });
  $('d-excel').addEventListener('click', function () {
    var cab = ['Folio', 'Fecha del pedido', 'Cliente', 'WhatsApp', 'Producto', 'Estado del pedido', 'Pago del cliente', 'Precio del producto', 'Instalación / envío', 'Total', 'Pagado', 'Saldo cliente',
      'Intermediario', 'Pago al intermediario', 'Base del cálculo', 'Mi parte calculada', 'Mi parte ajustada', 'Mi parte', '¿Ya me pagó mi mamá?', 'Fecha en que me pagó', 'Monto recibido', 'Me debe', 'Estado de mi pago',
      'Costos', 'Ganancia', 'Fecha de entrega', 'Folio de nota', 'Notas'];
    var cel = function (v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var filas = pedidos.slice().sort(function (a, b) { return (a.folio || '').localeCompare(b.folio || ''); }).map(function (p) {
      var c = calc(p);
      return [p.folio, fechaCorta(p.fecha), p.cliente, p.tel, p.producto, p.estado, c.pagoCliente, p.precioProducto, p.extras, c.total, c.pagado, c.saldo,
        p.intermediario && p.intermediario.nombre, c.inter, c.base, c.parteCalc, p.ajuste === null ? '' : p.ajuste, c.parte, p.mama && p.mama.pagado ? 'Sí' : 'No',
        p.mama && p.mama.fecha ? fechaCorta(p.mama.fecha) : '', c.recibido, c.meDebe, c.estadoMi, c.costos, c.ganancia, p.entrega ? fechaCorta(p.entrega) : '', p.notaFolio || '', p.notas].map(cel).join(',');
    });
    descargar('﻿' + [cab.map(cel).join(',')].concat(filas).join('\r\n'), 'RECOOVARE-pedidos-' + hoy() + '.csv', 'text/csv;charset=utf-8');
    $('d-estado').textContent = 'Archivo para Excel descargado.';
  });
  var CLAVES = ['recoovare_pedidos', 'recoovare_folio_pedidos', 'recoovare_pedidos_ignorados', 'recoovare_config_pedidos', 'recoovare_pedidos_init', 'recoovare_notas', 'recoovare_folio', 'recoovare_ajuste_ticket', 'recoovare_ancho'];
  $('d-respaldo').addEventListener('click', function () {
    var datos = { app: 'recoovare', fecha: new Date().toISOString(), datos: {} };
    CLAVES.forEach(function (k) { var v = localStorage.getItem(k); if (v !== null) datos.datos[k] = v; });
    descargar(JSON.stringify(datos, null, 1), 'RECOOVARE-respaldo-' + hoy() + '.json', 'application/json');
    $('d-estado').textContent = 'Respaldo descargado. Guárdalo en un lugar seguro.';
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
        location.reload();
      } catch (e) { $('d-estado').textContent = 'No se pudo restaurar: ' + e.message; $('d-estado').style.color = 'var(--rojo)'; }
    };
    r.readAsText(f);
    this.value = '';
  });

  /* ---------- cerrar con Escape ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!$('modal').hidden) cerrar(); else if (!$('modal-datos').hidden) $('modal-datos').hidden = true;
  });
  [$('modal'), $('modal-datos')].forEach(function (m) { m.addEventListener('click', function (e) { if (e.target === m) { if (m.id === 'modal') cerrar(); else m.hidden = true; } }); });

  // Abrir un pedido desde un link (?abrir=id)
  var q = new URLSearchParams(location.search).get('abrir');
  pintar();
  if (q && pedidos.some(function (p) { return p.id === q; })) abrir(q);
})();
