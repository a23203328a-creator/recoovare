# Catálogo web Recoovare – Guía

## Qué hay en esta carpeta

| Archivo | Para qué sirve | ¿Lo editas? |
|---|---|---|
| `datos.js` | Precios, modelos, preguntas del pedido, tu WhatsApp | **Sí, es el único** |
| `fotos/placas/` | Fotos de placas (nombre = código, ej. `011.jpg`) | Agregas fotos |
| `fotos/lapidas/` | Fotos de lápidas (ej. `L09.jpg`) | Agregas fotos |
| `index.html`, `estilos.css`, `app.js` | Diseño y funcionamiento | No hace falta |

**Para verla en tu computadora:** doble clic en `index.html`.

---

## 1. Tu WhatsApp y redes

En `datos.js`, sección `negocio`, ya está tu número de ventas:

```js
whatsapp: "529617850625",
whatsappVisible: "961 785 0625",
```

Si cambias de número, cambia las dos líneas (la primera con 52 y solo números). Ahí mismo puedes poner `instagram` y `facebook`.

---

## 2. Cambiar un precio

En `datos.js`, sección `precios`. Ejemplo: subir la 35×25 a $750:

```js
{ medida: "35×25", precio: 750, recomendada: true },
```

- El precio va **sin** `$` y **sin** comillas.
- Hay una lista por forma: `ovalada`, `rectangular`, `cuadrada`. Si cambias una medida en ovalada y quieres lo mismo en rectangular, cámbiala en las dos.

---

## 3. Agregar un modelo nuevo

1. Guarda la foto con su código como nombre: `011.jpg` para placas o `L09.jpg` para lápidas. Usa **minúsculas en .jpg** y sin espacios.
2. Súbela a `fotos/placas/` o a `fotos/lapidas/`.
3. En `datos.js`, dentro de `modelos` del tipo correcto, copia la última línea y cámbiale los datos:

```js
{ codigo: "011", nombre: "Bugambilias", categoria: "Flores", forma: "ovalada", foto: "011.jpg", nuevo: true },
```

- `categoria` tiene que escribirse **igual** que en la lista `categorias` de ese tipo (con acentos y mayúsculas).
- `forma` es `"ovalada"`, `"rectangular"` o `"cuadrada"`. De eso dependen los precios que se muestran.
- `nuevo: true` pone la etiqueta "Nuevo". Bórralo cuando ya no sea nuevo.
- Cada línea termina en **coma**.

## 4. Esconder o quitar un modelo

- **Esconder sin borrar** (por ejemplo, si ya no lo haces por un tiempo): agrégale `oculto: true`.
- **Quitar para siempre:** borra su línea completa.

## 5. Agregar una categoría

En `categorias` del tipo, agrega el nombre entre comillas:

```js
categorias: ["Talavera", "Girasoles", "Flores", "Número grande", "Religiosas"],
```

## 6. Cambiar las preguntas que salen abajo de cada modelo

Cada tipo tiene su lista `campos`. Ejemplo de placas:

```js
{ id: "apellido",  etiqueta: "Apellido o texto principal", ejemplo: "Familia Canul Canul", obligatorio: true },
```

- `etiqueta`: lo que lee el cliente.
- `ejemplo`: el texto gris de ayuda dentro de la caja.
- `obligatorio: true`: no deja mandar el pedido si está vacío.
- `parrafo: true`: caja grande para textos largos.
- `id`: un nombre corto, sin espacios ni acentos, distinto a los demás.
- `opciones`: para que el cliente elija una (como Instalación o Entrega). Cada opción tiene `texto` y `costo`; el costo se suma al total. Ejemplo para cambiar el precio de instalación con cemento:

```js
{ texto: "Que ustedes la instalen con cemento blanco", costo: 150 },
```

Todo lo que el cliente llene llega en el mensaje de WhatsApp, junto con el modelo, el tamaño y el precio.

## 7. Textos de "Lo que debes saber" y anticipo

- En `info` están los textos de material, tiempo de entrega, anticipo, entrega e instalación.
- El anticipo que aparece en cada pedido está en `negocio` → `anticipo: 150`.

---

## 8. Publicarla en internet (gratis)

Vas a usar **GitHub** (guarda los archivos) y **Cloudflare Pages** (los publica). Los nombres de los botones pueden variar un poco.

