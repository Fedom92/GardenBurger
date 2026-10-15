// Las ilustraciones de la marca (trazo blanco lino, en WebP), por su clave. Las usa
// el filtro de categorías y reemplazan la foto de un producto que no tiene, o que
// no carga.
import aderezo from "../../img/marca/ilustraciones/aderezo.webp";
import bolsa from "../../img/marca/ilustraciones/bolsa.webp";
import hamburguesaFuego from "../../img/marca/ilustraciones/hamburguesa-fuego.webp";
import hamburguesa from "../../img/marca/ilustraciones/hamburguesa.webp";
import llama from "../../img/marca/ilustraciones/llama.webp";
import papas from "../../img/marca/ilustraciones/papas.webp";
import vaso from "../../img/marca/ilustraciones/vaso.webp";

const ILUSTRACIONES = { aderezo, bolsa, "hamburguesa-fuego": hamburguesaFuego, hamburguesa, llama, papas, vaso };

export const ilustracion = (clave) => ILUSTRACIONES[clave] || bolsa;
