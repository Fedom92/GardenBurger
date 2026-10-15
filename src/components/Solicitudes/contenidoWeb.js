// Lo que completa la dueña: las fotos propias y las redes. Mientras falte algo, la
// web muestra su lugar marcado ("Foto pendiente", la red apagada), para que se
// note qué falta.
//
// Para cambiar una foto: copiarla (WebP o JPG, unos 1080 px de ancho) a
// src/img/marca/fotos/ e importarla acá en lugar de la actual. Para sacarla, dejar
// la constante en null.
import fotoCocinero from "../../img/marca/fotos/cocinero.webp";
import fotoHamburguesa from "../../img/marca/fotos/hamburguesa.webp";

// El cocinero de espaldas (recorte de la pieza de redes "cocinero_espaldas"): la
// misma foto arriba del selector y en el seguimiento mientras se cocina, así baja
// una sola vez.
export const FOTO_SELECTOR = fotoCocinero;
export const FOTO_COCINA = fotoCocinero;
// La hamburguesa de "Unite al club", recortada debajo del texto.
export const FOTO_CATALOGO = fotoHamburguesa;

// Las redes del pie, con la URL completa (https://www.instagram.com/…). Sin URL se
// muestran apagadas, como lugar a completar. El WhatsApp no va acá: sale del
// teléfono de cada sucursal.
export const REDES = [
    { nombre: "Instagram", url: "https://www.instagram.com/garden_burger_" },
];
