---
tags: [gardenburger, invariantes, referencia]
aliases: [Invariantes, Lo que no se rompe, Dependencias, Impacto de cambios]
actualizado: 2026-10-22
---

# Invariantes y dependencias

↑ [[GardenBurger]]

**Leer antes de tocar plata, estados, reglas o sucursales.** Cada fila es algo que hoy se cumple, dónde
se hace cumplir y qué se rompe si deja de cumplirse. No son leyes: son el diseño actual, y una
alternativa mejor se discute con su motivo y su costo en lecturas. El detalle, en la nota de cada fila.

## Lo que tiene que seguir siendo cierto

### Tiempo

| Invariante | Dónde se cumple | Si se rompe | Nota |
|---|---|---|---|
| "Hoy" es la jornada de 19 a 02; un pedido pertenece a la noche de su `timestamp` | `fechaComercial.js`, `HORARIO` | El arqueo, los buscadores y las asistencias miran otra noche | *Jornada y horarios › Jornada comercial* |
| Nada que se grabe usa `new Date()`: `serverTimestamp()` o `ahoraServidor()` | cada escritura con fecha | Una PC con el reloj corrido manda el pedido a otra jornada | *Jornada y horarios › La hora sale del servidor* |
| En un horario especial, `timestamp` es la hora pedida, sobre el día de la jornada en curso | `Caja.guardarBD` | El pedido y su plata caen en otra noche | *Jornada y horarios › Horario especial* |

### Plata

| Invariante | Dónde se cumple | Si se rompe | Nota |
|---|---|---|---|
| El arqueo es una función de los pedidos: suman los que tienen `cajeroID` y están `ENTREGADO` | `calcularArqueo`, `entraAlArqueo` | Números que no se pueden explicar mirando los pedidos | *Arqueo y estadísticas › El arqueo se calcula desde los pedidos* |
| Nadie escribe `resumenDiario` salvo el cálculo (`obtenerArqueo`, `obtenerResumenes`); nunca con `updateDoc` | `useResumenDiario.js` | Un resumen que no coincide con sus pedidos | *Arqueo y estadísticas › El resumen guardado* |
| Lo que corrige un pedido ya existente escribe con `actualizarPedidoYResumen()` | ATP, Deliverys, F2, F3, Historial | La noche cerrada queda con el resumen viejo, sin aviso | *Arqueo y estadísticas › El resumen guardado* |
| Cambiar el significado de un campo del resumen sube `VERSION_RESUMEN_DIARIO` | `useResumenDiario.js` | Las noches guardadas quedan contadas con la regla vieja | *Arqueo y estadísticas › Versionado* |
| `combos`, `esLocal` y el costo del envío se congelan en el pedido al cobrar; `nombre` y `valorHora` en cada asistencia | `Caja.guardarBD`, `armarRegistro` | Cambiar código o tarifas reescribe la historia | *Arqueo y estadísticas › Lo que se congela en el pedido* |
| `efectivoLocal + efectivoEnvio = totalEfectivo`; lo que cobra el repartidor sale de `repartirPago`, la misma función del arqueo | `calcularArqueo`, `JefeDeliverys` | La calle y la caja dan números distintos | *Logística de deliverys › Qué se cobra en la puerta* |
| El número de ticket y el pedido se guardan en la misma transacción; el id del pedido se genera fuera del callback | `Caja.guardarBD`, `avanzarContador` | Números salteados o pedidos duplicados por reintento | *Caja › Guardar un pedido* |
| Lo que crea un documento va con `useAccionUnica` | Caja, web, altas del admin | Un doble click crea dos pedidos | *Convenciones y preferencias › Acciones que no se pueden repetir* |

### Pedidos y estados

| Invariante | Dónde se cumple | Si se rompe | Nota |
|---|---|---|---|
| Estados, métodos de pago y roles nunca se escriben a mano: `ESTADOS`, `METODOS_PAGO`, `REACT_APP_*` | todo el código | Un string mal escrito deja un pedido fuera de toda lista | *Modelo de estados › Los estados* |
| Un pedido nunca se borra: anular es pasar a `ELIMINADO` | `firestore.rules` (`delete: if false`) | Se pierde la auditoría | *Reglas de Firestore › Quién puede qué* |
| Un anulado solo lo cambia el admin; un viaje en la calle no se anula | reglas + `enLaCalle()` | Un anulado vuelve al circuito; un viaje hecho no se paga | *Reglas de Firestore › update: valida la asignación de la solicitud* |
| Una solicitud web tiene un solo dueño a la vez, por 15 minutos | `asignacionValida()` + temporizador de la Caja | Dos cajeros cobran el mismo pedido | *Flujo del pedido › Una solicitud web tiene un solo dueño* |
| El ruteo lo decide `envio.zona_envio` contra `ENVIOS_LOCALES`, con `.includes()` | `ruteoPedido.js` | Pedidos al mostrador que eran delivery, o al revés | *Flujo del pedido › Pipeline* |
| Las zonas "Retira" y "Espera Afuera" se llaman exactamente así en `envios` | `ENVIOS_LOCALES`; Envíos no las muestra | Se rompen el ruteo, el arqueo y la Caja | *Gestion interna › Panel Admin: personal, sucursales y envíos* |
| En el carrito guardado, cada extra va inmediatamente después de su producto | `aplanarCarrito`, `useCarrito`, `agruparExtras` | La Caja y la Cocina asignan extras al producto equivocado | *Web publica › El carrito* |

