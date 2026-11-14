/* =====================================================================
   Conexión entre Notas de venta y Control de pedidos (mismo navegador).
   Cada nota guardada crea o actualiza su pedido (folio RC-xxxx).
   ===================================================================== */
(function () {
  var K = 'recoovare_pedidos', KF = 'recoovare_folio_pedidos', KI = 'recoovare_pedidos_ignorados', KINIT = 'recoovare_pedidos_init';
  function leer(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function guardar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function fechaLocal(iso) { var d = iso ? new Date(iso) : new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
  function esProducto(it) {
    if (it.clase) return it.clase === 'producto';
    return /^(placa|l[áa]pida|dise[ñn]o propio)/i.test(it.desc || '');
  }
  var KC = 'recoovare_config_pedidos';
  function reglaActual() { var c = Object.assign({ modo: 'porcentaje', pct: 50, fijo: 0 }, leer(KC, {})); return { modo: c.modo, pct: num(c.pct), fijo: num(c.fijo) }; }
  function hist(p, txt) { p.historial = p.historial || []; p.historial.push({ fecha: new Date().toISOString(), txt: txt }); }
  var ORDEN = ['Pendiente de boceto', 'En revisión', 'Aprobado', 'En producción', 'Listo para entregar', 'Entregado', 'Cancelado'];
  // Pone al día pedidos de la versión anterior: estados nuevos y la regla de reparto guardada en cada pedido
  function migrar(lista) {
    var r = null, cambio = false;
    lista.forEach(function (p) {
      if (p.estado === 'Pendiente') { p.estado = 'Pendiente de boceto'; cambio = true; }
      if (!p.regla) { p.regla = r || (r = reglaActual()); cambio = true; }
      if (!p.historial) { p.historial = []; cambio = true; }
    });
    return cambio;
  }
  function nuevoFolio() {
    var n = (leer(KF, 0) || 0) + 1; guardar(KF, n);
    return 'RC-' + String(n).padStart(4, '0');
  }
  function pedidoVacio() {
    return {
      id: 'p' + Date.now() + Math.random().toString(36).slice(2, 6), folio: nuevoFolio(),
      fecha: fechaLocal(), cliente: '', tel: '', producto: '', precioProducto: 0,
      extras: 0, extrasDetalle: '', entrega: '', estado: 'Pendiente de boceto', pagos: [], historial: [], regla: reglaActual(),
      metodoEntrega: '', ubicacion: '',
      intermediario: { nombre: '', monto: 0 }, costos: [], ajuste: null,
      mama: { pagado: false, fecha: '', monto: null }, notas: '', notaId: null, notaFolio: null
    };
  }
  /* ---------- carga inicial: pedidos de tu Excel ---------- */
  function inicializar() {
    if (leer(KINIT, false)) return;
    var actuales = leer(K, []);
    var base = [
      ['RC-0001', '2026-11-09', 'Naty', 'Lápida 45 × 32 cm', 850, 'Entregado', true],
      ['RC-0002', '2026-11-10', 'Mayra', 'Lápida 45 × 32 cm', 850, 'Listo para entregar', true],
      ['RC-0003', '2026-11-10', 'Suemi', 'Lápida 35 × 35 cm', 750, 'Listo para entregar', true],
      ['RC-0004', '2026-11-11', 'Gloria', 'Placa domiciliaria 35 × 25 cm', 700, 'En producción', true],
      ['RC-0005', '2026-11-11', 'Paula', 'Lápida 35 × 25 cm', 700, 'En producción', false]
    ].map(function (r, i) {
      return {
        id: 'p-excel-' + (i + 1), folio: r[0], fecha: r[1], cliente: r[2], tel: '', producto: r[3], precioProducto: r[4],
        extras: 0, extrasDetalle: '', entrega: '', estado: r[5],
        pagos: r[6] ? [{ fecha: r[1], monto: 150, metodo: 'Efectivo', concepto: 'Anticipo', origen: 'manual' }] : [],
        intermediario: { nombre: '', monto: 0 }, costos: [], ajuste: null, mama: { pagado: false, fecha: '', monto: null },
        notas: '', notaId: null, notaFolio: null
      };
    });
    // Los pedidos del Excel van primero; los que ya existieran se renumeran después
    var folio = 5;
    actuales.forEach(function (p) { folio++; p.folio = 'RC-' + String(folio).padStart(4, '0'); });
    guardar(K, actuales.concat(base));
    guardar(KF, folio);
    guardar(KINIT, true);
  }
  function desdeNota(nota) {
    if (!nota || !nota.folio) return null;
    inicializar();
    if (leer(KI, []).indexOf(nota.id) >= 0) return null;
    var lista = leer(K, []);
    var p = lista.find(function (x) { return x.notaId === nota.id; });
    // Nota creada desde un pedido existente: se enlaza a ese pedido y la nota pasa a llevar sus pagos
    if (!p && nota.pedidoId) { p = lista.find(function (x) { return x.id === nota.pedidoId && !x.notaId; }); if (p) p.pagos = []; }
    var suma = function (a) { return a.reduce(function (s, i) { return s + num(i.cant) * num(i.precio); }, 0); };
    var prods = nota.items.filter(esProducto), extras = nota.items.filter(function (i) { return !esProducto(i); });
    var fechaN = fechaLocal(nota.fecha);
    if (!p) {
      p = pedidoVacio(); p.fecha = fechaN; p.notas = nota.notas || '';
      hist(p, 'Pedido creado desde la nota ' + nota.folio);
      lista.unshift(p);
    } else if (!p.notaId) hist(p, 'Se creó la nota ' + nota.folio + ' para este pedido');
    migrar([p]);
    // Entrega desde la nota
    if (nota.envio) {
      p.metodoEntrega = nota.envio.metodo || '';
      p.ubicacion = nota.envio.metodo === 'envio' ? (nota.envio.direccion || '') : nota.envio.metodo === 'instalacion' ? (nota.envio.ubicacion || '') : '';
    }
    // Boceto: si todos los productos tienen boceto aprobado, el pedido pasa a "Aprobado" (solo avanza, nunca regresa)
    var conBoceto = (nota.items || []).filter(function (i) { return esProducto(i) && i.boceto; });
    var prodsN = (nota.items || []).filter(esProducto);
    var etapa = ORDEN.indexOf(p.estado);
    if (prodsN.length && conBoceto.length === prodsN.length && conBoceto.every(function (i) { return i.boceto.estado === 'aprobado'; }) && etapa >= 0 && etapa < 2) {
      p.estado = 'Aprobado'; hist(p, 'Boceto aprobado en la nota ' + nota.folio + ' → Aprobado');
    } else if (conBoceto.some(function (i) { return i.boceto.estado === 'revision' || (i.boceto.versiones || []).length; }) && p.estado === 'Pendiente de boceto') {
      p.estado = 'En revisión'; hist(p, 'Boceto enviado a revisión → En revisión');
    }
    p.cliente = (nota.cliente && nota.cliente.nombre) || p.cliente;
    p.tel = (nota.cliente && nota.cliente.tel) || p.tel;
    p.producto = prods.map(function (i) { return (i.cant > 1 ? i.cant + ' × ' : '') + i.desc; }).join(' + ') || (nota.items[0] ? nota.items[0].desc : p.producto);
    p.precioProducto = suma(prods);
    p.extras = suma(extras);
    p.extrasDetalle = extras.map(function (i) { return i.desc; }).join(', ');
    p.entrega = nota.entrega || p.entrega;
    p.notaId = nota.id; p.notaFolio = nota.folio;
    // Asesor de ventas -> intermediario (salvo que lo hayas cambiado a mano en Pedidos)
    var vend = ((window.CATALOGO && window.CATALOGO.vendedores) || []).find(function (v) { return v.codigo === nota.vendedor; });
    var inter = p.intermediario || {};
    if (!inter.manual) {
      if (vend) p.intermediario = { nombre: vend.nombre, codigo: vend.codigo, monto: num(nota.comision), pagado: !!inter.pagado, fecha: inter.fecha || '' };
      else if (inter.codigo) p.intermediario = { nombre: '', monto: 0 };
    }
    // Pagos que vienen de la nota (se recalculan cada vez)
    var manuales = (p.pagos || []).filter(function (x) { return x.origen !== 'nota'; });
    var deNota = [];
    if (Array.isArray(nota.pagos)) {
      deNota = nota.pagos.filter(function (x) { return num(x.monto) > 0; }).map(function (x) {
        return { fecha: x.fecha || fechaN, monto: num(x.monto), metodo: x.metodo || 'Efectivo', concepto: (x.concepto || 'Pago') + ' (nota ' + nota.folio + ')', origen: 'nota' };
      });
      p.pagos = deNota.concat(manuales);
      guardar(K, lista);
      return p;
    }
    if (num(nota.anticipo) > 0) deNota.push({ fecha: fechaN, monto: num(nota.anticipo), metodo: nota.metodo || 'Efectivo', concepto: 'Anticipo (nota ' + nota.folio + ')', origen: 'nota' });
    if (nota.pagado) {
      var pagadoYa = num(nota.anticipo) + manuales.reduce(function (s, x) { return s + num(x.monto); }, 0);
      var resta = suma(nota.items) - pagadoYa;
      if (resta > 0) deNota.push({ fecha: fechaLocal(), monto: resta, metodo: nota.metodo || 'Efectivo', concepto: 'Liquidación (nota ' + nota.folio + ')', origen: 'nota' });
    }
    p.pagos = deNota.concat(manuales);
    guardar(K, lista);
    return p;
  }
  function sincronizarNotas() {
    leer('recoovare_notas', []).forEach(desdeNota);
  }
  /* ---------- imágenes de bocetos (IndexedDB: guarda mucho más que localStorage) ---------- */
  var Img = (function () {
    var dbp = null;
    function db() {
      if (dbp) return dbp;
      dbp = new Promise(function (ok, mal) {
        if (!window.indexedDB) { mal(new Error('Este navegador no permite guardar imágenes')); return; }
        var r = indexedDB.open('recoovare_bocetos', 1);
        r.onupgradeneeded = function () { r.result.createObjectStore('imgs'); };
        r.onsuccess = function () { ok(r.result); };
        r.onerror = function () { mal(r.error); };
      });
      return dbp;
    }
    function tx(modo, fn) {
      return db().then(function (d) {
        return new Promise(function (ok, mal) {
          var t = d.transaction('imgs', modo), st = t.objectStore('imgs'), res;
          var r = fn(st); if (r) r.onsuccess = function () { res = r.result; };
          t.oncomplete = function () { ok(res); }; t.onerror = function () { mal(t.error); };
        });
      });
    }
    return {
      poner: function (id, data) { return tx('readwrite', function (st) { return st.put(data, id); }); },
      leer: function (id) { return tx('readonly', function (st) { return st.get(id); }); },
      borrar: function (id) { return tx('readwrite', function (st) { return st.delete(id); }); },
      todas: function () {
        return db().then(function (d) {
          return new Promise(function (ok, mal) {
            var out = {}, t = d.transaction('imgs', 'readonly'), c = t.objectStore('imgs').openCursor();
            c.onsuccess = function () { var cur = c.result; if (cur) { out[cur.key] = cur.value; cur.continue(); } };
            t.oncomplete = function () { ok(out); }; t.onerror = function () { mal(t.error); };
          });
        });
      }
    };
  })();
  window.RecoovareImg = Img;
  window.RecoovareSync = { migrar: migrar, hist: hist, ORDEN: ORDEN, reglaActual: reglaActual, inicializar: inicializar, K: K, KF: KF, KI: KI, leer: leer, guardar: guardar, num: num, nuevoFolio: nuevoFolio, pedidoVacio: pedidoVacio, desdeNota: desdeNota, sincronizarNotas: sincronizarNotas };
})();
