/* =====================================================================
   Generador de notas de venta – Recoovare
   Usa los precios y modelos de ../datos.js. Las notas se guardan en este
   navegador (localStorage), no en internet.
   ===================================================================== */
(function () {
  var D = window.CATALOGO || { negocio: { nombre: 'Recoovare' }, precios: {}, tipos: {} };
  var NEG = D.negocio || {};
  var DIRECCION = (D.cita && D.cita.direccion) || NEG.ciudad || '';
  var CLAVE_NOTAS = 'recoovare_notas', CLAVE_FOLIO = 'recoovare_folio', CLAVE_BORRADOR = 'recoovare_borrador', CLAVE_ANCHO = 'recoovare_ancho';
  var NOMBRES_FORMA = { ovalada: 'Ovalada', rectangular: 'Rectangular', cuadrada: 'Cuadrada' };
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- utilidades ---------- */
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
  function dinero(n) {
    n = Math.round(num(n) * 100) / 100;
    return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
  }
  function leer(clave, def) { try { var v = localStorage.getItem(clave); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function guardar(clave, v) { try { localStorage.setItem(clave, JSON.stringify(v)); } catch (e) { mostrarEstado('No se pudo guardar en este navegador.', true); } }
  function hoyISO(dias) { var d = new Date(); d.setDate(d.getDate() + (dias || 0)); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function fechaLarga(iso) {
    if (!iso) return '';
    var p = iso.split('-'); var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    var t = d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  function fechaHora(iso) {
    var d = iso ? new Date(iso) : new Date();
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + d.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
  }
  function telWA(t) { var d = String(t || '').replace(/\D/g, ''); if (d.length === 10) d = '52' + d; return d; }
  function mostrarEstado(t, error) { var e = $('estado'); e.textContent = t; e.style.color = error ? 'var(--error)' : ''; clearTimeout(mostrarEstado.t); mostrarEstado.t = setTimeout(function () { e.textContent = ''; }, 6000); }

  /* ---------- catálogo ---------- */
  function buscarModelo(tipo, codigo) {
    var t = D.tipos[tipo]; if (!t) return null;
    var c = String(codigo || '').trim().replace('#', '').toUpperCase();
    if (!c) return null;
    return t.modelos.find(function (m) { return m.codigo.toUpperCase() === c || m.codigo.toUpperCase() === c.padStart(3, '0'); }) || null;
  }
  function medidasPara(tipo, modelo) {
    var t = D.tipos[tipo]; var formas;
    if (t && t.medidas) formas = t.medidas;
    else if (modelo) formas = [modelo.forma];
    else formas = Object.keys(D.precios);
    var lista = [];
    formas.forEach(function (f) { (D.precios[f] || []).forEach(function (p) { lista.push({ forma: f, medida: p.medida, precio: p.precio, rec: p.recomendada }); }); });
    return lista;
  }

  /* ---------- estado de la nota ---------- */
  function notaVacia() {
    return { id: 'n' + Date.now(), folio: null, fecha: null, cliente: { nombre: '', tel: '' }, items: [], anticipo: NEG.anticipo || 0, metodo: 'Efectivo', entrega: hoyISO(3), notas: '', pagado: false };
  }
  var nota = leer(CLAVE_BORRADOR, null) || notaVacia();

  function totalNota(n) { return n.items.reduce(function (s, it) { return s + num(it.cant) * num(it.precio); }, 0); }
  function restaNota(n) { return n.pagado ? 0 : Math.max(0, totalNota(n) - num(n.anticipo)); }

  /* ---------- formulario de producto ---------- */
  var descEditada = false;
  function llenarDatalist() {
    var tipo = $('p-tipo').value;
    var t = D.tipos[tipo];
    $('lista-modelos').innerHTML = t ? t.modelos.filter(function (m) { return !m.oculto; }).map(function (m) { return '<option value="' + esc(m.codigo) + '">' + esc(m.codigo + ' – ' + m.nombre) + '</option>'; }).join('') : '';
  }
  function actualizarProducto(cambioMedida) {
    var tipo = $('p-tipo').value;
    var esOtro = tipo === 'otro';
    $('caja-codigo').hidden = esOtro; $('caja-medida').hidden = esOtro;
    var info = $('p-encontrado');
    if (esOtro) { info.textContent = ''; if (!descEditada) $('p-desc').value = ''; return; }
    var codigo = $('p-codigo').value;
    var m = buscarModelo(tipo, codigo);
    if (codigo.trim() && !m) { info.textContent = 'No encontré ese código en el catálogo; puedes escribir la descripción a mano.'; info.className = 'modelo-encontrado no'; }
    else if (m) { info.textContent = '#' + m.codigo + ' · ' + m.nombre + ' (' + m.categoria + ')'; info.className = 'modelo-encontrado'; }
    else { info.textContent = ''; info.className = 'modelo-encontrado'; }
    if (!cambioMedida) {
      var lista = medidasPara(tipo, m);
      var varias = lista.some(function (x) { return x.forma !== lista[0].forma; });
      $('p-medida').innerHTML = lista.map(function (x, i) { return '<option value="' + i + '"' + (x.rec ? ' data-rec="1"' : '') + '>' + esc(x.medida) + (varias ? ' ' + (NOMBRES_FORMA[x.forma] || x.forma).toLowerCase() : '') + ' – ' + dinero(x.precio) + '</option>'; }).join('');
      var rec = lista.findIndex(function (x) { return x.rec; });
      $('p-medida').value = String(rec >= 0 ? rec : 0);
      $('p-medida')._lista = lista;
    }
    var sel = ($('p-medida')._lista || [])[Number($('p-medida').value)];
    if (sel) $('p-precio').value = sel.precio;
    if (!descEditada) {
      var t = D.tipos[tipo];
      var nombre = (t ? t.singular.charAt(0).toUpperCase() + t.singular.slice(1) : '') + (m ? ' #' + m.codigo + ' ' + m.nombre : '');
      $('p-desc').value = nombre + (sel ? ' – ' + sel.medida + ' cm' : '');
    }
  }
  $('p-tipo').addEventListener('change', function () { $('p-codigo').value = ''; descEditada = false; llenarDatalist(); actualizarProducto(false); });
  $('p-codigo').addEventListener('input', function () { descEditada = false; actualizarProducto(false); });
  $('p-medida').addEventListener('change', function () { actualizarProducto(true); });
  $('p-desc').addEventListener('input', function () { descEditada = true; });

  function limpiarProducto() {
    $('p-codigo').value = ''; $('p-detalle').value = ''; $('p-cant').value = 1; descEditada = false;
    $('p-error').hidden = true; actualizarProducto(false);
  }
  $('btn-agregar').addEventListener('click', function () {
    var desc = $('p-desc').value.trim();
    var precio = num($('p-precio').value);
    var cant = Math.max(1, Math.round(num($('p-cant').value) || 1));
    var err = $('p-error');
    if (!desc) { err.textContent = 'Escribe la descripción del producto.'; err.hidden = false; $('p-desc').focus(); return; }
    if ($('p-precio').value === '') { err.textContent = 'Escribe el precio.'; err.hidden = false; $('p-precio').focus(); return; }
    nota.items.push({ desc: desc, detalle: $('p-detalle').value.trim(), cant: cant, precio: precio });
    limpiarProducto(); cambio();
  });
  document.querySelector('.rapidos').addEventListener('click', function (e) {
    var b = e.target.closest('[data-rapido]'); if (!b) return;
    var r = b.getAttribute('data-rapido');
    if (r === 'cemento') { nota.items.push({ desc: 'Instalación con cemento blanco', detalle: '', cant: 1, precio: 150 }); cambio(); }
    else if (r === 'taquetes') { nota.items.push({ desc: 'Instalación con taquetes y tornillos', detalle: '', cant: 1, precio: 125 }); cambio(); }
    else if (r === 'envio') {
      $('p-tipo').value = 'otro'; llenarDatalist(); actualizarProducto(false);
      $('p-desc').value = 'Envío a domicilio'; descEditada = true; $('p-precio').value = ''; $('p-precio').focus();
    }
  });
  $('lista-items').addEventListener('click', function (e) {
    var b = e.target.closest('[data-quitar]'); if (!b) return;
    nota.items.splice(Number(b.getAttribute('data-quitar')), 1); cambio();
  });

  /* ---------- cliente y pago ---------- */
  function leerFormulario() {
    nota.cliente.nombre = $('c-nombre').value.trim();
    nota.cliente.tel = $('c-tel').value.trim();
    nota.anticipo = num($('pg-anticipo').value);
    nota.metodo = $('pg-metodo').value;
    nota.entrega = $('pg-entrega').value;
    nota.notas = $('pg-notas').value.trim();
  }
  function escribirFormulario() {
    $('c-nombre').value = nota.cliente.nombre || '';
    $('c-tel').value = nota.cliente.tel || '';
    $('pg-anticipo').value = nota.anticipo;
    $('pg-metodo').value = nota.metodo || 'Efectivo';
    $('pg-entrega').value = nota.entrega || '';
    $('pg-notas').value = nota.notas || '';
  }
  ['c-nombre', 'c-tel', 'pg-anticipo', 'pg-metodo', 'pg-entrega', 'pg-notas'].forEach(function (id) {
    $(id).addEventListener('input', function () { leerFormulario(); cambio(true); });
    $(id).addEventListener('change', function () { leerFormulario(); cambio(true); });
  });

  /* ---------- contenido del ticket (lo usan la vista, la impresión y el PDF) ---------- */
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
    var total = totalNota(n);
    P.push({ t: 'fila', a: 'TOTAL', b: dinero(total), grande: true });
    if (n.pagado) {
      P.push({ t: 'pagado', txt: 'PAGADO' });
    } else {
      P.push({ t: 'fila', a: 'Anticipo (' + (n.metodo || 'Efectivo') + ')', b: dinero(n.anticipo) });
      P.push({ t: 'fila', a: 'RESTA', b: dinero(restaNota(n)), negrita: true });
    }
    P.push({ t: 'linea' });
    if (n.entrega) P.push({ t: 'texto', txt: 'Entrega: ' + fechaLarga(n.entrega), negrita: true });
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

  /* ---------- pintar ---------- */
  function pintar() {
    var ul = $('lista-items');
    ul.innerHTML = nota.items.map(function (it, i) {
      return '<li class="item"><div class="item-texto"><strong>' + esc(it.cant + ' × ' + it.desc) + '</strong>' +
        (it.detalle ? '<small>' + esc(it.detalle) + '</small>' : '') + '</div>' +
        '<span class="item-importe">' + dinero(num(it.cant) * num(it.precio)) + '</span>' +
        '<button type="button" class="item-quitar" data-quitar="' + i + '" aria-label="Quitar ' + esc(it.desc) + '">Quitar</button></li>';
    }).join('');
    $('items-vacio').hidden = nota.items.length > 0;
    var total = totalNota(nota);
    $('totales').innerHTML = '<div><span>Total</span><span>' + dinero(total) + '</span></div>' +
      '<div><span>Anticipo</span><span>' + dinero(nota.anticipo) + '</span></div>' +
      '<div class="grande"><span>Resta</span><span>' + dinero(restaNota(nota)) + '</span></div>';
    $('ticket-vista').innerHTML = htmlTicket(nota);
    var av = $('aviso-editando');
    if (nota.folio) { av.hidden = false; av.textContent = 'Editando la nota ' + nota.folio + (nota.pagado ? ' (pagada)' : '') + '. Los cambios se guardan al imprimir o mandar el PDF.'; }
    else av.hidden = true;
  }
  function cambio(sinFormulario) {
    if (!sinFormulario) escribirFormulario();
    guardar(CLAVE_BORRADOR, nota);
    pintar();
  }

  /* ---------- guardar con folio ---------- */
  function asegurarFolio() {
    leerFormulario();
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
    guardar(CLAVE_NOTAS, todas);
    guardar(CLAVE_BORRADOR, nota);
    pintar();
  }
  function validarNota() {
    if (!nota.items.length) { mostrarEstado('Agrega al menos un producto a la nota.', true); $('p-codigo').focus(); return false; }
    return true;
  }

  /* ---------- imprimir ---------- */
  var ancho = String(leer(CLAVE_ANCHO, '80'));
  // Área imprimible real: 58 mm imprime ~48 mm; 80 mm imprime ~72 mm. Se puede afinar.
  var ajustes = leer('recoovare_ajuste_ticket', {});
  function ajusteDe(a) { var d = a === '58' ? { ancho: 46, margen: 0 } : { ancho: 70, margen: 0 }; return Object.assign(d, ajustes[a] || {}); }
  function aplicarAjuste() {
    var aj = ajusteDe(ancho);
    document.body.style.setProperty('--ancho-ticket', aj.ancho + 'mm');
    document.body.style.setProperty('--margen-ticket', aj.margen + 'mm');
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
    asegurarFolio();
    var caja = $('ticket-imprimir');
    caja.innerHTML = htmlTicket(nota);
    var img = caja.querySelector('img');
    var lanzar = function () {
      // Mide el ticket para que la hoja tenga exactamente su largo
      caja.style.cssText = 'display:block;position:absolute;left:-9999px;top:0';
      var altoMM = Math.ceil(caja.querySelector('.ticket').getBoundingClientRect().height * 25.4 / 96) + 6;
      caja.style.cssText = '';
      var est = $('estilo-pagina') || document.head.appendChild(Object.assign(document.createElement('style'), { id: 'estilo-pagina' }));
      est.textContent = '@media print { @page { size: ' + (ancho === '58' ? 58 : 80) + 'mm ' + altoMM + 'mm; margin: 0; } }';
      window.print();
      mostrarEstado('Nota ' + nota.folio + ' guardada.');
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
  function hacerPDF(n) {
    var jsPDF = window.jspdf && window.jspdf.jsPDF;
    if (!jsPDF) throw new Error('No cargó la librería de PDF');
    var W = ancho === '58' ? 58 : 80, M = ancho === '58' ? 5 : 5, ANCHO = W - 2 * M;
    var base = ancho === '58' ? 8 : 9.5;
    var LH = base * 0.42; // alto de línea en mm
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
    return doc;
  }
  function nombrePDF() { return 'Nota-' + (nota.folio || 'borrador') + (nota.cliente.nombre ? '-' + nota.cliente.nombre.replace(/[^\wáéíóúñÁÉÍÓÚÑ]+/g, '-') : '') + '.pdf'; }
  function descargar(blob, nombre) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }
  $('btn-pdf').addEventListener('click', function () {
    if (!validarNota()) return;
    asegurarFolio();
    try { descargar(hacerPDF(nota).output('blob'), nombrePDF()); mostrarEstado('PDF de la nota ' + nota.folio + ' descargado.'); }
    catch (e) { mostrarEstado('No se pudo crear el PDF: ' + e.message, true); }
  });
  function mensajeWA() {
    return 'Hola' + (nota.cliente.nombre ? ' ' + nota.cliente.nombre : '') + ', te comparto tu nota de ' + (NEG.nombre || 'Recoovare') + '.\n\n' +
      'Folio: ' + nota.folio + '\n' +
      'Total: ' + dinero(totalNota(nota)) + '\n' +
      (nota.pagado ? 'Estado: PAGADO\n' : 'Anticipo: ' + dinero(nota.anticipo) + '\nResta: ' + dinero(restaNota(nota)) + '\n') +
      (nota.entrega ? 'Entrega: ' + fechaLarga(nota.entrega) + '\n' : '') +
      '\n¡Gracias por tu preferencia!';
  }
  $('btn-compartir').addEventListener('click', function () {
    if (!validarNota()) return;
    asegurarFolio();
    var blob;
    try { blob = hacerPDF(nota).output('blob'); } catch (e) { mostrarEstado('No se pudo crear el PDF: ' + e.message, true); return; }
    var archivo = null;
    try { archivo = new File([blob], nombrePDF(), { type: 'application/pdf' }); } catch (e) { archivo = null; }
    var movil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (movil && archivo && navigator.canShare && navigator.canShare({ files: [archivo] })) {
      navigator.share({ files: [archivo], title: 'Nota ' + nota.folio, text: mensajeWA() })
        .then(function () { mostrarEstado('Nota ' + nota.folio + ' compartida.'); })
        .catch(function (e) { if (e && e.name !== 'AbortError') mostrarEstado('No se pudo compartir; usa "Descargar PDF".', true); });
      return;
    }
    descargar(blob, nombrePDF());
    var tel = telWA(nota.cliente.tel);
    window.open('https://wa.me/' + tel + '?text=' + encodeURIComponent(mensajeWA()), '_blank', 'noopener');
    mostrarEstado('Se descargó el PDF. Adjúntalo en el chat de WhatsApp que se abrió' + (tel ? '' : ' (no pusiste teléfono: elige el contacto)') + '.');
  });

  /* ---------- nueva nota ---------- */
  $('btn-nueva').addEventListener('click', function () {
    if (nota.items.length && !nota.folio && !window.confirm('La nota actual no se ha guardado. ¿Empezar una nueva de todos modos?')) return;
    nota = notaVacia(); limpiarProducto(); cambio();
    $('c-nombre').focus();
  });

  /* ---------- historial ---------- */
  function pintarHistorial() {
    var q = $('buscar-nota').value.trim().toLowerCase();
    var todas = leer(CLAVE_NOTAS, []).filter(function (n) {
      if (!q) return true;
      return (n.folio || '').toLowerCase().indexOf(q) >= 0 || (n.cliente.nombre || '').toLowerCase().indexOf(q) >= 0 || (n.cliente.tel || '').replace(/\D/g, '').indexOf(q.replace(/\D/g, '') || '§') >= 0;
    });
    $('historial').innerHTML = todas.length ? todas.map(function (n) {
      return '<li class="h-item"><div class="h-info"><strong>' + esc(n.folio + ' · ' + (n.cliente.nombre || 'Sin nombre')) + '</strong>' +
        '<small>' + esc(fechaHora(n.fecha) + ' · Total ' + dinero(totalNota(n)) + (n.pagado ? '' : ' · Resta ' + dinero(restaNota(n)))) + '</small></div>' +
        '<span class="h-estado ' + (n.pagado ? 'pagado">Pagado' : 'pendiente">Pendiente') + '</span>' +
        '<div class="h-acciones"><button type="button" class="btn btn-claro" data-abrir="' + esc(n.id) + '">Abrir</button>' +
        '<button type="button" class="btn btn-claro" data-pagado="' + esc(n.id) + '">' + (n.pagado ? 'Marcar pendiente' : 'Marcar pagado') + '</button>' +
        '<button type="button" class="btn btn-claro" data-borrar="' + esc(n.id) + '">Borrar</button></div></li>';
    }).join('') : '<li class="vacio">No hay notas guardadas' + (q ? ' con esa búsqueda' : ' todavía') + '.</li>';
  }
  $('btn-historial').addEventListener('click', function () { $('modal-historial').hidden = false; pintarHistorial(); $('buscar-nota').focus(); });
  $('btn-cerrar-historial').addEventListener('click', function () { $('modal-historial').hidden = true; });
  $('modal-historial').addEventListener('click', function (e) { if (e.target === this) this.hidden = true; });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('modal-historial').hidden) $('modal-historial').hidden = true; });
  $('buscar-nota').addEventListener('input', pintarHistorial);
  $('historial').addEventListener('click', function (e) {
    var todas = leer(CLAVE_NOTAS, []);
    var b;
    if ((b = e.target.closest('[data-abrir]'))) {
      var n = todas.find(function (x) { return x.id === b.getAttribute('data-abrir'); });
      if (n) { nota = n; cambio(); $('modal-historial').hidden = true; window.scrollTo(0, 0); }
    } else if ((b = e.target.closest('[data-pagado]'))) {
      var id = b.getAttribute('data-pagado');
      todas.forEach(function (x) { if (x.id === id) x.pagado = !x.pagado; });
      guardar(CLAVE_NOTAS, todas);
      if (nota.id === id) { nota.pagado = !nota.pagado; cambio(); }
      pintarHistorial();
    } else if ((b = e.target.closest('[data-borrar]'))) {
      var idb = b.getAttribute('data-borrar');
      var nb = todas.find(function (x) { return x.id === idb; });
      if (!window.confirm('¿Borrar la nota ' + (nb ? nb.folio : '') + '? No se puede deshacer.')) return;
      guardar(CLAVE_NOTAS, todas.filter(function (x) { return x.id !== idb; }));
      if (nota.id === idb) { nota = notaVacia(); cambio(); }
      pintarHistorial();
    }
  });

  /* ---------- inicio ---------- */
  ponerAncho(ancho === '58' ? '58' : '80');
  llenarDatalist();
  actualizarProducto(false);
  escribirFormulario();
  pintar();
})();
