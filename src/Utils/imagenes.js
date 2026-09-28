import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebaseConfig/firebase";

// Fotos de producto. Se achican y se pasan a WebP ACÁ, en el navegador del admin,
// antes de subir: a Storage llega solo la versión liviana. La foto de una cámara
// (4000 px, 4-6 MB) se ve a 86-128 px en la Caja y en la web; subirla entera haría
// lenta la web con datos móviles sin que se note ninguna diferencia en pantalla.
//
// 1200 px de lado alcanzan con margen para pantallas de alta densidad (×3) y para
// una vista más grande a futuro: una foto así pesa ~100-200 KB. Una imagen más
// chica no se agranda. El original queda en la PC del admin.
const LADO_MAXIMO = 1200;
const CALIDAD_WEBP = 0.85;

// Lo que ve el admin cuando el navegador no puede abrir el archivo. El caso típico
// son las HEIC del iPhone, que Chrome en Windows no abre.
export const IMAGEN_ILEGIBLE = "No se pudo abrir la imagen. Usá una JPG, PNG o WebP: las HEIC del iPhone no se abren en Windows.";

const optimizar = async (archivo) => {
    const bitmap = await createImageBitmap(archivo).catch(() => { throw new Error(IMAGEN_ILEGIBLE); });
    const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    // Safari no genera WebP desde un canvas y devuelve PNG: pesa más, pero funciona.
    // Por eso la extensión del archivo sale del tipo real y no se da por sentada.
    const webp = await new Promise((listo) => canvas.toBlob(listo, "image/webp", CALIDAD_WEBP));
    // Una imagen chica y ya optimizada puede pesar menos que su versión WebP.
    return webp.size < archivo.size ? webp : archivo;
};

// Optimiza la foto, la sube a productos/ y devuelve su URL de descarga. El caché de
// un año es seguro porque cada subida tiene nombre propio: una foto nueva es otra URL.
export const subirImagenProducto = async (archivo) => {
    const imagen = await optimizar(archivo);
    const nombre = archivo.name.replace(/\.[^.]*$/, "");
    const extension = imagen.type.split("/")[1];
    const storageRef = ref(storage, `productos/${Date.now()}_${nombre}.${extension}`);
    await uploadBytes(storageRef, imagen, { cacheControl: "public, max-age=31536000" });
    return getDownloadURL(storageRef);
};
