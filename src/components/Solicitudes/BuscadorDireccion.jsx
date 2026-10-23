import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaMapMarkerAlt } from "react-icons/fa";
import { limitesDeBusqueda } from "../../Utils/zonasEnvio";
import { nuevaSesion, sugerirDirecciones, datosDeDireccion } from "../../Utils/googleMaps";

// Cuántas letras y cuánto silencio antes de consultar a Google: cada consulta se
// factura, y "Jara 1250" tecla por tecla serían nueve.
const MIN_LETRAS = 3;
const ESPERA_MS = 300;

// La dirección del delivery, elegida de las sugerencias de Google: el cliente no
// puede dejar una escrita a mano (decisión del dueño, 23-10-2026), así todo pedido
// trae sus coordenadas y su zona. Elegida, se ve como una tarjeta con "Cambiar".
//
// `onFalla`: Google no cargó o rechazó la consulta (sin clave, clave mal
// restringida, sin conexión). TuPedido vuelve al campo de texto libre.
const BuscadorDireccion = ({ id, centro, radioKm, elegida, detalle, onElegir, onCambiar, onFalla }) => {
    const [texto, setTexto] = useState("");
    // null: todavía no se consultó; []: Google no encontró nada en el radio.
    const [sugerencias, setSugerencias] = useState(null);
    const [activa, setActiva] = useState(-1);
    const [abierta, setAbierta] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [aviso, setAviso] = useState("");
    const sesion = useRef(null);
    // Solo vale la respuesta de la última consulta: con la red lenta, una vieja
    // llegaba después y pisaba las sugerencias de lo que ya se había escrito.
    const ultimaConsulta = useRef(0);
    // En una ref para que el efecto no se vuelva a disparar si TuPedido la recrea.
    const fallar = useRef(onFalla);
    fallar.current = onFalla;
    const limites = useMemo(() => limitesDeBusqueda(centro, radioKm), [centro, radioKm]);

    useEffect(() => {
        const consulta = texto.trim();
        const numero = ++ultimaConsulta.current;
        if (consulta.length < MIN_LETRAS) {
            setSugerencias(null);
            setCargando(false);
            return undefined;
        }
        const espera = setTimeout(async () => {
            setCargando(true);
            try {
                if (!sesion.current) sesion.current = await nuevaSesion();
                const lista = await sugerirDirecciones(consulta, { centro, limites, radioKm, sesion: sesion.current });
                if (numero === ultimaConsulta.current) {
                    setSugerencias(lista);
                    setActiva(-1);
                }
            } catch (error) {
                if (numero === ultimaConsulta.current) fallar.current(error);
            } finally {
                if (numero === ultimaConsulta.current) setCargando(false);
            }
        }, ESPERA_MS);
        return () => clearTimeout(espera);
    }, [texto, centro, limites, radioKm]);

    const elegir = async (sugerencia) => {
        setAbierta(false);
        setCargando(true);
        // Descarta las sugerencias que todavía estén en camino.
        ultimaConsulta.current += 1;
        try {
            const datos = await datosDeDireccion(sugerencia);
            // Pedir los datos del lugar cierra la sesión: la próxima búsqueda es otra.
            sesion.current = null;
            if (!datos.tieneAltura) {
                setAviso("Falta la altura: escribí la calle con el número y elegila de la lista.");
                return;
            }
            setTexto("");
            setSugerencias(null);
            onElegir(datos);
        } catch (error) {
            fallar.current(error);
        } finally {
            setCargando(false);
        }
    };

    if (elegida) {
        return (
            <div className="gb-direccion-elegida">
                <FaMapMarkerAlt className="gb-direccion-icono" aria-hidden="true" />
                <div className="flex-grow-1">
                    <div className="fw-bold">{elegida.direccion}</div>
                    {detalle && <div className="gb-direccion-detalle">{detalle}</div>}
                </div>
                <button type="button" className="gb-link" onClick={onCambiar}>Cambiar</button>
            </div>
        );
    }

    const lista = abierta && sugerencias ? sugerencias : [];
    const sinResultados = abierta && !cargando && sugerencias?.length === 0;

    // Con la lista abierta, Enter elige y no envía el formulario.
    const teclas = (e) => {
        if (!lista.length) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiva((i) => (i + 1) % lista.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiva((i) => (i <= 0 ? lista.length - 1 : i - 1));
        } else if (e.key === "Enter") {
            e.preventDefault();
            elegir(lista[Math.max(activa, 0)]);
        } else if (e.key === "Escape") {
            setAbierta(false);
        }
    };

    return (
        <div className="gb-buscador">
            <div className="gb-campo-icono">
                <FaMapMarkerAlt aria-hidden="true" />
                <input id={id} type="text" className="form-control" placeholder="Calle y número" autoComplete="off"
                    role="combobox" aria-autocomplete="list" aria-expanded={lista.length > 0} aria-controls={`${id}-lista`}
                    aria-activedescendant={activa >= 0 && lista.length ? `${id}-opcion-${activa}` : undefined}
                    value={texto}
                    onChange={(e) => { setTexto(e.target.value); setAviso(""); setAbierta(true); }}
                    onFocus={() => setAbierta(true)}
                    onBlur={() => setAbierta(false)}
                    onKeyDown={teclas} />
            </div>
            {(lista.length > 0 || sinResultados) && (
                // onMouseDown con preventDefault: sin él, el blur del campo cerraba la
                // lista antes de que llegara el click.
                <div className="gb-sugerencias" onMouseDown={(e) => e.preventDefault()}>
                    <ul id={`${id}-lista`} role="listbox" className="list-unstyled mb-0">
                        {lista.map((s, i) => (
                            <li key={s.id} id={`${id}-opcion-${i}`} role="option" aria-selected={i === activa}
                                className={`gb-sugerencia ${i === activa ? "is-activa" : ""}`}
                                onClick={() => elegir(s)}>
                                <span className="gb-sugerencia-principal">{s.principal}</span>
                                {s.secundario && <span className="gb-sugerencia-secundario">{s.secundario}</span>}
                            </li>
                        ))}
                    </ul>
                    {sinResultados && <p className="gb-sugerencia gb-sugerencia-secundario mb-0">No encontramos esa dirección.</p>}
                    {/* La atribución que pide Google cuando sus sugerencias se muestran sin mapa. */}
                    <p className="gb-sugerencias-pie mb-0">Google Maps</p>
                </div>
            )}
            {cargando && <p className="gb-ayuda">Buscando…</p>}
            {!cargando && aviso && <p className="gb-error" role="alert">{aviso}</p>}
        </div>
    );
};

export default BuscadorDireccion;
