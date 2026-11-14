/* =====================================================================
   Lógica del catálogo. No necesitas editar este archivo:
   todo lo que cambia (precios, modelos, preguntas) está en datos.js
   ===================================================================== */
(function () {
  var D = window.CATALOGO;
  if (!D) { document.body.insertAdjacentHTML('afterbegin', '<p style="padding:20px;background:#fee;color:#900">Error: no se pudo leer datos.js. Revisa que no falte una coma o una comilla.</p>'); return; }

  var NOMBRES_FORMA = { ovalada: 'Ovalada', rectangular: 'Rectangular', cuadrada: 'Cuadrada' };
  var ICONO_WA = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.5L3 21l2-5.5A8.4 8.4 0 1 1 21 11.5z"/></svg>';
  var ICONO_INFO = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.5"/></svg>';
  var ICONO_SIG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  var ICONO_ATRAS = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>';
  var ICONO_FLECHA = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

  var estado = { tipo: 'placas', categoria: 'todos', busqueda: '', medida: {} };

  /* ---------- utilidades ---------- */
  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function dinero(n) { return '$' + Number(n).toLocaleString('es-MX'); }
  function sinAcentos(t) { return String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  /* Asesor de ventas: recoovare.pages.dev/?v=codigo (se recuerda para siempre; ?v=recoovare lo quita) */
  var VENDEDOR = (function () {
    var lista = D.vendedores || [], K = 'recoovare_vendedor', cod = null;
    var q = new URLSearchParams(location.search).get('v');
    try {
      // El cliente queda para siempre con la PRIMERA asesora cuyo link abrió.
      // ?v=recoovare borra la asesora guardada en ese celular.
      var s = JSON.parse(localStorage.getItem(K) || 'null');
      var guardada = s && lista.some(function (x) { return x.codigo === s.c; }) ? s.c : null;
      if (q !== null) {
        q = q.trim().toLowerCase();
        var v = lista.find(function (x) { return x.codigo === q; });
        if (!v) { localStorage.removeItem(K); guardada = null; }
        else if (!guardada) { guardada = v.codigo; localStorage.setItem(K, JSON.stringify({ c: guardada, t: Date.now() })); }
      }
      cod = guardada;
    } catch (e) {}
    return lista.find(function (x) { return x.codigo === cod; }) || null;
  })();
  function numeroWA() { return String((VENDEDOR ? VENDEDOR.whatsapp : D.negocio.whatsapp) || '').replace(/\D/g, ''); }
  function linkWA(texto) {
    if (VENDEDOR) texto += '\n\n' + (VENDEDOR.titulo || 'Asesor de ventas') + ': ' + VENDEDOR.nombre;
    return 'https://wa.me/' + numeroWA() + '?text=' + encodeURIComponent(texto);
  }
  function telVisible(n) { n = String(n || '').replace(/\D/g, '').slice(-10); return n.length === 10 ? n.slice(0, 3) + ' ' + n.slice(3, 6) + ' ' + n.slice(6) : n; }
  if (VENDEDOR) {
    var banda = document.getElementById('asesor');
    if (banda) {
      banda.innerHTML = '<div class="wrap asesor-in"><span>Te atiende <strong>' + esc(VENDEDOR.nombre) + '</strong> · ' + esc(VENDEDOR.titulo || 'Asesor de ventas') + ' de ' + esc(D.negocio.nombre) + '</span>' +
        '<a href="' + esc(linkWA('Hola ' + VENDEDOR.nombre + ', quiero información sobre las placas y lápidas de ' + D.negocio.nombre + '.')) + '" target="_blank" rel="noopener">WhatsApp ' + esc(telVisible(VENDEDOR.whatsapp)) + '</a></div>';
      banda.hidden = false;
    }
  }
  function visibles(tipo) { return D.tipos[tipo].modelos.filter(function (m) { return !m.oculto; }); }
  // Lista de medidas de un modelo: las de su forma, o todas las que el tipo indique en "medidas"
  function preciosDe(m, tipo) {
    var t = tipo ? D.tipos[tipo] : null;
    var formas = (t && t.medidas) ? t.medidas : [m.forma];
    var lista = [];
    formas.forEach(function (f) {
      (D.precios[f] || []).forEach(function (p) { lista.push({ medida: p.medida, precio: p.precio, recomendada: p.recomendada, grupo: f }); });
    });
    return lista;
  }
  function medidaInicial(m, tipo) {
    var i = preciosDe(m, tipo).findIndex(function (p) { return p.recomendada; });
    return i >= 0 ? i : 0;
  }
  function formaTexto(tipo, m) {
    var t = D.tipos[tipo];
    var formas = t.medidas ? t.medidas : [m.forma];
    return formas.map(function (f) { return NOMBRES_FORMA[f] || f; }).join(' o ');
  }
  function htmlMedidas(lista, idx) {
    var grupos = [];
    lista.forEach(function (s, i) {
      var g = grupos[grupos.length - 1];
      if (!g || g.nombre !== s.grupo) { g = { nombre: s.grupo, items: [] }; grupos.push(g); }
      g.items.push({ s: s, i: i });
    });
    var conTitulo = grupos.length > 1;
    return grupos.map(function (g) {
      return (conTitulo ? '<span class="grupo-medida">' + esc(NOMBRES_FORMA[g.nombre] || g.nombre) + '</span>' : '') +
        '<div class="sizes" role="group" aria-label="Tamaño ' + esc(NOMBRES_FORMA[g.nombre] || g.nombre) + '">' +
        g.items.map(function (x) { return '<button type="button" data-medida="' + x.i + '" aria-pressed="' + (x.i === idx) + '">' + esc(x.s.medida) + '</button>'; }).join('') +
        '</div>';
    }).join('');
  }
  // ¿Se muestra este campo con las respuestas actuales?
  function campoVisible(c, form) {
    if (!c.mostrarSi) return true;
    return c.mostrarSi.some(function (cond) {
      var dep = form.querySelector('[data-campo="' + cond.campo + '"]');
      if (dep && dep.hidden) return false;
      var marcado = form.querySelector('input[name="' + cond.campo + '"]:checked');
      var v = marcado ? Number(marcado.value) : 0;
      return cond.en.indexOf(v) >= 0;
    });
  }
  function claveModelo(tipo, m) { return tipo + ':' + m.codigo; }
  function ej(t) { t = t || ''; return (!t || /^ej\./i.test(t)) ? t : 'Ej. ' + t; }
  function mayus(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

  /* ---------- datos del negocio en la página ---------- */
  document.querySelectorAll('.js-ciudad').forEach(function (el) { el.textContent = D.negocio.ciudad; });
  document.querySelectorAll('.js-anticipo').forEach(function (el) { el.textContent = dinero(D.negocio.anticipo || 0); });
  document.querySelectorAll('.js-wa-otra').forEach(function (a) {
    a.href = linkWA('Hola ' + D.negocio.nombre + ', quiero cotizar una placa de otra medida: ');
  });
  document.querySelectorAll('.js-wa-general').forEach(function (a) {
    a.href = linkWA('Hola ' + D.negocio.nombre + ', quiero información sobre sus placas y lápidas.');
  });
  (function piePagina() {
    var visible = VENDEDOR ? telVisible(VENDEDOR.whatsapp) : (D.negocio.whatsappVisible || numeroWA());
    var html = '<a href="' + esc(linkWA('Hola ' + D.negocio.nombre + ', quiero información.')) + '" target="_blank" rel="noopener">WhatsApp' + (visible ? ': ' + esc(visible) : '') + '</a>';
    if (D.negocio.instagram) html += '<a href="https://instagram.com/' + esc(D.negocio.instagram) + '" target="_blank" rel="noopener">Instagram: @' + esc(D.negocio.instagram) + '</a>';
    if (D.negocio.facebook) html += '<a href="' + esc(D.negocio.facebook) + '" target="_blank" rel="noopener">Facebook</a>';
    document.getElementById('footer-links').innerHTML = html;
  })();

  /* ---------- precios e info ---------- */
  document.getElementById('tablas-precios').innerHTML = Object.keys(D.precios).map(function (forma) {
    return '<div class="tabla-precio"><h3>' + esc(NOMBRES_FORMA[forma] || forma) + '</h3>' +
      D.precios[forma].map(function (p) {
        return '<div class="fila"><span>' + esc(p.medida) + ' cm' + (p.recomendada ? '<span class="tag-rec">Recomendada</span>' : '') + '</span><span class="p">' + dinero(p.precio) + '</span></div>';
      }).join('') + '</div>';
  }).join('');
  document.getElementById('info').innerHTML = (D.info || []).map(function (i) {
    return '<div class="info-item"><h3>' + esc(i.titulo) + '</h3><p>' + esc(i.texto) + '</p></div>';
  }).join('');

  /* ---------- pestañas y categorías ---------- */
  function pintarPestanas() {
    document.getElementById('tabs').innerHTML = Object.keys(D.tipos).map(function (k) {
      return '<button type="button" data-tipo="' + k + '" aria-pressed="' + (estado.tipo === k) + '">' + esc(D.tipos[k].nombre) + ' (' + visibles(k).length + ')</button>';
    }).join('');
  }
  function pintarCategorias() {
    var t = D.tipos[estado.tipo];
    var mods = visibles(estado.tipo);
    var cats = [{ k: 'todos', n: 'Todos', c: mods.length }].concat(t.categorias.map(function (c) {
      return { k: c, n: c, c: mods.filter(function (m) { return m.categoria === c; }).length };
    })).filter(function (c) { return c.c > 0; });
    document.getElementById('categorias').innerHTML = cats.map(function (c) {
      return '<button type="button" data-cat="' + esc(c.k) + '" aria-pressed="' + (estado.categoria === c.k) + '">' + esc(c.n) + ' (' + c.c + ')</button>';
    }).join('');
  }

  /* ---------- tarjetas ---------- */
  function htmlOpcion(c, o, i) {
    return '<label class="op-card"><input type="radio" name="' + esc(c.id) + '" value="' + i + '"' + (i === 0 ? ' checked' : '') + '>' +
      '<span class="op-marca" aria-hidden="true"></span>' +
      '<span class="op-txt"><strong>' + esc(o.texto) + (o.recomendada ? ' <em class="op-reco">Recomendada</em>' : '') + '</strong>' +
      (o.sub ? '<small>' + esc(o.sub).replace(/\n/g, '<br>') + '</small>' : '') + '</span>' +
      (o.costo ? '<span class="op-precio">+' + dinero(o.costo) + '</span>' : '') + '</label>';
  }
  function textoMsg(o) { return o.mensajeTexto || o.texto; }
  function htmlCampos(tipo, m, solo) {
    var id = claveModelo(tipo, m).replace(/[^a-zA-Z0-9]/g, '-');
    return D.tipos[tipo].campos.filter(function (c) { return !solo || solo.indexOf(c.id) >= 0; }).map(function (c) {
      var fid = id + '-' + c.id;
      if (c.opciones) {
        var cuerpo;
        if (c.grupos) {
          var orden = [];
          c.opciones.forEach(function (o) { if (orden.indexOf(o.grupo) < 0) orden.push(o.grupo); });
          cuerpo = orden.map(function (g) {
            var gi = c.grupos[g] || {};
            return '<div class="op-grupo"><p class="op-grupo-tit">' + esc(gi.titulo || '') + '</p>' +
              (gi.aviso ? '<p class="aviso">' + ICONO_INFO + '<span>' + esc(gi.aviso) + '</span></p>' : '') +
              '<div class="op-lista">' + c.opciones.map(function (o, i) { return o.grupo === g ? htmlOpcion(c, o, i) : ''; }).join('') + '</div></div>';
          }).join('');
        } else {
          cuerpo = '<div class="op-lista">' + c.opciones.map(function (o, i) { return htmlOpcion(c, o, i); }).join('') + '</div>';
        }
        return '<fieldset class="campo opciones" data-campo="' + esc(c.id) + '"><legend>' + esc(c.etiqueta) + '</legend>' +
          (c.ayuda ? '<p class="aviso">' + ICONO_INFO + '<span>' + esc(c.ayuda) + '</span></p>' : '') + cuerpo + '</fieldset>';
      }
      var control = c.parrafo
        ? '<textarea id="' + fid + '" name="' + esc(c.id) + '" placeholder="' + esc(ej(c.ejemplo)) + '"></textarea>'
        : '<input id="' + fid + '" name="' + esc(c.id) + '" type="text" placeholder="' + esc(ej(c.ejemplo)) + '">';
      return '<div class="campo" data-campo="' + esc(c.id) + '"><label for="' + fid + '">' + esc(c.etiqueta) + (c.obligatorio ? ' <span class="req" aria-hidden="true">*</span>' : '') + '</label>' + control +
        (c.ayuda ? '<p class="ayuda">' + esc(c.ayuda) + '</p>' : '') +
        (c.obligatorio ? '<p class="msg-error" hidden>Este dato es necesario.</p>' : '') + '</div>';
    }).join('');
  }
  function htmlTarjeta(tipo, m) {
    var t = D.tipos[tipo];
    var clave = claveModelo(tipo, m);
    var lista = preciosDe(m, tipo);
    var idx = estado.medida[clave] != null ? estado.medida[clave] : medidaInicial(m, tipo);
    var p = idx === -1 ? { medida: 'Otra medida', precio: 0, otra: true } : (lista[idx] || { medida: '', precio: 0 });
    return '<article class="card" data-clave="' + esc(clave) + '">' +
      '<div class="card-img"><img loading="lazy" src="' + esc(t.carpeta + m.foto) + '" alt="' + esc(mayus(t.singular) + ' modelo ' + m.codigo + ', ' + m.nombre) + '"></div>' +
      '<div class="card-body">' +
        '<div class="card-meta"><span class="code">#' + esc(m.codigo) + '</span><span>' + esc(m.categoria) + ' · ' + esc(formaTexto(tipo, m)) + '</span>' + (m.nuevo ? '<span class="tag-nuevo">Nuevo</span>' : '') + '</div>' +
        '<h3>' + esc(m.nombre) + '</h3>' +
        '<div><span class="label-sm">Tamaño (cm)</span>' + htmlMedidas(lista, idx) +
          '<button type="button" class="otra-medida" data-medida="-1" aria-pressed="' + (idx === -1) + '">Otra medida (cotizar)</button></div>' +
        '<div class="price-row"><p class="price"><span class="js-precio">' + (p.otra ? 'A cotizar' : dinero(p.precio)) + '</span> <span class="mxn"' + (p.otra ? ' hidden' : '') + '>MXN</span></p><span class="tag-rec js-rec"' + (p.recomendada ? '' : ' hidden') + '>Medida recomendada</span></div>' +
        '<button type="button" class="btn-pedir">Mandar a hacer mi boceto ' + ICONO_SIG + '</button>' +
      '</div></article>';
  }
  function filtrados() {
    var q = sinAcentos(estado.busqueda.trim().replace('#', ''));
    return visibles(estado.tipo).filter(function (m) {
      if (estado.categoria !== 'todos' && m.categoria !== estado.categoria) return false;
      if (!q) return true;
      return sinAcentos(m.codigo).indexOf(q) >= 0 || sinAcentos(m.nombre).indexOf(q) >= 0 || sinAcentos(m.categoria).indexOf(q) >= 0;
    });
  }
  function pintarModelos() {
    var t = D.tipos[estado.tipo];
    var lista = filtrados();
    document.getElementById('titulo-modelos').textContent = 'Elige tu ' + t.singular;
    document.getElementById('conteo').textContent = 'Mostrando ' + lista.length + ' de ' + visibles(estado.tipo).length + ' ' + t.nombre.toLowerCase();
    document.getElementById('vacio').hidden = lista.length > 0;
    document.getElementById('grid').innerHTML = lista.map(function (m) { return htmlTarjeta(estado.tipo, m); }).join('');
  }
  function pintarTodo() { pintarPestanas(); pintarCategorias(); pintarModelos(); }

  function buscarModelo(clave) {
    var partes = clave.split(':');
    var m = D.tipos[partes[0]].modelos.find(function (x) { return x.codigo === partes[1]; });
    return { tipo: partes[0], m: m };
  }

  /* ---------- eventos ---------- */
  function irA(tipo) {
    if (!D.tipos[tipo]) return;
    estado.tipo = tipo; estado.categoria = 'todos'; estado.busqueda = '';
    document.getElementById('buscar').value = '';
    pintarTodo();
  }
  document.querySelectorAll('[data-ir]').forEach(function (a) {
    a.addEventListener('click', function () { irA(a.getAttribute('data-ir')); });
  });
  document.getElementById('tabs').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-tipo]'); if (b) irA(b.getAttribute('data-tipo'));
  });
  document.getElementById('categorias').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-cat]'); if (!b) return;
    estado.categoria = b.getAttribute('data-cat'); pintarCategorias(); pintarModelos();
  });
  document.getElementById('buscar').addEventListener('input', function (e) {
    estado.busqueda = e.target.value; pintarModelos();
  });

  var grid = document.getElementById('grid');
  grid.addEventListener('click', function (e) {
    var card = e.target.closest('.card'); if (!card) return;
    var clave = card.getAttribute('data-clave');

    var bm = e.target.closest('button[data-medida]');
    if (bm) {
      var i = Number(bm.getAttribute('data-medida'));
      estado.medida[clave] = i;
      var bmod = buscarModelo(clave);
      var p = i === -1 ? { otra: true } : preciosDe(bmod.m, bmod.tipo)[i];
      card.querySelectorAll('button[data-medida]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === bm)); });
      card.querySelector('.js-precio').textContent = p.otra ? 'A cotizar' : dinero(p.precio);
      card.querySelector('.mxn').hidden = !!p.otra;
      card.querySelector('.js-rec').hidden = !p.recomendada;
      return;
    }
    if (e.target.closest('.btn-pedir')) {
      var info = buscarModelo(clave);
      var ix = estado.medida[clave] != null ? estado.medida[clave] : medidaInicial(info.m, info.tipo);
      abrirPedido(info.tipo, info.m.codigo, ix, true);
    }
  });

  /* ==========================================================
     PÁGINA DEL PEDIDO ("Mandar a hacer mi boceto")
     ========================================================== */
  var BLOQUE = { instalacion: 'instalacion', domicilio: 'instalacion', cementerio: 'instalacion', entrega: 'entrega', envio: 'entrega' };
  var ICONOS_PD = {
    diseno: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    instalacion: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3.5 17.3a1.8 1.8 0 0 0 2.6 2.6l5.8-5.8a4 4 0 0 0 5.2-5.4l-2.4 2.4-2.4-.6-.6-2.4z"/>',
    entrega: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.7"/><circle cx="17" cy="17.5" r="1.7"/>',
    resumen: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>'
  };
  function cabeza(b, titulo, sub) {
    return '<div class="pd-cab"><span class="pd-ico" aria-hidden="true"><svg viewBox="0 0 24 24">' + ICONOS_PD[b] + '</svg></span><div><h2>' + esc(titulo) + '</h2>' + (sub ? '<p>' + esc(sub) + '</p>' : '') + '</div></div>';
  }
  var pd = null; // { tipo, m, idx, vuelta }
  var vista = document.getElementById('pedido-vista');

  function precioPd() {
    return pd.idx === -1 ? { medida: 'Otra medida', precio: 0, otra: true } : (preciosDe(pd.m, pd.tipo)[pd.idx] || { medida: '', precio: 0 });
  }
  function abrirPedido(tipo, codigo, idx, empujar) {
    var t = D.tipos[tipo]; if (!t) return false;
    var m = t.modelos.find(function (x) { return x.codigo === codigo; }); if (!m) return false;
    var lista = preciosDe(m, tipo);
    if (!(idx === -1 || (idx >= 0 && idx < lista.length))) idx = medidaInicial(m, tipo);
    pd = { tipo: tipo, m: m, idx: idx, vuelta: window.scrollY };
    estado.medida[claveModelo(tipo, m)] = idx;
    var ids = function (b) { return t.campos.filter(function (c) { return (BLOQUE[c.id] || 'diseno') === b; }).map(function (c) { return c.id; }); };
    var hayEntrega = ids('entrega').length > 0;
    vista.innerHTML =
      '<div class="wrap pd-wrap">' +
        '<button type="button" class="pd-volver js-volver">' + ICONO_ATRAS + ' Volver al catálogo</button>' +
        '<div class="pd-head"><span class="eyebrow">Tu pedido</span><h1>Mandar a hacer mi boceto</h1>' +
          '<p>Llena tus datos y te mandamos el boceto por WhatsApp para que lo revises antes de hacerla.</p></div>' +
        '<div class="pd-grid">' +
          '<aside class="pd-modelo">' +
            '<div class="pd-foto"><img src="' + esc(t.carpeta + m.foto) + '" alt="' + esc(mayus(t.singular) + ' modelo ' + m.codigo + ', ' + m.nombre) + '"></div>' +
            '<div class="pd-modelo-info">' +
              '<div class="card-meta"><span class="code">#' + esc(m.codigo) + '</span><span>' + esc(m.categoria) + '</span></div>' +
              '<h3>' + esc(m.nombre) + '</h3>' +
              '<div class="pd-precio-fila"><span class="pd-medida js-pd-medida"></span><span class="pd-precio js-pd-precio"></span></div>' +
            '</div>' +
            '<details class="pd-cambiar"><summary>Cambiar medida</summary><div class="js-pd-medidas"></div></details>' +
          '</aside>' +
          '<form class="pd-form" novalidate>' +
            '<section class="pd-bloque" data-b="diseno">' + cabeza('diseno', 'Datos del diseño', 'Lo que llevará tu ' + t.singular + '.') +
              '<div class="campo js-otra" hidden><label for="pd-otra">Medida que necesitas <span class="req" aria-hidden="true">*</span></label>' +
                '<input id="pd-otra" name="medidaOtra" type="text" placeholder="Ej. 60 × 40 cm"><p class="msg-error" hidden>Escribe la medida que necesitas.</p></div>' +
              htmlCampos(tipo, m, ids('diseno')) +
            '</section>' +
            '<section class="pd-bloque" data-b="instalacion">' + cabeza('instalacion', 'Instalación', 'Elige solo una opción.') +
              htmlCampos(tipo, m, ids('instalacion')) +
            '</section>' +
            (hayEntrega ? '<section class="pd-bloque" data-b="entrega">' + cabeza('entrega', 'Entrega', '¿Cómo te la hacemos llegar?') +
              '<p class="pd-incluida js-incluida" hidden>' + ICONO_INFO + '<span>La instalación incluye el servicio a domicilio; no necesitas elegir entrega.</span></p>' +
              htmlCampos(tipo, m, ids('entrega')) +
            '</section>' : '') +
            '<section class="pd-bloque pd-final" data-b="resumen">' + cabeza('resumen', 'Resumen del pedido') +
              '<div class="js-pd-resumen"></div>' +
              '<button type="submit" class="btn-wa">' + ICONO_WA + ' Enviar mi boceto por WhatsApp</button>' +
              '<p class="nota">Si quieres agregar una foto o un logo, mándalo en el mismo chat de WhatsApp.</p>' +
            '</section>' +
          '</form>' +
        '</div>' +
      '</div>';
    vista.hidden = false;
    document.body.classList.add('modo-pedido');
    pintarMedidaPd();
    actualizarPd();
    window.scrollTo(0, 0);
    var ruta = '#pedido/' + tipo + '/' + codigo + '/' + idx;
    if (empujar) history.pushState({ pedido: true }, '', ruta);
    document.title = 'Pedido #' + m.codigo + ' – ' + D.negocio.nombre;
    return true;
  }
  var TITULO = document.title;
  function cerrarPedido() {
    if (!pd) return;
    var clave = claveModelo(pd.tipo, pd.m), vuelta = pd.vuelta, tipo = pd.tipo;
    pd = null;
    vista.hidden = true; vista.innerHTML = '';
    document.body.classList.remove('modo-pedido');
    document.title = TITULO;
    if (estado.tipo !== tipo) irA(tipo); else pintarModelos();
    var card = document.querySelector('.card[data-clave="' + clave.replace(/"/g, '') + '"]');
    if (vuelta > 0 && card) window.scrollTo(0, vuelta);
    else if (card) card.scrollIntoView({ block: 'center' });
    else document.getElementById('modelos').scrollIntoView();
  }
  function volverCatalogo() {
    if (history.state && history.state.pedido) history.back();
    else { history.replaceState(null, '', location.pathname + location.search + '#modelos'); cerrarPedido(); }
  }
  window.addEventListener('popstate', function () {
    var r = rutaPedido();
    if (r) abrirPedido(r.tipo, r.codigo, r.idx, false);
    else cerrarPedido();
  });
  function rutaPedido() {
    var mt = /^#pedido\/([a-z]+)\/([^\/]+)\/(-?\d+)/.exec(location.hash);
    return mt ? { tipo: mt[1], codigo: decodeURIComponent(mt[2]), idx: Number(mt[3]) } : null;
  }
  function pintarMedidaPd() {
    var p = precioPd();
    vista.querySelector('.js-pd-medida').textContent = p.otra ? 'Otra medida' : p.medida + ' cm';
    vista.querySelector('.js-pd-precio').textContent = p.otra ? 'A cotizar' : dinero(p.precio);
    vista.querySelector('.js-pd-medidas').innerHTML = htmlMedidas(preciosDe(pd.m, pd.tipo), pd.idx) +
      '<button type="button" class="otra-medida" data-medida="-1" aria-pressed="' + (pd.idx === -1) + '">Otra medida (cotizar)</button>';
    vista.querySelector('.js-otra').hidden = !p.otra;
  }
  function actualizarPd() {
    var form = vista.querySelector('.pd-form');
    var campos = D.tipos[pd.tipo].campos;
    for (var k = 0; k < 2; k++) campos.forEach(function (c) {
      var caja = form.querySelector('[data-campo="' + c.id + '"]'); if (caja) caja.hidden = !campoVisible(c, form);
    });
    var ent = form.querySelector('[data-campo="entrega"]'), inc = form.querySelector('.js-incluida');
    if (ent && inc) inc.hidden = !ent.hidden;
    var r = calcularPd();
    var filas = '<div class="pd-fila"><span>' + esc(mayus(r.t.singular) + ' #' + r.m.codigo + ' · ' + (r.p.otra ? 'otra medida' : r.p.medida + ' cm')) + '</span><span>' + (r.p.otra ? 'A cotizar' : dinero(r.p.precio)) + '</span></div>';
    r.extras.forEach(function (e) { filas += '<div class="pd-fila"><span>' + esc(e.nombre) + '</span><span>+' + dinero(e.costo) + '</span></div>'; });
    if (r.cotizar) filas += '<div class="pd-fila"><span>Envío a domicilio</span><span>Según la zona</span></div>';
    var total = r.p.otra ? 'A cotizar' + (r.extras.length ? ' <small>+ ' + dinero(r.total) + ' de extras</small>' : '') : dinero(r.total) + ' <small>MXN' + (r.cotizar ? ' + envío' : '') + '</small>';
    vista.querySelector('.js-pd-resumen').innerHTML =
      '<div class="pd-lineas">' + filas + '</div>' +
      '<div class="pd-total"><span>Total</span><strong>' + total + '</strong></div>' +
      (D.negocio.anticipo ? '<div class="pd-anticipo"><div><span>Anticipo para iniciar</span><strong>' + dinero(D.negocio.anticipo) + '</strong></div>' +
        '<p>El anticipo se realiza una vez aprobado el boceto.</p></div>' : '') +
      (r.confirmarZona ? '<p class="aviso">' + ICONO_INFO + '<span>La instalación se confirma al revisar tu ubicación.</span></p>' : '');
  }
  function calcularPd() {
    var t = D.tipos[pd.tipo], form = vista.querySelector('.pd-form');
    var p = precioPd(), extras = [], cotizar = false, confirmarZona = false;
    t.campos.forEach(function (c) {
      if (!c.opciones) return;
      var caja = form.querySelector('[data-campo="' + c.id + '"]');
      if (!caja || caja.hidden) return;
      var marcado = form.querySelector('input[name="' + c.id + '"]:checked');
      var o = c.opciones[marcado ? Number(marcado.value) : 0];
      if (o.costo) extras.push({ nombre: o.resumen || (c.etiqueta + ' · ' + o.texto), costo: o.costo });
      if (o.cotizar) cotizar = true;
      if (o.confirmarZona) confirmarZona = true;
    });
    var total = p.precio + extras.reduce(function (s, e) { return s + e.costo; }, 0);
    return { tipo: pd.tipo, t: t, m: pd.m, p: p, extras: extras, total: total, cotizar: cotizar, confirmarZona: confirmarZona };
  }
  vista.addEventListener('click', function (e) {
    if (e.target.closest('.js-volver')) { volverCatalogo(); return; }
    var bm = e.target.closest('button[data-medida]');
    if (bm && pd) {
      pd.idx = Number(bm.getAttribute('data-medida'));
      estado.medida[claveModelo(pd.tipo, pd.m)] = pd.idx;
      history.replaceState(history.state, '', '#pedido/' + pd.tipo + '/' + pd.m.codigo + '/' + pd.idx);
      pintarMedidaPd(); actualizarPd();
      if (pd.idx === -1) vista.querySelector('#pd-otra').focus();
    }
  });
  vista.addEventListener('change', function (e) { if (e.target.type === 'radio' && pd) actualizarPd(); });
  // Link al modelo con su foto (la página /m/... muestra vista previa en WhatsApp)
  function linkModelo(tipo, m) { return location.origin + '/m/' + tipo + '/' + encodeURIComponent(m.codigo); }
  function medidaBonita(md) { return String(md).replace(/\s*[×x]\s*/g, ' × ') + ' cm'; }
  function sinPunto(t) { return String(t).replace(/\.\s*$/, ''); }

  vista.addEventListener('submit', function (e) {
    e.preventDefault();
    var form = e.target, r = calcularPd();
    var faltan = null;
    var otraIn = form.elements.medidaOtra;
    function marcar(el, mal) {
      var caja = el.closest('.campo'), err = caja && caja.querySelector('.msg-error');
      if (caja) caja.classList.toggle('con-error', mal); if (err) err.hidden = !mal;
      if (mal) { el.setAttribute('aria-invalid', 'true'); if (!faltan) faltan = el; } else el.removeAttribute('aria-invalid');
    }
    if (r.p.otra) marcar(otraIn, !otraIn.value.trim());

    // Recolecta lo que sí aplica (los campos ocultos no cuentan)
    var dato = {}, opcion = {}, notas = [];
    r.t.campos.forEach(function (c) {
      var caja = form.querySelector('[data-campo="' + c.id + '"]');
      if (!caja || caja.hidden) return;
      if (c.opciones) {
        var mk = form.querySelector('input[name="' + c.id + '"]:checked');
        var o = c.opciones[mk ? Number(mk.value) : 0];
        opcion[c.id] = o;
        if (o.mensaje) notas.push(o.mensaje);
        return;
      }
      var el = form.elements[c.id], v = (el.value || '').trim();
      marcar(el, !!c.obligatorio && !v);
      dato[c.id] = v;
    });
    if (faltan) { faltan.focus(); faltan.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }

    function bloqueCampos(ids) {
      var out = [];
      r.t.campos.forEach(function (c) {
        if (ids.indexOf(c.id) < 0) return;
        var nombre = c.msj || c.etiqueta.replace(/\s*\(.*\)/, '').replace(/^¿|\?$/g, '');
        var v;
        if (c.opciones) { if (!opcion[c.id]) return; v = textoMsg(opcion[c.id]); }
        else { if (!(c.id in dato)) return; v = dato[c.id] || c.vacio; if (!v) return; }
        out.push({ corto: !!c.corto, t: c.corto ? '*' + nombre + ':* ' + v : '*' + nombre + ':*\n' + v });
      });
      // los datos cortos seguidos (fechas, foto) van en renglones juntos
      return out.map(function (x, i) { return (i === 0 ? '' : (x.corto && out[i - 1].corto ? '\n' : '\n\n')) + x.t; }).join('');
    }
    var ids = function (b) { return r.t.campos.filter(function (c) { return (BLOQUE[c.id] || 'diseno') === b; }).map(function (c) { return c.id; }); };
    var prod = mayus(r.t.singular);
    var sec = [];

    // MODELO
    sec.push('📋 *MODELO*\n' + prod + ' #' + r.m.codigo + ' · ' + r.m.nombre + '\n' +
      (r.p.otra ? 'Medida: ' + otraIn.value.trim() + ' (otra medida)\nPrecio: por cotizar' : 'Medida: ' + medidaBonita(r.p.medida) + '\nPrecio: ' + dinero(r.p.precio) + ' MXN') +
      '\nVer modelo: ' + linkModelo(r.tipo, r.m));

    // PERSONALIZACIÓN
    var pers = bloqueCampos(ids('diseno'));
    if (pers) sec.push('✏️ *PERSONALIZACIÓN*\n' + pers);

    // INSTALACIÓN / ENTREGA
    var inst = opcion.instalacion, pideInst = !!(inst && inst.confirmarZona), envio = !!(opcion.entrega && opcion.entrega.cotizar);
    if (inst) {
      var txtInst = inst.grupo === 'yo'
        ? (inst.mensajeCorto || 'La instalo yo · ' + inst.texto)
        : inst.texto + (inst.costo ? ' · +' + dinero(inst.costo) : '');
      var ubic = bloqueCampos(ids('instalacion').filter(function (id) { return id !== 'instalacion'; }));
      sec.push('🔧 *INSTALACIÓN*\n' + txtInst + (ubic ? '\n\n' + ubic : ''));
    }
    if (opcion.entrega) {
      var dirEnvio = bloqueCampos(ids('entrega').filter(function (id) { return id !== 'entrega'; }));
      sec.push('🚚 *ENTREGA*\n' + textoMsg(opcion.entrega) + (dirEnvio ? '\n\n' + dirEnvio : ''));
    }

    // RESUMEN
    var res = [prod + ': ' + (r.p.otra ? 'por cotizar' : dinero(r.p.precio))];
    r.extras.forEach(function (x) { res.push((x.nombre.indexOf('Instalación') === 0 ? 'Instalación' : x.nombre) + ': ' + dinero(x.costo)); });
    if (envio) res.push('Envío: según la zona');
    res.push(r.p.otra
      ? '*Total: por cotizar*' + (r.extras.length ? ' (+' + dinero(r.total) + ' de extras)' : '')
      : '*Total: ' + dinero(r.total) + ' MXN' + (envio ? ' + envío' : '') + '*');
    if (D.negocio.anticipo) res.push('*Anticipo: ' + dinero(D.negocio.anticipo) + ' MXN*');
    sec.push('💰 *RESUMEN*\n' + res.join('\n') + (D.negocio.anticipo ? '\n\nEl anticipo se realiza una vez aprobado el boceto.' : ''));

    if (pideInst || envio) sec.push('¿Me confirman la cobertura y si hay algún cargo adicional por mi ubicación?');
    if (notas.length) sec.push(notas.join('\n'));

    var mensaje = 'Hola ' + D.negocio.nombre + ', me gustaría solicitar mi boceto:\n\n' + sec.join('\n\n');
    window.open(linkWA(mensaje), '_blank', 'noopener');
  });

  /* ---------- placa 3D de la portada ---------- */
  (function placa3D() {
    var lista = D.portada || [];
    var placa = document.getElementById('placa3d');
    var escena = document.getElementById('escena');
    if (!lista.length || !placa) return;
    var quieto = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var CAPAS = 12, PASO = 1.4; // grosor: 12 capas de 1.4px
    var html = '';
    for (var k = CAPAS; k >= 1; k--) html += '<div class="capa canto" style="transform:translateZ(' + (-k * PASO) + 'px)"><img alt=""></div>';
    html += '<div class="capa frente"><img alt=""><span class="brillo"></span></div>';
    placa.innerHTML = html;
    var imgs = placa.querySelectorAll('img');
    var brillo = placa.querySelector('.brillo');
    var sombra = document.getElementById('sombra3d');
    var pie = document.getElementById('p3d-pie');
    var puntos = document.getElementById('p3d-puntos');
    puntos.innerHTML = lista.map(function (x, i) { return '<button type="button" data-i="' + i + '" aria-label="Ver ' + esc(x.texto) + '" aria-pressed="false"></button>'; }).join('');
    // precarga
    lista.forEach(function (x) { var im = new Image(); im.src = x.foto; });

    var actual = 0;
    function poner(i) {
      actual = i;
      var x = lista[i];
      imgs.forEach(function (im) { im.src = x.foto; });
      brillo.style.webkitMaskImage = brillo.style.maskImage = 'url("' + x.foto + '")';
      pie.textContent = '#' + x.codigo + ' · ' + x.texto;
      pie.setAttribute('data-i', i);
      puntos.querySelectorAll('button').forEach(function (b, n) { b.setAttribute('aria-pressed', String(n === i)); });
    }
    poner(0);

    // movimiento
    var rx = 0, ry = 0, tx = 0, ty = 0, giro = 0, usuario = false, ultimoMov = 0;
    function apuntar(e) {
      var r = escena.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      ty = Math.max(-1, Math.min(1, px)) * 32;
      tx = Math.max(-1, Math.min(1, py)) * -22;
      usuario = true; ultimoMov = performance.now();
    }
    if (!quieto) {
      document.getElementById('inicio').addEventListener('pointermove', apuntar);
      document.getElementById('inicio').addEventListener('pointerleave', function () { usuario = false; });
    }
    function cuadro(t) {
      if (!usuario || t - ultimoMov > 2500) {
        usuario = false;
        tx = quieto ? -6 : -6 + Math.sin(t / 2100) * 6;
        ty = quieto ? 12 : Math.sin(t / 1700) * 18;
      }
      rx += (tx - rx) * 0.08;
      ry += (ty - ry) * 0.08;
      placa.style.transform = 'rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + (ry + giro).toFixed(2) + 'deg)';
      var pos = 50 - (ry + giro) * 1.6;
      brillo.style.backgroundPosition = pos + '% ' + (50 + rx * 1.2) + '%';
      var abs = Math.min(1, Math.abs(ry + giro) / 90);
      sombra.style.transform = 'scaleX(' + (1 - abs * 0.6).toFixed(3) + ') translateX(' + (-(ry) * 0.6).toFixed(1) + 'px)';
      requestAnimationFrame(cuadro);
    }
    requestAnimationFrame(cuadro);

    // cambio de diseño con giro
    var girando = false;
    function cambiar(i) {
      if (girando || i === actual) return;
      if (quieto) { poner(i); return; }
      girando = true;
      var t0 = performance.now();
      (function fase1(t) {
        var k = Math.min(1, (t - t0) / 260);
        giro = 90 * k * k;
        if (k < 1) return requestAnimationFrame(fase1);
        poner(i);
        var t1 = performance.now();
        (function fase2(t) {
          var q = Math.min(1, (t - t1) / 380);
          giro = -90 * Math.pow(1 - q, 2);
          if (q < 1) return requestAnimationFrame(fase2);
          giro = 0; girando = false;
        })(t1);
      })(t0);
    }
    function automatico(ms) {
      return setInterval(function () { if (!document.hidden && !usuario) cambiar((actual + 1) % lista.length); }, ms);
    }
    var temporizador = automatico(4500);
    function elegir(i) {
      clearInterval(temporizador);
      temporizador = automatico(6000);
      cambiar((i + lista.length) % lista.length);
    }
    puntos.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-i]'); if (!b) return;
      elegir(Number(b.getAttribute('data-i')));
    });
    document.getElementById('p3d-ant').addEventListener('click', function (e) { e.stopPropagation(); elegir(actual - 1); });
    document.getElementById('p3d-sig').addEventListener('click', function (e) { e.stopPropagation(); elegir(actual + 1); });
    escena.addEventListener('click', function () { elegir(actual + 1); });
    pie.addEventListener('click', function () {
      var x = lista[Number(pie.getAttribute('data-i')) || 0];
      irA(x.tipo);
      estado.busqueda = x.codigo;
      document.getElementById('buscar').value = x.codigo;
      pintarModelos();
    });
  })();

  /* ---------- ya tengo mi diseño ---------- */
  (function miDiseno() {
    var form = document.getElementById('form-diseno');
    if (!form) return;
    var SOLO = ['instalacion', 'entrega', 'domicilio', 'cementerio', 'envio'];
    var FORMAS = { placas: ['ovalada', 'rectangular', 'cuadrada'], lapidas: (D.tipos.lapidas && D.tipos.lapidas.medidas) || ['rectangular', 'cuadrada'] };
    var est = { tipo: 'placas', forma: 'ovalada', idx: 0 };
    function recomendada(f) { var i = (D.precios[f] || []).findIndex(function (p) { return p.recomendada; }); return i >= 0 ? i : 0; }
    est.idx = recomendada(est.forma);
    var caja = document.getElementById('md-campos');
    function camposDe() { return D.tipos[est.tipo].campos.filter(function (c) { return SOLO.indexOf(c.id) >= 0; }); }
    function visibles() {
      for (var k = 0; k < 2; k++) camposDe().forEach(function (c) {
        var el = caja.querySelector('[data-campo="' + c.id + '"]'); if (el) el.hidden = !campoVisible(c, caja);
      });
    }
    function precio() { return (D.precios[est.forma] || [])[est.idx] || { medida: '', precio: 0 }; }
    function calcular() {
      var p = precio(), extras = [], cotizar = false, zona = false, lineas = [];
      camposDe().forEach(function (c) {
        var el = caja.querySelector('[data-campo="' + c.id + '"]');
        if (!el || el.hidden) return;
        if (c.opciones) {
          var mk = caja.querySelector('input[name="' + c.id + '"]:checked');
          var o = c.opciones[mk ? Number(mk.value) : 0];
          if (o.costo) extras.push({ n: c.etiqueta, c: o.costo });
          if (o.cotizar) cotizar = true; if (o.confirmarZona) zona = true;
          lineas.push('• ' + c.etiqueta + ': ' + textoMsg(o) + (o.costo ? ' (+' + dinero(o.costo) + ')' : ''));
        }
      });
      var total = p.precio + extras.reduce(function (s, e) { return s + e.c; }, 0);
      return { p: p, extras: extras, total: total, cotizar: cotizar, zona: zona, lineas: lineas };
    }
    function resumen() {
      var r = calcular();
      document.getElementById('md-precio').textContent = dinero(r.p.precio);
      var det = 'Diseño propio ' + NOMBRES_FORMA[est.forma].toLowerCase() + ' ' + r.p.medida + ' cm: ' + dinero(r.p.precio);
      r.extras.forEach(function (e) { det += '<br>' + esc(e.n) + ': ' + dinero(e.c); });
      document.getElementById('md-resumen').innerHTML = '<p>' + det + '</p><p class="total">Total: ' + dinero(r.total) + ' MXN' + (r.cotizar ? ' + envío' : '') + '</p>' +
        (r.zona ? '<p>La instalación se confirma al revisar tu ubicación.</p>' : '') +
        (D.negocio.anticipo ? '<p>Anticipo para iniciar: <strong>' + dinero(D.negocio.anticipo) + '</strong><br><small>El anticipo se realiza una vez aprobado el boceto.</small></p>' : '');
    }
    function pintarMedidas() {
      document.getElementById('md-medidas').innerHTML = FORMAS[est.tipo].map(function (f) {
        return '<span class="grupo-medida">' + esc(NOMBRES_FORMA[f] || f) + '</span><div class="sizes" role="group" aria-label="Tamaño ' + esc(NOMBRES_FORMA[f] || f) + '">' +
          (D.precios[f] || []).map(function (p, i) {
            var on = est.forma === f && est.idx === i;
            return '<button type="button" data-forma="' + f + '" data-i="' + i + '" aria-pressed="' + on + '">' + esc(p.medida) + '</button>';
          }).join('') + '</div>';
      }).join('');
    }
    function pintarTipo() {
      if (FORMAS[est.tipo].indexOf(est.forma) < 0) { est.forma = FORMAS[est.tipo][0]; est.idx = recomendada(est.forma); }
      pintarMedidas();
      caja.innerHTML = htmlCampos(est.tipo, { codigo: 'propio' }, SOLO);
      visibles(); resumen();
    }
    form.addEventListener('change', function (e) {
      if (e.target.name === 'md-tipo') { est.tipo = e.target.value; pintarTipo(); return; }
      if (e.target.type === 'radio') { visibles(); resumen(); }
    });
    document.getElementById('md-medidas').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-forma]'); if (!b) return;
      est.forma = b.getAttribute('data-forma'); est.idx = Number(b.getAttribute('data-i'));
      pintarMedidas(); resumen();
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var faltan = null;
      var nombre = form.elements.nombre;
      function marcar(el, mal) {
        var cj = el.closest('.campo'); var err = cj && cj.querySelector('.msg-error');
        if (cj) cj.classList.toggle('con-error', mal); if (err) err.hidden = !mal;
        if (mal) { el.setAttribute('aria-invalid', 'true'); if (!faltan) faltan = el; } else el.removeAttribute('aria-invalid');
      }
      marcar(nombre, !nombre.value.trim());
      // Junta lo que aplica (los campos ocultos no cuentan)
      var dato = {}, opcion = {};
      camposDe().forEach(function (c) {
        var cj = caja.querySelector('[data-campo="' + c.id + '"]'); if (!cj || cj.hidden) return;
        if (c.opciones) {
          var mk = caja.querySelector('input[name="' + c.id + '"]:checked');
          opcion[c.id] = c.opciones[mk ? Number(mk.value) : 0];
          return;
        }
        var el = cj.querySelector('input, textarea'); var v = (el.value || '').trim();
        marcar(el, !!c.obligatorio && !v);
        dato[c.id] = { c: c, v: v };
      });
      if (faltan) { faltan.focus(); return; }
      var r = calcular();
      var t = D.tipos[est.tipo], prod = mayus(t.singular);
      var notas = form.elements.notas.value.trim();
      function dir(id) {
        var d = dato[id]; if (!d || !d.v) return '';
        return '\n\n*' + (d.c.msj || d.c.etiqueta.replace(/\s*\(.*\)/, '')) + ':*\n' + d.v;
      }
      var sec = [];
      sec.push('📋 *MI DISEÑO*\n' + prod + ' con diseño propio\n' +
        'Medida: ' + NOMBRES_FORMA[est.forma] + ' · ' + medidaBonita(r.p.medida) + '\n' +
        'Precio: ' + dinero(r.p.precio) + ' MXN\n' +
        '*A nombre de:* ' + nombre.value.trim());
      var inst = opcion.instalacion, pideInst = !!(inst && inst.confirmarZona), envio = !!(opcion.entrega && opcion.entrega.cotizar);
      if (inst) {
        var txtInst = inst.grupo === 'yo'
          ? (inst.mensajeCorto || 'La instalo yo · ' + inst.texto)
          : inst.texto + (inst.costo ? ' · +' + dinero(inst.costo) : '');
        sec.push('🔧 *INSTALACIÓN*\n' + txtInst + dir('domicilio') + dir('cementerio'));
      }
      if (opcion.entrega) sec.push('🚚 *ENTREGA*\n' + textoMsg(opcion.entrega) + dir('envio'));
      if (notas) sec.push('💬 *COMENTARIOS*\n' + notas);
      var res = [prod + ': ' + dinero(r.p.precio)];
      if (inst && inst.costo) res.push('Instalación: ' + dinero(inst.costo));
      if (envio) res.push('Envío: según la zona');
      res.push('*Total: ' + dinero(r.total) + ' MXN' + (envio ? ' + envío' : '') + '*');
      if (D.negocio.anticipo) res.push('*Anticipo: ' + dinero(D.negocio.anticipo) + ' MXN*');
      sec.push('💰 *RESUMEN*\n' + res.join('\n') + (D.negocio.anticipo ? '\n\nEl anticipo se realiza una vez aprobado el boceto.' : ''));
      if (pideInst || envio) sec.push('¿Me confirman la cobertura y si hay algún cargo adicional por mi ubicación?');
      sec.push('Les mando mi diseño por aquí. Quedo en espera de la prueba para aprobarla.');
      var mensaje = 'Hola ' + D.negocio.nombre + ', ya tengo mi diseño y me gustaría mandarlo a hacer:\n\n' + sec.join('\n\n');
      window.open(linkWA(mensaje), '_blank', 'noopener');
    });
    pintarTipo();
  })();

  /* ---------- cita para diseñar en persona ---------- */
  (function citas() {
    var C = D.cita;
    var form = document.getElementById('form-cita');
    if (!C || !form) { var sec = document.getElementById('cita'); if (sec) sec.hidden = true; return; }
    var CLAVES = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    var NOMBRES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    var paso = Number(C.intervalo) || 60;
    function rango(txt) {
      if (!txt) return null;
      var p = String(txt).replace(/\s/g, '').split('-');
      if (p.length !== 2) return null;
      function min(t) { var x = t.split(':'); return Number(x[0]) * 60 + Number(x[1] || 0); }
      return [min(p[0]), min(p[1])];
    }
    function hora(m) {
      var h = Math.floor(m / 60), mm = m % 60;
      return (h % 12 || 12) + ':' + (mm < 10 ? '0' : '') + mm + (h < 12 ? ' a.m.' : ' p.m.');
    }
    // Días disponibles
    var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    var ahora = new Date();
    var dias = [];
    for (var i = 0; i < (Number(C.diasAdelante) || 21); i++) {
      var d = new Date(hoy); d.setDate(hoy.getDate() + i);
      var r = rango(C.horario[CLAVES[d.getDay()]]);
      if (!r) continue;
      var slots = [];
      for (var t = r[0]; t + paso <= r[1]; t += paso) slots.push(t);
      if (i === 0) {
        var limite = ahora.getHours() * 60 + ahora.getMinutes() + 60; // al menos 1 hora de anticipación
        slots = slots.filter(function (s) { return s >= limite; });
      }
      if (!slots.length) continue;
      var etiqueta = mayus(d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }));
      if (i === 0) etiqueta += ' (hoy)'; else if (i === 1) etiqueta += ' (mañana)';
      dias.push({ etiqueta: etiqueta, slots: slots });
    }
    var selDia = document.getElementById('cita-dia');
    var selHora = document.getElementById('cita-hora');
    selDia.innerHTML = dias.map(function (x, i) { return '<option value="' + i + '">' + esc(x.etiqueta) + '</option>'; }).join('');
    function pintarHoras() {
      var x = dias[Number(selDia.value) || 0];
      selHora.innerHTML = x ? x.slots.map(function (m) { return '<option>' + hora(m) + '</option>'; }).join('') : '';
    }
    selDia.addEventListener('change', pintarHoras);
    pintarHoras();

    // Horario y ubicación
    var filas = [1, 2, 3, 4, 5, 6, 0].map(function (n) {
      var r = rango(C.horario[CLAVES[n]]);
      return '<tr><td>' + NOMBRES[n] + '</td><td>' + (r ? hora(r[0]) + ' – ' + hora(r[1]) : 'Cerrado') + '</td></tr>';
    }).join('');
    document.getElementById('horario').innerHTML = '<table><tbody>' + filas + '</tbody></table>';
    var info = document.getElementById('ubicacion-info');
    if (C.direccion) {
      var q = encodeURIComponent(C.direccion);
      var link = C.mapa || ('https://www.google.com/maps/search/?api=1&query=' + q);
      info.innerHTML = '<p class="dir">' + esc(C.direccion) + '</p>' +
        (C.referencias ? '<p class="muted">' + esc(C.referencias) + '</p>' : '') +
        '<iframe title="Mapa de ubicación de ' + esc(D.negocio.nombre) + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=' + encodeURIComponent(C.coordenadas || C.direccion) + '&z=17&output=embed"></iframe>' +
        '<a class="btn btn-primary btn-mapa" href="' + esc(link) + '" target="_blank" rel="noopener">Cómo llegar</a>';
    } else {
      info.innerHTML = '<p class="muted">Te compartimos la ubicación exacta por WhatsApp al confirmar tu cita. Estamos en ' + esc(D.negocio.ciudad) + '.</p>';
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var nombre = form.elements.nombre;
      var caja = nombre.closest('.campo');
      if (!nombre.value.trim()) {
        caja.classList.add('con-error'); caja.querySelector('.msg-error').hidden = false; nombre.setAttribute('aria-invalid', 'true'); nombre.focus(); return;
      }
      caja.classList.remove('con-error'); caja.querySelector('.msg-error').hidden = true; nombre.removeAttribute('aria-invalid');
      var que = form.querySelector('input[name="que"]:checked');
      var d = dias[Number(selDia.value) || 0];
      var lineas = [
        '• Nombre: ' + nombre.value.trim(),
        '• Quiero diseñar: ' + (que ? que.value : ''),
        '• Día: ' + (d ? d.etiqueta.replace(/ \((hoy|mañana)\)$/, '') : ''),
        '• Hora: ' + selHora.value
      ];
      if (form.elements.modelo.value.trim()) lineas.push('• Modelo que me gustó: ' + form.elements.modelo.value.trim());
      if (form.elements.notas.value.trim()) lineas.push('• Comentarios: ' + form.elements.notas.value.trim());
      var mensaje = 'Hola ' + D.negocio.nombre + ', quiero agendar una cita para diseñar en persona:\n\n' + lineas.join('\n') + '\n\n¿Tienen disponibilidad?';
      window.open(linkWA(mensaje), '_blank', 'noopener');
    });
  })();

  /* ---------- inicio ---------- */
  // Un link que termina en #lapidas abre directo la pestaña de lápidas
  var h = location.hash.replace('#', '');
  if (D.tipos[h]) { estado.tipo = h; }
  pintarTodo();
  if (D.tipos[h]) { document.getElementById('modelos').scrollIntoView(); }
  var rutaIni = rutaPedido();
  if (rutaIni && D.tipos[rutaIni.tipo]) {
    estado.tipo = rutaIni.tipo; pintarTodo();
    if (!abrirPedido(rutaIni.tipo, rutaIni.codigo, rutaIni.idx, false)) history.replaceState(null, '', location.pathname + location.search);
  }

  /* ---------- aviso de bienvenida: ¿placas o lápidas? ---------- */
  (function () {
    var bv = document.getElementById('bienvenida'); if (!bv) return;
    var visto = false;
    try { visto = sessionStorage.getItem('recoovare_bienvenida') === '1'; } catch (e) {}
    if (D.tipos[h] || rutaIni || visto) return; // si el link ya dice qué ver, o ya lo vio en esta visita, no se muestra
    function cerrar() {
      bv.hidden = true; document.body.style.overflow = '';
      try { sessionStorage.setItem('recoovare_bienvenida', '1'); } catch (e) {}
    }
    bv.hidden = false; document.body.style.overflow = 'hidden';
    bv.querySelectorAll('[data-bv]').forEach(function (b) {
      b.addEventListener('click', function () {
        cerrar(); irA(b.getAttribute('data-bv'));
        document.getElementById('modelos').scrollIntoView({ behavior: 'smooth' });
      });
    });
    document.getElementById('bv-cerrar').addEventListener('click', cerrar);
    document.getElementById('bv-todo').addEventListener('click', cerrar);
    bv.addEventListener('click', function (e) { if (e.target === bv) cerrar(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !bv.hidden) cerrar(); });
  })();
})();
