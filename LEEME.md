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

---

## Agenda (ESSENTIA y RECOOVARE)

Entra a **https://recoovare.pages.dev/pedidos/agenda/** (privada, con el mismo inicio de sesión que Pedidos). También hay un botón "Agenda" en Pedidos.

- Una sola agenda para los dos negocios: **Cita RECOOVARE** (cliente viene al local a diseñar), **Entrega RECOOVARE** (entrega o instalación de un pedido), **ESSENTIA** (entrega a domicilio o visita al local) y **Ocupado** (para bloquear un horario).
- Si algo choca o queda muy pegado a otra cosa en otro lugar, te avisa. El tiempo de traslado se cambia abajo a la derecha (30 min de inicio).
- **Horarios libres para citas**: con el horario de citas de `datos.js` (sección `cita`) te dice qué huecos tienes ese día. "Copiar" o "Mandar por WhatsApp" para pasárselo a tus asesoras.
- **Pedidos sin fecha en la agenda**: los pedidos activos que aún no tienen entrega agendada. Al agendar uno, su fecha de entrega, forma de entrega y ubicación se actualizan en Pedidos. Al marcar la entrega como hecha te pregunta si también lo marcas como Entregado.
- "Confirmar por WhatsApp" abre el chat del cliente con el mensaje de confirmación ya escrito.
- **Semana o Mes**: arriba eliges cómo ver el calendario. Los botones **Ambos · RECOOVARE · ESSENTIA** filtran lo que ves (los bloques de "Ocupado" se ven siempre). Se recuerda tu elección.
- **Más tipos**: Reunión, Pago o cobro (solo recordatorio: no se anota en Gastos ni en Pedidos), Pendiente y Recordatorio. Cada uno lleva su negocio. Pago, pendiente y recordatorio pueden ir "sin hora" y no cuentan para los choques.
- **Pendientes sin hacer** se pasan solos al día de hoy con la marca "Atrasado · era del…" hasta que los marques como hechos.
- **La fecha de entrega queda igual en todos lados**: si la cambias en Pedidos, en la nota o en la agenda, se actualiza en los tres. Cada pedido tiene una sola entrega en la agenda (se mueve, no se duplica). Si cancelas o borras el pedido, su entrega se quita de la agenda.

---

## Gastos de ESSENTIA

Entra a **https://recoovare.pages.dev/pedidos/gastos/** (privada). Reemplaza la hoja de Excel de gastos.

- "+ Anotar gasto": monto, concepto, categoría, de qué negocio es (ESSENTIA o RECOOVARE), con qué pagaste y la fecha. Si escribes un concepto que ya usaste, propone la misma categoría y forma de pago.
- Arriba ves el mes: total, compra de perfumes (inventario), operación de ESSENTIA y lo que pagaste para RECOOVARE.
- **Utilidad por semana**: en la tabla anotas la ganancia de Shopify de cada semana (lunes a domingo, con las fechas de la fila; ventas menos costo por artículo). A cada semana se le restan su operación de ESSENTIA y sus gastos de RECOOVARE. La compra de perfumes no se resta otra vez.
- **Utilidad del mes**: suma las semanas y resta los gastos de todo el mes.
- **Reparto de utilidad semanal**: eliges una semana y se toma su utilidad neta. Pones cuánto dinero hay de verdad disponible y cuánto va a **Mi salario**, **Ahorro del negocio** y **Colchón del negocio** (cada uno en % o en monto fijo). No deja asignar más de lo disponible ni de la utilidad. Con "Confirmar reparto" se guarda (uno por semana); si después cambias los porcentajes, los repartos anteriores no cambian. Si falta la ganancia o hubo pérdida, no se puede repartir.
- Después registras lo que de verdad te pagaste o separaste (puede ser en partes, con fecha y nota). Te dice cuánto falta pagarte y cuánto falta separar.
- **Ahorro y colchón**: saldo acumulado (separado menos salidas). "Registrar salida" para cuando uses ese dinero.
- **Historial de repartos**: todas las semanas repartidas y el resumen del mes.
- El reparto no es un gasto: no se resta otra vez. Si anotas tu salario como gasto, te avisa para que no lo cuentes dos veces.
- Los costos que pones en cada pedido de RECOOVARE no se cuentan aquí; se quedan solo en Pedidos.
- Toca un gasto para editarlo o borrarlo. Abajo puedes descargar el mes o todo para Excel.
- **Periodo**: arriba eliges Un mes (con flechas), Mes pasado, Últimos 3 meses, Este año o Rango de fechas. Cambian el resumen, las categorías, las formas de pago, la lista y la descarga ("Descargar este periodo"). Con varios meses verás **Utilidad por mes** (sale de las semanas que ya anotas); la tabla semanal y el reparto se ven en "Un mes".
- **Buscar y filtrar**: escribe en el buscador (concepto o nota) o toca una categoría en "¿En qué se va el dinero?" para ver solo esos gastos y su total.
- Ya trae cargados los 11 gastos del 9 al 12 de noviembre de 2026 que tenías en el Excel.

---

## Panel de administración

**Instalarlo como app** (ícono "Recoovare" que abre directo en el panel, sin barra del navegador):
- Android (Chrome): abre https://recoovare.pages.dev/admin/, menú ⋮ → "Instalar app" o "Agregar a la pantalla principal".
- iPhone (Safari): abre el mismo link, botón Compartir → "Agregar a inicio".
- Computadora (Chrome o Edge): ícono de instalar en la barra de direcciones, o menú → "Instalar Recoovare Admin".
La primera vez que la abras como app te pedirá el código de tu correo (el inicio de sesión dura 1 semana).

