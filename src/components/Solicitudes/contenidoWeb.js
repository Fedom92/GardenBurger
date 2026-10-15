// Lo que completa la dueña: las fotos propias y las redes. Mientras falte algo, la
// web muestra su lugar marcado ("Foto pendiente", la red apagada), para que se
// note qué falta.
//
// Para poner una foto: copiarla (JPG o WebP, unos 1200 px de ancho) a
// src/img/marca/fotos/ e importarla acá, por ejemplo:
//   import fotoSelector from "../../img/marca/fotos/selector.webp";
//   export const FOTO_SELECTOR = fotoSelector;

export const FOTO_SELECTOR = null; // arriba del selector de sucursal
export const FOTO_CATALOGO = null; // arriba del catálogo
export const FOTO_COCINA = null;   // en el seguimiento, mientras el pedido se cocina

// Las redes del pie, con la URL completa (https://www.instagram.com/…). Sin URL se
// muestran apagadas, como lugar a completar.
export const REDES = [
    { nombre: "Instagram", url: "" },
    { nombre: "Facebook", url: "" },
];
