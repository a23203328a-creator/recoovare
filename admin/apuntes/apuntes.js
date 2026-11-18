/* =====================================================================
   Apuntes administrativos (privado, se guarda en línea).
   Al borrar se marca como borrado (no se elimina del todo) para que otro
   dispositivo no lo vuelva a traer.
   ===================================================================== */
(function () {
  var K = 'admin_apuntes';
  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var $ = function (id) { return document.getElementById(id); };
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function leer() { try { var v = JSON.parse(localStorage.getItem(K) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function guardar() { try { localStorage.setItem(K, JSON.stringify(apuntes)); return true; } catch (e) { alert('No se pudo guardar. Intenta de nuevo.'); return false; } }
  function uid() { return 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function fecha(s) { if (!s) return ''; var d = new Date(s); return d.getDate() + ' ' + MESES[d.getMonth()] + ' ' + d.getFullYear() + ', ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function sinAcentos(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

  var apuntes = leer(), filtro = 'todos', actual = null;
  function vivos() { return apuntes.filter(function (a) { return a && !a.borrado; }); }

  function pintar() {
    var q = sinAcentos($('buscar').value.trim());
    var todos = vivos();
    var lista = todos.filter(function (a) {
      if (filtro === 'imp' && !a.importante) return false;
      return !q || sinAcentos(a.titulo + ' ' + a.texto).indexOf(q) >= 0;
    }).sort(function (a, b) { return (b.importante ? 1 : 0) - (a.importante ? 1 : 0) || String(b.editado || b.creado).localeCompare(String(a.editado || a.creado)); });
    var imp = todos.filter(function (a) { return a.importante; }).length;
    $('cuenta').textContent = todos.length ? todos.length + (todos.length === 1 ? ' apunte' : ' apuntes') + (imp ? ' · ' + imp + (imp === 1 ? ' importante' : ' importantes') : '') + (q || filtro === 'imp' ? ' · mostrando ' + lista.length : '') : '';
    if (!todos.length) { $('lista').innerHTML = '<div class="ap-vacio" style="grid-column:1/-1"><b>Guarda aquí lo que no tiene fecha</b><br>Proveedores, ideas, pendientes del negocio o datos que quieras tener a la mano.<br><br><button type="button" class="btn btn-principal" data-nuevo>+ Nuevo apunte</button></div>'; return; }
    if (!lista.length) { $('lista').innerHTML = '<div class="ap-vacio" style="grid-column:1/-1">Ningún apunte coincide con tu búsqueda.</div>'; return; }
    $('lista').innerHTML = lista.map(function (a) {
      return '<button type="button" class="ap-nota' + (a.importante ? ' imp' : '') + '" data-id="' + esc(a.id) + '">' +
        '<h3>' + (a.importante ? '<span class="estrella" aria-label="Importante">★</span>' : '') + '<span>' + esc(a.titulo || 'Sin título') + '</span></h3>' +
        (a.texto ? '<p>' + esc(a.texto) + '</p>' : '') +
        '<small>' + (a.editado && a.editado !== a.creado ? 'Editado ' + fecha(a.editado) : 'Creado ' + fecha(a.creado)) + '</small></button>';
    }).join('');
  }

  function abrir(a) {
    actual = a || null;
    $('m-titulo').textContent = a ? 'Editar apunte' : 'Nuevo apunte';
    $('m-tit').value = a ? a.titulo || '' : '';
    $('m-texto').value = a ? a.texto || '' : '';
    $('m-imp').checked = !!(a && a.importante);
    $('m-borrar').hidden = !a;
    $('m-error').hidden = true;
    $('m-fechas').textContent = a ? 'Creado ' + fecha(a.creado) + (a.editado && a.editado !== a.creado ? ' · Editado ' + fecha(a.editado) : '') : '';
    $('modal').hidden = false;
    setTimeout(function () { (a ? $('m-texto') : $('m-tit')).focus(); }, 30);
  }
  function cerrar() { $('modal').hidden = true; actual = null; }
  function aviso(t) { var el = $('toast'); el.textContent = t; el.hidden = false; clearTimeout(aviso.t); aviso.t = setTimeout(function () { el.hidden = true; }, 2200); }

  $('form').addEventListener('submit', function (e) {
    e.preventDefault();
    var tit = $('m-tit').value.trim(), txt = $('m-texto').value.trim();
    if (!tit && !txt) { $('m-error').hidden = false; $('m-tit').focus(); return; }
    var ahora = new Date().toISOString(), editando = !!actual;
    if (actual) {
      var a = apuntes.find(function (x) { return x.id === actual.id; });
      if (a) { a.titulo = tit; a.texto = txt; a.importante = $('m-imp').checked; a.editado = ahora; }
    } else {
      apuntes.unshift({ id: uid(), titulo: tit, texto: txt, importante: $('m-imp').checked, creado: ahora, editado: ahora });
    }
    if (guardar()) { cerrar(); pintar(); aviso(editando ? 'Apunte actualizado' : 'Apunte guardado'); }
  });
  $('m-borrar').addEventListener('click', function () {
    if (!actual) return;
    if (!confirm('¿Borrar el apunte «' + (actual.titulo || 'Sin título') + '»? No se puede deshacer.')) return;
    var a = apuntes.find(function (x) { return x.id === actual.id; });
    if (a) { a.borrado = true; a.titulo = ''; a.texto = ''; a.editado = new Date().toISOString(); }
    if (guardar()) { cerrar(); pintar(); aviso('Apunte borrado'); }
  });
  $('m-tit').addEventListener('input', function () { $('m-error').hidden = true; });
  $('m-texto').addEventListener('input', function () { $('m-error').hidden = true; });
  $('m-cerrar').addEventListener('click', cerrar);
  $('modal').addEventListener('click', function (e) { if (e.target === $('modal')) cerrar(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('modal').hidden) cerrar(); });
  $('nuevo').addEventListener('click', function () { abrir(null); });
  $('buscar').addEventListener('input', pintar);
  document.querySelector('.ap-filtros').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    filtro = b.dataset.f;
    this.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    pintar();
  });
  $('lista').addEventListener('click', function (e) {
    if (e.target.closest('[data-nuevo]')) { abrir(null); return; }
    var c = e.target.closest('.ap-nota'); if (!c) return;
    abrir(apuntes.find(function (x) { return x.id === c.dataset.id; }));
  });
  pintar();
  var abrirId = new URLSearchParams(location.search).get('abrir');
  if (abrirId) { history.replaceState(null, '', location.pathname); var ap = apuntes.find(function (x) { return x.id === abrirId && !x.borrado; }); if (ap) abrir(ap); }
})();
