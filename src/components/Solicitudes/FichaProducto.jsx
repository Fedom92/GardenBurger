import React, { useState } from "react";
import { Modal } from "react-bootstrap";
import { fmtPesos } from "../../Utils/formato";
import { capitalizar } from "./catalogo";
import { nuevaLinea } from "./carritoWeb";
import { FotoProducto } from "./ProductoCard";
import { Cantidad, Icono } from "./piezasWeb";

// La ficha de un producto: reemplaza a los tres modales de antes (hamburguesa,
// extras de hamburguesa y extras genéricos), que eran dos pasos encadenados con un
// "Siguiente" que en realidad terminaba. Todo en una sola hoja: tamaño, extras, nota
// para la cocina y cantidad.
//
// Es el Modal de react-bootstrap: toma el foco, se cierra con Esc y devuelve el foco
// a la tarjeta. En el celular se abre desde abajo (ver .gb-ficha en webPublica.css).
//
// El estado es local y arranca de cero en cada apertura (quien la abre le pasa una
// `key` nueva): la nota de una hamburguesa cancelada ya no aparece en la siguiente.
const FichaProducto = ({ ficha, onAgregar, onCerrada }) => {
    const { producto, grupos } = ficha;
    const variantes = producto.variantes || null;
    const [abierta, setAbierta] = useState(true);
    // Sin tamaño elegido de entrada: es más seguro que preelegir uno. Con una sola
    // variante no hay nada que elegir.
    const [variante, setVariante] = useState(variantes?.length === 1 ? variantes[0] : null);
    const [elegidos, setElegidos] = useState(() => new Set());
    const [nota, setNota] = useState("");
    const [cantidad, setCantidad] = useState(1);

    const nombre = variantes ? producto.nombre : producto.descripcion;
    const base = variantes ? variante : producto;          // el producto real que se agrega
    const extras = grupos.flatMap((g) => g.extras).filter((e) => elegidos.has(e.id));
    const precioUnidad = (Number(base?.precio) || 0) + extras.reduce((t, e) => t + (Number(e.precio) || 0), 0);
    // La foto y los ingredientes son los de la tarjeta para todos los tamaños: en una
    // hamburguesa, los del DOBLE (ver agruparHamburguesas). Elegir el tamaño cambia el
    // precio, no lo que se ve (decisión del dueño, 16-10-2026).
    const { ingredientes } = producto;

    const alternar = (id) => setElegidos((actual) => {
        const nuevo = new Set(actual);
        if (nuevo.has(id)) nuevo.delete(id); else nuevo.add(id);
        return nuevo;
    });

    const agregar = () => {
        if (!base) return;
        onAgregar(nuevaLinea(base, extras, nota, cantidad), variantes ? `${nombre} ${capitalizar(base.categoria)}` : nombre);
        setAbierta(false);
    };

    // Los pasos se numeran según lo que tenga el producto: "01 · Tamaño" solo existe
    // en las hamburguesas agrupadas.
    let paso = 0;
    const siguiente = () => String(++paso).padStart(2, "0");
    const elegirTamanio = variantes && variantes.length > 1;

    return (
        <Modal show={abierta} onHide={() => setAbierta(false)} onExited={onCerrada} centered
            className="gb-modal gb-ficha" data-bs-theme="dark" aria-labelledby="ficha-titulo">
            <div className="gb-tirador" aria-hidden="true" />
            <div className="gb-ficha-cuerpo">
                <div className="gb-ficha-foto">
                    <FotoProducto producto={producto} />
                    <button type="button" className="gb-boton-cerrar" onClick={() => setAbierta(false)} aria-label="Cerrar">
                        <Icono nombre="cruz" />
                    </button>
                </div>

                <h2 id="ficha-titulo" className="gb-display gb-titulo">{nombre}</h2>
                {ingredientes && <p className="gb-muted mt-2">{ingredientes}</p>}

                {elegirTamanio && (
                    <fieldset className="mt-1">
                        <legend className="gb-paso">{siguiente()} · Tamaño</legend>
                        <div className="gb-segmento" style={{ gridTemplateColumns: `repeat(${variantes.length}, minmax(0, 1fr))` }}>
                            {variantes.map((v) => (
                                <label key={v.id} className={`gb-segmento-opcion ${variante?.id === v.id ? "is-on" : ""}`}>
                                    <input type="radio" name="tamanio" className="visually-hidden"
                                        checked={variante?.id === v.id} onChange={() => setVariante(v)} />
                                    <span className="fw-bolder">{v.categoria}</span>
                                    <span className="gb-segmento-precio">{fmtPesos(v.precio)}</span>
                                </label>
                            ))}
                        </div>
                    </fieldset>
                )}

                {grupos.map((g) => (
                    <section key={g.id} aria-label={g.titulo}>
                        <p className="gb-paso">{siguiente()} · {g.titulo} <span className="text-lowercase">(opcional)</span></p>
                        <div className="d-flex flex-wrap gap-2">
                            {g.extras.map((e) => (
                                <button key={e.id} type="button" className="gb-chip" aria-pressed={elegidos.has(e.id)}
                                    onClick={() => alternar(e.id)}>
                                    {capitalizar(e.descripcion)} {Number(e.precio) > 0 ? `+${fmtPesos(e.precio)}` : "sin cargo"}
                                </button>
                            ))}
                        </div>
                    </section>
                ))}

                <label htmlFor="ficha-nota" className="gb-paso d-block">{siguiente()} · Nota para la cocina</label>
                <input id="ficha-nota" type="text" className="form-control" placeholder="Ej: sin tomate" maxLength={120}
                    value={nota} onChange={(e) => setNota(e.target.value)} />
            </div>

            <div className="gb-ficha-pie">
                <div className="gb-damero" aria-hidden="true" />
                <div className="gb-ficha-barra">
                    <Cantidad valor={cantidad} nombre={nombre} menosDeshabilitado={cantidad <= 1}
                        onMenos={() => setCantidad((c) => Math.max(1, c - 1))} onMas={() => setCantidad((c) => c + 1)} />
                    <button type="button" className="btn btn-gb gb-ficha-agregar" onClick={agregar} disabled={!base}>
                        {base ? `Agregar · ${fmtPesos(precioUnidad * cantidad)}` : "Elegí un tamaño"}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default FichaProducto;
