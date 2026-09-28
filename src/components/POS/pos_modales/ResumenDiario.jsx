import React from "react";
import { Modal } from "react-bootstrap";
import { toast } from "react-toastify";

import { fmtPesos, fmtPesosRedondeado } from "../../../Utils/formato";

// La base de una noche de trabajo: la misma cuenta que la Liquidación de
// Asistencias para un día. Ausente o sin horas —todavía sin salida cargada— no hay
// base: null, y la tabla lo avisa.
const baseDe = (registro) => {
    if (!registro || registro.ausente) return null;
    const horas = Number(registro.horas) || 0;
    if (!horas) return null;
    return horas * (Number(registro.valorHora) || 0) - (Number(registro.descuento) || 0);
};

// Muestra el arqueo de la jornada en curso. Los datos los trae la Caja al abrir, con
// obtenerArqueo(): los calcula desde los pedidos, no los lee de un contador. No hace
// falta que se actualice solo, porque el arqueo se mira al cierre.
//
// Es también lo que el encargado necesita para cerrar la noche:
// - lo que se le paga a cada repartidor: la base de su asistencia (`registros`, el
//   documento de asistencias de la noche) más sus envíos;
// - los viajes que volvieron sin entregar y siguen sin anular;
// - los vueltos que los admins tienen que transferir, con un botón para copiarlos.
const ResumenDiario = ({ isOpen, onClose, resumen, registros, vueltos = [], sinEntregar = [], fecha, isLoading }) => {
    const totalEfectivo = resumen?.totalEfectivo || 0;
    const efectivoLocal = resumen?.efectivoLocal || 0;
    const efectivoEnvio = resumen?.efectivoEnvio || 0;
    const mp = resumen?.mp || 0;

    const deliverys = Object.entries(resumen?.deliverys || {})
        .map(([id, d]) => {
            const base = registros ? baseDe(registros[id]) : null;
            return { id, ...d, base, total: (base || 0) + (Number(d.totalEnvios) || 0) };
        })
        .sort((a, b) => a.nombre.localeCompare(b.nombre));

    const totalVueltos = vueltos.reduce((t, v) => t + v.monto, 0);

    // Texto plano para pegar en el WhatsApp del admin.
    const copiarVueltos = async () => {
        const lineas = vueltos.map((v) =>
            `${v.codigo} · ${v.nombre} · ${fmtPesos(v.monto)}${v.estimado ? " (estimado)" : ""} · ${v.alias ? `alias: ${v.alias}` : "sin alias"}`);
        const texto = [`Vueltos a transferir — ${fecha}`, ...lineas, `Total: ${fmtPesos(totalVueltos)}`].join("\n");
        try {
            await navigator.clipboard.writeText(texto);
            toast.success("Lista de vueltos copiada");
        } catch (error) {
            console.error("No se pudo copiar la lista de vueltos:", error);
            toast.error("No se pudo copiar. Seleccioná la lista y copiala a mano.");
        }
    };

    return (
        <Modal show={isOpen} onHide={onClose} size="lg" scrollable centered>
            <Modal.Header closeButton>
                <Modal.Title className="fs-4 fw-bold text-dark">
                    Resumen del día <small className="text-body-secondary fs-6 fw-normal">{fecha}</small>
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="p-4">
                {isLoading ? (
                    <div className="text-center py-5">
                        <span className="loader"></span>
                        <p className="mt-3">Cargando resumen...</p>
                    </div>
                ) : !resumen ? null : (
                    <>
                        <div className="row g-3">
                            <div className="col-md-6">
                                <div className="card border-success h-100">
                                    <div className="card-header bg-success bg-opacity-10 fw-bold">
                                        <i className="fa fa-money-bill-wave me-1"></i> Efectivo
                                    </div>
                                    <div className="card-body">
                                        <p className="fs-3 fw-bolder mb-3">{fmtPesos(totalEfectivo)}</p>
                                        <div className="d-flex justify-content-between border-top pt-2">
                                            <span>Retira / Espera Afuera</span>
                                            <strong>{fmtPesos(efectivoLocal)}</strong>
                                        </div>
                                        <div className="d-flex justify-content-between border-top pt-2 mt-2">
                                            <span>Envíos</span>
                                            <strong>{fmtPesos(efectivoEnvio)}</strong>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-md-6">
                                <div className="card border-primary h-100">
                                    <div className="card-header bg-primary bg-opacity-10 fw-bold">
                                        <i className="fa fa-credit-card me-1"></i> Mercado Pago
                                    </div>
                                    <div className="card-body">
                                        <p className="fs-3 fw-bolder mb-3">{fmtPesos(mp)}</p>
                                        <div className="d-flex justify-content-between border-top pt-2">
                                            <span className="fw-bold">Total del día</span>
                                            <strong className="fw-bolder">{fmtPesos(totalEfectivo + mp)}</strong>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-6">
                                <div className="card border-dark text-center">
                                    <div className="card-body py-3">
                                        <p className="fs-2 fw-bolder mb-0">{resumen.totalPedidos || 0}</p>
                                        <span className="text-body-secondary text-uppercase small fw-bold">Pedidos</span>
                                    </div>
                                </div>
                            </div>

                            <div className="col-6">
                                <div className="card border-dark text-center">
                                    <div className="card-body py-3">
                                        <p className="fs-2 fw-bolder mb-0">{resumen.totalCombos || 0}</p>
                                        <span className="text-body-secondary text-uppercase small fw-bold">Combos</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {sinEntregar.length > 0 && (
                            <div className="alert alert-danger mt-4 mb-0" role="alert">
                                <i className="fa-solid fa-rotate-left me-1"></i>
                                <strong>{sinEntregar.length}</strong> {sinEntregar.length === 1 ? "pedido volvió" : "pedidos volvieron"} sin
                                entregar y {sinEntregar.length === 1 ? "sigue" : "siguen"} sin anular
                                ({sinEntregar.map((p) => p.codigo).join(", ")}). Mientras tanto suman al arqueo como
                                cobrados: anulalos desde F3.
                            </div>
                        )}

                        {deliverys.length > 0 && (
                            <div className="mt-4">
                                <h6 className="fw-bold border-bottom pb-2">Deliverys</h6>
                                {registros === null && (
                                    <small className="d-block text-danger mb-1">
                                        No se pudo leer la asistencia de la noche: el total muestra solo los envíos.
                                    </small>
                                )}
                                <table className="table table-sm mb-0">
                                    <thead>
                                        <tr>
                                            <th>Repartidor</th>
                                            <th className="text-center">Viajes</th>
                                            <th className="text-end">Envíos</th>
                                            <th className="text-end" title="Horas × valor hora − descuentos, de la asistencia de la noche">Base</th>
                                            <th className="text-end">A pagar</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Los envíos son la misma cuenta que ve la jefa de deliverys
                                            en sus Métricas. */}
                                        {deliverys.map((d) => (
                                            <tr key={d.id}>
                                                <td>{d.nombre}</td>
                                                <td className="text-center">{d.cantidadPedidos || 0}</td>
                                                <td className="text-end">{fmtPesos(d.totalEnvios)}</td>
                                                <td className="text-end">
                                                    {d.base !== null
                                                        ? fmtPesosRedondeado(d.base)
                                                        : <span className="text-danger small">{registros === null ? "—" : "falta la asistencia"}</span>}
                                                </td>
                                                <td className="text-end fw-bold">{fmtPesosRedondeado(d.total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {vueltos.length > 0 && (
                            <div className="mt-4">
                                <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2">
                                    <h6 className="fw-bold mb-0">Vueltos a transferir · {fmtPesos(totalVueltos)}</h6>
                                    <button type="button" className="btn btn-sm btn-outline-dark" onClick={copiarVueltos}>
                                        <i className="fa-regular fa-copy me-1"></i> Copiar
                                    </button>
                                </div>
                                <table className="table table-sm mb-0">
                                    <thead>
                                        <tr>
                                            <th>Ticket</th>
                                            <th>Cliente</th>
                                            <th className="text-end">Vuelto</th>
                                            <th>Alias</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {vueltos.map((v) => (
                                            <tr key={v.id}>
                                                <td>{v.codigo}</td>
                                                <td>{v.nombre}</td>
                                                <td className="text-end">
                                                    {fmtPesos(v.monto)}
                                                    {/* El repartidor todavía no volvió: es lo que anunció el cliente. */}
                                                    {v.estimado && <small className="d-block text-body-secondary">estimado</small>}
                                                </td>
                                                <td>{v.alias || <span className="text-body-secondary">sin alias</span>}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </Modal.Body>

            <Modal.Footer>
                <button type="button" className="btn btn-secondary" onClick={onClose}>Cerrar</button>
            </Modal.Footer>
        </Modal>
    );
};

export default ResumenDiario;
