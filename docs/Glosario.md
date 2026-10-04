---
tags: [gardenburger, referencia]
aliases: [Vocabulario, Terminos, arqueo, jornada comercial, ATP, solicitud, combo, PENDIENTEMP, envio local, pago dividido, horario especial]
actualizado: 2026-10-03
---

# Glosario

← [[GardenBurger]]

Las palabras que el resto del vault usa **sin explicar**, porque en el negocio se dan por sabidas.
Una línea cada una y el enlace a la nota que la desarrolla.

> [!tip] Si llegás sin contexto, empezá acá
> Son diez minutos de lectura que hacen que las otras notas se entiendan de corrido. "Arqueo"
> aparece en 11 notas y "solicitud" en 13; ninguna las define.

## Tiempo y plata

| Término | Qué es |
|---|---|
| **Jornada comercial** | El "hoy" del sistema: de las **19 a las 2**, no el día calendario. Un pedido de las 00:30 pertenece a la noche anterior. Atraviesa el arqueo, los buscadores, el historial y los sueldos. El cierre a las 2 es margen: no se trabaja pasada la 1. Vive en `HORARIO` de `Constantes.jsx`. → [[Reglas de negocio#Jornada comercial]] |
| **Arqueo** | El cierre de caja de la jornada: cuánta plata entró, separada por efectivo y Mercado Pago. **Se calcula sumando los pedidos de la jornada**, no se acumula: un número mal solo puede venir de un pedido mal. Lo mira el **encargado**, con el F4 de la Caja, y solo de 00:00 a `horaCierre`. → [[Decisiones tecnicas#El arqueo se calcula desde los pedidos]], [[Reglas de negocio#Quién mira el arqueo, y cuándo]] |
| **`resumenDiario`** | La colección donde se guarda el arqueo ya calculado, como **foto**: un documento por jornada cerrada y por sucursal, para no releer sus pedidos cada vez. La jornada en curso no tiene documento. → [[Modelo de datos Firestore]] |
| **Efectivo local vs efectivo envío** | Dos cajas distintas: lo que se cobra en el mostrador (zonas de `ENVIOS_LOCALES`) y lo que vuelve con el repartidor. Se arquean por separado porque se cuentan por separado. → [[Reglas de negocio#Envíos locales vs delivery]] |
| **Recargo MP** | Porcentaje que se suma cuando el cliente paga por Mercado Pago (`REACT_APP_recargoMP`). En el pago dividido se aplica solo sobre la parte que va por MP. |
| **Pago dividido** (`%`, `METODOS_PAGO.DIVIDIDO`) | Método de pago en el que una parte va en efectivo y el resto por MP. El monto en efectivo lo fija el cajero; el recargo cae sobre la diferencia. |
| **Liquidación** | El cálculo de sueldos de un período: horas × valor hora **día por día**, menos descuentos, y a los repartidores sus envíos. Registra el trabajo hecho, no a quién se le pagó. La hace el admin. → [[Asistencias y liquidacion]] |
| **Valor hora congelado** | Cada registro de asistencia guarda el valor hora que se pagó **esa noche**. Subirle el sueldo a alguien no reescribe sus liquidaciones pasadas. → [[Asistencias y liquidacion]] |

## El pedido

| Término | Qué es |
|---|---|
| **Solicitud** | Un pedido que **armó el cliente en la web** y todavía nadie cobró. Está en estado `PENDIENTE`, no tiene número de ticket ni `timestamp`, y por eso **no aparece en los buscadores**. Deja de ser solicitud cuando el cajero la Revisa y la guarda. → [[Flujo del pedido]] |
| **Pedido** | El documento de `sucursales/{id}/pedidos`. Es el centro del sistema: nace en la Caja o como solicitud web y va acumulando campos a medida que avanza. → [[Modelo de datos Firestore]] |
| **Ticket** / **código** | El número que identifica al pedido, con formato `42-JD` (secuencial de la sucursal + iniciales del cajero). La numeración es **por sucursal** y sale de un contador transaccional. |
| **`PENDIENTEMP`** | Estado de un pedido cobrado por MP o pago dividido que **espera que el cajero coteje la transferencia** en su Mercado Pago. El sistema no verifica nada: lo mira una persona. → [[Modelo de estados]] |
| **Horario especial** | Pedido encargado para más tarde. Lo raro: `timestamp` deja de ser cuándo se cargó y pasa a ser **a qué hora tiene que estar listo**. → [[Reglas de negocio#Horario especial]] |
| **Envío local** | Las zonas en las que el cliente viene al local: **"Retira"** y **"Espera Afuera"** (la constante `ENVIOS_LOCALES`). Deciden tres cosas: si el pedido va a mostrador o a reparto, cómo se arquea el efectivo, y qué campos pide la Caja. |
| **Zona de envío** | El documento de `envios` que define distancia y costo. La zona —y no lo que eligió el cliente— es lo que decide el ruteo de cocina. |
| **Foto del arqueo** | El documento de `resumenDiario` de una jornada **cerrada**: el arqueo calculado una vez y guardado. No se recalcula solo; solo se borra si alguien corrige un pedido de esa jornada. → [[Decisiones tecnicas#El arqueo se calcula desde los pedidos]] |
| **Estadísticas Generales** | Las estadísticas completas del sistema nuevo (`/estadisticas`), con el aspecto del Histórico. Leen las fotos de cada noche, no los pedidos. → [[Mapa de archivos]] |
| **Métricas** | El vistazo rápido del admin (`/metricas`), de todas las sucursales y desde el celular: combos, ventas, pedidos, delivery vs mostrador y top 3 combos. Botones de sucursal y de período (Hoy, Ayer, semana, mes). Lee fotos. Lo completo es **Estadísticas**. → [[Decisiones tecnicas#Métricas y Estadísticas leen fotos, no pedidos]] |
| **`pagaCon` / `pagaronCon`** | Con cuánto **dijo** el cliente que iba a pagar (lo carga el cajero en efectivo; en el pago dividido es la parte en efectivo) y con cuánto **pagó al final** (lo carga el jefe cuando vuelve el repartidor). La diferencia con lo que hay que cobrar es el **vuelto** o la **propina**: la moto no lleva cambio. |
| **Métricas de deliverys** | El control de la jefa de deliverys: viajes, envíos y efectivo a rendir por repartidor, **en vivo** (listener). No paga nada: al repartidor le paga el encargado desde el F4. Hasta el 28-09-2026 se llamaba "Liquidación" y sumaba un fijo. → [[Reglas de negocio#Deliverys: qué se cobra en la puerta y cuánto cobra el repartidor]] |
| **Sueldo del repartidor** | `horas × valorHora − descuentos` de su asistencia, **más el envío de cada viaje**, entregado o no. No hay fijo. Lo ve el encargado en el F4, cada noche. → [[Decisiones tecnicas#Al repartidor le paga el encargado, desde el F4]] |
| **Vuelto / Propina** | Qué pasa con la diferencia cuando el cliente de un delivery paga en efectivo con un billete más grande: el repartidor la trae y los admins le transfieren el **vuelto** al alias del cliente, o se la queda de **propina**. Lo marca el cajero, obligatorio (`DESTINO_VUELTO`). |
| **Volvió sin entregar** | Un viaje que se cerró sin entrega: canceló el cliente o no se encontró la dirección. Se paga el envío; el pedido sigue en `DELIVERY` hasta que el encargado lo anula desde F3. |
| **Solicitud liberada** | Una solicitud web que un cajero tomó y no terminó en 15 minutos: las demás cajas la ven libre, como cualquier otra, y pueden tomarla. → [[Flujo del pedido#Asignación de solicitudes web — un solo dueño]] |
| **Corte de la web** | La hora en que una sucursal deja de tomar pedidos web: `horasCorte` antes de su cierre, dato de la sucursal. No habilita el F4, que va con `HORA_HABILITA_STATS`. → [[Reglas de negocio#La web pública solo toma pedidos en horario]] |
| **Combo** | Unidad de conteo del arqueo, no un producto. Se cuentan **unidades**: un ítem con cantidad 3 son 3 combos. Qué categorías cuentan sale de `CATEGORIAS_COMBOS`. El carrito web tenía un campo `combo` que no tenía nada que ver: era un contador para identificar cada línea, y desde el 04-10-2026 se llama `grupo` ([[Web publica#El campo `grupo`]]). → [[Reglas de negocio#Combos]] |
| **Extra** | Producto de categoría `EXTRA` que se cuelga de otro (`tipoExtra: HAMBURGUESA` o `GENERAL`). En el carrito es una fila propia, aunque se muestre sangrado bajo su producto. |
| **`esPrueba`** | Marca de los pedidos que insertaba la herramienta de pruebas, eliminada el 24-09-2026. Cuentan en el arqueo igual que los reales, así que los que quedaron en Firestore siguen contando. |

## La gente

| Término | Qué es |
|---|---|
| **Sucursal** | Cada local. El slug del documento (`davinci`, `luro`) es lo que va en las URLs públicas y lo que scopea todas las colecciones operativas. → [[Arquitectura y rutas#Multi-sucursal]] |
| **Encargado** | El rol que maneja una sucursal: caja, cocina, ATP, deliverys y asistencias. Es el único que **elimina tickets** y mira el **arqueo**. Carga las horas del día pero **no decide sueldos**. |
| **Cajero** | Cobra, toma las solicitudes web y busca tickets. Eliminar un ticket es del encargado. |
| **ATP** | **Atención al Público**: el mostrador. Es a la vez un rol, una pantalla y un estado del pedido — el pedido está listo y esperando a que el cliente lo retire. |
| **Jefe de deliverys** | Asigna repartidores, registra salida y regreso, cierra la entrega con `pagaronCon` y paga a los repartidores. Rol propio (`REACT_APP_jefeDeliverys`). Comparte el módulo de deliverys con el encargado. → [[Reglas de negocio#Deliverys: qué se cobra en la puerta y cuánto cobra el repartidor]] |
| **Repartidor** | Quien lleva el pedido. **No entra al sistema**: existe como documento en `usuarios` con `sinAcceso: true`, porque cobra y tiene que aparecer en la liquidación. → [[Decisiones tecnicas#Todos los empleados viven en `usuarios`]] |
| **Admin** | Catálogo, empleados, sucursales, envíos, liquidación e historial de cualquier sucursal. **No se crea desde la app**: se da de alta a mano en la Consola de Firebase. |

## El catálogo

| Término | Qué es |
|---|---|
| **`menu.json`** | Una **foto** del catálogo publicada en Storage. Es lo que ve el cliente en la web, y por eso puede estar desactualizado respecto de Firestore. Ahorra todas las lecturas del tráfico público. → [[Decisiones tecnicas#`menu.json` depende de tres capas]] |
| **Publicar menú** | El botón de Productos que regenera `menu.json`. Mientras haya cambios sin publicar, **parpadea**. Hasta que no se toca, el cliente sigue viendo los precios viejos. El JSON lleva también las sucursales, para el pie del menú. |
| **Variante** | Las versiones de una hamburguesa (SIMPLE / DOBLE / TRIPLE). Cada una es un producto propio en Firestore; la web las agrupa para mostrarlas juntas. |

## Palabras del código

| Término | Qué es |
|---|---|
| **`colSucursal` / `docSucursal`** | Los helpers que arman las rutas de Firestore con la sucursal **del usuario logueado**. Si no hay sucursal tiran error a propósito, en vez de leer un path equivocado. Sus primos `colDeSucursal` / `docDeSucursal` reciben la sucursal explícita y los usa el admin. |
| **`ahoraServidor()`** | La hora corregida por el offset del servidor. Todo lo que se graba con una fecha armada a mano sale de acá y **nunca de `new Date()`**: hay PCs en el local con el reloj mal. |
| **`useAccionUnica`** | El guard contra doble ejecución. Usa un `ref` (corta en el mismo tick) y un `useState` (para el botón). Imprescindible en todo lo que **crea** un documento: cobrar en la Caja, comprar en la web y las altas del admin. → [[Convenciones y preferencias#Acciones que no se pueden repetir]] |
| **Custom claim** | La marca `admin: true` que viaja **en el token** de Firebase Auth. Permite que las reglas pregunten quién es admin sin pagar una lectura. Toma efecto recién al volver a iniciar sesión. → [[Reglas de seguridad#Ser admin va en el token]] |
| **Contador** | El documento `contadores/pedidos` de cada sucursal, del que sale el número de ticket. **Ojo**: "contador" también figura como un rol en el panel de empleados, que es otra cosa (y hoy no hace nada). |
| **`get` vs `list`** | En las reglas de Firestore, leer **un** documento por id versus **consultar** la colección. `read` otorga los dos, y confundirlos fue el agujero P0 de la primera auditoría. → [[Reglas de seguridad]] |
