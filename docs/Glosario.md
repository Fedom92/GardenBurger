---
tags: [gardenburger, referencia]
aliases: [Vocabulario, Terminos, arqueo, jornada comercial, ATP, solicitud, combo, PENDIENTEMP, envio local, pago dividido, horario especial]
actualizado: 2026-09-23
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
| **Jornada comercial** | El "hoy" del sistema: de las **19 a las 2**, no el día calendario. Un pedido de las 00:30 pertenece a la noche anterior. Atraviesa el arqueo, los buscadores, el historial y los sueldos. El cierre a las 2 es margen: no se trabaja pasada la 1. → [[Reglas de negocio#Jornada comercial]] |
| **Arqueo** | El cierre de caja de la jornada: cuánta plata entró, separada por efectivo y Mercado Pago. Vive en el documento `resumenDiario/{DD-MM-YYYY}` de la sucursal y se mueve con `increment()`, que **no es idempotente** — de ahí casi todos los cuidados del proyecto. → [[Modelo de estados]] |
| **`resumenDiario`** | La colección donde vive el arqueo. Un documento por jornada y por sucursal. También guarda las métricas por repartidor. → [[Modelo de datos Firestore]] |
| **Efectivo local vs efectivo envío** | Dos cajas distintas: lo que se cobra en el mostrador (zonas de `ENVIOS_LOCALES`) y lo que vuelve con el repartidor. Se arquean por separado porque se cuentan por separado. → [[Reglas de negocio#Envíos locales vs delivery]] |
| **Recargo MP** | Porcentaje que se suma cuando el cliente paga por Mercado Pago (`REACT_APP_recargoMP`). En el pago dividido se aplica solo sobre la parte que va por MP. |
| **Pago dividido** (`%`) | Método de pago en el que una parte va en efectivo y el resto por MP. El monto en efectivo lo fija el cajero; el recargo cae sobre la diferencia. |
| **Liquidación** | El cálculo de sueldos de un período: horas × valor hora **día por día**, menos descuentos. La hace el admin. → [[Asistencias y liquidacion]] |
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
| **Combo** | Unidad de conteo del arqueo, no un producto. Se cuentan **unidades**: un ítem con cantidad 3 son 3 combos. Qué categorías cuentan sale de `CATEGORIAS_COMBOS`. → [[Reglas de negocio#Combos]] |
| **Extra** | Producto de categoría `EXTRA` que se cuelga de otro (`tipoExtra: HAMBURGUESA` o `GENERAL`). En el carrito es una fila propia, aunque se muestre sangrado bajo su producto. |
| **`esPrueba`** | Marca de los pedidos que insertaba la herramienta de pruebas, eliminada el 24-09-2026. Sumaban al arqueo igual que los reales, así que los que quedaron en Firestore siguen contando. |

## La gente

| Término | Qué es |
|---|---|
| **Sucursal** | Cada local. El slug del documento (`davinci`, `luro`) es lo que va en las URLs públicas y lo que scopea todas las colecciones operativas. → [[Arquitectura y rutas#Multi-sucursal]] |
| **Encargado** | El rol que maneja una sucursal: caja, cocina, ATP, deliverys, asistencias e historial. Carga las horas del día pero **no decide sueldos**. |
| **Cajero** | Cobra, toma las solicitudes web, busca y elimina tickets. |
| **ATP** | **Atención al Público**: el mostrador. Es a la vez un rol, una pantalla y un estado del pedido — el pedido está listo y esperando a que el cliente lo retire. |
| **Jefe de deliverys** | Asigna repartidores, registra salida y regreso, y cierra la entrega. Es un rol del sistema. |
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
| **`useAccionUnica`** | El guard contra doble ejecución de todo lo que escribe plata. Usa un `ref` (corta en el mismo tick) y un `useState` (para el botón). → [[Convenciones y preferencias#Acciones que escriben plata]] |
| **Custom claim** | La marca `admin: true` que viaja **en el token** de Firebase Auth. Permite que las reglas pregunten quién es admin sin pagar una lectura. Toma efecto recién al volver a iniciar sesión. → [[Reglas de seguridad#Ser admin va en el token]] |
| **Contador** | El documento `contadores/pedidos` de cada sucursal, del que sale el número de ticket. **Ojo**: "contador" también figura como un rol en el panel de empleados, que es otra cosa (y hoy no hace nada). |
| **`get` vs `list`** | En las reglas de Firestore, leer **un** documento por id versus **consultar** la colección. `read` otorga los dos, y confundirlos fue el agujero P0 de la primera auditoría. → [[Reglas de seguridad]] |
