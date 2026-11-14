/* =====================================================================
   Notas de venta – Recoovare
   Usa los precios y modelos de ../datos.js. Las notas se guardan en este
   navegador (localStorage) y las imágenes de bocetos en IndexedDB.
   ===================================================================== */
(function () {
  var D = window.CATALOGO || { negocio: { nombre: 'Recoovare' }, precios: {}, tipos: {} };
  var NEG = D.negocio || {};
  var DIRECCION = (D.cita && D.cita.direccion) || NEG.ciudad || '';
  var CLAVE_NOTAS = 'recoovare_notas', CLAVE_FOLIO = 'recoovare_folio', CLAVE_BORRADOR = 'recoovare_borrador', CLAVE_ANCHO = 'recoovare_ancho';
  var NOMBRES_FORMA = { ovalada: 'Ovalada', rectangular: 'Rectangular', cuadrada: 'Cuadrada' };
  var INST = { taquetes: { txt: 'Instalación con taquetes y tornillos', precio: 125 }, cemento: { txt: 'Instalación con cemento blanco', precio: 150 } };
  var METODOS = { recoge: 'Recoge en el local', envio: 'Envío a domicilio', instalacion: 'Instalación' };
  var ESTADOS_B = { pendiente: 'Pendiente', revision: 'En revisión', aprobado: 'Aprobado' };
  var Img = window.RecoovareImg;
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- utilidades ---------- */
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
  function dinero(n) {
    n = Math.round(num(n) * 100) / 100;
    return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
  }
  function leer(clave, def) { try { var v = localStorage.getItem(clave); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function guardar(clave, v) { try { localStorage.setItem(clave, JSON.stringify(v)); return true; } catch (e) { mostrarEstado('No se pudo guardar en este navegador.', true); return false; } }
  function hoyISO(dias) { var d = new Date(); d.setDate(d.getDate() + (dias || 0)); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function fechaLarga(iso) {
    if (!iso) return '';
    var p = iso.split('-'); var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    var t = d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  function fechaCorta(iso) { if (!iso) return ''; var p = String(iso).slice(0, 10).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function fechaHora(iso) {
    var d = iso ? new Date(iso) : new Date();
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + d.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
  }
  function telWA(t) { var d = String(t || '').replace(/\D/g, ''); if (d.length === 10) d = '52' + d; return d; }
  function telBonito(t) { var d = String(t || '').replace(/\D/g, '').slice(-10); return d.length === 10 ? d.slice(0, 3) + ' ' + d.slice(3, 6) + ' ' + d.slice(6) : (t || ''); }
  function uid(p) { return (p || 'i') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function mayus(t) { return t ? t.charAt(0).toUpperCase() + t.slice(1) : ''; }
  function mostrarEstado(t, error) { var e = $('estado'); e.textContent = t; e.style.color = error ? 'var(--error)' : ''; clearTimeout(mostrarEstado.t); mostrarEstado.t = setTimeout(function () { e.textContent = ''; }, 7000); }

  /* ---------- catálogo ---------- */
  function buscarModelo(tipo, codigo) {
    var t = D.tipos[tipo]; if (!t) return null;
    var c = String(codigo || '').trim().replace('#', '').toUpperCase();
    if (!c) return null;
    return t.modelos.find(function (m) { return m.codigo.toUpperCase() === c || m.codigo.toUpperCase() === c.padStart(3, '0'); }) || null;
  }
  function formasPara(tipo, modelo) {
    var t = D.tipos[tipo];
    if (t && t.medidas) return t.medidas.slice();
    if (modelo) return [modelo.forma];
    return Object.keys(D.precios);
  }
  function fotoModelo(tipo, m) { var t = D.tipos[tipo]; return t && m ? '../' + t.carpeta + m.foto : ''; }

  /* ---------- la nota ---------- */
  function notaVacia() {
    return { id: 'n' + Date.now(), folio: null, fecha: null, vendedor: '', cliente: { nombre: '', tel: '' }, items: [], pagos: [],
      anticipo: 0, metodo: 'Efectivo', entrega: hoyISO(3), envio: { metodo: 'recoge', direccion: '', costo: '', inst: 'taquetes', ubicacion: '' },
      notas: '', pagado: false, destino: '', pdfBoceto: false };
  }
  // Pone al día notas hechas con la versión anterior (sin perder nada)
  function migrar(n) {
    if (!n) return n;
    n.cliente = n.cliente || { nombre: '', tel: '' };
    n.items = (n.items || []).map(function (it) { it.uid = it.uid || uid('i'); return it; });
    if (!n.envio) {
      n.envio = { metodo: 'recoge', direccion: '', costo: '', inst: 'taquetes', ubicacion: '' };
      n.items.forEach(function (it) {
        if (it.clase !== 'extra' || it.auto) return;
        if (/^instalaci[oó]n con (cemento|taquetes)/i.test(it.desc)) { n.envio.metodo = 'instalacion'; n.envio.inst = /cemento/i.test(it.desc) ? 'cemento' : 'taquetes'; n.envio.ubicacion = it.detalle || ''; it.auto = 'entrega'; }
        else if (/^env[ií]o a domicilio/i.test(it.desc)) { n.envio.metodo = 'envio'; n.envio.costo = it.precio; n.envio.direccion = it.detalle || ''; it.auto = 'entrega'; }
      });
    }
    if (!Array.isArray(n.pagos)) {
      n.pagos = [];
      var f = (n.fecha || new Date().toISOString()).slice(0, 10);
      if (num(n.anticipo) > 0) n.pagos.push({ id: uid('p'), concepto: 'Anticipo', monto: num(n.anticipo), metodo: n.metodo || 'Efectivo', fecha: f });
      if (n.pagado) { var r = totalNota(n) - num(n.anticipo); if (r > 0) n.pagos.push({ id: uid('p'), concepto: 'Liquidación', monto: r, metodo: n.metodo || 'Efectivo', fecha: f }); }
    }
    return n;
  }
  var VENDEDORES = D.vendedores || [], COMISIONES = D.comisiones || {};
  function comisionNota(n) {
    if (!n.vendedor) return 0;
    return n.items.reduce(function (s, it) { return s + (it.clase === 'producto' && it.medida && COMISIONES[it.medida] ? COMISIONES[it.medida] * num(it.cant) : 0); }, 0);
  }
  function sinComision(n) { return n.vendedor && n.items.some(function (it) { return it.clase === 'producto' && !(it.medida && COMISIONES[it.medida]); }); }
  function totalNota(n) { return n.items.reduce(function (s, it) { return s + num(it.cant) * num(it.precio); }, 0); }
  function pagadoNota(n) { return (n.pagos || []).reduce(function (s, p) { return s + num(p.monto); }, 0); }
  function saldoNota(n) { return Math.max(0, totalNota(n) - pagadoNota(n)); }
  // Campos que usan Pedidos y versiones anteriores
  function derivados(n) {
    n.anticipo = n.pagos[0] ? num(n.pagos[0].monto) : 0;
    n.metodo = n.pagos[0] ? n.pagos[0].metodo : 'Efectivo';
    n.pagado = totalNota(n) > 0 && saldoNota(n) <= 0;
    n.comision = comisionNota(n);
  }
  function asesoraNota() { return VENDEDORES.find(function (v) { return v.codigo === nota.vendedor; }) || null; }

  var nota, guardadaJSON = null;
  function json(n) { var c = JSON.parse(JSON.stringify(n)); delete c.destino; return JSON.stringify(c); }
  function copiaGuardada(id) { return leer(CLAVE_NOTAS, []).find(function (x) { return x.id === id; }) || null; }
  function cargar(n) {
    var g = copiaGuardada(n.id);
    var mismo = g && JSON.stringify(g) === JSON.stringify(n);
    nota = migrar(n); derivados(nota);
    // Si viene tal cual de lo guardado, está guardada (aunque se haya puesto al día al abrirla)
    guardadaJSON = mismo ? json(nota) : (g ? json(derivadosCopia(migrar(JSON.parse(JSON.stringify(g))))) : null);
  }
  function derivadosCopia(n) { derivados(n); return n; }
  function sucia() {
    if (guardadaJSON === null) return !!(nota.items.length || nota.cliente.nombre || nota.cliente.tel || nota.pagos.length);
    return json(nota) !== guardadaJSON;
  }

  /* ---------- captura de producto ---------- */
  var cap = { tipo: 'placas', forma: null, idx: null, descEditada: false, editando: null };
  function capLista() {
    var tipo = cap.tipo, m = (tipo === 'placas' || tipo === 'lapidas') ? buscarModelo(tipo, $('p-codigo').value) : null;
    var formas = tipo === 'otro' ? [] : formasPara(tipo === 'propio' ? null : tipo, m);
    if (tipo === 'propio') formas = Object.keys(D.precios);
    return { m: m, formas: formas };
  }
  function pintarCaptura(reiniciarMedida) {
    var tipo = cap.tipo, L = capLista(), m = L.m;
    document.querySelectorAll('#cap-tipo button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-tipo') === tipo)); });
    $('caja-codigo').hidden = !(tipo === 'placas' || tipo === 'lapidas');
    $('caja-forma').hidden = tipo === 'otro' || L.formas.length < 2;
    $('caja-medida').hidden = tipo === 'otro';
    // vista del modelo
    var cod = $('p-codigo').value.trim(), vista = $('p-modelo');
    if (m) vista.innerHTML = '<img src="' + esc(fotoModelo(tipo, m)) + '" alt="" data-ver-src="' + esc(fotoModelo(tipo, m)) + '" data-ver-titulo="' + esc('#' + m.codigo + ' · ' + m.nombre) + '"><div><strong>#' + esc(m.codigo) + ' · ' + esc(m.nombre) + '</strong><small>' + esc(m.categoria) + ' · ' + esc(NOMBRES_FORMA[m.forma] || m.forma) + '</small></div>';
    else vista.innerHTML = cod ? '<span class="no">No encontré ese número en el catálogo. Puedes escribir la descripción a mano.</span>' : '<small>Escribe el número y aquí aparece la foto para confirmar.</small>';
    if (tipo === 'otro') { if (!cap.descEditada && !cap.editando) $('p-desc').value = ''; return; }
    // forma
    if (L.formas.indexOf(cap.forma) < 0) cap.forma = (m && L.formas.indexOf(m.forma) >= 0) ? m.forma : L.formas[0];
    $('p-formas').innerHTML = L.formas.map(function (f) { return '<button type="button" data-forma="' + f + '" aria-pressed="' + (f === cap.forma) + '">' + esc(NOMBRES_FORMA[f] || f) + '</button>'; }).join('');
    // medidas de esa forma
    var lista = D.precios[cap.forma] || [];
    if (reiniciarMedida || cap.idx === null || (cap.idx >= 0 && cap.idx >= lista.length)) {
      var r = lista.findIndex(function (x) { return x.recomendada; }); cap.idx = r >= 0 ? r : 0;
      var sel = lista[cap.idx]; if (sel) $('p-precio').value = sel.precio;
    }
    $('p-medidas').innerHTML = lista.map(function (x, i) {
      return '<button type="button" data-i="' + i + '" aria-pressed="' + (i === cap.idx) + '">' + esc(x.medida) + ' cm<small>' + dinero(x.precio) + '</small>' + (x.recomendada ? '<span class="rec">Recomendada</span>' : '') + '</button>';
    }).join('') + '<button type="button" data-i="-1" aria-pressed="' + (cap.idx === -1) + '">Otra medida<small>precio a mano</small></button>';
    if (!cap.descEditada) $('p-desc').value = descAuto();
  }
  function descAuto() {
    var tipo = cap.tipo, m = capLista().m, t = D.tipos[tipo];
    var sel = cap.idx >= 0 ? (D.precios[cap.forma] || [])[cap.idx] : null;
    var nombre = tipo === 'propio' ? 'Diseño propio ' + (NOMBRES_FORMA[cap.forma] || '').toLowerCase() : (t ? mayus(t.singular) : '') + (m ? ' #' + m.codigo + ' ' + m.nombre : '');
    return nombre + (sel ? ' – ' + sel.medida + ' cm' : '');
  }
  function limpiarCaptura() {
    cap.editando = null; cap.descEditada = false; cap.idx = null;
    $('p-codigo').value = ''; $('p-detalle').value = ''; $('p-cant').value = 1; $('p-error').hidden = true;
    $('captura').classList.remove('editando'); $('cap-titulo').textContent = 'Agregar producto';
    $('btn-agregar').textContent = 'Agregar a la nota ↓'; $('btn-cancelar-edicion').hidden = true;
    pintarCaptura(true);
  }
  function llenarDatalist() {
    var t = D.tipos[cap.tipo];
    $('lista-modelos').innerHTML = t ? t.modelos.filter(function (m) { return !m.oculto; }).map(function (m) { return '<option value="' + esc(m.codigo) + '">' + esc(m.codigo + ' – ' + m.nombre) + '</option>'; }).join('') : '';
  }
  $('cap-tipo').addEventListener('click', function (e) {
    var b = e.target.closest('[data-tipo]'); if (!b) return;
    cap.tipo = b.getAttribute('data-tipo'); cap.descEditada = false; cap.forma = null;
    $('p-codigo').value = ''; if (cap.tipo === 'otro') $('p-precio').value = '';
    llenarDatalist(); pintarCaptura(true);
  });
  $('p-codigo').addEventListener('input', function () { cap.descEditada = false; pintarCaptura(true); });
  $('p-formas').addEventListener('click', function (e) { var b = e.target.closest('[data-forma]'); if (!b) return; cap.forma = b.getAttribute('data-forma'); pintarCaptura(true); });
  $('p-medidas').addEventListener('click', function (e) {
    var b = e.target.closest('[data-i]'); if (!b) return;
    cap.idx = Number(b.getAttribute('data-i'));
    var sel = (D.precios[cap.forma] || [])[cap.idx];
    if (sel) $('p-precio').value = sel.precio; else { $('p-precio').value = ''; }
    pintarCaptura(false);
    if (cap.idx === -1) { $('p-desc').focus(); }
  });
  $('p-desc').addEventListener('input', function () { cap.descEditada = true; });

  $('btn-agregar').addEventListener('click', function () {
    var desc = $('p-desc').value.trim(), err = $('p-error');
    if (!desc) { err.textContent = 'Escribe la descripción del producto.'; err.hidden = false; $('p-desc').focus(); return; }
    if ($('p-precio').value === '') { err.textContent = 'Escribe el precio.'; err.hidden = false; $('p-precio').focus(); return; }
    var m = capLista().m;
    var sel = cap.tipo !== 'otro' && cap.idx >= 0 ? (D.precios[cap.forma] || [])[cap.idx] : null;
    var datos = {
      desc: desc, detalle: $('p-detalle').value.trim(), cant: Math.max(1, Math.round(num($('p-cant').value) || 1)), precio: num($('p-precio').value),
      clase: cap.tipo === 'otro' ? 'extra' : 'producto', tipo: cap.tipo, codigo: m ? m.codigo : '', forma: cap.tipo === 'otro' ? '' : cap.forma,
      medida: sel ? sel.medida : '', descManual: cap.descEditada
    };
    if (cap.editando) {
      var it = nota.items.find(function (x) { return x.uid === cap.editando; });
      if (it) Object.assign(it, datos);
      mostrarEstado('Producto actualizado.');
    } else {
      datos.uid = uid('i');
      // los productos van antes de los conceptos automáticos de instalación/envío
      var pos = nota.items.findIndex(function (x) { return x.auto; });
      if (pos < 0) nota.items.push(datos); else nota.items.splice(pos, 0, datos);
    }
    limpiarCaptura(); cambio();
  });
  $('btn-cancelar-edicion').addEventListener('click', function () { limpiarCaptura(); pintar(); });
  function editarItem(it) {
    cap.editando = it.uid; cap.tipo = it.tipo || (it.clase === 'extra' ? 'otro' : (/^l[áa]pida/i.test(it.desc) ? 'lapidas' : /^dise/i.test(it.desc) ? 'propio' : 'placas'));
    llenarDatalist();
    $('p-codigo').value = it.codigo || '';
    cap.forma = it.forma || null;
    var lista = D.precios[cap.forma] || [];
    var i = lista.findIndex(function (x) { return x.medida === it.medida; });
    cap.idx = it.medida ? i : (it.clase === 'extra' ? null : -1);
    cap.descEditada = true;
    pintarCaptura(false);
    $('p-desc').value = it.desc; $('p-detalle').value = it.detalle || ''; $('p-cant').value = it.cant; $('p-precio').value = it.precio;
    $('captura').classList.add('editando'); $('cap-titulo').textContent = 'Editando: ' + it.desc;
    $('btn-agregar').textContent = 'Guardar cambios del producto'; $('btn-cancelar-edicion').hidden = false;
    $('captura').scrollIntoView({ behavior: 'smooth', block: 'start' });
    pintar();
  }

  /* ---------- lista de productos y bocetos ---------- */
  var abiertos = {};
  function bocetoDe(it) {
    if (!it.boceto) it.boceto = { estado: 'pendiente', versiones: [], aprobadaId: null, aprobadoFecha: '', textos: '', indicaciones: '' };
    return it.boceto;
  }
  function htmlBoceto(it) {
    var b = bocetoDe(it);
    var ap = b.versiones.find(function (v) { return v.id === b.aprobadaId; });
    return '<div class="boceto" data-boceto="' + esc(it.uid) + '">' +
      '<div class="boceto-cab"><h4>Boceto</h4><div class="seg" role="group" aria-label="Estado del boceto">' +
        Object.keys(ESTADOS_B).map(function (k) { return '<button type="button" data-best="' + k + '" aria-pressed="' + (b.estado === k) + '">' + ESTADOS_B[k] + '</button>'; }).join('') +
      '</div></div>' +
      (b.estado === 'aprobado' && b.aprobadoFecha ? '<p class="aprob">✓ Aprobado el ' + esc(fechaCorta(b.aprobadoFecha)) + (ap ? ' · versión V' + ap.n : '') + '</p>' :
        (ap ? '<p class="aprob">Antes se aprobó la versión V' + ap.n + (b.aprobadoFecha ? ' (' + esc(fechaCorta(b.aprobadoFecha)) + ')' : '') + '</p>' : '')) +
      '<div class="versiones">' +
        b.versiones.slice().reverse().map(function (v) {
          var esAp = v.id === b.aprobadaId;
          return '<div class="version' + (esAp ? ' aprobada' : '') + '"><img data-img="' + esc(v.id) + '" alt="Boceto versión ' + v.n + '" data-ver-titulo="' + esc(it.desc + ' · V' + v.n) + '">' +
            '<div class="version-pie"><span><b>V' + v.n + '</b> · ' + esc(fechaCorta(v.fecha)) + '</span>' +
            (esAp ? '<span class="ok">✓ Aprobada</span>' : '<button type="button" class="btn-texto" data-aprobar="' + esc(v.id) + '">Marcar como aprobada</button>') + '</div></div>';
        }).join('') +
        '<label class="subir">+ Subir ' + (b.versiones.length ? 'nueva versión (V' + (b.versiones.length + 1) + ')' : 'imagen del boceto') + '<input type="file" accept="image/*" data-subir="' + esc(it.uid) + '"></label>' +
      '</div>' +
      '<div class="fila-2">' +
        '<div class="campo"><label>Textos exactos</label><textarea data-bcampo="textos" placeholder="Tal como deben ir: nombres, fechas, frase…">' + esc(b.textos) + '</textarea></div>' +
        '<div class="campo"><label>Indicaciones del cliente</label><textarea data-bcampo="indicaciones" placeholder="Colores, cambios, tipo de letra…">' + esc(b.indicaciones) + '</textarea></div>' +
      '</div></div>';
  }
  function pintarLista() {
    var ul = $('lista-items');
    ul.innerHTML = nota.items.map(function (it) {
      var m = it.codigo ? buscarModelo(it.tipo, it.codigo) : null;
      var foto = m ? fotoModelo(it.tipo, m) : '';
      var b = it.clase === 'producto' ? bocetoDe(it) : null;
      var abierto = abiertos[it.uid];
      return '<li class="item' + (cap.editando === it.uid ? ' en-edicion' : '') + '"><div class="item-fila">' +
        (foto ? '<img class="item-foto" src="' + esc(foto) + '" alt="" data-ver-src="' + esc(foto) + '" data-ver-titulo="' + esc(it.desc) + '">' : '<span class="item-foto vacia">' + (it.auto ? '🚚' : '—') + '</span>') +
        '<div class="item-texto"><strong>' + esc(it.cant + ' × ' + it.desc) + '</strong>' +
          (it.detalle ? '<small>' + esc(it.detalle) + '</small>' : '') +
          (it.cant > 1 ? '<small>' + dinero(it.precio) + ' c/u</small>' : '') +
          (it.auto ? '<span class="item-tag">Desde “Instalación y entrega”</span>' : '') + '</div>' +
        '<div class="item-der"><span class="item-importe">' + dinero(num(it.cant) * num(it.precio)) + '</span>' +
          (b ? '<span class="b-estado ' + b.estado + '">Boceto: ' + ESTADOS_B[b.estado] + (b.versiones.length ? ' · V' + b.versiones.length : '') + '</span>' : '') +
          '<div class="item-acciones">' +
            (b ? '<button type="button" class="btn-texto" data-toggle-boceto="' + esc(it.uid) + '">' + (abierto ? 'Ocultar boceto' : 'Boceto') + '</button>' : '') +
            (it.auto ? '' : '<button type="button" class="btn-texto" data-editar="' + esc(it.uid) + '">Editar</button><button type="button" class="btn-texto rojo" data-quitar="' + esc(it.uid) + '">Quitar</button>') +
          '</div></div></div>' +
        (b && abierto ? htmlBoceto(it) : '') + '</li>';
    }).join('');
    $('items-vacio').hidden = nota.items.length > 0;
    $('lista-total').textContent = nota.items.length ? 'Total ' + dinero(totalNota(nota)) : '';
    cargarImagenes(ul);
  }
  function cargarImagenes(raiz) {
    if (!Img) return;
    raiz.querySelectorAll('img[data-img]').forEach(function (im) {
      Img.leer(im.getAttribute('data-img')).then(function (d) { if (d) { im.src = d; im.setAttribute('data-ver-src', d); } }).catch(function () {});
    });
  }
  function itemPorUid(u) { return nota.items.find(function (x) { return x.uid === u; }); }
  $('lista-items').addEventListener('click', function (e) {
    var b;
    if ((b = e.target.closest('[data-quitar]'))) {
      var it = itemPorUid(b.getAttribute('data-quitar'));
      if (it && it.boceto && it.boceto.versiones.length && !confirm('Este producto tiene bocetos guardados. ¿Quitarlo de la nota?')) return;
      nota.items = nota.items.filter(function (x) { return x !== it; });
      if (cap.editando === (it && it.uid)) limpiarCaptura();
      cambio(); return;
    }
    if ((b = e.target.closest('[data-editar]'))) { editarItem(itemPorUid(b.getAttribute('data-editar'))); return; }
    if ((b = e.target.closest('[data-toggle-boceto]'))) { var u = b.getAttribute('data-toggle-boceto'); abiertos[u] = !abiertos[u]; pintarLista(); return; }
    var caja = e.target.closest('[data-boceto]'); if (!caja) return;
    var itb = itemPorUid(caja.getAttribute('data-boceto')), bo = bocetoDe(itb);
    if ((b = e.target.closest('[data-best]'))) {
      bo.estado = b.getAttribute('data-best');
      if (bo.estado === 'aprobado') { bo.aprobadoFecha = hoyISO(); if (!bo.aprobadaId && bo.versiones.length) bo.aprobadaId = bo.versiones[bo.versiones.length - 1].id; }
      cambio(); return;
    }
    if ((b = e.target.closest('[data-aprobar]'))) { bo.aprobadaId = b.getAttribute('data-aprobar'); bo.estado = 'aprobado'; bo.aprobadoFecha = hoyISO(); cambio(); return; }
  });
  $('lista-items').addEventListener('input', function (e) {
    var t = e.target.closest('[data-bcampo]'); if (!t) return;
    var itb = itemPorUid(t.closest('[data-boceto]').getAttribute('data-boceto'));
    bocetoDe(itb)[t.getAttribute('data-bcampo')] = t.value;
    cambio(true, true);
  });
  $('lista-items').addEventListener('change', function (e) {
    var inp = e.target.closest('[data-subir]'); if (!inp || !inp.files || !inp.files[0]) return;
    var itb = itemPorUid(inp.getAttribute('data-subir')), bo = bocetoDe(itb);
    if (!Img) { mostrarEstado('Este navegador no permite guardar imágenes.', true); return; }
    mostrarEstado('Guardando imagen…');
    reducir(inp.files[0]).then(function (data) {
      var id = uid('b');
      return Img.poner(id, data).then(function () {
        bo.versiones.push({ id: id, n: bo.versiones.length + 1, fecha: hoyISO() });
        if (bo.estado === 'pendiente' || bo.estado === 'aprobado') bo.estado = 'revision';
        abiertos[itb.uid] = true; cambio(); mostrarEstado('Boceto V' + bo.versiones.length + ' guardado. Recuerda guardar la nota.');
      });
    }).catch(function (er) { mostrarEstado('No se pudo guardar la imagen: ' + (er && er.message || er), true); });
  });
  // Reduce la imagen a un tamaño de pantalla para que pese poco
  function reducir(file) {
    return new Promise(function (ok, mal) {
      var r = new FileReader();
      r.onload = function () {
        var im = new Image();
        im.onload = function () {
          var max = 1600, s = Math.min(1, max / Math.max(im.width, im.height));
          var c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
          var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
          ok(c.toDataURL('image/jpeg', 0.85));
        };
        im.onerror = function () { mal(new Error('El archivo no es una imagen válida')); };
        im.src = r.result;
      };
      r.onerror = function () { mal(r.error); };
      r.readAsDataURL(file);
    });
  }

  /* ---------- cliente ---------- */
  $('c-vendedor').innerHTML = '<option value="">Ninguno (venta directa)</option>' + VENDEDORES.map(function (v) { return '<option value="' + esc(v.codigo) + '">' + esc(v.nombre) + '</option>'; }).join('');
  ['c-nombre', 'c-tel', 'c-vendedor'].forEach(function (id) {
    $(id).addEventListener('input', function () { nota.cliente.nombre = $('c-nombre').value.trim(); nota.cliente.tel = $('c-tel').value.trim(); nota.vendedor = $('c-vendedor').value; cambio(true); });
  });
  $('c-vendedor').addEventListener('change', function () { nota.vendedor = this.value; nota.destino = ''; cambio(true); });

  /* ---------- instalación y entrega ---------- */
  function aplicarEntrega() {
    nota.items = nota.items.filter(function (x) { return x.auto !== 'entrega'; });
    var e = nota.envio;
    if (e.metodo === 'envio' && num(e.costo) > 0) nota.items.push({ uid: 'auto-envio', auto: 'entrega', clase: 'extra', desc: 'Envío a domicilio', detalle: e.direccion || '', cant: 1, precio: num(e.costo) });
    if (e.metodo === 'instalacion') { var t = INST[e.inst] || INST.taquetes; nota.items.push({ uid: 'auto-inst', auto: 'entrega', clase: 'extra', desc: t.txt, detalle: e.ubicacion || '', cant: 1, precio: t.precio }); }
  }
  function pintarEntrega() {
    var e = nota.envio;
    document.querySelectorAll('#e-metodo button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-metodo') === e.metodo)); });
    document.querySelectorAll('#e-insttipo button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-inst') === e.inst)); });
    $('e-envio').hidden = e.metodo !== 'envio'; $('e-inst').hidden = e.metodo !== 'instalacion';
    $('e-ayuda').textContent = e.metodo === 'recoge' ? 'El cliente pasa a recogerla a ' + (DIRECCION || 'el local') + '.' :
      e.metodo === 'envio' ? (num(e.costo) > 0 ? 'El envío se agrega a la nota como concepto aparte.' : 'Escribe el costo del envío para que se sume a la nota.') :
      'La instalación se agrega a la nota como concepto aparte; el traslado va incluido.';
  }
  function escribirEntrega() {
    var e = nota.envio;
    $('e-costo').value = e.costo === '' ? '' : e.costo; $('e-direccion').value = e.direccion || ''; $('e-ubicacion').value = e.ubicacion || '';
    $('pg-entrega').value = nota.entrega || ''; $('pg-notas').value = nota.notas || '';
  }
  $('e-metodo').addEventListener('click', function (ev) { var b = ev.target.closest('[data-metodo]'); if (!b) return; nota.envio.metodo = b.getAttribute('data-metodo'); aplicarEntrega(); cambio(true); });
  $('e-insttipo').addEventListener('click', function (ev) { var b = ev.target.closest('[data-inst]'); if (!b) return; nota.envio.inst = b.getAttribute('data-inst'); aplicarEntrega(); cambio(true); });
  ['e-costo', 'e-direccion', 'e-ubicacion'].forEach(function (id) {
    $(id).addEventListener('input', function () { nota.envio.costo = $('e-costo').value; nota.envio.direccion = $('e-direccion').value.trim(); nota.envio.ubicacion = $('e-ubicacion').value.trim(); aplicarEntrega(); cambio(true); });
  });
  ['pg-entrega', 'pg-notas'].forEach(function (id) {
    $(id).addEventListener('input', function () { nota.entrega = $('pg-entrega').value; nota.notas = $('pg-notas').value.trim(); cambio(true); });
  });

  /* ---------- pagos ---------- */
  function sugerirPago() {
    var hay = nota.pagos.length;
    $('pg-concepto').value = hay ? 'Abono' : 'Anticipo';
    $('pg-monto').value = hay ? (saldoNota(nota) || '') : (NEG.anticipo || '');
    $('pg-fecha').value = hoyISO();
  }
  $('pg-concepto').addEventListener('change', function () { if (this.value === 'Liquidación') $('pg-monto').value = saldoNota(nota) || ''; });
  $('btn-pago').addEventListener('click', function () {
    var m = num($('pg-monto').value);
    if (m <= 0) { mostrarEstado('Escribe el monto del pago.', true); $('pg-monto').focus(); return; }
    nota.pagos.push({ id: uid('p'), concepto: $('pg-concepto').value, monto: m, metodo: $('pg-metodo').value, fecha: $('pg-fecha').value || hoyISO() });
    cambio(true); sugerirPago(); mostrarEstado('Pago registrado. Recuerda guardar la nota.');
  });
  $('pagos').addEventListener('click', function (e) {
    var b = e.target.closest('[data-quitar-pago]'); if (!b) return;
    var p = nota.pagos.find(function (x) { return x.id === b.getAttribute('data-quitar-pago'); });
    if (!p || !confirm('¿Quitar el pago de ' + dinero(p.monto) + ' (' + p.concepto + ')?')) return;
    nota.pagos = nota.pagos.filter(function (x) { return x !== p; }); cambio(true); sugerirPago();
  });
  function pintarPagos() {
    var tot = totalNota(nota), pag = pagadoNota(nota), sal = saldoNota(nota);
    $('k-total').textContent = dinero(tot); $('k-pagado').textContent = dinero(pag); $('k-saldo').textContent = dinero(sal);
    $('k-saldo-caja').classList.toggle('cero', tot > 0 && sal <= 0);
    $('pagos').innerHTML = nota.pagos.length ? nota.pagos.map(function (p) {
      return '<li class="pago"><div class="p-info"><strong>' + esc(p.concepto) + '</strong><small>' + esc(fechaCorta(p.fecha) + ' · ' + p.metodo) + '</small></div>' +
        '<span class="p-monto">' + dinero(p.monto) + '</span><button type="button" class="btn-texto rojo" data-quitar-pago="' + esc(p.id) + '">Quitar</button></li>';
    }).join('') : '<li class="vacio">Todavía no hay pagos registrados.</li>';
    if (pag > tot && tot > 0) mostrarEstado('Ojo: lo pagado es mayor que el total.', true);
  }

  /* ---------- contenido del ticket (vista, impresión y PDF) ---------- */
  function partesTicket(n) {
    var P = [];
    P.push({ t: 'logo' });
    P.push({ t: 'centro', txt: 'Placas domiciliarias y lápidas' });
    if (DIRECCION) P.push({ t: 'centro', txt: DIRECCION });
    if (NEG.whatsappVisible) P.push({ t: 'centro', txt: 'WhatsApp: ' + NEG.whatsappVisible });
    P.push({ t: 'linea' });
    P.push({ t: 'fila', a: 'NOTA DE VENTA', b: n.folio ? 'Folio ' + n.folio : 'Sin folio', negrita: true });
    P.push({ t: 'texto', txt: 'Fecha: ' + fechaHora(n.fecha) });
    if (n.cliente.nombre) P.push({ t: 'texto', txt: 'Cliente: ' + n.cliente.nombre });
    if (n.cliente.tel) P.push({ t: 'texto', txt: 'Tel: ' + n.cliente.tel });
    P.push({ t: 'linea' });
    if (!n.items.length) P.push({ t: 'texto', txt: '(sin productos)' });
    n.items.forEach(function (it) {
      P.push({ t: 'fila', a: it.cant + ' x ' + it.desc, b: dinero(num(it.cant) * num(it.precio)), negrita: true });
      if (it.cant > 1) P.push({ t: 'detalle', txt: dinero(it.precio) + ' c/u' });
      if (it.detalle) P.push({ t: 'detalle', txt: it.detalle });
    });
    P.push({ t: 'linea' });
    P.push({ t: 'fila', a: 'TOTAL', b: dinero(totalNota(n)), grande: true });
    (n.pagos || []).forEach(function (p) { P.push({ t: 'fila', a: p.concepto + ' ' + fechaCorta(p.fecha).slice(0, 5) + ' (' + p.metodo + ')', b: dinero(p.monto) }); });
    if (totalNota(n) > 0 && saldoNota(n) <= 0) P.push({ t: 'pagado', txt: 'PAGADO' });
    else P.push({ t: 'fila', a: 'SALDO PENDIENTE', b: dinero(saldoNota(n)), negrita: true });
    P.push({ t: 'linea' });
    var e = n.envio || {};
    if (n.entrega || e.metodo) P.push({ t: 'texto', txt: 'Entrega: ' + (METODOS[e.metodo] || '') + (n.entrega ? ' · ' + fechaLarga(n.entrega) : ''), negrita: true });
    if (n.notas) P.push({ t: 'texto', txt: 'Notas: ' + n.notas });
    P.push({ t: 'espacio' });
    P.push({ t: 'centro', txt: 'Conserva esta nota para recoger tu pedido.' });
    P.push({ t: 'centro', txt: '¡Gracias por tu preferencia!', negrita: true });
    return P;
  }
  function htmlTicket(n) {
    return '<div class="ticket">' + partesTicket(n).map(function (p) {
      var cls = p.negrita ? ' t-negrita' : '';
      switch (p.t) {
        case 'logo': return '<img class="t-logo" src="../fotos/logo.png" alt="' + esc(NEG.nombre || 'Recoovare') + '">';
        case 'centro': return '<p class="t-centro' + cls + '">' + esc(p.txt) + '</p>';
        case 'linea': return '<div class="t-linea"></div>';
        case 'fila': return '<div class="t-fila' + cls + (p.grande ? ' t-grande' : '') + '"><span>' + esc(p.a) + '</span><span>' + esc(p.b) + '</span></div>';
        case 'detalle': return '<p class="t-detalle">' + esc(p.txt) + '</p>';
        case 'pagado': return '<p class="t-pagado">' + esc(p.txt) + '</p>';
        case 'espacio': return '<p>&nbsp;</p>';
        default: return '<p class="' + cls.trim() + '">' + esc(p.txt) + '</p>';
      }
    }).join('') + '</div>';
  }

  /* ---------- pintar todo ---------- */
  function escribirFormulario() {
    $('c-nombre').value = nota.cliente.nombre || ''; $('c-tel').value = nota.cliente.tel || ''; $('c-vendedor').value = nota.vendedor || '';
    escribirEntrega();
  }
  function bocetosAprobados() { return nota.items.filter(function (it) { return it.boceto && it.boceto.aprobadaId; }); }
  function pintarDestinos() {
    var a = asesoraNota(), tel = nota.cliente.tel;
    if (!nota.destino) nota.destino = a ? 'asesora' : 'cliente';
    if (nota.destino === 'asesora' && !a) nota.destino = 'cliente';
    var op = [{ k: 'cliente', t: 'Cliente', s: (nota.cliente.nombre || 'Sin nombre') + (tel ? ' · ' + telBonito(tel) : ' · sin WhatsApp (elegirás el chat)'), off: !tel }];
    if (a) op.push({ k: 'asesora', t: 'Asesora', s: a.nombre + ' · ' + telBonito(a.whatsapp) + ' (se lo reenvía al cliente)' });
    $('destinos').innerHTML = op.map(function (o) {
      return '<label class="destino' + (o.off ? ' sin-tel' : '') + '"><input type="radio" name="destino" value="' + o.k + '"' + (nota.destino === o.k ? ' checked' : '') + '><span><strong>' + o.t + '</strong><small>' + esc(o.s) + '</small></span></label>';
    }).join('');
    var dest = nota.destino === 'asesora' && a ? a.nombre.split(' ')[0] : (nota.cliente.nombre ? nota.cliente.nombre.split(' ')[0] : 'el cliente');
    $('btn-compartir').textContent = 'Compartir por WhatsApp con ' + dest;
  }
  $('destinos').addEventListener('change', function (e) { if (e.target.name === 'destino') { nota.destino = e.target.value; pintarDestinos(); guardar(CLAVE_BORRADOR, nota); } });
  $('incluir-boceto').addEventListener('change', function () { nota.pdfBoceto = this.checked; cambio(true); });

  function pintarEncabezado() {
    $('h-folio').textContent = nota.folio ? 'Nota ' + nota.folio : 'Nota nueva';
    var modo = $('h-modo'); modo.textContent = nota.folio ? 'Editando' : 'Nueva'; modo.classList.toggle('editando', !!nota.folio);
    var g = $('h-guardado'), s = sucia();
    g.className = 'guardado ' + (s ? 'pendiente' : 'ok');
    g.textContent = s ? '● Cambios sin guardar' : (nota.folio ? '✓ Guardada' : '');
    if (!s && !nota.folio) g.className = 'guardado';
    document.title = (s ? '• ' : '') + (nota.folio ? 'Nota ' + nota.folio : 'Nota nueva') + ' – Recoovare';
  }
  function pintar() {
    derivados(nota);
    pintarLista(); pintarEntrega(); pintarPagos(); pintarEncabezado(); pintarDestinos();
    $('ticket-vista').innerHTML = htmlTicket(nota);
    var vend = asesoraNota(), ci = $('comision-info');
    ci.hidden = !vend;
    if (vend) ci.textContent = 'Comisión de ' + vend.nombre + ': ' + dinero(nota.comision) + (sinComision(nota) ? ' (hay una medida especial: pon su comisión a mano en Pedidos)' : '') + '. No aparece en el ticket.';
    var hayAp = bocetosAprobados().length > 0;
    $('caja-incluir').hidden = !hayAp; $('incluir-boceto').checked = !!nota.pdfBoceto && hayAp;
  }
  // cambio(sinFormulario, sinRepintarLista)
  function cambio(sinFormulario, soloEncabezado) {
    if (!sinFormulario) escribirFormulario();
    derivados(nota);
    guardar(CLAVE_BORRADOR, nota);
    if (soloEncabezado) { pintarEncabezado(); return; }
    pintar();
  }

  /* ---------- guardar ---------- */
  function guardarNota(silencioso) {
    derivados(nota);
    if (!nota.folio) {
      var f = (leer(CLAVE_FOLIO, 0) || 0) + 1;
      guardar(CLAVE_FOLIO, f);
      nota.folio = 'R-' + String(f).padStart(4, '0');
      nota.fecha = new Date().toISOString();
    }
    var todas = leer(CLAVE_NOTAS, []);
    var i = todas.findIndex(function (x) { return x.id === nota.id; });
    var copia = JSON.parse(JSON.stringify(nota));
    if (i >= 0) todas[i] = copia; else todas.unshift(copia);
    if (!guardar(CLAVE_NOTAS, todas)) return false;
    guardar(CLAVE_BORRADOR, nota);
    guardadaJSON = json(nota);
    var ped = window.RecoovareSync ? window.RecoovareSync.desdeNota(nota) : null;
    pintar();
    var av = $('aviso');
    if (ped) { av.hidden = false; av.innerHTML = esc('Nota ' + nota.folio + ' guardada · Pedido ' + ped.folio + ' actualizado. ') + '<a href="../pedidos/?abrir=' + encodeURIComponent(ped.id) + '">Ver en Pedidos</a>'; }
    if (!silencioso) mostrarEstado('Nota ' + nota.folio + ' guardada.');
    return true;
  }
  function validarNota() {
    if (!nota.items.length) { mostrarEstado('Agrega al menos un producto a la nota.', true); $('p-codigo').focus(); return false; }
    return true;
  }
  $('btn-guardar').addEventListener('click', function () { if (validarNota()) guardarNota(); });
  $('btn-guardar2').addEventListener('click', function () { if (validarNota()) guardarNota(); });
  window.addEventListener('beforeunload', function (e) { if (sucia() && nota.folio) { e.preventDefault(); e.returnValue = ''; } });
  document.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (validarNota()) guardarNota(); } });

  /* ---------- imprimir ---------- */
  var ancho = String(leer(CLAVE_ANCHO, '80'));
  var ajustes = leer('recoovare_ajuste_ticket', {});
  function ajusteDe(a) { var d = a === '58' ? { ancho: 46, margen: 0 } : { ancho: 70, margen: 0 }; return Object.assign(d, ajustes[a] || {}); }
  function aplicarAjuste() {
    var aj = ajusteDe(ancho);
    document.documentElement.style.setProperty('--ancho-ticket', aj.ancho + 'mm');
    document.documentElement.style.setProperty('--margen-ticket', aj.margen + 'mm');
    $('aj-ancho').value = aj.ancho; $('aj-margen').value = aj.margen;
  }
  function ponerAncho(a) { ancho = a; document.body.classList.toggle('ancho-58', a === '58'); document.body.classList.toggle('ancho-80', a !== '58'); $('ancho').value = a; guardar(CLAVE_ANCHO, a); aplicarAjuste(); }
  $('ancho').addEventListener('change', function () { ponerAncho(this.value); });
  function guardarAjuste() {
    var an = Math.min(80, Math.max(30, num($('aj-ancho').value) || ajusteDe(ancho).ancho));
    var mg = Math.min(10, Math.max(0, num($('aj-margen').value)));
    ajustes[ancho] = { ancho: an, margen: mg }; guardar('recoovare_ajuste_ticket', ajustes); aplicarAjuste();
  }
  $('aj-ancho').addEventListener('change', guardarAjuste);
  $('aj-margen').addEventListener('change', guardarAjuste);
  $('btn-imprimir').addEventListener('click', function () {
    if (!validarNota()) return;
    if (!guardarNota(true)) return;
    var caja = $('ticket-imprimir');
    caja.innerHTML = htmlTicket(nota);
    var img = caja.querySelector('img');
    var lanzar = function () {
      caja.style.cssText = 'display:block;position:absolute;left:-9999px;top:0';
      var altoMM = Math.ceil(caja.querySelector('.ticket').getBoundingClientRect().height * 25.4 / 96) + 6;
      caja.style.cssText = '';
      var est = $('estilo-pagina') || document.head.appendChild(Object.assign(document.createElement('style'), { id: 'estilo-pagina' }));
      est.textContent = '@media print { @page { size: ' + (ancho === '58' ? 58 : 80) + 'mm ' + altoMM + 'mm; margin: 0; } }';
      window.print();
      mostrarEstado('Nota ' + nota.folio + ' guardada e impresa.');
    };
    if (img && !img.complete) { img.onload = img.onerror = lanzar; } else lanzar();
  });

  /* ---------- PDF ---------- */
  var logoData = null;
  (function cargarLogo() {
    var im = new Image();
    im.onload = function () {
      try {
        var c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
        var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0);
        logoData = { url: c.toDataURL('image/jpeg', 0.92), r: im.naturalHeight / im.naturalWidth };
      } catch (e) { logoData = null; }
    };
    im.src = '../fotos/logo.png';
  })();
  function medidasImagen(data) { return new Promise(function (ok) { var im = new Image(); im.onload = function () { ok({ w: im.naturalWidth, h: im.naturalHeight }); }; im.onerror = function () { ok(null); }; im.src = data; }); }
  // Devuelve una promesa con el documento (las imágenes de boceto se leen de IndexedDB)
  function hacerPDF(n) {
    var jsPDF = window.jspdf && window.jspdf.jsPDF;
    if (!jsPDF) return Promise.reject(new Error('No cargó la librería de PDF'));
    var W = ancho === '58' ? 58 : 80, M = 5, ANCHO = W - 2 * M;
    var base = ancho === '58' ? 8 : 9.5;
    var LH = base * 0.42;
    function dibujar(doc, real) {
      var y = M + 1;
      partesTicket(n).forEach(function (p) {
        doc.setFont('helvetica', p.negrita || p.grande ? 'bold' : 'normal');
        doc.setFontSize(p.grande ? base * 1.25 : base);
        var lh = p.grande ? LH * 1.25 : LH;
        if (p.t === 'logo') {
          if (logoData) { var lw = ANCHO * 0.7, lhh = lw * logoData.r; if (real) doc.addImage(logoData.url, 'JPEG', (W - lw) / 2, y, lw, lhh); y += lhh + 2; }
          else { doc.setFont('helvetica', 'bold'); doc.setFontSize(base * 1.6); if (real) doc.text(NEG.nombre || 'Recoovare', W / 2, y + 5, { align: 'center' }); y += 8; }
        } else if (p.t === 'centro') {
          doc.splitTextToSize(p.txt, ANCHO).forEach(function (l) { y += lh; if (real) doc.text(l, W / 2, y, { align: 'center' }); });
        } else if (p.t === 'linea') {
          y += 2; if (real) { doc.setLineDashPattern([0.8, 0.8], 0); doc.setLineWidth(0.2); doc.line(M, y, W - M, y); doc.setLineDashPattern([], 0); } y += 1;
        } else if (p.t === 'fila') {
          var bw = doc.getTextWidth(p.b) + 2;
          var lineas = doc.splitTextToSize(p.a, ANCHO - bw);
          lineas.forEach(function (l, i) { y += lh; if (real) { doc.text(l, M, y); if (i === 0) doc.text(p.b, W - M, y, { align: 'right' }); } });
        } else if (p.t === 'detalle') {
          doc.splitTextToSize(p.txt, ANCHO - 3).forEach(function (l) { y += lh; if (real) doc.text(l, M + 3, y); });
        } else if (p.t === 'pagado') {
          doc.setFont('helvetica', 'bold'); doc.setFontSize(base * 1.6);
          y += 2; if (real) { doc.setLineWidth(0.5); doc.rect(M + 4, y, ANCHO - 8, 9); doc.text(p.txt, W / 2, y + 6.4, { align: 'center' }); } y += 10;
        } else if (p.t === 'espacio') {
          y += lh * 0.8;
        } else {
          doc.splitTextToSize(p.txt, ANCHO).forEach(function (l) { y += lh; if (real) doc.text(l, M, y); });
        }
      });
      return y + M + 2;
    }
    var medir = new jsPDF({ unit: 'mm', format: [W, 300] });
    var alto = Math.max(60, dibujar(medir, false));
    var doc = new jsPDF({ unit: 'mm', format: [W, alto] });
    doc.setProperties({ title: 'Nota ' + (n.folio || '') + ' – ' + (NEG.nombre || 'Recoovare') });
    dibujar(doc, true);
    var conBoceto = n.pdfBoceto ? n.items.filter(function (it) { return it.boceto && it.boceto.aprobadaId; }) : [];
    if (!conBoceto.length || !Img) return Promise.resolve(doc);
    // Una página por boceto aprobado, del mismo ancho que el ticket
    return conBoceto.reduce(function (pr, it) {
      return pr.then(function () {
        return Img.leer(it.boceto.aprobadaId).then(function (data) {
          if (!data) return;
          return medidasImagen(data).then(function (dim) {
            if (!dim) return;
            var iw = ANCHO, ih = iw * dim.h / dim.w;
            var titulo = doc.splitTextToSize('Boceto aprobado: ' + it.desc, ANCHO);
            var hPag = M + titulo.length * LH + 3 + ih + (it.boceto.aprobadoFecha ? LH + 2 : 0) + M;
            doc.addPage([W, Math.max(60, hPag)]);
            doc.setFont('helvetica', 'bold'); doc.setFontSize(base);
            var y = M; titulo.forEach(function (l) { y += LH; doc.text(l, M, y); });
            y += 3; doc.addImage(data, 'JPEG', M, y, iw, ih); y += ih;
            if (it.boceto.aprobadoFecha) { doc.setFont('helvetica', 'normal'); y += LH + 1; doc.text('Aprobado el ' + fechaCorta(it.boceto.aprobadoFecha), M, y); }
          });
        });
      });
    }, Promise.resolve()).then(function () { return doc; });
  }
  function nombrePDF() { return 'Nota-' + (nota.folio || 'borrador') + (nota.cliente.nombre ? '-' + nota.cliente.nombre.replace(/[^\wáéíóúñÁÉÍÓÚÑ]+/g, '-') : '') + '.pdf'; }
  function descargar(blob, nombre) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }
  $('btn-pdf').addEventListener('click', function () {
    if (!validarNota() || !guardarNota(true)) return;
    hacerPDF(nota).then(function (doc) { descargar(doc.output('blob'), nombrePDF()); mostrarEstado('Nota ' + nota.folio + ' guardada y PDF descargado.'); })
      .catch(function (e) { mostrarEstado('No se pudo crear el PDF: ' + e.message, true); });
  });
  function mensajeWA(aAsesora) {
    var a = asesoraNota();
    var resumen = 'Total: ' + dinero(totalNota(nota)) + '\nPagado: ' + dinero(pagadoNota(nota)) + '\n' + (saldoNota(nota) > 0 ? 'Saldo pendiente: ' + dinero(saldoNota(nota)) : 'Estado: PAGADO') + '\n' +
      (nota.entrega ? 'Entrega: ' + (METODOS[nota.envio.metodo] || '') + ' · ' + fechaLarga(nota.entrega) + '\n' : '');
    if (aAsesora && a) {
      return 'Hola ' + a.nombre.split(' ')[0] + ', te mando la nota ' + nota.folio + ' de ' + (nota.cliente.nombre || 'tu cliente') + '. El anticipo ya está confirmado ✅\n\n' + resumen +
        '\nPor favor reenvíale el PDF al cliente con el Mensaje 8 del manual.';
    }
    return 'Hola' + (nota.cliente.nombre ? ' ' + nota.cliente.nombre.split(' ')[0] : '') + ', te comparto tu nota de ' + (NEG.nombre || 'Recoovare') + '.\n\nFolio: ' + nota.folio + '\n' + resumen + '\n¡Gracias por tu preferencia!';
  }
  $('btn-compartir').addEventListener('click', function () {
    if (!validarNota() || !guardarNota(true)) return;
    var aAsesora = nota.destino === 'asesora' && asesoraNota();
    hacerPDF(nota).then(function (doc) {
      var blob = doc.output('blob'), archivo = null;
      try { archivo = new File([blob], nombrePDF(), { type: 'application/pdf' }); } catch (e) { archivo = null; }
      var movil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (movil && archivo && navigator.canShare && navigator.canShare({ files: [archivo] })) {
        navigator.share({ files: [archivo], title: 'Nota ' + nota.folio, text: mensajeWA(aAsesora) })
          .then(function () { mostrarEstado('Nota ' + nota.folio + ' compartida.'); })
          .catch(function (e) { if (e && e.name !== 'AbortError') mostrarEstado('No se pudo compartir; usa "Descargar PDF".', true); });
        return;
      }
      descargar(blob, nombrePDF());
      var tel = aAsesora ? String(aAsesora.whatsapp).replace(/\D/g, '') : telWA(nota.cliente.tel);
      window.open('https://wa.me/' + tel + '?text=' + encodeURIComponent(mensajeWA(aAsesora)), '_blank', 'noopener');
      mostrarEstado('Nota guardada y PDF descargado. Adjúntalo en el chat de ' + (aAsesora ? aAsesora.nombre : (nota.cliente.nombre || 'WhatsApp')) + (tel ? '' : ' (no hay teléfono: elige el contacto)') + '.');
    }).catch(function (e) { mostrarEstado('No se pudo crear el PDF: ' + e.message, true); });
  });

  /* ---------- ampliar imagen o ticket ---------- */
  function abrirVer(titulo, html) { $('ver-titulo').textContent = titulo; $('ver-cuerpo').innerHTML = html; $('modal-ver').hidden = false; }
  $('btn-ampliar').addEventListener('click', function (e) { e.preventDefault(); abrirVer('Vista previa del ticket', htmlTicket(nota)); });
  // En computadora la vista previa siempre está abierta; en celular se despliega
  document.querySelector('#caja-vista > summary').addEventListener('click', function (e) {
    if (!(window.matchMedia && window.matchMedia('(max-width: 1000px)').matches)) e.preventDefault();
  });
  document.addEventListener('click', function (e) {
    var im = e.target.closest('img[data-ver-src]'); if (!im || e.target.closest('#modal-ver')) return;
    abrirVer(im.getAttribute('data-ver-titulo') || 'Imagen', '<img src="' + esc(im.getAttribute('data-ver-src')) + '" alt="">');
  });
  $('btn-cerrar-ver').addEventListener('click', function () { $('modal-ver').hidden = true; });
  $('modal-ver').addEventListener('click', function (e) { if (e.target === this) this.hidden = true; });

  /* ---------- nueva nota / historial ---------- */
  function confirmarSalida() { return !sucia() || window.confirm('La nota ' + (nota.folio || 'actual') + ' tiene cambios sin guardar. ¿Continuar sin guardar?'); }
  $('btn-nueva').addEventListener('click', function () {
    if (!confirmarSalida()) return;
    cargar(notaVacia()); $('aviso').hidden = true; limpiarCaptura(); sugerirPago(); cambio(); $('c-nombre').focus();
  });
  function pintarHistorial() {
    var q = $('buscar-nota').value.trim().toLowerCase();
    var todas = leer(CLAVE_NOTAS, []).map(function (n) { return migrar(n); }).filter(function (n) {
      if (!q) return true;
      return (n.folio || '').toLowerCase().indexOf(q) >= 0 || (n.cliente.nombre || '').toLowerCase().indexOf(q) >= 0 || (n.cliente.tel || '').replace(/\D/g, '').indexOf(q.replace(/\D/g, '') || '§') >= 0;
    });
    $('historial').innerHTML = todas.length ? todas.map(function (n) {
      var sal = saldoNota(n), pag = totalNota(n) > 0 && sal <= 0;
      return '<li class="h-item' + (n.id === nota.id ? ' actual' : '') + '"><div class="h-info"><strong>' + esc(n.folio + ' · ' + (n.cliente.nombre || 'Sin nombre')) + '</strong>' +
        '<small>' + esc(fechaHora(n.fecha) + ' · Total ' + dinero(totalNota(n)) + (pag ? '' : ' · Saldo ' + dinero(sal))) + '</small></div>' +
        '<span class="h-estado ' + (pag ? 'pagado">Pagado' : 'pendiente">Saldo pendiente') + '</span>' +
        '<div class="h-acciones"><button type="button" class="btn btn-claro" data-abrir="' + esc(n.id) + '">Abrir</button>' +
        '<button type="button" class="btn btn-claro" data-borrar="' + esc(n.id) + '">Borrar</button></div></li>';
    }).join('') : '<li class="vacio">No hay notas guardadas' + (q ? ' con esa búsqueda' : ' todavía') + '.</li>';
  }
  $('btn-historial').addEventListener('click', function () { $('modal-historial').hidden = false; pintarHistorial(); $('buscar-nota').focus(); });
  $('btn-cerrar-historial').addEventListener('click', function () { $('modal-historial').hidden = true; });
  $('modal-historial').addEventListener('click', function (e) { if (e.target === this) this.hidden = true; });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { $('modal-historial').hidden = true; $('modal-ver').hidden = true; } });
  $('buscar-nota').addEventListener('input', pintarHistorial);
  $('historial').addEventListener('click', function (e) {
    var todas = leer(CLAVE_NOTAS, []), b;
    if ((b = e.target.closest('[data-abrir]'))) {
      var n = todas.find(function (x) { return x.id === b.getAttribute('data-abrir'); });
      if (!n || (n.id !== nota.id && !confirmarSalida())) return;
      cargar(n); $('aviso').hidden = true; limpiarCaptura(); sugerirPago(); cambio(); $('modal-historial').hidden = true; window.scrollTo(0, 0);
    } else if ((b = e.target.closest('[data-borrar]'))) {
      var idb = b.getAttribute('data-borrar');
      var nb = todas.find(function (x) { return x.id === idb; });
      if (!window.confirm('¿Borrar la nota ' + (nb ? nb.folio : '') + ' y sus bocetos? No se puede deshacer. (Su pedido en Pedidos no se borra.)')) return;
      if (nb && Img) (nb.items || []).forEach(function (it) { ((it.boceto && it.boceto.versiones) || []).forEach(function (v) { Img.borrar(v.id).catch(function () {}); }); });
      guardar(CLAVE_NOTAS, todas.filter(function (x) { return x.id !== idb; }));
      if (nota.id === idb) { cargar(notaVacia()); cambio(); }
      pintarHistorial();
    }
  });

  /* ---------- nota desde un pedido (?pedido=id) ---------- */
  function notaDesdePedido(id) {
    var S = window.RecoovareSync; if (!S) return null;
    S.inicializar();
    var p = S.leer(S.K, []).find(function (x) { return x.id === id; });
    if (!p) return null;
    if (p.notaId) { var ex = copiaGuardada(p.notaId); if (ex) return ex; }
    var n = notaVacia();
    n.pedidoId = p.id;
    n.cliente = { nombre: p.cliente || '', tel: p.tel || '' };
    n.vendedor = (p.intermediario && p.intermediario.codigo) || '';
    var tipo = /^l[áa]pida/i.test(p.producto || '') ? 'lapidas' : 'placas';
    var md = /(\d{2})\s*[×x]\s*(\d{2})/.exec(p.producto || '');
    var medida = md ? md[1] + '×' + md[2] : '';
    var forma = '';
    Object.keys(D.precios).some(function (f) { if ((D.precios[f] || []).some(function (x) { return x.medida === medida; })) { forma = f; return true; } return false; });
    if (p.producto || p.precioProducto) n.items.push({ uid: uid('i'), desc: p.producto || 'Producto', detalle: '', cant: 1, precio: num(p.precioProducto), clase: 'producto', tipo: tipo, codigo: '', forma: forma, medida: medida });
    if (num(p.extras) > 0) {
      var det = (p.extrasDetalle || '').toLowerCase();
      if (/cemento/.test(det)) { n.envio.metodo = 'instalacion'; n.envio.inst = 'cemento'; }
      else if (/taquete|tornillo/.test(det)) { n.envio.metodo = 'instalacion'; n.envio.inst = 'taquetes'; }
      else if (/env[ií]o/.test(det)) { n.envio.metodo = 'envio'; n.envio.costo = num(p.extras); }
      else n.items.push({ uid: uid('i'), desc: p.extrasDetalle || 'Instalación / envío', detalle: '', cant: 1, precio: num(p.extras), clase: 'extra', tipo: 'otro' });
    }
    n.pagos = (p.pagos || []).map(function (x) { return { id: uid('p'), concepto: (x.concepto || 'Pago').replace(/\s*\(nota.*\)$/, ''), monto: num(x.monto), metodo: x.metodo || 'Efectivo', fecha: x.fecha || hoyISO() }; });
    n.entrega = p.entrega || n.entrega; n.notas = p.notas || '';
    return n;
  }

  /* ---------- inicio ---------- */
  var params = new URLSearchParams(location.search);
  var abrirId = params.get('abrir'), pedidoId = params.get('pedido');
  var inicial = null;
  if (abrirId) inicial = copiaGuardada(abrirId);
  else if (pedidoId) { inicial = notaDesdePedido(pedidoId); }
  cargar(inicial || leer(CLAVE_BORRADOR, null) || notaVacia());
  if (pedidoId && inicial) {
    if (!inicial.folio) aplicarEntrega();
    $('aviso').hidden = false;
    $('aviso').textContent = inicial.folio ? 'Este pedido ya tenía la nota ' + inicial.folio + '; se abrió para editarla.' : 'Nota creada con los datos del pedido. Revisa el producto (puedes editarlo y elegir el modelo) y guarda.';
    history.replaceState(null, '', location.pathname);
  }
  ponerAncho(ancho === '58' ? '58' : '80');
  llenarDatalist();
  pintarCaptura(true);
  escribirFormulario();
  sugerirPago();
  pintar();
  if (window.matchMedia && window.matchMedia('(max-width: 1000px)').matches) $('caja-vista').open = false;
})();
