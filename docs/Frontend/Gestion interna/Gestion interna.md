---
tags: [gardenburger, frontend, staff, hub]
aliases: [Pantallas del staff, Gestion interna, Staff]
actualizado: 2026-10-23
---

# Gestión interna

↑ [[Frontend]]

Las pantallas del staff: lo que usan el cajero, la cocina, el mostrador, la jefa de deliverys, el
encargado y el admin. Las reglas de negocio de cada una están en su sector (*Sectores*); acá, cómo
están hechas.

## Qué ve cada rol

`MODULOS_POR_ROL` en `Login_Navs/Navigation.jsx` decide qué ve cada rol en el menú lateral. Es
**cosmético**: la barrera son los guards ([[Frontend#Guards]]) y las reglas.

| Rol | Módulos del menú | Aterriza en (`ROLES[rol].rutaInicial`) |
|---|---|---|
| admin | Productos, Métricas, Historial, Estadísticas (Actuales e Históricas), Liquidación, Clientes, Configuración | `/productos` |
| encargado | Caja, Cocina, ATP, Deliverys, Asistencias | `/pedidos-caja` |
| cajero | Caja | `/pedidos-caja` |
| cocina | Cocina | `/gestion-cocina` |
| jefa de deliverys | Deliverys | `/jefe-deliverys` |
| atp | ATP | `/gestion-atp` |
| delivery | ninguno: no entra al sistema | — |

Un rol que no esté en `ROLES` cae en `/miPerfil`.

## Las pantallas

| Pantalla | Archivo principal | Sector | Qué tiene de particular |
|---|---|---|---|
| **Caja** | `POS/Caja.jsx` | *Cajero* | Nota propia: [[Caja]] |
| **Cocina** | `Cocina/Cocina.jsx` | *Cocinero* | Dos solapas con contadores, listeners por estado; `PedidosCocinando` filtra por `cocineroID`. El ticket del cliente (`TicketImpresion`) abre una ventana e imprime |
| **ATP** | `ATP/ATP.jsx` | *ATP* | Botón de WhatsApp "tu pedido está listo" y botón Imprimir para lo que no pasó por la cocina |
| **Deliverys** | `Delivery/JefeDeliverys.jsx` | *Jefa de deliverys* | Dos listeners: los `DELIVERY` y los viajes cerrados de la noche (Métricas). Los modales de pedido y de métricas en `delivery_modales/` |
| **Asistencias** · **Liquidación** | `Asistencias/` | *Encargado* · *Admin* | La grilla de carga `ModalCargarJornada` es la misma; `modoAdmin` habilita el valor hora y la auditoría |
| **Productos** | `Productos/Productos.jsx` | *Admin* | Productos y categorías por listener; botón "Publicar Menú" que titila. Ver *Catálogo* |
| **Panel Admin** | `Admin/PanelAdmin.jsx` | *Admin* | Pestañas Personal, Sucursales y Envíos con la activa en la URL (`?tab=`); `mountOnEnter`: cada una lee lo suyo recién al abrirla |
| **Historial** | `Pedidos/HistorialPedidos.jsx` | *Admin* | Pedidos por rango, **sin filtro de estado ni tope** (el admin sabe lo que pide); eliminar y restaurar; `AuditoriaPedido` muestra la traza de un pedido |
| **Métricas** | `Metricas/Metricas.jsx` | *Admin* | Pensada para entrar entera en el celular sin scroll |
| **Estadísticas** | `Estadisticas/Generales/` · `Estadisticas/Historico/` | *Admin* | Actuales (resúmenes guardados) e Históricas (TSV). Ver *Arqueo y estadísticas › Métricas y Estadísticas* |
| **Clientes** | `Clientes/Clientes.jsx` | *Admin* | Un **buscador**, no un listado: no lee nada al entrar (abajo) |
| **Mi Perfil** | `Admin/MiPerfil.jsx` | todos | De solo lectura: ver *Authentication › Mi Perfil es de solo lectura* |

### Clientes: un buscador con tope

Un término de solo dígitos se busca como **teléfono exacto**; cualquier otra cosa, como **prefijo
de nombre** —Firestore compara byte a byte, así que distingue mayúsculas y acentos: hay que
escribirlo como se cargó—. Elegir solo la sucursal lista esa sucursal. Todo con tope. La ficha la
crea y actualiza la Caja al cobrar (*Cajero › La ficha del cliente*); un CRM propio está pendiente.

### Panel Admin: personal, sucursales y envíos

- **Personal**: todos los empleados, ordenados por rol (`nroOrden`) y nombre, repartidores
  incluidos. El alta y la baja se ramifican por `sinAcceso` (ver *Authentication › Alta y baja de empleados*).
  La tabla enriquece las filas con `rolNombre` y `sucursalNombre` para que los filtros muestren
  nombres y no valores crudos.
- **Sucursales**: la tabla dice qué hace la web hoy (solo informa); en Acciones, encender o apagar,
  las excepciones (botón naranja) y editar. **Todo cambio se publica solo** (`publicarSucursales`).
  El alta va con `setDoc` y la edición con `updateDoc` solo de los campos del formulario: antes
  era un `setDoc` sin merge que borraba las excepciones vigentes. La **Ubicación** son las
  coordenadas del local pegadas de Google Maps (clic derecho sobre el local → clic en las
  coordenadas): de ahí mide la web el envío. Es opcional; sin ella la tabla avisa "Falta ubicación".
- **Envíos**: las zonas en `TablaGenerica` y el alta y edición en un modal. **No muestra Retira
  ni Espera Afuera**: sus nombres deciden el ruteo de cocina y el arqueo. Las demás tienen que ser
  un rango en km (`3-4`): la web lo lee. **Todo cambio se publica solo** (`publicarEnvios`).

## Cómo se ve el staff

- **Blanco y negro**, salvo los botones. Tema oscuro con `--color-primario-normal: #272727` y
  `--color-primario-fuerte: #000000`. Estilos y animaciones en `style/Main.css`.
- **Menú lateral** colapsable en la PC y cajón en el celular (`mobile-open`), que se abre con un
  botón flotante arriba a la izquierda (`.nav-handle`: logo + flecha, en lugar de una topbar que
  gastaba alto); lo que tiene algo en esa esquina se corre 115 px: el buscador de la Caja
  (`.search-bar`) y el título de Métricas y Estadísticas Históricas (`.est-titulo-pantalla`), las
  pantallas pensadas para el celular. **El resto de los módulos son de PC.** El cajón abierto (28-09-2026) tiene
  encabezado con logo, nombre, rol y una X; ítems de 48 px para el dedo; la pantalla actual marcada
  (`NavLink` → `nav-actual`); submenús con una flecha que gira y "Salir" abajo, en rojo. Todo en la
  media query móvil de `Main.css`: en la PC el menú no cambia.
- **Las pantallas del admin**: tabla (`TablaGenerica`) + botón "Agregar X", y el alta, la edición
  y cualquier detalle de una fila **en un modal**, nunca en un panel debajo de la tabla (dueño,
  12-10-2026: con 10 sucursales, tabla y panel juntos no escalan). Sin leyendas informativas de
  relleno.
- **`.App` centra el texto** (`App.css`): todo lo del staff sale centrado salvo que diga otra
  cosa. Los modales no: se dibujan fuera de `.App`.
- **La regla global `.nav` de `Main.css` es la de los ítems del menú** y también le cae a cualquier
  `.nav` de Bootstrap: un componente con `.nav` la tiene que deshacer, como `.tabs-admin`.

Más convenciones de código y UI: *Convenciones y preferencias*.