Entra a **https://recoovare.pages.dev/admin/** (privado, mismo inicio de sesión que Pedidos). Es tu página de inicio para los dos negocios.

- Arriba: pedidos activos, bocetos pendientes (por hacer y por aprobar), entregas de los próximos 7 días, lo que tienes hoy y lo que falta cobrar. Todo sale de tus datos reales; toca una tarjeta para ir a ese apartado.
- **Buscador** arriba del panel: escribe un nombre, teléfono, folio (RC-0014, R-0010) o concepto y te muestra lo que coincide en Pedidos, Notas de venta, Agenda, Apuntes y Gastos. Toca un resultado para abrirlo (Enter abre el primero; en la computadora, la tecla / pone el cursor en el buscador).
- "Hoy y próximas actividades" (agenda de ESSENTIA y RECOOVARE) y "Pedidos que requieren atención".
- Menú en todas las páginas privadas: a la izquierda en la computadora y abajo en el celular (en "Más" están Gastos, Apuntes y Catálogo).
- **Ventas de RECOOVARE**: eliges el mes con ‹ › y ves ventas (con la comparación contra el mes anterior), cobrado a clientes, tu parte, lo que tu mamá te pagó, lo que te debe y las comisiones por pagar. Abajo, las ventas y tu parte de los últimos 6 meses (toca una barra para ir a ese mes) y por quién llegó cada venta (directo o qué asesor). Son las mismas cuentas que «Reparto y comisiones» en Pedidos.
- **Apuntes** (/admin/apuntes/): anotaciones sin fecha. Crear, editar, marcar como importante (★), buscar y borrar (pide confirmación). Se guardan en línea.

---

## Tarjetas de ESSENTIA

En el menú: **Tarjetas ESSENTIA** (privado, https://recoovare.pages.dev/pedidos/tarjetas/). No se suma a Gastos ESSENTIA.

- **+ Tarjeta**: nombre, solo los últimos 4 dígitos, día de corte, fecha de pago ("X días después del corte" o "un día fijo del mes") y límite (opcional). Te muestra un ejemplo de corte y fecha límite para que confirmes que está bien.
- **+ Compra**: fecha, concepto, monto y si es de contado o a 3, 6, 9, 12, 18 o 24 MSI. Te dice en qué corte entra y cuándo se paga. En MSI cada mes cuenta solo la mensualidad.
- **+ Pago**: lo que pagaste a la tarjeta. Desde cada tarjeta, "+ Pago" ya trae el monto a pagar.
- **Anotar estado de cuenta** (opcional): el "pago para no generar intereses" del banco. Manda sobre el cálculo y te avisa si hay diferencia (comisiones, intereses o compras sin anotar).
- Ves por tarjeta: cuánto pagar y cuándo vence (en rojo si faltan 3 días o menos o ya venció), lo que llevas en el periodo, el próximo corte y el disponible. Abajo: MSI activos (mensualidad, cuántas van y cuánto falta), lo que pagarás de MSI los próximos 6 meses y todos los movimientos.
- La **fecha límite** de cada corte aparece sola en la **Agenda** como "Pago ESSENTIA" y en el **panel de inicio** cuando faltan 7 días o menos. Al pagar, se marca como pagado. Si cambias el corte, se mueve (no se duplica).

---

## Interesados de ESSENTIA

Página privada: `/pedidos/interesados/` (también en el menú y en el panel).

- Anota clientes que esperan un perfume (solo botellas completas): nombre, teléfono, perfume, precio que se le dio, anticipo (opcional), fecha aproximada de llegada, de dónde llegó y notas.
- La lista se agrupa por perfume. Cuando te llega, toca **Ya llegó** y luego **Avisar**: abre WhatsApp con el mensaje listo y lo marca como "Avisado".
- Estados: Esperando, Avisado, Vendido y Ya no le interesa.
- "Lo más pedido" muestra qué perfumes tienen más clientes esperando.
- No crea recordatorios en la Agenda ni movimientos de dinero. Se guarda en línea y aparece en el buscador del panel.

## Asesores de ventas

- Cada asesor tiene su link corto: `recoovare.pages.dev/CODIGO` (ej. `recoovare.pages.dev/soemy`). Cada link corto es una carpeta con su `index.html` (copia la carpeta `soemy`, renómbrala con el código nuevo y cambia `soemy` por el código dentro del archivo). Ahí los pedidos, "¿Ya tienes tu diseño?" y las citas llegan a SU WhatsApp, con su nombre al final del mensaje. Arriba sale "Te atiende …".
- El cliente queda para siempre con la primera asesora cuyo link abrió (aunque después entre por tu link normal o por el de otra asesora). Para volver a tu número en tu propio celular abre `recoovare.pages.dev/?v=recoovare`.
- Alta de asesores y tabla de comisiones: en `datos.js` (secciones `vendedores` y `comisiones`).
- En Notas eliges el asesor y la comisión se calcula sola por medida (no sale en el ticket). En Pedidos aparece como intermediario; si la cambias a mano, se respeta.
- En Pedidos → "Asesores de ventas": links para copiar, ventas, comisión, pagada y por pagar.
