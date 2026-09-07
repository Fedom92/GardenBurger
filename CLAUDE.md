# GardenBurger

Sistema de gestión para una hamburguesería **multi-sucursal**: POS (Caja), Cocina, ATP
(mostrador), Delivery, asistencias y sueldos, menú online público y panel de administración.
SPA en React 18 (CRA) + Firebase 9.23.0 modular.

## El contexto vive en `docs/`

**`docs/` es la única fuente de documentación del proyecto**, y también es un vault de Obsidian.
Antes de recorrer `src/`, abrir **`docs/GardenBurger.md`**: tiene una tabla "vengo a… → leer esto"
que dice qué nota leer según la tarea. Leer *una* nota, no las doce.

No hay documentación en ningún otro lado. Si algo falta, la nota correspondiente va actualizada —
no se crea un `.md` suelto.

El vault es la fuente rápida; el código es la fuente de verdad. Si se contradicen, **gana el
código** y hay que corregir la nota.

## Lo mínimo para no romper nada

Esto **no son reglas cerradas**: es el diseño actual, y cada punto salió de un problema real. Si
ves una alternativa mejor, proponela. El detalle y el porqué están en el vault.

1. **La jornada comercial va de las 19 a las 2**, y es lo que significa "hoy" en todo el sistema:
   arqueo, buscadores, historial. Un pedido de las 00:30 pertenece a la noche anterior. Todo sale
   de `Utils/fechaComercial.js`. **Nunca `new Date()`** para algo que se graba: hay PCs en el
   local con el reloj mal, va por `ahoraServidor()`.
2. **Minimizar lecturas de Firestore es un requisito de primer orden**, no una optimización. Antes
   de agregar una consulta, preguntarse si el dato ya está en memoria. `getDocs` **siempre** va al
   servidor y se factura, aunque haya caché.
3. **`increment()` no es idempotente.** Todo lo que mueve `resumenDiario` va con guard
   (`Utils/useAccionUnica.js`) y dentro del mismo `writeBatch` que el pedido. Nunca `updateDoc`
   sobre `resumenDiario`: falla si el documento de la jornada no existe todavía.
4. **Multi-sucursal**: las colecciones operativas son subcolecciones de `sucursales/{id}/…`. El
   scope lo dan `colSucursal`/`docSucursal` (staff) o la sucursal de la URL (público).
5. **Nunca hardcodear** roles ni estados: van por `process.env.REACT_APP_*`, `ROLES` y `ESTADOS`
   de `Utils/Constantes.jsx`.

## Cómo trabajar en este repo

- Para verificaciones **No correr `npm run build`**, salvo pedido explícito. De necesitar un build pedir al usuario.
- **No hacer commits, push ni operaciones de git** salvo pedido explícito.
- **La config de Firebase se versiona, los secretos no.** `firebase.json`, `firestore.rules`,
  `storage.rules` y `functions/src` están en el repo y se despliegan con `firebase deploy`. Los
  `.env` (raíz y `functions/`) siguen ignorados. Los **índices no se declaran** en `firebase.json`,
  a propósito: se manejan desde la Consola.
- **El rol admin no se asigna desde la app.** Los administradores se crean a mano en la Consola de
  Firebase, y ser admin se resuelve con un custom claim en el token, no con una lectura.
- Tablas con `TablaGenerica`, montos con `fmtPesos`, confirmaciones destructivas con `Swal.fire`.
  Un `console.error` sin aviso visible al usuario cuenta como bug.
- Los archivos son **CRLF**: cualquier patrón multilínea necesita `\r?\n`.
- Las sugerencias, alternativas y mejoras son siempre bienvenidas. Solo se pide traer el motivo y
  el costo en lecturas de Firestore junto con la propuesta.
