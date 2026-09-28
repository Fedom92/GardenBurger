import React, { useState } from "react";
import { Modal } from "react-bootstrap";
import { toast } from "react-toastify";
import { SUBESTADOS_MOTODELIVERY, METODOS_PAGO, DESTINO_VUELTO, etiquetaPago } from "../../../Utils/Constantes";
import { repartirPago } from "../../POS/pos_hooks/useResumenDiario";
import { fmtPesos } from "../../../Utils/formato";

// Lo que ve el jefe es lo que el repartidor tiene que COBRAR en la puerta, no el
// total del pedido:
// - EFECTIVO: el total, con lo que el cliente dijo que paga. La moto no lleva
//   cambio: la diferencia la trae el repartidor (los admins le transfieren el
//   vuelto al cliente) o se la queda de propina, según eligió el cajero.
// - Pago dividido: solo la parte en efectivo, que es también su pagaCon. El resto
//   ya entró por MP.
// - MP: nada. No se muestran ni el total ni pagaCon: no hay plata que manejar.
const ModalPedidoDelivery = ({ isOpen, pedido, deliverys, onClose, onAsignarDelivery, onMarcarEstado, onVolvioSinEntregar, procesando = false }) => {
    // Se carga a mano y sin precargar: con pagaCon ya escrito, confirmar sin mirar
    // es un error humano que no se ve. Por ahora el monto es libre.
    const [pagaronConInput, setPagaronConInput] = useState(pedido?.pagaronCon || "");

    if (!pedido) return null;

    const p = pedido;
    const estadoDelivery = p.estadoDelivery || "";
    const salio = estadoDelivery === SUBESTADOS_MOTODELIVERY.SALIDA;
    // Volvió sin entregar: el viaje ya se cerró y el pedido espera que el encargado
    // lo anule. No se puede volver a asignar ni a despachar.
    const cerrado = estadoDelivery === SUBESTADOS_MOTODELIVERY.FIN;
    const tieneAsignado = Boolean(p.deliveryAsignado);
    // El selector va por `deliveryID`, que es lo que guarda el pedido. Por nombre,
    // corregir el nombre de un repartidor dejaba sus pedidos como "Sin asignar".

    const esMP = p.metodoPago === METODOS_PAGO.MP.key;
    const esDividido = p.metodoPago === METODOS_PAGO.DIVIDIDO.key;
    const aCobrar = repartirPago(p).efectivo;
    const pagaCon = Number(p.pagaCon) || 0;
    // Lo que el cliente paga de más. En el pago dividido pagaCon es justo la parte
    // en efectivo, así que no hay diferencia.
    const diferencia = pagaCon > aCobrar ? pagaCon - aCobrar : 0;
    const textoDiferencia = p.destinoVuelto === DESTINO_VUELTO.VUELTO.key
        ? <>Vuelto: <strong>{fmtPesos(diferencia)}</strong> (lo trae el repartidor)</>
        : p.destinoVuelto === DESTINO_VUELTO.PROPINA.key
            ? <>Propina: <strong>{fmtPesos(diferencia)}</strong> (se la queda el repartidor)</>
            : <>Diferencia: <strong>{fmtPesos(diferencia)}</strong></>;

    const confirmarEntrega = () => {
        // Tiene que estar cargado —si no, la entrega se cerraba sin registrar con
        // cuánto pagó el cliente—, pero el monto no se compara con nada.
        if (!esMP && (!pagaronConInput || isNaN(Number(pagaronConInput)))) {
            toast.error("Ingresá con cuánto pagó el cliente antes de confirmar.");
            return;
        }
        onMarcarEstado(p.id, SUBESTADOS_MOTODELIVERY.FIN, esMP ? "" : pagaronConInput);
    };

    const waClienteHref = p.telefono
        ? `https://api.whatsapp.com/send?phone=549${p.telefono}&text=${encodeURIComponent(`Tu pedido está en camino! 🛵`)}`
        : null;

    return (
        <Modal show={isOpen} onHide={onClose} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title>Pedido #{p.codigo} — {p.nombre}</Modal.Title>
            </Modal.Header>
            <Modal.Body>

                {/* Info del pedido */}
                <div className="row mb-3">
                    <div className="col-md-6">
                        <p className="mb-1">
                            <strong>Teléfono:</strong> {p.telefono || "—"}
                            {waClienteHref && (
                                <a
                                    href={waClienteHref}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-success btn-sm ms-2 py-0 px-1"
                                    title="WhatsApp Cliente"
                                >
                                    <i className="fa-brands fa-whatsapp"></i>
                                </a>
                            )}
                        </p>
                        <p className="mb-1">
                            <strong>Dirección:</strong> {p.direccion || "—"}
                        </p>
                        {p.entreCalles && (
                            <p className="mb-1"><strong>Entre calles:</strong> {p.entreCalles}</p>
                        )}
                        {p.observaciones && (
                            <p className="mb-1">
                                <strong>Observaciones:</strong>{" "}
                                <span className="text-warning fw-semibold">{p.observaciones}</span>
                            </p>
                        )}
                        <p className="mb-1"><strong>Zona:</strong> {p.envio?.zona_envio}</p>
                        <p className="mb-1"><strong>Costo envío:</strong> {fmtPesos(p.envio?.costo_envio)}</p>
                    </div>

                    {/* Cobro: lo único que le importa al repartidor en la puerta */}
                    <div className="col-md-6">
                        <p className="mb-1">
                            <strong>Método de pago:</strong> {etiquetaPago(p.metodoPago)}
                        </p>
                        {esMP ? (
                            <div className="border rounded p-2">
                                <i className="fa-solid fa-circle-check me-1"></i>
                                Pagado por Mercado Pago. <strong>No se cobra nada.</strong>
                            </div>
                        ) : (
                            <div className="border border-dark rounded p-2">
                                <div className="fs-5">
                                    Cobrar en efectivo: <strong>{fmtPesos(aCobrar)}</strong>
                                </div>
                                {esDividido && (
                                    <small className="d-block">Pago dividido: solo la parte en efectivo.</small>
                                )}
                                {pagaCon > 0 && (
                                    <div className="mt-1">
                                        Paga con: <strong>{fmtPesos(pagaCon)}</strong>
                                        {diferencia > 0 && <> · {textoDiferencia}</>}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <hr />

                {/* Gestión */}
                {cerrado ? (
                    <div className="alert alert-danger mb-0" role="alert">
                        <i className="fa-solid fa-rotate-left me-1"></i>
                        Volvió sin entregar. El envío ya cuenta para <strong>{p.deliveryAsignado}</strong>;
                        falta que el encargado anule el pedido desde F3.
                    </div>
                ) : (
                <div className="row">
                    <div className="col-md-6 mb-2">
                        <div className="d-flex align-items-center gap-2 mb-1">
                            <label className="form-label fw-semibold mb-0">Asignar repartidor</label>
                        </div>
                        <select
                            className="form-select"
                            value={p.deliveryID || ""}
                            onChange={(e) => onAsignarDelivery(p.id, e.target.value)}
                            disabled={procesando}
                        >
                            <option value="">Sin asignar</option>
                            {deliverys.map(d => (
                                <option key={d.id} value={d.id}>{d.nombreCompleto}</option>
                            ))}
                        </select>
                    </div>

                    {/* Al volver el repartidor: con cuánto pagó al final el cliente */}
                    {salio && !esMP && (
                        <div className="col-md-6 mb-2">
                            <label className="form-label fw-semibold">Pagaron con $</label>
                            <input
                                type="number"
                                className="form-control"
                                placeholder="Con cuánto pagó el cliente"
                                min={0}
                                value={pagaronConInput}
                                onChange={(e) => setPagaronConInput(e.target.value)}
                            />
                            {esDividido && (
                                <small className="text-muted">Solo la parte en efectivo: {fmtPesos(aCobrar)}.</small>
                            )}
                        </div>
                    )}
                </div>
                )}

            </Modal.Body>
            <Modal.Footer>
                {tieneAsignado && !salio && !cerrado && (
                    <button
                        className="btn btn-warning"
                        onClick={() => onMarcarEstado(p.id, SUBESTADOS_MOTODELIVERY.SALIDA, "")}
                        disabled={procesando}
                    >
                        <i className="fa-solid fa-motorcycle"></i> Marcar Salida
                    </button>
                )}
                {/* Sin cobro no hay "Pagaron con": este camino cierra el viaje igual,
                    porque se hizo y el envío se paga. */}
                {salio && (
                    <button
                        className="btn btn-outline-danger me-auto"
                        onClick={() => onVolvioSinEntregar(p.id)}
                        disabled={procesando}
                    >
                        <i className="fa-solid fa-rotate-left"></i> Volvió sin entregar
                    </button>
                )}
                {salio && (
                    <button
                        className="btn btn-success"
                        onClick={confirmarEntrega}
                        disabled={procesando}
                    >
                        <i className="fa-solid fa-check"></i> Confirmar Entrega
                    </button>
                )}
                <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
            </Modal.Footer>
        </Modal>
    );
};

export default ModalPedidoDelivery;
