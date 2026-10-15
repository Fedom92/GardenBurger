import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

// La carta de /menu partida en páginas del tamaño de un estado de WhatsApp: 1080 ×
// 1920. Se arman en CSS a 450 × 800 —poco más que el ancho de un celular, así la
// letra se lee casi como en la pantalla— y html2canvas las saca al 2,4x. El PDF
// lleva las mismas páginas: es para mandar por chat y mirarlo en el celular, no para
// imprimir.
//
// Lo importa Menu.jsx recién al tocar un botón: html2canvas y jsPDF no bajan con la
// página.
const ANCHO = 450;
const ALTO = 800;
const ESCALA = 2.4;
const FONDO = "#262423";
const LINO = "#fcf5ed";

// html2canvas no dibuja repeating-conic-gradient: en las páginas, el damero va con
// un mosaico dibujado acá, con los mismos cuadros que el del CSS.
const mosaicoDamero = () => {
    const lienzo = document.createElement("canvas");
    lienzo.width = 16;
    lienzo.height = 16;
    const ctx = lienzo.getContext("2d");
    ctx.fillStyle = FONDO;
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = LINO;
    ctx.fillRect(8, 0, 8, 8);
    ctx.fillRect(0, 8, 8, 8);
    return lienzo.toDataURL();
};

const nuevoDamero = (mosaico) => {
    const damero = document.createElement("div");
    damero.className = "gb-damero";
    damero.style.background = `url(${mosaico}) 0 0 / 16px 16px`;
    return damero;
};

// Reparte la carta en páginas, dentro del escenario (fuera de la vista). Mide con el
// layout real: agrega cada ítem y, si el cuerpo de la página desborda, lo pasa a una
// página nueva. Un título nunca queda solo al pie: se va con su primer ítem. Una
// sección que sigue en otra página repite su título.
const repartir = (carta, escenario) => {
    const cabecera = carta.querySelector('[data-carta="cabecera"]');
    const pie = carta.querySelector('[data-carta="pie"]');
    const mosaico = mosaicoDamero();
    const paginas = [];
    let cuerpo = null;

    const abrirPagina = () => {
        const pagina = document.createElement("div");
        pagina.className = "gb-pagina-menu";
        pagina.style.width = `${ANCHO}px`;
        pagina.style.height = `${ALTO}px`;
        cuerpo = document.createElement("div");
        cuerpo.className = "gb-pagina-menu-cuerpo";
        pagina.append(nuevoDamero(mosaico), cabecera.cloneNode(true), cuerpo, pie.cloneNode(true), nuevoDamero(mosaico));
        escenario.append(pagina);
        paginas.push(pagina);
    };
    const desborda = () => cuerpo.scrollHeight > cuerpo.clientHeight;

    abrirPagina();
    carta.querySelectorAll('[data-carta="seccion"]').forEach((seccion) => {
        const titulo = seccion.querySelector('[data-carta="titulo"]');
        let bloque = null;
        // La sección sin sus hijos: conserva la clase y las variables (las columnas
        // de las hamburguesas).
        const abrirBloque = () => {
            bloque = seccion.cloneNode(false);
            bloque.append(titulo.cloneNode(true));
            cuerpo.append(bloque);
        };

        seccion.querySelectorAll('[data-carta="item"]').forEach((item) => {
            if (!bloque) abrirBloque();
            const copia = item.cloneNode(true);
            bloque.append(copia);
            if (!desborda()) return;
            copia.remove();
            if (bloque.children.length === 1) bloque.remove();
            abrirPagina();
            abrirBloque();
            bloque.append(copia);
        });
    });

    if (paginas.length > 1) {
        paginas.forEach((pagina, i) => {
            const numero = document.createElement("span");
            numero.className = "gb-pagina-menu-numero";
            numero.textContent = `${i + 1} / ${paginas.length}`;
            pagina.append(numero);
        });
    }
    return paginas;
};

const generarPaginas = async (carta) => {
    // Con las fuentes cargadas: medir con la de respaldo cortaría mal las páginas.
    await document.fonts.ready;
    const escenario = document.createElement("div");
    escenario.className = "gb-web gb-escenario-menu";
    escenario.setAttribute("data-bs-theme", "dark");
    escenario.setAttribute("aria-hidden", "true");
    document.body.append(escenario);
    try {
        const lienzos = [];
        for (const pagina of repartir(carta, escenario)) {
            lienzos.push(await html2canvas(pagina, { scale: ESCALA, backgroundColor: FONDO, logging: false }));
        }
        return lienzos;
    } finally {
        escenario.remove();
    }
};

const aBlob = (lienzo) => new Promise((resolver, rechazar) => {
    lienzo.toBlob((blob) => (blob ? resolver(blob) : rechazar(new Error("No se pudo generar la imagen"))), "image/png");
});

const descargar = (url, nombre) => {
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombre;
    document.body.append(enlace);
    enlace.click();
    enlace.remove();
};

// Una imagen por página. Con varias, el navegador pregunta una vez si deja bajar
// varios archivos.
export const descargarImagenes = async (carta) => {
    const lienzos = await generarPaginas(carta);
    for (const [i, lienzo] of lienzos.entries()) {
        const url = URL.createObjectURL(await aBlob(lienzo));
        const sufijo = lienzos.length > 1 ? `-${i + 1}-de-${lienzos.length}` : "";
        descargar(url, `menu-garden-burger${sufijo}.png`);
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
};

export const descargarPDF = async (carta) => {
    const lienzos = await generarPaginas(carta);
    // En puntos y con la proporción de la página: lo que importa es la forma.
    const pdf = new jsPDF({ unit: "pt", format: [ANCHO, ALTO], orientation: "portrait" });
    lienzos.forEach((lienzo, i) => {
        if (i > 0) pdf.addPage([ANCHO, ALTO], "portrait");
        pdf.addImage(lienzo.toDataURL("image/jpeg", 0.9), "JPEG", 0, 0, ANCHO, ALTO);
    });
    pdf.save("menu-garden-burger.pdf");
};
