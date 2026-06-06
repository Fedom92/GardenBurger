import React from "react";
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

// Card individual — retorna null (sin col wrapper) si no hay datos
const CardPaso = ({ icono, titulo, campos, col = "col-6" }) => {
    const hayDatos = campos.some(c => c.valor);
    if (!hayDatos) return null;
    return (
        <div className={col}>
            <div className="bg-success bg-opacity-10 border border-success border-opacity-25 rounded p-2 h-100">
                <div className="d-flex align-items-center gap-2 mb-1">
                    <span style={{ fontSize: "15px" }}>{icono}</span>
                    <span className="fw-bold small text-dark">{titulo}</span>
                </div>
                {campos.map((c, i) => c.valor && (
                    <div key={i} className="small">
                        <span className="text-muted">{c.label}: </span>
                        <span className="fw-semibold text-dark">{c.valor}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Grupo colapsable — cerrado por defecto, con chevron animado
const Grupo = ({ label, children }) => (
    <details className="mb-3">
        <summary
            className="d-flex align-items-center gap-2 mb-2 py-1"
            style={{ cursor: "pointer", listStyle: "none" }}
        >
            <span className="small fw-semibold text-uppercase text-muted" style={{ letterSpacing: "0.07em", whiteSpace: "nowrap" }}>
                {label}
            </span>
            <div className="flex-grow-1" style={{ height: "1px", backgroundColor: "#dee2e6" }} />
            <i className="fa fa-chevron-down grupo-chevron text-muted" style={{ fontSize: "11px" }} />
        </summary>
        <div className="row g-2 mt-1">
            {children}
        </div>
    </details>
);

// ─── componente principal ────────────────────────────────────────────────────

const AuditoriaPedido = ({ pedido: p, isOpen, onClose }) => {
    if (!p) return null;

    const tieneMP = p.metodoPago === "MP" || p.metodoPago === "%";
    const tieneCocinaFin = !!p.cocinaFinTimestamp;
    const tieneCancelaciones = !!(p.cajeroCancelaSolID || p.cajeroCancelaMPID || p.cajeroEliminaID);
    const iconoCreacion = p.origen === "WEB" ? "🌐" : "🖥️";

    return (
        <Modal show={isOpen} onHide={onClose} size="lg" centered scrollable>
            <Modal.Header closeButton closeVariant="white" className="bg-dark text-white border-0 py-3">
                <Modal.Title className="fs-6 fw-bold d-flex align-items-center w-100">
                    <span>
                        <i className="fa fa-receipt me-2" />
                        Auditoría Pedido N° {p.codigo}
                    </span>
                    <span className="ms-auto me-3">
                        <span className="badge bg-secondary text-uppercase fs-6 py-2 px-3">
                            {p.estado}
                        </span>
                    </span>
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="p-4 bg-white">
                {/* ── Resumen del pedido ── */}
                <div className="row g-2 mb-4 bg-light rounded p-3 small text-dark mx-0">
                    {[
                        { label: "Cliente",      valor: p.nombre || null },
                        { label: "Teléfono",     valor: p.telefono || null },
                        { label: "Método pago",  valor: p.metodoPago || null },
                        { label: "Total",        valor: p.total != null ? `$${p.total}` : null },
                        { label: "Origen",       valor: [p.sucursal, p.origen].filter(Boolean).join(" - ") || null },
                        { label: "Dirección",    valor: [p.direccion, p.entreCalles].filter(Boolean).join(", ") || null },
                        { label: "Envío",        valor: p.envio?.zona_envio ? `${p.envio.zona_envio} | $${p.envio.costo_envio}` : null },
                        { label: "Hora especial",valor: p.hora || null },
                    ].map((f, i) => f.valor && (
                        <div key={i} className="col-6">
                            <span className="text-muted">{f.label}: </span>
                            <span className="fw-bold">{f.valor}</span>
                        </div>
                    ))}
                    {p.observaciones && (
                        <div className="col-12">
                            <span className="text-muted">Observaciones: </span>
                            <span className="fw-bold">{p.observaciones}</span>
                        </div>
                    )}
                </div>

                {/* ── Creación + Caja — misma fila ── */}
                <div className="row g-3 mb-1">
                    <div className={p.cajeroID ? "col-6" : "col-12"}>
                        <Grupo label="Creación">
                            <CardPaso
                                col="col-12"
                                icono={iconoCreacion}
                                titulo={p.origen === "WEB" ? "Pedido creado por el cliente (web)" : "Pedido creado desde caja"}
                                campos={[
                                    { label: "Fecha y hora",        valor: fmt(p.timestamp) },
                                    { label: "Nombre original",     valor: p.cliente?.nombre || null },
                                    { label: "Teléfono original",   valor: p.cliente?.telefono || null },
                                    { label: "Dirección original",  valor: p.cliente?.direccion || null },
                                    { label: "Entre calles orig.",  valor: p.cliente?.entreCalles || null },
                                    { label: "Método pago orig.",   valor: p.cliente?.metodoPago || null },
                                    { label: "Opción orig.",        valor: p.cliente?.opcion || null },
                                ]}
                            />
                            {p.mensajeWsp && (
                                <div className="col-12">
                                    <details>
                                        <summary className="small text-primary" style={{ cursor: "pointer", listStyle: "none" }}>
                                            💬 Ver mensaje WhatsApp enviado
                                        </summary>
                                        <pre className="mt-2 p-3 bg-light rounded small text-dark text-wrap border">
                                            {p.mensajeWsp}
                                        </pre>
                                    </details>
                                </div>
                            )}
                        </Grupo>
                    </div>

                    {p.cajeroID && (
                        <div className="col-6">
                            <Grupo label="Caja">
                                <CardPaso
                                    col="col-12"
                                    icono="🧾"
                                    titulo={p.origen === "WEB" ? "Cajero aprueba solicitud" : "Cajero genera pedido"}
                                    campos={[
                                        { label: "Cajero",     valor: p.cajero },
                                        { label: "Fecha/hora", valor: fmt(p.cajeroTimestamp) },
                                    ]}
                                />
                                {tieneMP && (
                                    <CardPaso
                                        col="col-12"
                                        icono="💳"
                                        titulo="Cajero confirma pago MP"
                                        campos={[
                                            { label: "Cajero",     valor: p.cajeroApruebaMP },
                                            { label: "Fecha/hora", valor: fmt(p.cajeroApruebaMPTimestamp) },
                                        ]}
                                    />
                                )}
                            </Grupo>
                        </div>
                    )}
                </div>

                {/* ── Grupo: Cocina ── */}
                {p.cocineroID && (
                    <Grupo label="Cocina">
                        <CardPaso
                            col={tieneCocinaFin ? "col-6" : "col-12"}
                            icono="👨‍🍳"
                            titulo="Cocinero recibe el pedido"
                            campos={[
                                { label: "Cocinero",   valor: p.cocinero },
                                { label: "Fecha/hora", valor: fmt(p.cocineroTimestamp) },
                            ]}
                        />
                        {tieneCocinaFin && (
                            <CardPaso
                                col="col-6"
                                icono="🍳"
                                titulo="Pedido listo / Sale de cocina"
                                campos={[
                                    { label: "Fecha/hora", valor: fmt(p.cocinaFinTimestamp) },
                                ]}
                            />
                        )}
                    </Grupo>
                )}

                {/* ── Grupo: Mostrador (ATP) ── */}
                {p.atpTimestamp && (
                    <Grupo label="Mostrador">
                        <CardPaso
                            col="col-12"
                            icono="🪟"
                            titulo="Entregado en mostrador"
                            campos={[
                                { label: "Atendido por", valor: p.atpCompletadoPor },
                                { label: "Fecha/hora",   valor: fmt(p.atpTimestamp) },
                            ]}
                        />
                    </Grupo>
                )}

                {/* ── Grupo: Delivery ── */}
                {p.deliveryID && (
                    <Grupo label="Delivery">
                        <CardPaso
                            col="col-12"
                            icono="🛵"
                            titulo="Delivery asignado"
                            campos={[
                                { label: "Repartidor",   valor: p.deliveryAsignado },
                                { label: "Asignado por", valor: p.gestorDelivery },
                                { label: "Fecha/hora",   valor: fmt(p.gestorDeliveryTimestamp) },
                            ]}
                        />
                        <CardPaso
                            col="col-6"
                            icono="⚠️"
                            titulo="Salida a domicilio"
                            campos={[
                                { label: "Fecha/hora", valor: fmt(p.deliverySalidaTimestamp) },
                            ]}
                        />
                        <CardPaso
                            col="col-6"
                            icono="✅"
                            titulo="Entrega a domicilio"
                            campos={[
                                { label: "Fecha/hora",   valor: fmt(p.deliveryFinTimestamp) },
                                { label: "Cliente pagó", valor: p.pagoRepartidorCon ? `$${p.pagoRepartidorCon}` : null },
                            ]}
                        />
                    </Grupo>
                )}

                {/* ── Grupo: Carrito ── */}
                {p.carrito?.length > 0 && (
                    <Grupo label={`Carrito — ${p.carrito.length} items`}>
                        <div className="col-12">
                            <div className="bg-light rounded p-3 small">
                                {p.carrito.map((item, i) => (
                                    <div
                                        key={i}
                                        className={`d-flex justify-content-between py-1 ${i < p.carrito.length - 1 ? "border-bottom" : ""} ${item.categoria === "EXTRA" ? "text-muted fst-italic ps-3" : "text-dark"}`}
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
                    </Grupo>
                )}

                {/* ── Grupo: Cancelaciones ── */}
                {tieneCancelaciones && (
                    <Grupo label="Cancelaciones">
                        <CardPaso
                            icono="🚫"
                            titulo="Solicitud web cancelada"
                            campos={[
                                { label: "Cancelado por", valor: p.cajeroCancelaSol },
                                { label: "Fecha/hora",    valor: fmt(p.cajeroCancelaSolTimestamp) },
                            ]}
                        />
                        <CardPaso
                            icono="💳"
                            titulo="Pedido MP cancelado"
                            campos={[
                                { label: "Cancelado por", valor: p.cajeroCancelaMP },
                                { label: "Fecha/hora",    valor: fmt(p.cajeroCancelaMPTimestamp) },
                            ]}
                        />
                        <CardPaso
                            icono="🗑️"
                            titulo="Pedido eliminado"
                            campos={[
                                { label: "Eliminado por", valor: p.cajeroElimina },
                                { label: "Fecha/hora",    valor: fmt(p.cajeroEliminaTimestamp) },
                            ]}
                        />
                    </Grupo>
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