### A. Subir la carpeta a GitHub
1. Crea una cuenta en github.com.
2. Botón **New repository** → nombre: `recoovare` → **Public** → **Create repository**.
3. Pica **uploading an existing file** y arrastra **todo el contenido** de esta carpeta (no la carpeta en sí): `index.html`, `datos.js`, `app.js`, `estilos.css` y la carpeta `fotos`.
4. Abajo, **Commit changes**.

### B. Publicar con Cloudflare Pages
1. Crea una cuenta en dash.cloudflare.com.
2. Ve a **Workers & Pages** → **Create** → pestaña **Pages** → **Connect to Git**.
3. Conecta tu cuenta de GitHub y elige el repositorio `recoovare`.
4. En la configuración de compilación: Framework **None**, deja vacío el *Build command* y también *Build output directory* (si te pide algo, pon `/`).
5. **Save and Deploy**. En un minuto te da una dirección tipo `recoovare.pages.dev`.

Desde ese momento, **cada cambio que guardes en GitHub se publica solo** en uno o dos minutos.

### C. Actualizar después (se puede desde el celular)
- **Precios o modelos:** en GitHub abre `datos.js` → ícono de lápiz ✏️ → cambia → **Commit changes**.
- **Fotos nuevas:** entra a la carpeta `fotos/placas` → **Add file** → **Upload files** → **Commit changes**.

### D. Tu propio dominio (opcional, con costo anual)
En Cloudflare Pages → tu proyecto → **Custom domains** puedes conectar algo como `recoovare.com`.

---

## Links útiles para compartir
- Catálogo completo: `https://TU-SITIO/`
- Directo a lápidas: `https://TU-SITIO/#lapidas`
- Directo a placas: `https://TU-SITIO/#placas`

## Si algo deja de verse
Casi siempre es una coma o una comilla en `datos.js`. Si la página muestra el aviso rojo "no se pudo leer datos.js", revisa el último cambio que hiciste: que cada `{ ... }` termine en coma y cada texto tenga sus dos comillas.

## Fotos: recomendaciones
- Mínimo 1000 px de ancho, fondo limpio, mismo encuadre en todas.
- Que pesen menos de 300 KB cada una para que cargue rápido en el celular (puedes comprimirlas gratis en squoosh.app).

---

## Generador de notas de venta

Entra a **https://recoovare.pages.dev/notas/** (no aparece en el menú de la página; guárdala en favoritos).

1. Escribe el nombre y WhatsApp del cliente.
2. Agrega productos: elige Placa o Lápida, escribe el código (ej. 047 o L03) y la medida; el precio se pone solo. Puedes cambiarlo.
3. Botones rápidos: instalación con cemento ($150), con taquetes ($125) y envío (escribes el costo).
4. Pon el anticipo, la forma de pago y la fecha de entrega. Se calcula lo que resta.
5. **Imprimir ticket**: en la ventana de impresión elige tu impresora de tickets, márgenes "Ninguno" y escala 100%. Arriba eliges papel de 80 mm o 58 mm.
6. **Mandar PDF por WhatsApp**: en el celular abre el menú de compartir (eliges WhatsApp y el chat). En la computadora descarga el PDF y abre el chat del cliente para que lo adjuntes.

Cada nota recibe un folio (R-0001, R-0002…) y queda en **Historial**, donde puedes abrirla, reimprimirla o marcarla como pagada.
Las notas se guardan en ese navegador y dispositivo; no se suben a internet.

---

## Control de pedidos

Entra a **https://recoovare.pages.dev/pedidos/** (privado, no aparece en el menú).

- Mismas columnas que tu Excel "Mi parte": folio RC, cliente, producto, estado, pago del cliente, intermediario, mi parte (50% × (precio del producto − intermediario)), si tu mamá ya te pagó y cuánto te debe.
- Además: pagos/abonos del cliente, costos por pedido (solo para ver la ganancia) y fecha de entrega.
- Cada nota que guardas en Notas de venta crea su pedido (RC-xxxx) automáticamente y guarda el folio R de la nota.
- "Respaldo y Excel": descarga un .csv para Excel y un respaldo completo (pedidos + notas) para pasarlo a otra computadora.
- Los datos se guardan en ese navegador y dispositivo.
