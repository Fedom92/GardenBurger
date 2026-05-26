import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import { Modal } from "react-bootstrap";
import moment from "moment";

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = (ts) => {
    if (!ts) return null;
    try {
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        return moment(date).format("DD/MM/YYYY HH:mm");
    } catch {
        return null;
    }
};

// ─── sub-componentes ─────────────────────────────────────────────────────────

const Paso = ({ icono, titulo, activo, campos }) => {
    const hayDatos = campos.some(c => c.valor);
    if (!hayDatos) return null;

    return (
        <div className={`d-flex gap-3 mb-3 ${activo ? "" : "opacity-50"}`}>
            {/* línea de tiempo */}
            <div className="d-flex flex-column align-items-center" style={{ minWidth: "32px" }}>
                <div
                    className={`rounded-circle d-flex align-items-center justify-content-center text-white ${
                        activo ? "bg-dark" : "bg-secondary"
                    }`}
                    style={{ width: "32px", height: "32px", fontSize: "14px", flexShrink: 0 }}
                >
                    {icono}
                </div>
                <div className="vr flex-grow-1 my-1" style={{ minHeight: "20px" }}></div>
            </div>

            {/* contenido */}
            <div className="pb-2 flex-grow-1">
                <p className="fw-bold mb-1 small text-dark">{titulo}</p>
                {campos.map((c, i) => c.valor && (
                    <div key={i} className="d-flex gap-2 small mb-1">
                        <span className="text-muted" style={{ minWidth: "140px" }}>
                            {c.label}:
                        </span>
                        <span className="fw-semibold text-dark">{c.valor}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const SeccionCarrito = ({ carrito }) => {
    if (!carrito?.length) return null;
    return (
        <div className="mt-3">
            <p className="fw-bold mb-2 small text-dark">🛒 Carrito</p>
            <div className="bg-light rounded p-3 small">
                {carrito.map((item, i) => (
                    <div
                        key={i}
                        className={`d-flex justify-content-between py-1 ${
                            i < carrito.length - 1 ? "border-bottom" : ""
                        } ${item.categoria === "EXTRA" ? "text-muted fst-italic ps-3" : "text-dark"}`}
                    >
                        <span>
                            {item.categoria === "EXTRA" && "↳ "}
                            {item.cantidad}x {item.descripcion}
                            {item.observaciones && (
                                <small className="text-muted"> — {item.observaciones}</small>
                            )}
                        </span>
                        <span className="fw-semibold">${item.subtotal}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const BadgeEstado = ({ estado }) => {
    return (
        <span className="badge bg-secondary text-uppercase py-1 px-2">
            {estado}
        </span>
    );
};

// ─── componente principal ────────────────────────────────────────────────────

const AuditoriaPedido = ({ pedidoId, isOpen, onClose }) => {
    const [pedido, setPedido] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isOpen || !pedidoId) return;
        setLoading(true);
        setError(null);
        setPedido(null);

        getDoc(doc(db, "pedidos", pedidoId))
            .then((snap) => {
                if (!snap.exists()) {
                    setError("Pedido no encontrado.");
                } else {
                    setPedido({ id: snap.id, ...snap.data() });
                }
            })
            .catch(() => setError("Error al cargar el pedido."))
            .finally(() => setLoading(false));
    }, [pedidoId, isOpen]);

    const p = pedido;

    return (
        <Modal show={isOpen} onHide={onClose} size="lg" centered scrollable>
            <Modal.Header closeButton closeVariant="white" className="bg-dark text-white border-0 py-3">
                <Modal.Title className="fs-6 fw-bold">
                    {p ? (
                        <>
                            <i className="fa fa-receipt me-2" />
                            Auditoría Pedido N° {p.codigo}
                            <span className="ms-3">
                                <BadgeEstado estado={p.estado} />
                            </span>
                        </>
                    ) : "Auditoría de pedido"}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="p-4 bg-white">
                {loading && (
                    <div className="text-center py-4">
                        <span className="loader" />
                    </div>
                )}

                {error && (
                    <div className="alert alert-danger">{error}</div>
                )}

                {p && (
                    <>
                        {/* ── Resumen del pedido ── */}
                        <div className="row g-2 mb-4 bg-light rounded p-3 small text-dark mx-0">
                            {[
                                { label: "Cliente",      valor: p.nombre },
                                { label: "Teléfono",     valor: p.telefono },
                                { label: "Total",        valor: p.total ? `$${p.total}` : null },
                                { label: "Método pago",  valor: p.metodoPago },
                                { label: "Origen",       valor: p.origen },
                                { label: "Sucursal",     valor: p.sucursal },
                                { label: "Dirección",    valor: p.direccion || null },
                                { label: "Entre calles", valor: p.entreCalles || null },
                                { label: "Zona envío",   valor: p.envio?.zona_envio || null },
                                { label: "Costo envío",  valor: p.envio?.costo_envio != null ? `$${p.envio.costo_envio}` : null },
                                { label: "Observaciones",valor: p.observaciones || null },
                                { label: "Hora especial",valor: p.hora || null },
                            ].map((f, i) => f.valor && (
                                <div key={i} className="col-6">
                                    <span className="text-muted">{f.label}: </span>
                                    <span className="fw-bold">{f.valor}</span>
                                </div>
                            ))}
                        </div>

                        {/* ── Timeline de auditoría ── */}
                        <div>
                            {/* 1. Creación del pedido */}
                            <Paso
                                icono="🌐"
                                titulo={p.origen === "WEB" ? "Pedido creado por el cliente (web)" : "Pedido creado desde caja"}
                                activo={true}
                                campos={[
                                    { label: "Fecha y hora", valor: fmt(p.timestamp) },
                                    ...(p.origen === "WEB" ? [
                                        { label: "Nombre original",    valor: p.cliente?.nombre || null },
                                        { label: "Teléfono original",  valor: p.cliente?.telefono || null },
                                        { label: "Dirección original", valor: p.cliente?.direccion || null },
                                        { label: "Entre calles orig.", valor: p.cliente?.entreCalles || null },
                                        { label: "Método pago orig.",  valor: p.cliente?.metodoPago || null },
                                        { label: "Opción orig.",       valor: p.cliente?.opcion || null },
                                        { label: "Hora Cliente",       valor: p.clienteTimestamp || null },
                                    ] : [])
                                ]}
                            />

                            {/* 1b. Mensaje WhatsApp expandible */}
                            {p.mensajeWsp && (
                                <details className="ms-5 mb-3">
                                    <summary
                                        className="small text-primary"
                                        style={{ cursor: "pointer", listStyle: "none" }}
                                    >
                                        💬 Ver mensaje WhatsApp enviado
                                    </summary>
                                    <pre className="mt-2 p-3 bg-light rounded small text-dark text-wrap border">
                                        {p.mensajeWsp}
                                    </pre>
                                </details>
                            )}

                            {/* 2. Cajero procesa el pedido (caja o aprueba solicitud web) */}
                            <Paso
                                icono="🧾"
                                titulo={p.origen === "WEB" ? "Cajero aprueba solicitud" : "Cajero genera pedido"}
                                activo={!!p.cajeroID}
                                campos={[
                                    { label: "Cajero",      valor: p.cajero },
                                    { label: "Fecha/hora",  valor: fmt(p.cajeroTimestamp) }
                                ]}
                            />

                            {/* 3. Confirmación MP (solo si aplica) */}
                            {p.metodoPago === "MP" || p.metodoPago === "%" ? (
                                <Paso
                                    icono="💳"
                                    titulo="Cajero confirma pago MP"
                                    activo={!!p.cajeroApruebaMPID}
                                    campos={[
                                        { label: "Cajero",     valor: p.cajeroApruebaMP },
                                        { label: "Fecha/hora", valor: fmt(p.cajeroApruebaMPTimestamp) },
                                    ]}
                                />
                            ) : null}

                            {/* 4. Cocina */}
                            <Paso
                                icono="🍳"
                                titulo="Pedido enviado a cocina"
                                activo={!!p.cocineroID}
                                campos={[
                                    { label: "Cocinero",    valor: p.cocinero },
                                    { label: "Fecha/hora",  valor: fmt(p.cocineroTimestamp) },
                                ]}
                            />

                            {/* 5. Delivery — asignación */}
                            <Paso
                                icono="🛵"
                                titulo="Repartidor asignado"
                                activo={!!p.deliveryID}
                                campos={[
                                    { label: "Repartidor",                valor: p.deliveryAsignado },
                                    { label: "Asignado por",              valor: p.gestorDelivery },
                                    { label: "Fecha/hora",                valor: fmt(p.gestorDeliveryTimestamp) },
                                    { label: "Subestado MotoDelivery",    valor: p.estadoDelivery }
                                ]}
                            />

                            {/* 5b. Delivery — salida */}
                            <Paso
                                icono="🟡"
                                titulo="Salida a domicilio"
                                activo={!!p.deliverySalidaTimestamp}
                                campos={[
                                    { label: "Fecha/hora",     valor: fmt(p.deliverySalidaTimestamp) },
                                ]}
                            />

                            {/* 5c. Delivery — vuelta / entregado */}
                            <Paso
                                icono="✅"
                                titulo="Entregado"
                                activo={!!p.deliveryFinTimestamp}
                                campos={[
                                    { label: "Fecha/hora",     valor: fmt(p.deliveryFinTimestamp) },
                                ]}
                            />

                            {/* 6. Cancelaciones */}
                            {(p.cajeroCancelaSolID || p.cajeroCancelaSol) && (
                                <Paso
                                    icono="🚫"
                                    titulo="Solicitud web cancelada"
                                    activo={true}
                                    campos={[
                                        { label: "Cancelado por",  valor: p.cajeroCancelaSol },
                                        { label: "Fecha/hora",     valor: fmt(p.cajeroCancelaSolTimestamp) },
                                    ]}
                                />
                            )}

                            {(p.cajeroCancelaMPID || p.cajeroCancelaMP) && (
                                <Paso
                                    icono="💳"
                                    titulo="Pedido MP cancelado"
                                    activo={true}
                                    campos={[
                                        { label: "Cancelado por",  valor: p.cajeroCancelaMP },
                                        { label: "Fecha/hora",     valor: fmt(p.cajeroCancelaMPTimestamp) },
                                    ]}
                                />
                            )}

                            {(p.cajeroEliminaID || p.cajeroElimina) && (
                                <Paso
                                    icono="🗑️"
                                    titulo="Pedido eliminado"
                                    activo={true}
                                    campos={[
                                        { label: "Eliminado por",  valor: p.cajeroElimina },
                                        { label: "Fecha/hora",     valor: fmt(p.cajeroEliminaTimestamp) },
                                    ]}
                                />
                            )}
                        </div>

                        {/* ── Carrito ── */}
                        <SeccionCarrito carrito={p.carrito} />
                    </>
                )}
            </Modal.Body>

            <Modal.Footer className="bg-light border-0 py-2 d-flex justify-content-end">
                <button className="btn btn-sm btn-dark" onClick={onClose}>
                    Cerrar
                </button>
            </Modal.Footer>
        </Modal>
    );
};

export default AuditoriaPedido;