### Sucursales, seguridad y costo

| Invariante | Dónde se cumple | Si se rompe | Nota |
|---|---|---|---|
| Lo operativo de una sucursal se alcanza con `colSucursal`/`docSucursal` (staff) o con la sucursal de la URL (público), nunca con un path armado a mano | `firebase.js` | Se lee o escribe en otra sucursal | *Frontend › Multi-sucursal en el front* |
| `useAuth()` solo bajo la rama del staff; las páginas públicas no montan sesión | `App.js` | Una página pública rompe la sesión de la Caja | *Frontend › Árbol de providers* |
| Ser admin es el claim del token; el rol admin no se asigna desde la app; `ADMIN_ROL` = `REACT_APP_admin` | reglas, `crearUsuario` | Cualquiera se da permisos, o un admin no puede entrar | *Authentication › Ser admin es un claim en el token* |
| Nada con datos personales va en `public/` | — | El hosting lo sirve sin sesión | *Storage › Los TSV de Estadísticas, en una carpeta privada* |
| Antes de agregar una lectura, el dato no está en memoria; `getDocs` siempre se factura | criterio de cada cambio | La cuota diaria se va en consultas repetidas | *Firestore › Lo que hay que saber del SDK* |
| La web pública lee `menu.json`, no Firestore; lo privado no se publica | `menuPublico.js` | El tráfico público paga lecturas, o se ve lo que solo se vende en la Caja | *Storage › menu.json* |

## Si cambiás X, revisá Y

| Si cambiás… | Revisá también |
|---|---|
| **Un valor de `ESTADOS` o `SUBESTADOS_MOTODELIVERY`** | `firestore.rules` (los repite); `FLUJO_PUB_ESTADOS` y `getCurrentStepIndex` (el seguimiento); `calcularArqueo`; los listeners por estado de Cocina, ATP y Deliverys |
| **`MINUTOS_SOLICITUD_TOMADA`** | `asignacionVencida()` en `firestore.rules` |
| **`HORARIO` o `HORA_HABILITA_STATS`** | todo `fechaComercial.js` y sus tests; `HORAS_JORNADA` (el ABM de sucursales); el horario especial; que los horarios de cada sucursal sigan cayendo adentro. Los resúmenes ya guardados no se recalculan |
| **`CATEGORIAS_COMBOS` o sus `excludes`** | solo cuenta para los pedidos nuevos (`combos` está congelado); `esComboConta` del Histórico; el top de combos de Métricas |
| **El nombre de una categoría** | sus productos (se relacionan por nombre); los extras que ofrece la web (`extrasDe`); `CATEGORIAS_HAMBURGUESA`, `CATEGORIAS_COMBOS`, `CANTIDAD_CARNES`; `getItemsCocina` si es `BEBIDAS`; si es privada |
| **`ENVIOS_LOCALES` o una zona de `envios`** | el ruteo de cocina, `esLocal` (que se congela al cobrar), el desglose del arqueo, la UI de la Caja, `cliente.opcion` de la web |
| **La forma de un ítem del carrito web** | la clave de `localStorage` (`pedidoWeb:<sucursal>`); `aplanarCarrito`; `useRevisarSolicitud`; `agruparExtras`; `esCreacionPublicaValida()` |
| **Un campo que suma `calcularArqueo`** | subir `VERSION_RESUMEN_DIARIO` (cada noche guardada se recalcula una vez: ~60-100 lecturas por noche y sucursal) |
| **Un campo nuevo en la solicitud web** | nada en las reglas (lista negra); que la Caja lo conserve al guardar con `merge` |
| **Una regla de Firestore o de Storage** | que no la despliega un asistente: lo hace el dueño; que las reglas se combinan con OR |
| **Un rol** | `ROLES`, `MODULOS_POR_ROL`, los `RequireRole` de `App.js`, `.env`; si es admin, `functions/.env` |
| **Un producto, categoría o sucursal** | publicar el menú (las sucursales se publican solas) |
| **Un `getDocs` nuevo** | *Mapa de operaciones Firestore*: cuánto cuesta, cuántas veces por noche, y si un listener o un dato en memoria lo evita |
