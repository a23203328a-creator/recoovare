/* =====================================================================
   Guardado en línea (Cloudflare) para Pedidos, Notas, Agenda y Gastos.
   - Al abrir: trae los datos de internet y los pone en este navegador.
   - Al guardar: sube solo lo que cambió (unos segundos después).
   - Sin internet: sigue funcionando aquí y sube los cambios al regresar.
   ===================================================================== */
(function () {
  var SYNC = ['recoovare_pedidos', 'recoovare_folio_pedidos', 'recoovare_pedidos_ignorados', 'recoovare_config_pedidos', 'recoovare_pedidos_init', 'recoovare_notas', 'recoovare_folio', 'recoovare_agenda', 'essentia_gastos', 'essentia_ganancias', 'essentia_reparto'];
  var KB = 'recoovare_nube_base', KP = 'recoovare_nube_pendiente', KIP = 'recoovare_nube_imgs_pendientes', KIS = 'recoovare_nube_imgs_subidas';
  var API = '/api';
  var origSet = Storage.prototype.setItem;
  var callado = false, timer = null, subiendo = false, enLinea = false;

  function leer(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function poner(k, v) { callado = true; try { origSet.call(localStorage, k, typeof v === 'string' ? v : JSON.stringify(v)); } finally { callado = false; } }

  /* ---------- indicador ---------- */
  var pill = document.createElement('div');
  pill.setAttribute('role', 'status');
  pill.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:50;font:700 13px Nunito,system-ui,sans-serif;padding:6px 12px;border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,.12);background:#fff;color:#5E4E45;border:1px solid #E8E0D8;max-width:calc(100vw - 24px)';
  function indicar(t, tipo) {
    pill.textContent = t;
    pill.style.background = tipo === 'ok' ? '#DDF2E4' : tipo === 'error' ? '#FDECC8' : '#fff';
    pill.style.color = tipo === 'ok' ? '#0F5E31' : tipo === 'error' ? '#7A3E06' : '#5E4E45';
    if (!pill.parentNode && document.body) document.body.appendChild(pill);
  }

  /* ---------- detectar cambios ---------- */
  Storage.prototype.setItem = function (k, v) {
    origSet.call(this, k, v);
    if (this === window.localStorage && !callado && SYNC.indexOf(k) >= 0) {
      var p = leer(KP, {}); p[k] = 1; poner(KP, p);
      programar();
    }
  };
  function programar() { clearTimeout(timer); timer = setTimeout(subir, 900); if (enLinea) indicar('☁ Guardando…'); }

  /* ---------- mezclar si otro dispositivo guardó lo mismo ---------- */
  function mezclar(k, local, remoto) {
    if (k === 'recoovare_folio_pedidos' || k === 'recoovare_folio') return String(Math.max(Number(local) || 0, Number(remoto) || 0));
    var L, R;
    try { L = JSON.parse(local); R = JSON.parse(remoto); } catch (e) { return local; }
    if (Array.isArray(L) && Array.isArray(R)) {
      if (k === 'recoovare_pedidos_ignorados') return JSON.stringify(R.concat(L.filter(function (x) { return R.indexOf(x) < 0; })));
      var porId = {}, orden = [];
      R.forEach(function (x) { if (x && x.id) { porId[x.id] = x; orden.push(x.id); } });
      L.forEach(function (x) { if (x && x.id) { if (!porId[x.id]) orden.unshift(x.id); porId[x.id] = x; } });
      return JSON.stringify(orden.map(function (id) { return porId[id]; }));
    }
    return local;
  }

  /* ---------- subir ---------- */
  function subir() {
    if (subiendo) { programar(); return; }
    var pend = leer(KP, {}), claves = Object.keys(pend);
    if (!claves.length) { if (enLinea) indicar('☁ Guardado en línea', 'ok'); return; }
    subiendo = true;
    var base = leer(KB, {}), cambios = {}, enviados = {};
    claves.forEach(function (k) { var v = localStorage.getItem(k); if (v !== null) { cambios[k] = v; enviados[k] = v; } });
    fetch(API + '/datos', { method: 'PUT', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ cambios: cambios, base: base }) })
      .then(function (r) { return r.json().then(function (j) { return { s: r.status, j: j }; }); })
      .then(function (res) {
        subiendo = false;
        if (res.s === 409 && res.j.choque) {
          Object.keys(res.j.datos).forEach(function (k) {
            poner(k, mezclar(k, localStorage.getItem(k), res.j.datos[k]));
            base[k] = res.j.versiones[k];
          });
          poner(KB, base); subir(); return;
        }
        if (res.s !== 200) throw new Error(res.j && res.j.error || ('Error ' + res.s));
        var p = leer(KP, {});
        Object.keys(res.j.versiones || {}).forEach(function (k) { base[k] = res.j.versiones[k]; if (localStorage.getItem(k) === enviados[k]) delete p[k]; });
        poner(KB, base); poner(KP, p);
        enLinea = true;
        if (Object.keys(p).length) programar(); else indicar('☁ Guardado en línea', 'ok');
      })
      .catch(function () {
        subiendo = false; enLinea = false;
        indicar('Sin conexión: se guarda en esta compu y se sube al volver', 'error');
        clearTimeout(timer); timer = setTimeout(subir, 15000);
      });
  }
  window.addEventListener('online', function () { subir(); subirImagenes(); });

  /* ---------- imágenes de bocetos ---------- */
  function envolverImagenes() {
    var Img = window.RecoovareImg; if (!Img || Img._nube) return;
    var o = { poner: Img.poner, leer: Img.leer, borrar: Img.borrar };
    Img.poner = function (id, data) {
      return o.poner(id, data).then(function (r) { var p = leer(KIP, {}); p[id] = 'subir'; poner(KIP, p); subirImagenes(); return r; });
    };
    Img.leer = function (id) {
      return o.leer(id).then(function (d) {
        if (d) return d;
        return fetch(API + '/img/' + encodeURIComponent(id), { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.text() : null; })
          .then(function (t) { if (t) { o.poner(id, t); } return t; }).catch(function () { return null; });
      });
    };
    Img.borrar = function (id) {
      return o.borrar(id).then(function (r) { var p = leer(KIP, {}); p[id] = 'borrar'; poner(KIP, p); subirImagenes(); return r; });
    };
    Img._nube = true; Img._o = o;
  }
  var subiendoImgs = false;
  function subirImagenes() {
    var Img = window.RecoovareImg; if (!Img || !Img._o || subiendoImgs) return;
    var p = leer(KIP, {}), ids = Object.keys(p); if (!ids.length) return;
    subiendoImgs = true;
    ids.reduce(function (pr, id) {
      return pr.then(function () {
        if (p[id] === 'borrar') return fetch(API + '/img/' + encodeURIComponent(id), { method: 'DELETE', credentials: 'same-origin' }).then(function (r) { if (r.ok) quitar(id); });
        return Img._o.leer(id).then(function (d) {
          if (!d) { quitar(id); return; }
          return fetch(API + '/img/' + encodeURIComponent(id), { method: 'PUT', credentials: 'same-origin', body: d }).then(function (r) { if (r.ok) quitar(id); });
        });
      });
    }, Promise.resolve()).catch(function () {}).then(function () { subiendoImgs = false; });
    function quitar(id) { var q = leer(KIP, {}); delete q[id]; poner(KIP, q); }
  }
  // Primera vez: sube los bocetos que ya estaban en esta computadora
  function subirImagenesExistentes() {
    var Img = window.RecoovareImg; if (!Img || !Img.todas || localStorage.getItem(KIS)) return;
    Promise.all([Img.todas(), fetch(API + '/img', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; })]).then(function (res) {
      if (!res[1]) return;
      var remotos = res[1].ids || [], p = leer(KIP, {});
      Object.keys(res[0] || {}).forEach(function (id) { if (remotos.indexOf(id) < 0) p[id] = 'subir'; });
      poner(KIP, p); poner(KIS, '1'); subirImagenes();
    }).catch(function () {});
  }

  /* ---------- cambios hechos en otro dispositivo ---------- */
  function revisarOtros() {
    if (document.hidden || !enLinea || Object.keys(leer(KP, {})).length) return;
    fetch(API + '/datos', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j) return;
      var base = leer(KB, {}), cambio = SYNC.some(function (k) { return j.versiones[k] && j.versiones[k] !== base[k]; });
      if (!cambio) return;
      if (document.querySelector('.modal:not([hidden])')) { indicar('Hay cambios de otro dispositivo: recarga la página', 'error'); return; }
      SYNC.forEach(function (k) { if (j.datos[k] !== undefined) poner(k, j.datos[k]); });
      poner(KB, j.versiones);
      location.reload();
    }).catch(function () {});
  }
  document.addEventListener('visibilitychange', revisarOtros);

  /* ---------- arranque ---------- */
  function cargarScripts(lista, fin) {
    var i = 0;
    (function sig() {
      if (i >= lista.length) { fin && fin(); return; }
      var s = document.createElement('script'); s.src = lista[i++];
      s.onload = function () { if (/sync\.js/.test(s.src)) envolverImagenes(); sig(); };
      s.onerror = sig;
      document.body.appendChild(s);
    })();
  }
  function conTiempo(p, ms) { return Promise.race([p, new Promise(function (_, mal) { setTimeout(function () { mal(new Error('tiempo')); }, ms); })]); }

  window.RecoovareNube = {
    iniciar: function (scripts) {
      indicar('☁ Cargando datos…');
      conTiempo(fetch(API + '/datos', { credentials: 'same-origin' }), 10000)
        .then(function (r) { if (!r.ok) throw new Error('Error ' + r.status); return r.json(); })
        .then(function (j) {
          enLinea = true;
          var remotas = Object.keys(j.datos || {}), pend = leer(KP, {}), base = leer(KB, {});
          if (!remotas.length) {
            // Primera vez: lo que hay en este navegador se sube a internet
            SYNC.forEach(function (k) { if (localStorage.getItem(k) !== null) pend[k] = 1; });
          } else {
            remotas.forEach(function (k) {
              var local = localStorage.getItem(k);
              if (pend[k] && local !== null) poner(k, mezclar(k, local, j.datos[k]));
              else poner(k, j.datos[k]);
              base[k] = j.versiones[k];
            });
          }
          poner(KB, base); poner(KP, pend);
        })
        .catch(function () { enLinea = false; indicar('Sin conexión: trabajando con los datos de esta compu', 'error'); })
        .then(function () {
          cargarScripts(scripts, function () {
            if (enLinea) { subir(); subirImagenes(); subirImagenesExistentes(); }
          });
        });
    }
  };
})();
