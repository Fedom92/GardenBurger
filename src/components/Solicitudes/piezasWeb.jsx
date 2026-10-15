import React from "react";
import { Dropdown } from "react-bootstrap";
import { FaWhatsapp } from "react-icons/fa";
import { fmtPesos } from "../../Utils/formato";

// Piezas chicas de la web pública que se repiten entre pantallas.

// Íconos de trazo, como pide el manual (nada de emojis en la interfaz).
const TRAZOS = {
    bolsa: "M5 8h14l-1.2 12.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5 8zM9 8V6.5a3 3 0 0 1 6 0V8",
    flecha: "M5 12h14M13 6l6 6-6 6",
    atras: "M19 12H5M11 6l-6 6 6 6",
    mas: "M12 5v14M5 12h14",
    menos: "M5 12h14",
    cruz: "M6 6l12 12M18 6L6 18",
    check: "M5 12.5l4.5 4.5L19 7.5",
    puntos: "M12 5h.01M12 12h.01M12 19h.01",   // ⋮: tres puntos, con trazo grueso
};

const GROSOR = { puntos: 4 };

export const Icono = ({ nombre, tamanio = 24 }) => (
    <svg width={tamanio} height={tamanio} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={GROSOR[nombre] || 2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={TRAZOS[nombre]} />
    </svg>
);

// "− N +". En la ficha, "−" no baja de 1 (`menosDeshabilitado`). Con `onQuitar`
// (lo que ya está en el pedido), en 1 el "−" pasa a ser una ✕ que lo saca.
export const Cantidad = ({ valor, nombre, onMenos, onMas, onQuitar, menosDeshabilitado = false }) => (
    <div className="gb-cantidad" role="group" aria-label={`Cantidad de ${nombre}`}>
        {onQuitar && valor <= 1 ? (
            <button type="button" className="gb-cantidad-boton" onClick={onQuitar} aria-label={`Quitar ${nombre}`}>
                <Icono nombre="cruz" tamanio={18} />
            </button>
        ) : (
            <button type="button" className="gb-cantidad-boton" onClick={onMenos} disabled={menosDeshabilitado}
                aria-label={`Uno menos de ${nombre}`}>
                <Icono nombre="menos" tamanio={20} />
            </button>
        )}
        <span className="gb-cantidad-valor" aria-live="polite">{valor}</span>
        <button type="button" className="gb-cantidad-boton" onClick={onMas} aria-label={`Uno más de ${nombre}`}>
            <Icono nombre="mas" tamanio={20} />
        </button>
    </div>
);

// El botón del carrito de la cabecera: la bolsa con la cantidad de productos y el
// total. Vacío se ve apagado, pero está, para que se sepa dónde mirar. Lleva hasta
// "Tu pedido", en la misma página.
export const BotonCarrito = ({ cantidad, total, onClick }) => {
    const vacio = cantidad === 0;
    const etiqueta = vacio
        ? "Ver pedido: todavía no agregaste nada"
        : `Ver pedido: ${cantidad} ${cantidad === 1 ? "producto" : "productos"}, ${fmtPesos(total)}`;
    return (
        <button type="button" className={`gb-boton-carrito ${vacio ? "is-vacio" : ""}`} onClick={onClick} aria-label={etiqueta}>
            <span className="gb-boton-carrito-icono">
                <Icono nombre="bolsa" />
                {!vacio && <span className="gb-badge">{cantidad}</span>}
            </span>
            <span>{fmtPesos(total)}</span>
        </button>
    );
};

// El chat de WhatsApp de una sucursal, con el texto ya escrito. Los teléfonos se
// cargan sin el 549 (10 dígitos, como en la Caja).
export const urlWhatsApp = (telefono, texto) =>
    `https://api.whatsapp.com/send?phone=549${telefono}&text=${encodeURIComponent(texto)}`;

const CONSULTA = "Hola, tengo una consulta.";

// El botón flotante de WhatsApp, en todas las pantallas públicas. Con una sucursal
// (el catálogo, el seguimiento) abre su chat; sin sucursal elegida (el selector,
// /menu) pregunta a cuál escribir. Sin ningún teléfono cargado, no aparece.
export const BotonWhatsApp = ({ sucursales = [], mensaje = CONSULTA }) => {
    const conTelefono = sucursales.filter((s) => s?.telefono);
    if (!conTelefono.length) return null;

    if (conTelefono.length === 1) {
        return (
            <div className="gb-whatsapp-flotante">
                <a className="gb-whatsapp" href={urlWhatsApp(conTelefono[0].telefono, mensaje)}
                    target="_blank" rel="noopener noreferrer" aria-label="Escribir a la sucursal por WhatsApp">
                    <FaWhatsapp aria-hidden="true" />
                </a>
            </div>
        );
    }

    return (
        <Dropdown drop="up" align="end" className="gb-whatsapp-flotante">
            <Dropdown.Toggle as="button" type="button" className="gb-whatsapp" aria-label="Escribir por WhatsApp: elegir sucursal">
                <FaWhatsapp aria-hidden="true" />
            </Dropdown.Toggle>
            <Dropdown.Menu className="gb-whatsapp-menu">
                <Dropdown.Header>¿A qué sucursal le escribís?</Dropdown.Header>
                {conTelefono.map((s) => (
                    <Dropdown.Item key={s.id || s.telefono} href={urlWhatsApp(s.telefono, mensaje)}
                        target="_blank" rel="noopener noreferrer">
                        {s.nombre || s.id}
                    </Dropdown.Item>
                ))}
            </Dropdown.Menu>
        </Dropdown>
    );
};

// El título numerado de cada parte: "//.01 Lo que pediste".
export const Subtitulo = ({ numero, children, id }) => (
    <h3 className="gb-subtitulo" id={id}>
        <span className="gb-numero">{`//.${numero}`}</span>
        {children}
    </h3>
);
