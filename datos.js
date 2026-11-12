/* =====================================================================
   DATOS DEL CATÁLOGO – RECOOVARE
   ---------------------------------------------------------------------
   Este es el ÚNICO archivo que necesitas editar para:
     - cambiar precios y costos de instalación
     - agregar, ocultar o quitar modelos
     - cambiar las preguntas que aparecen abajo de cada modelo
     - cambiar tu WhatsApp, redes y textos de información

   Reglas para no romper nada:
     - Los textos van entre comillas: "así"
     - Cada elemento de una lista termina con coma: { ... },
       (el ÚLTIMO de cada lista puede llevar o no coma)
     - Los precios son números SIN comillas y SIN signo $: 700
   ===================================================================== */

window.CATALOGO = {

  /* ---------- Tu negocio ---------- */
  negocio: {
    nombre: "Recoovare",
    // WhatsApp con 52 + 10 dígitos, solo números
    whatsapp: "529617850625",
    whatsappVisible: "961 785 0625",
    ciudad: "Mérida, Yucatán",
    anticipo: 150,   // anticipo para iniciar un pedido, en pesos
    instagram: "",   // tu usuario sin @, ejemplo: "recoovare"
    facebook: ""     // link completo, ejemplo: "https://facebook.com/recoovare"
  },

  /* ---------- Precios por forma (pesos MXN) ----------
     "recomendada: true" pone la etiqueta "Medida recomendada".
     Cada modelo usa la lista de precios de su "forma". */
  precios: {
    ovalada: [
      { medida: "30×20", precio: 450 },
      { medida: "35×25", precio: 700, recomendada: true },
      { medida: "45×32", precio: 850 },
      { medida: "55×40", precio: 1150 }
    ],
    rectangular: [
      { medida: "30×20", precio: 450 },
      { medida: "35×25", precio: 700, recomendada: true },
      { medida: "45×32", precio: 850 },
      { medida: "55×40", precio: 1150 }
    ],
    cuadrada: [
      { medida: "30×30", precio: 550 },
      { medida: "35×35", precio: 750 },
      { medida: "45×45", precio: 950 },
      { medida: "55×55", precio: 1250 }
    ]
  },

  /* ---------- Placa 3D de la portada ----------
     Diseños que van girando en la portada. "foto" debe estar en fotos/portada/.
     Las placas ovaladas se ven mejor con fondo transparente (.webp o .png). */
  portada: [
    { foto: "fotos/portada/p1.webp", tipo: "placas",  codigo: "047", texto: "Placa tipo talavera azul con colibrí" },
    { foto: "fotos/portada/p2.webp", tipo: "lapidas", codigo: "L04", texto: "Lápida de granito negro con espigas doradas" },
    { foto: "fotos/portada/p3.webp", tipo: "placas",  codigo: "034", texto: "Placa Casa Girasol" },
    { foto: "fotos/portada/p4.webp", tipo: "lapidas", codigo: "L08", texto: "Lápida de mármol con paloma y esquinas doradas" }
  ],

  /* ---------- Citas para diseñar en persona ----------
     horario: escribe "9:00-18:00" en los días que atiendes y deja "" los que no.
     intervalo: cada cuántos minutos se puede agendar.
     diasAdelante: cuántos días hacia adelante se pueden elegir.
     direccion y mapa: tu dirección y el link de Google Maps.
     Si "direccion" está vacía, no se muestra el mapa. */
  cita: {
    horario: {
      lunes: "11:00-19:00",
      martes: "11:00-19:00",
      miercoles: "11:00-19:00",
      jueves: "11:00-19:00",
      viernes: "11:00-19:00",
      sabado: "11:00-19:00",
      domingo: "11:00-19:00"
    },
    intervalo: 30,
    diasAdelante: 21,
    direccion: "Calle 46a4 #965 x 143 y 145, Villamagna del Sur, Mérida, Yucatán",
    referencias: "",
    // coordenadas de tu local en Google Maps (para el mapa) y el link para "Cómo llegar"
    coordenadas: "20.9192507,-89.6147589",
    mapa: "https://maps.app.goo.gl/8GmmaSbQXzLBScMY9"
  },

  /* ---------- Sección "Lo que debes saber" ---------- */
  info: [
    { titulo: "Material", texto: "Cerámica en losa, encapsulada en resina." },
    { titulo: "Tiempo de entrega", texto: "Máximo 3 días para realizarla." },
    { titulo: "Anticipo", texto: "Se pide un anticipo de $150 para iniciar tu pedido." },
    { titulo: "Entrega", texto: "Si no requieres instalación, pasas a recogerla o te la enviamos a domicilio con costo extra." },
    { titulo: "Instalación", texto: "Placas: con orificios para que la instales tú, o la instalamos a domicilio: $150 con cemento blanco o $125 con taquetes y tornillos. Lápidas: instalación solo en cementerios de Mérida. La instalación tiene un rango de cobertura: al mandar tu ubicación te confirmamos si aplica." }
  ],

  /* ---------- Tipos de producto ----------
     Cada tipo tiene:
       categorias: los botones de filtro
       medidas:    (opcional) qué listas de precios se ofrecen en ese tipo
       campos:     las preguntas que salen abajo de cada modelo
                   obligatorio: true -> no deja enviar si está vacío
                   parrafo: true     -> caja de texto grande
                   opciones: [...]   -> el cliente elige una opción;
                                        "costo" se suma al total
                   ayuda: "..."      -> texto de aviso debajo de la pregunta
                   mostrarSi: [...]  -> solo aparece con ciertas respuestas
       modelos:    la lista de diseños
                   codigo    -> el número que ve el cliente
                   nombre    -> nombre corto del diseño
                   categoria -> igual a una de "categorias"
                   forma     -> "ovalada", "rectangular" o "cuadrada"
                   foto      -> archivo dentro de la carpeta del tipo
                   nuevo: true  -> etiqueta "Nuevo" (opcional)
                   oculto: true -> lo esconde sin borrarlo (opcional)
  */
  tipos: {

    placas: {
      nombre: "Placas domiciliarias",
      singular: "placa",
      carpeta: "fotos/placas/",
      categorias: ["Tipo talavera", "Flores", "Girasoles", "Frases", "Abuelos", "Naturaleza", "Número grande", "Azulejo"],
      campos: [
        { id: "apellido",  etiqueta: "Apellido o texto principal", ejemplo: "Familia Canul Canul", obligatorio: true },
        { id: "direccion", etiqueta: "Dirección que lleva la placa (calle, número, cruzamientos y colonia)", ejemplo: "C. 79B #573 x 98 y 100, Col. Sambulá" },
        { id: "extra",     etiqueta: "¿Algún cambio al modelo? Descríbelo", ejemplo: "cambiar las flores por girasoles, letras en azul…", parrafo: true },
        { id: "instalacion", etiqueta: "Instalación",
          ayuda: "La instalación incluye el servicio a domicilio y tiene un rango de cobertura: al mandarnos tu ubicación te confirmamos si aplica.",
          opciones: [
            { texto: "La instalo yo – con orificios para tornillos", costo: 0 },
            { texto: "La instalo yo – sin orificios (para pegarla con cemento)", costo: 0 },
            { texto: "Que ustedes la instalen con cemento blanco", costo: 150, confirmarZona: true },
            { texto: "Que ustedes la instalen con taquetes y tornillos", costo: 125, confirmarZona: true }
        ] },
        // "mostrarSi" hace que la pregunta solo salga con ciertas respuestas (0 = primera opción)
        { id: "entrega", etiqueta: "Entrega", mostrarSi: [{ campo: "instalacion", en: [0, 1] }], opciones: [
            { texto: "Paso a recogerla", costo: 0 },
            { texto: "Envío a domicilio (costo extra según la zona)", costo: 0, cotizar: true }
        ] },
        { id: "domicilio", etiqueta: "Dirección o ubicación para la instalación", ejemplo: "calle, número, colonia y referencias, o tu ubicación de Google Maps", parrafo: true, obligatorio: true,
          mostrarSi: [{ campo: "instalacion", en: [2, 3] }] },
        { id: "envio", etiqueta: "Dirección para el envío", ejemplo: "calle, número, colonia y referencias", parrafo: true, obligatorio: true,
          mostrarSi: [{ campo: "entrega", en: [1] }] }
      ],
      modelos: [
        { codigo: "001", nombre: "Tipo talavera multicolor", categoria: "Tipo talavera", forma: "ovalada", foto: "001.jpg" },
        { codigo: "002", nombre: "Guirnalda de flores", categoria: "Flores", forma: "ovalada", foto: "002.jpg" },
        { codigo: "003", nombre: "Girasoles al pie", categoria: "Girasoles", forma: "ovalada", foto: "003.jpg" },
        { codigo: "004", nombre: "Girasoles y ranita", categoria: "Girasoles", forma: "ovalada", foto: "004.jpg" },
        { codigo: "005", nombre: "Flores acuarela", categoria: "Flores", forma: "ovalada", foto: "005.jpg" },
        { codigo: "006", nombre: "Alcatraces", categoria: "Flores", forma: "ovalada", foto: "006.jpg" },
        { codigo: "007", nombre: "Corona de girasoles", categoria: "Girasoles", forma: "ovalada", foto: "007.jpg" },
        { codigo: "008", nombre: "Número grande floral", categoria: "Número grande", forma: "ovalada", foto: "008.jpg" },
        { codigo: "009", nombre: "Tipo talavera mosaico", categoria: "Tipo talavera", forma: "ovalada", foto: "009.jpg" },
        { codigo: "010", nombre: "Tipo talavera Bienvenidos a nuestro hogar", categoria: "Tipo talavera", forma: "ovalada", foto: "010.jpg" },
        { codigo: "011", nombre: "Tipo talavera con volutas", categoria: "Tipo talavera", forma: "ovalada", foto: "011.jpg" },
        { codigo: "012", nombre: "Tipo talavera flores azules", categoria: "Tipo talavera", forma: "ovalada", foto: "012.jpg" },
        { codigo: "013", nombre: "Bienvenidos a nuestro dulce hogar", categoria: "Frases", forma: "ovalada", foto: "013.jpg" },
        { codigo: "014", nombre: "Canta el gallo pero manda la gallina", categoria: "Frases", forma: "ovalada", foto: "014.jpg" },
        { codigo: "015", nombre: "Mi casa es tu casa", categoria: "Frases", forma: "ovalada", foto: "015.jpg" },
        { codigo: "016", nombre: "Bienvenidos a la casa de los abuelos", categoria: "Abuelos", forma: "ovalada", foto: "016.jpg" },
        { codigo: "017", nombre: "Bienvenidos a su pobre casa", categoria: "Frases", forma: "ovalada", foto: "017.jpg" },
        { codigo: "018", nombre: "Corona de flores de colores", categoria: "Flores", forma: "ovalada", foto: "018.jpg" },
        { codigo: "019", nombre: "Tipo talavera azul clásica", categoria: "Tipo talavera", forma: "ovalada", foto: "019.jpg" },
        { codigo: "020", nombre: "Tipo talavera azul con flores", categoria: "Tipo talavera", forma: "ovalada", foto: "020.jpg" },
        { codigo: "021", nombre: "Bienvenidos a mi hogar", categoria: "Frases", forma: "ovalada", foto: "021.jpg" },
        { codigo: "022", nombre: "Tipo talavera azul marino", categoria: "Tipo talavera", forma: "ovalada", foto: "022.jpg" },
        { codigo: "023", nombre: "Casa de los abuelos con margaritas", categoria: "Abuelos", forma: "ovalada", foto: "023.jpg" },
        { codigo: "024", nombre: "Número grande con greca azul", categoria: "Número grande", forma: "ovalada", foto: "024.jpg" },
        { codigo: "025", nombre: "Café con flores azules", categoria: "Flores", forma: "ovalada", foto: "025.jpg" },
        { codigo: "026", nombre: "Girasoles y alcatraces", categoria: "Girasoles", forma: "ovalada", foto: "026.jpg" },
        { codigo: "027", nombre: "Tipo talavera negra con flores", categoria: "Tipo talavera", forma: "ovalada", foto: "027.jpg" },
        { codigo: "028", nombre: "Margaritas con marco azul", categoria: "Flores", forma: "ovalada", foto: "028.jpg" },
        { codigo: "029", nombre: "Casa Colibrí", categoria: "Naturaleza", forma: "ovalada", foto: "029.jpg" },
        { codigo: "030", nombre: "Girasoles con marco dorado", categoria: "Girasoles", forma: "ovalada", foto: "030.jpg" },
        { codigo: "031", nombre: "Casa Playita", categoria: "Naturaleza", forma: "ovalada", foto: "031.jpg" },
        { codigo: "032", nombre: "Bienvenidos con margaritas", categoria: "Flores", forma: "ovalada", foto: "032.jpg" },
        { codigo: "033", nombre: "Tipo talavera con lunares", categoria: "Tipo talavera", forma: "ovalada", foto: "033.jpg" },
        { codigo: "034", nombre: "Casa Girasol", categoria: "Girasoles", forma: "ovalada", foto: "034.jpg" },
        { codigo: "035", nombre: "Guirnalda Bienvenidos", categoria: "Flores", forma: "ovalada", foto: "035.jpg" },
        { codigo: "036", nombre: "Tipo talavera y flores Bienvenidos", categoria: "Flores", forma: "ovalada", foto: "036.jpg" },
        { codigo: "037", nombre: "Corona de flores rojas", categoria: "Flores", forma: "ovalada", foto: "037.jpg" },
        { codigo: "038", nombre: "Playa con caballitos de mar", categoria: "Naturaleza", forma: "ovalada", foto: "038.jpg" },
        { codigo: "039", nombre: "Marco azul con flores", categoria: "Flores", forma: "ovalada", foto: "039.jpg" },
        { codigo: "040", nombre: "Flores silvestres", categoria: "Flores", forma: "ovalada", foto: "040.jpg" },
        { codigo: "041", nombre: "La casa de los abuelos tipo talavera", categoria: "Abuelos", forma: "ovalada", foto: "041.jpg" },
        { codigo: "042", nombre: "Casa Color Azul", categoria: "Tipo talavera", forma: "ovalada", foto: "042.jpg" },
        { codigo: "043", nombre: "Casa de los girasoles", categoria: "Girasoles", forma: "ovalada", foto: "043.jpg" },
        { codigo: "044", nombre: "Casa de los abuelos, hotel de los hijos", categoria: "Frases", forma: "ovalada", foto: "044.jpg" },
        { codigo: "045", nombre: "Tipo talavera azul con número", categoria: "Tipo talavera", forma: "ovalada", foto: "045.jpg" },
        { codigo: "046", nombre: "Tipo talavera azul con flores de colores", categoria: "Tipo talavera", forma: "ovalada", foto: "046.jpg" },
        { codigo: "047", nombre: "Tipo talavera azul con colibrí", categoria: "Tipo talavera", forma: "ovalada", foto: "047.jpg" },
        { codigo: "048", nombre: "Regadera con girasoles", categoria: "Abuelos", forma: "ovalada", foto: "048.jpg" },
        { codigo: "049", nombre: "Colibrí y flores", categoria: "Naturaleza", forma: "ovalada", foto: "049.jpg" },
        { codigo: "050", nombre: "Casa de la playa con peces", categoria: "Naturaleza", forma: "ovalada", foto: "050.jpg" },
        { codigo: "051", nombre: "Girasoles con número", categoria: "Girasoles", forma: "ovalada", foto: "051.jpg" },
        { codigo: "052", nombre: "Número clásico con girasoles", categoria: "Número grande", forma: "ovalada", foto: "052.jpg" },
        { codigo: "053", nombre: "Colibrí verde con número", categoria: "Naturaleza", forma: "ovalada", foto: "053.jpg" },
        { codigo: "054", nombre: "Abuelitos con flores", categoria: "Abuelos", forma: "ovalada", foto: "054.jpg" },
        { codigo: "055", nombre: "La casa de los abues", categoria: "Abuelos", forma: "ovalada", foto: "055.jpg" },
        { codigo: "056", nombre: "Flores con número", categoria: "Número grande", forma: "ovalada", foto: "056.jpg" },
        { codigo: "057", nombre: "Azulejo italiano con número", categoria: "Azulejo", forma: "rectangular", foto: "057.jpg" },
        { codigo: "058", nombre: "Limones", categoria: "Naturaleza", forma: "rectangular", foto: "058.jpg" },
        { codigo: "059", nombre: "Gerberas con número", categoria: "Flores", forma: "rectangular", foto: "059.jpg" },
        { codigo: "060", nombre: "Azulejo con limones", categoria: "Azulejo", forma: "rectangular", foto: "060.jpg" },
        { codigo: "061", nombre: "Azulejo dorado", categoria: "Azulejo", forma: "rectangular", foto: "061.jpg" },
        { codigo: "062", nombre: "Azulejo con enredadera", categoria: "Azulejo", forma: "rectangular", foto: "062.jpg" },
        { codigo: "063", nombre: "Azulejo azul y amarillo", categoria: "Azulejo", forma: "rectangular", foto: "063.jpg" },
        { codigo: "064", nombre: "Azulejo con conchas", categoria: "Azulejo", forma: "rectangular", foto: "064.jpg" },
        { codigo: "065", nombre: "Azulejo azul con arabescos", categoria: "Azulejo", forma: "rectangular", foto: "065.jpg" },
        { codigo: "066", nombre: "Azulejo con fondo amarillo", categoria: "Azulejo", forma: "rectangular", foto: "066.jpg" },
        { codigo: "067", nombre: "Azulejo terracota", categoria: "Azulejo", forma: "rectangular", foto: "067.jpg" },
        { codigo: "068", nombre: "Azulejo azul fino", categoria: "Azulejo", forma: "rectangular", foto: "068.jpg" },
        { codigo: "069", nombre: "Azulejo pergamino", categoria: "Azulejo", forma: "rectangular", foto: "069.jpg" },
        { codigo: "070", nombre: "Azulejo con trenzado", categoria: "Azulejo", forma: "rectangular", foto: "070.jpg" },
        { codigo: "071", nombre: "Azulejo azul cielo", categoria: "Azulejo", forma: "rectangular", foto: "071.jpg" },
        { codigo: "072", nombre: "Azulejo blanco y dorado", categoria: "Azulejo", forma: "rectangular", foto: "072.jpg" },
      ]
    },

    lapidas: {
      nombre: "Lápidas",
      singular: "lápida",
      carpeta: "fotos/lapidas/",
      categorias: ["Negro y dorado", "Mármol blanco", "Con foto", "Libro abierto", "Religiosas", "Dobles", "Colores", "Angelitos"],
      // Las lápidas pueden pedirse en cualquiera de estas medidas
      medidas: ["rectangular", "cuadrada"],
      campos: [
        { id: "nombre",        etiqueta: "Nombre completo", ejemplo: "José Antonio Herrera Ramírez", obligatorio: true },
        { id: "nacimiento",    etiqueta: "Fecha de nacimiento", ejemplo: "01/11/1985" },
        { id: "fallecimiento", etiqueta: "Fecha de fallecimiento", ejemplo: "02/07/2022" },
        { id: "frase",         etiqueta: "Frase o mensaje", ejemplo: "Siempre en nuestra mente y corazón", parrafo: true },
        { id: "foto", etiqueta: "¿Lleva foto?",
          ayuda: "Si lleva foto, mándala por WhatsApp en el mismo chat después de enviar tu boceto.",
          opciones: [
            { texto: "Sin foto", costo: 0 },
            { texto: "Sí, lleva foto (la mando por WhatsApp)", costo: 0, mensaje: "Les mando la foto por aquí." }
        ] },
        { id: "extra", etiqueta: "¿Requiere alguna modificación? Descríbela", ejemplo: "cambiar la imagen religiosa, agregar otro nombre…", parrafo: true },
        { id: "instalacion", etiqueta: "Instalación",
          ayuda: "Instalación únicamente en cementerios de Mérida. Al mandarnos la ubicación te confirmamos si aplica.",
          opciones: [
            { texto: "Sin instalación", costo: 0 },
            { texto: "Que ustedes la instalen con cemento blanco", costo: 150, confirmarZona: true },
            { texto: "Que ustedes la instalen con taquetes y tornillos", costo: 125, confirmarZona: true }
        ] },
        { id: "entrega", etiqueta: "Entrega", mostrarSi: [{ campo: "instalacion", en: [0] }], opciones: [
            { texto: "Paso a recogerla", costo: 0 },
            { texto: "Envío a domicilio (costo extra según la zona)", costo: 0, cotizar: true }
        ] },
        { id: "cementerio", etiqueta: "Cementerio y ubicación de la tumba", ejemplo: "Cementerio General, sección, fila o referencias", parrafo: true, obligatorio: true,
          mostrarSi: [{ campo: "instalacion", en: [1, 2] }] },
        { id: "envio", etiqueta: "Dirección para el envío", ejemplo: "calle, número, colonia y referencias", parrafo: true, obligatorio: true,
          mostrarSi: [{ campo: "entrega", en: [1] }] }
      ],
      modelos: [
        { codigo: "L01", nombre: "Negro con cruz dorada y rosas", categoria: "Negro y dorado", forma: "rectangular", foto: "L01.jpg" },
        { codigo: "L02", nombre: "Granito con cruz floral", categoria: "Negro y dorado", forma: "rectangular", foto: "L02.jpg" },
        { codigo: "L03", nombre: "Con foto, cielo y marco dorado", categoria: "Con foto", forma: "rectangular", foto: "L03.jpg" },
        { codigo: "L04", nombre: "Granito negro con espigas doradas", categoria: "Negro y dorado", forma: "rectangular", foto: "L04.jpg" },
        { codigo: "L05", nombre: "Granito negro con manos en oración", categoria: "Negro y dorado", forma: "rectangular", foto: "L05.jpg" },
        { codigo: "L06", nombre: "Granito negro En Memoria", categoria: "Negro y dorado", forma: "rectangular", foto: "L06.jpg" },
        { codigo: "L07", nombre: "Gris con foto en blanco y negro", categoria: "Con foto", forma: "rectangular", foto: "L07.jpg" },
        { codigo: "L08", nombre: "Mármol con paloma y esquinas doradas", categoria: "Mármol blanco", forma: "rectangular", foto: "L08.jpg" },
        { codigo: "L09", nombre: "Mármol con cruz y flores rojas", categoria: "Mármol blanco", forma: "rectangular", foto: "L09.jpg" },
        { codigo: "L10", nombre: "Mármol con Virgen y manos en oración", categoria: "Religiosas", forma: "rectangular", foto: "L10.jpg" },
        { codigo: "L11", nombre: "Mármol con paloma y cruz", categoria: "Mármol blanco", forma: "rectangular", foto: "L11.jpg" },
        { codigo: "L12", nombre: "Mármol con Virgen y foto", categoria: "Con foto", forma: "rectangular", foto: "L12.jpg" },
        { codigo: "L13", nombre: "Mármol con marco de rosas", categoria: "Mármol blanco", forma: "rectangular", foto: "L13.jpg" },
        { codigo: "L14", nombre: "Mármol con rosas azules", categoria: "Colores", forma: "rectangular", foto: "L14.jpg" },
        { codigo: "L15", nombre: "Mármol con foto y flores lilas", categoria: "Con foto", forma: "rectangular", foto: "L15.jpg" },
        { codigo: "L16", nombre: "Mármol con cruz y flores negras", categoria: "Mármol blanco", forma: "rectangular", foto: "L16.jpg" },
        { codigo: "L17", nombre: "Mármol con libro y rosas", categoria: "Mármol blanco", forma: "rectangular", foto: "L17.jpg" },
        { codigo: "L18", nombre: "Mármol In Memoriam", categoria: "Mármol blanco", forma: "rectangular", foto: "L18.jpg" },
        { codigo: "L19", nombre: "Sagrado Corazón y Virgen", categoria: "Religiosas", forma: "rectangular", foto: "L19.jpg" },
        { codigo: "L20", nombre: "Doble con rosas y manos", categoria: "Dobles", forma: "rectangular", foto: "L20.jpg" },
        { codigo: "L21", nombre: "Cruz, paloma y rosas", categoria: "Religiosas", forma: "rectangular", foto: "L21.jpg" },
        { codigo: "L22", nombre: "Lirios rosas", categoria: "Colores", forma: "rectangular", foto: "L22.jpg" },
        { codigo: "L23", nombre: "Virgen de Guadalupe", categoria: "Religiosas", forma: "rectangular", foto: "L23.jpg" },
        { codigo: "L24", nombre: "Angelito con paloma", categoria: "Angelitos", forma: "rectangular", foto: "L24.jpg" },
        { codigo: "L25", nombre: "Mármol con cruz y arabescos", categoria: "Mármol blanco", forma: "rectangular", foto: "L25.jpg" },
        { codigo: "L26", nombre: "Libro con foto de cuerpo completo", categoria: "Libro abierto", forma: "rectangular", foto: "L26.jpg" },
        { codigo: "L27", nombre: "Cielo con alas de ángel y foto", categoria: "Con foto", forma: "rectangular", foto: "L27.jpg" },
        { codigo: "L28", nombre: "Mármol con foto y flores rosas", categoria: "Con foto", forma: "rectangular", foto: "L28.jpg" },
        { codigo: "L29", nombre: "Libro abierto con foto y paloma", categoria: "Libro abierto", forma: "rectangular", foto: "L29.jpg" },
        { codigo: "L30", nombre: "Virgen de Guadalupe familiar", categoria: "Dobles", forma: "rectangular", foto: "L30.jpg" },
        { codigo: "L31", nombre: "Libro doble", categoria: "Dobles", forma: "rectangular", foto: "L31.jpg" },
        { codigo: "L32", nombre: "Libro de mármol con foto y poema", categoria: "Libro abierto", forma: "rectangular", foto: "L32.jpg" },
        { codigo: "L33", nombre: "Libro con Virgen y paloma", categoria: "Libro abierto", forma: "rectangular", foto: "L33.jpg" },
        { codigo: "L34", nombre: "Granito negro con cruz y paloma", categoria: "Negro y dorado", forma: "rectangular", foto: "L34.jpg" },
        { codigo: "L35", nombre: "Libro de mármol con poema", categoria: "Libro abierto", forma: "rectangular", foto: "L35.jpg" },
        { codigo: "L36", nombre: "Libro doble con foto y flores", categoria: "Dobles", forma: "rectangular", foto: "L36.jpg" },
        { codigo: "L37", nombre: "Mármol con foto", categoria: "Con foto", forma: "rectangular", foto: "L37.jpg" },
        { codigo: "L38", nombre: "Libro con Divino Niño", categoria: "Religiosas", forma: "rectangular", foto: "L38.jpg" },
        { codigo: "L39", nombre: "Libro azul con estrellas y foto", categoria: "Colores", forma: "rectangular", foto: "L39.jpg" },
        { codigo: "L40", nombre: "Libro doble con Sagrado Corazón", categoria: "Dobles", forma: "rectangular", foto: "L40.jpg" },
        { codigo: "L41", nombre: "Negro con cruz y paloma", categoria: "Negro y dorado", forma: "rectangular", foto: "L41.jpg" },
        { codigo: "L42", nombre: "Con foto y marco terracota", categoria: "Con foto", forma: "rectangular", foto: "L42.jpg" },
        { codigo: "L43", nombre: "Madera con paleta de pintor", categoria: "Colores", forma: "rectangular", foto: "L43.jpg" },
        { codigo: "L44", nombre: "Mármol con cruz y paloma negra", categoria: "Mármol blanco", forma: "rectangular", foto: "L44.jpg" },
        { codigo: "L45", nombre: "Blanco con arabescos", categoria: "Mármol blanco", forma: "rectangular", foto: "L45.jpg" },
        { codigo: "L46", nombre: "Mármol gris En Memoria", categoria: "Mármol blanco", forma: "rectangular", foto: "L46.jpg" },
        { codigo: "L47", nombre: "Blanco con marco ornamental", categoria: "Mármol blanco", forma: "rectangular", foto: "L47.jpg" },
        { codigo: "L48", nombre: "Libro con foto y canasta de rosas", categoria: "Libro abierto", forma: "rectangular", foto: "L48.jpg" },
        { codigo: "L49", nombre: "Cielo azul con pluma y aves", categoria: "Colores", forma: "rectangular", foto: "L49.jpg" },
        { codigo: "L50", nombre: "Dorado con rosas y palomas", categoria: "Colores", forma: "rectangular", foto: "L50.jpg" },
        { codigo: "L51", nombre: "Gris con foto y flores", categoria: "Con foto", forma: "rectangular", foto: "L51.jpg" },
        { codigo: "L52", nombre: "Libro azul con foto", categoria: "Libro abierto", forma: "rectangular", foto: "L52.jpg" },
        { codigo: "L53", nombre: "Negro con arabescos dorados", categoria: "Negro y dorado", forma: "rectangular", foto: "L53.jpg" },
        { codigo: "L54", nombre: "Negro con taza de café", categoria: "Negro y dorado", forma: "rectangular", foto: "L54.jpg" },
        { codigo: "L55", nombre: "Libro negro con versículo", categoria: "Negro y dorado", forma: "rectangular", foto: "L55.jpg" },
        { codigo: "L56", nombre: "Blanco y dorado con Sagrado Corazón", categoria: "Religiosas", forma: "rectangular", foto: "L56.jpg" },
        { codigo: "L57", nombre: "Negro doble con cruz y paloma", categoria: "Dobles", forma: "rectangular", foto: "L57.jpg" },
        { codigo: "L58", nombre: "Negro con foto y Virgen", categoria: "Con foto", forma: "rectangular", foto: "L58.jpg" },
        { codigo: "L59", nombre: "Negro con foto y rosa", categoria: "Con foto", forma: "rectangular", foto: "L59.jpg" },
        { codigo: "L60", nombre: "Mármol negro con cruz", categoria: "Negro y dorado", forma: "rectangular", foto: "L60.jpg" },
        { codigo: "L61", nombre: "Libro de mármol con Santísima Trinidad", categoria: "Angelitos", forma: "rectangular", foto: "L61.jpg" },
        { codigo: "L62", nombre: "Libro de mármol con símbolo de bautizo", categoria: "Angelitos", forma: "rectangular", foto: "L62.jpg" },
        { codigo: "L63", nombre: "Mármol con cruz ornamental", categoria: "Mármol blanco", forma: "rectangular", foto: "L63.jpg" },
        { codigo: "L64", nombre: "Mármol con esquinas ornamentales", categoria: "Mármol blanco", forma: "rectangular", foto: "L64.jpg" }
      ]
    }
  }
};
