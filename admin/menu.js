/* =====================================================================
   Menú común del área privada (ESSENTIA y RECOOVARE)
   - Computadora: menú lateral compacto.
   - Celular: barra abajo con Inicio, Pedidos, Agenda, Ventas y "Más".
   - Solo agrega el menú: no cambia nada de cada módulo.
   ===================================================================== */
(function () {
  if (window.__menuAdmin) return; window.__menuAdmin = true;

  var I = {
    inicio: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
    pedidos: '<path d="M3 7l9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/>',
    agenda: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    ventas: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    gastos: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M16 12h5v4h-5a2 2 0 0 1 0-4z"/><path d="M3 9h14"/>',
    apuntes: '<path d="M5 3h10l4 4v14H5z"/><path d="M14 3v5h5M8 12h8M8 16h6"/>',
    catalogo: '<path d="M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4z"/><path d="M20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z"/>',
    mas: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    fuera: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'
  };
  var ITEMS = [
    { k: 'inicio', t: 'Inicio', href: '/admin/', re: /^\/admin\/?(index\.html)?$/ },
    { k: 'pedidos', t: 'Pedidos', href: '/pedidos/', re: /^\/pedidos\/?(index\.html)?$/ },
    { k: 'agenda', t: 'Agenda', href: '/pedidos/agenda/', re: /^\/pedidos\/agenda/ },
    { k: 'ventas', t: 'Notas de venta', corto: 'Ventas', href: '/notas/', re: /^\/notas/ },
    { k: 'gastos', t: 'Gastos ESSENTIA', href: '/pedidos/gastos/', re: /^\/pedidos\/gastos/ },
    { k: 'apuntes', t: 'Apuntes', href: '/admin/apuntes/', re: /^\/admin\/apuntes/ },
    { k: 'catalogo', t: 'Catálogo', href: '/?v=recoovare', externo: true }
  ];
  var ABAJO = ['inicio', 'pedidos', 'agenda', 'ventas'];
  var ruta = location.pathname;
  function ico(k) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + I[k] + '</svg>'; }
  function activo(it) { return it.re && it.re.test(ruta); }
  function enlace(it, clase, corto) {
    return '<a class="' + clase + '" href="' + it.href + '"' + (it.externo ? ' target="_blank" rel="noopener"' : '') + (activo(it) ? ' aria-current="page"' : '') + '>' +
      ico(it.k) + '<span>' + (corto && it.corto ? it.corto : it.t) + '</span>' + (it.externo ? '<svg class="ma-ext" viewBox="0 0 24 24" aria-hidden="true">' + I.fuera + '</svg>' : '') + '</a>';
  }

  var css = '' +
    '.ma-lado,.ma-abajo,.ma-hoja{font-family:Inter,system-ui,-apple-system,sans-serif;box-sizing:border-box}' +
    '.ma-lado *,.ma-abajo *,.ma-hoja *{box-sizing:border-box}' +
    '.ma-lado svg,.ma-abajo svg,.ma-hoja svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none}' +
    '.ma-lado{position:fixed;left:0;top:0;bottom:0;width:204px;background:#111318;color:#C9CDD6;display:flex;flex-direction:column;gap:2px;padding:14px 10px;z-index:30;overflow-y:auto}' +
    '.ma-marca{display:flex;flex-direction:column;padding:4px 10px 14px;color:#fff;font-weight:800;font-size:17px;line-height:1.15;text-decoration:none}' +
    '.ma-marca small{font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#8A909C;margin-bottom:2px}' +
    '.ma-it{display:flex;align-items:center;gap:10px;min-height:42px;padding:8px 10px;border-radius:10px;color:inherit;text-decoration:none;font-size:14.5px;font-weight:600}' +
    '.ma-it:hover{background:rgba(255,255,255,.08);color:#fff}' +
    '.ma-it[aria-current]{background:#fff;color:#111318}' +
    '.ma-ext{width:14px!important;height:14px!important;margin-left:auto;opacity:.6}' +
    '.ma-sep{height:1px;background:rgba(255,255,255,.12);margin:8px 6px}' +
    '.ma-abajo{display:none}' +
    'body.con-menu .barra-links{display:none!important}' +
    '.ma-hoja{display:none}' +
    '@media (min-width:1100px){body.con-menu{padding-left:204px!important}body.con-menu .nube-pill{left:216px!important}}' +
    '@media (max-width:1099.98px){' +
      '.ma-lado{display:none}' +
      'body.con-menu{padding-bottom:calc(68px + env(safe-area-inset-bottom))!important}' +
      '.ma-abajo{display:grid;grid-template-columns:repeat(5,1fr);position:fixed;left:0;right:0;bottom:0;z-index:69;background:#111318;padding:4px 4px calc(4px + env(safe-area-inset-bottom))}' +
      '.ma-ab{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-height:58px;color:#AEB4C0;text-decoration:none;font-size:11.5px;font-weight:700;border-radius:10px;background:none;border:0;font-family:inherit;cursor:pointer}' +
      '.ma-ab[aria-current],.ma-ab[aria-expanded="true"]{color:#fff;background:rgba(255,255,255,.1)}' +
      '.ma-hoja{position:fixed;left:8px;right:8px;bottom:calc(72px + env(safe-area-inset-bottom));z-index:70;background:#fff;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.25);padding:8px;flex-direction:column;gap:2px}' +
      '.ma-hoja.abierta{display:flex}' +
      '.ma-hoja .ma-it{color:#23262D}' +
      '.ma-hoja .ma-it:hover{background:#F1F2F5}' +
      '.ma-hoja .ma-it[aria-current]{background:#111318;color:#fff}' +
      'body.con-menu .nube-pill{bottom:calc(80px + env(safe-area-inset-bottom))!important}' +
      'body.con-menu .toast{bottom:calc(80px + env(safe-area-inset-bottom))!important}' +
      'body.con-menu .acciones-panel{bottom:calc(66px + env(safe-area-inset-bottom))!important}' +
    '}' +
    '@media (max-width:1000px){body.con-menu.ancho-80 .nube-pill,body.con-menu.ancho-58 .nube-pill{bottom:calc(168px + env(safe-area-inset-bottom))!important}' +
    '}' +
    '@media print{.ma-lado,.ma-abajo,.ma-hoja{display:none!important}body.con-menu{padding:0!important}}';

  function montar() {
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

    var lado = document.createElement('nav');
    lado.className = 'ma-lado no-imprimir'; lado.setAttribute('aria-label', 'Menú del área privada');
    lado.innerHTML = '<a class="ma-marca" href="/admin/"><small>ESSENTIA · RECOOVARE</small>Administración</a>' +
      ITEMS.map(function (it, i) { return (it.k === 'gastos' || it.k === 'catalogo' ? '<div class="ma-sep"></div>' : '') + enlace(it, 'ma-it'); }).join('');

    var abajo = document.createElement('nav');
    abajo.className = 'ma-abajo no-imprimir'; abajo.setAttribute('aria-label', 'Menú del área privada');
    var resto = ITEMS.filter(function (it) { return ABAJO.indexOf(it.k) < 0; });
    var masActivo = resto.some(activo);
    abajo.innerHTML = ITEMS.filter(function (it) { return ABAJO.indexOf(it.k) >= 0; }).map(function (it) { return enlace(it, 'ma-ab', true); }).join('') +
      '<button type="button" class="ma-ab" aria-expanded="false" aria-controls="ma-hoja"' + (masActivo ? ' aria-current="page"' : '') + '>' + ico('mas') + '<span>Más</span></button>';

    var hoja = document.createElement('div');
    hoja.className = 'ma-hoja no-imprimir'; hoja.id = 'ma-hoja';
    hoja.innerHTML = resto.map(function (it) { return enlace(it, 'ma-it'); }).join('');

    document.body.appendChild(lado); document.body.appendChild(hoja); document.body.appendChild(abajo);
    document.body.classList.add('con-menu');

    var btn = abajo.querySelector('button');
    function cerrar() { hoja.classList.remove('abierta'); btn.setAttribute('aria-expanded', 'false'); }
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var ab = !hoja.classList.contains('abierta');
      hoja.classList.toggle('abierta', ab); btn.setAttribute('aria-expanded', String(ab));
    });
    document.addEventListener('click', function (e) { if (!hoja.contains(e.target)) cerrar(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrar(); });
  }
  if (document.body) montar(); else document.addEventListener('DOMContentLoaded', montar);
})();
