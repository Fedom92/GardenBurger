import React, { useState, useEffect } from "react";
import { collection, query, orderBy, getDocs, getDoc, where, serverTimestamp, Timestamp, deleteField } from "firebase/firestore";
import { db, docDeSucursal } from "../../firebaseConfig/firebase";
import { useAuth } from "../../context/AuthContext";
import { fetchSucursales } from "../../Utils/sucursales";
import "../../style/Main.css"
import TablaGenerica from "../../Utils/TablaGenerica";
import { getRangoJornada, ahoraServidor } from "../../Utils/fechaComercial";
import AuditoriaPedido from "./AuditoriaPedido";
import moment from "moment";
import Swal from "sweetalert2";
import { fmtPesos, fmtFechaHora, aInputFecha } from "../../Utils/formato";
import { avisarErrorDeCarga, sinConexion } from "../../Utils/avisos";
import { useAccionUnica } from "../../Utils/useAccionUnica";
import { actualizarPedidoYResumen, enLaCalle } from "../POS/pos_hooks/useResumenDiario";
import { HORARIO, ESTADOS, etiquetaPago } from "../../Utils/Constantes";


const computeRango = (startStr, endStr) => {
  const { horaAbre, horaCierre } = HORARIO;
  const inicio = moment(startStr).set({ hour: horaAbre, minute: 0, second: 0, millisecond: 0 }).toDate();
  const fin = moment(endStr).add(1, "day").set({ hour: horaCierre, minute: 0, second: 0, millisecond: 0 }).toDate();
  return { inicio, fin };
};

const HistorialPedidos = () => {
  const { userData } = useAuth();
  const esAdmin = userData?.rol === process.env.REACT_APP_admin;

  const [{ inicio: inicioJornada, fin: finJornada }] = useState(getRangoJornada);
  const [pedidos, setPedidos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [auditoriaPedido, setAuditoriaPedido] = useState(null);

  // Solo el admin entra (RequireAdmin en App.js): por eso el rango no tiene tope
  // de días. Elige la sucursal.
  const [sucursales, setSucursales] = useState([]);
  const [sucursalSel, setSucursalSel] = useState("");
  const sucursalActiva = esAdmin ? sucursalSel : userData?.sucursal;

  const [fechaInicioStr, setFechaInicioStr] = useState(aInputFecha(inicioJornada));
  const [fechaFinStr, setFechaFinStr] = useState(aInputFecha(moment(finJornada).subtract(4, "hours")));
  const [queryRange, setQueryRange] = useState({ inicio: inicioJornada, fin: finJornada });

  const handleBuscar = () => setQueryRange(computeRango(fechaInicioStr, fechaFinStr));

  useEffect(() => {
    if (!esAdmin) return;
    fetchSucursales()
      .then((lista) => {
        setSucursales(lista);
        setSucursalSel((prev) => prev || lista[0]?.id || "");
      })
      .catch((error) => {
        console.error(error);
        avisarErrorDeCarga("las sucursales");
      });
  }, [esAdmin]);

  useEffect(() => {
    if (!sucursalActiva) return;
    // Al cambiar de sucursal o de fechas, la búsqueda anterior puede seguir en
    // vuelo: si llega después, pisaba la lista y se veían los pedidos de Luro con
    // Davinci elegida. Solo cuenta la respuesta de la búsqueda vigente.
    let vigente = true;
    setIsLoading(true);
    // Sin filtro de estado: el historial también es la herramienta para auditar
    // cancelados y eliminados —quién los tocó y cuándo, con el botón de auditoría
    // de cada fila—. El filtro "Estado" de la tabla, que antes era decorativo
    // porque todas las filas eran ENTREGADO, ahora sirve para separarlos.
    // Sacar la igualdad además elimina la necesidad del índice compuesto
    // (estado + timestamp): queda un rango sobre timestamp con su orderBy.
    const q = query(
      collection(db, "sucursales", sucursalActiva, "pedidos"),
      where("timestamp", ">=", queryRange.inicio),
      where("timestamp", "<=", queryRange.fin),
      orderBy("timestamp", "desc")
    );
    getDocs(q)
      .then(snap => { if (vigente) setPedidos(snap.docs.map(d => ({ id: d.id, ...d.data() }))); })
      .catch(err => {
        if (!vigente) return;
        console.error("Error HistorialPedidos:", err);
        avisarErrorDeCarga("los pedidos");
      })
      .finally(() => { if (vigente) setIsLoading(false); });
    return () => { vigente = false; };
  }, [queryRange, sucursalActiva]);

  // Eliminar desde el Historial: solo el admin (la pantalla entera es suya), de
  // cualquier fecha. Es un borrado lógico —el pedido queda en ELIMINADO, con quién y
  // cuándo—, igual que F3, y con la misma regla: no con el repartidor en la calle.
  // Si la noche ya cerró, se borra su resumen guardado en la misma escritura, así
  // Métricas y Estadísticas la recalculan.
  const { procesando: eliminando, ejecutar } = useAccionUnica();
  const eliminarPedido = async (pedido) => {
    const { isConfirmed } = await Swal.fire({
      title: '¿Eliminar el pedido?',
      text: `El pedido ${pedido.codigo} queda como ELIMINADO: sale de las estadísticas`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });
    if (!isConfirmed || sinConexion()) return;

    await ejecutar(async () => {
      try {
        const ref = docDeSucursal(sucursalActiva, "pedidos", pedido.id);
        // La lista es de cuando se buscó: el pedido pudo cambiar después. Se relee
        // (1 lectura, solo al eliminar).
        const actual = (await getDoc(ref)).data() || {};
        if ([ESTADOS.ELIMINADO, ESTADOS.CANCELADO].includes(actual.estado)) {
          setPedidos((prev) => prev.map((p) => (p.id === pedido.id ? { id: p.id, ...actual } : p)));
          Swal.fire({ title: 'Ya estaba anulado', text: `El pedido ya figura como ${actual.estado}.`, icon: 'info', confirmButtonColor: '#0d6efd' });
          return;
        }
        if (enLaCalle(actual)) {
          Swal.fire({ title: 'El repartidor está en la calle', text: 'La jefa de deliverys tiene que marcar que volvió antes de eliminar el pedido.', icon: 'warning', confirmButtonColor: '#ffc107' });
          return;
        }

        // `estadoAnterior` es lo que permite "Restaurar pedido". Solo lo guarda el
        // Historial: un pedido anulado desde F3 se rehace en la Caja.
        await actualizarPedidoYResumen(ref, pedido, {
          estado: ESTADOS.ELIMINADO,
          estadoAnterior: actual.estado,
          cajeroEliminaID: userData.id,
          cajeroElimina: userData.nombreCompleto,
          cajeroEliminaTimestamp: serverTimestamp(),
        }, sucursalActiva);

        // La fila se actualiza en el lugar, sin volver a buscar. La hora es la del
        // servidor estimada: la exacta la tiene Firestore, y se ve al buscar de nuevo.
        setPedidos((prev) => prev.map((p) => (p.id === pedido.id ? {
          ...p,
          estado: ESTADOS.ELIMINADO,
          estadoAnterior: actual.estado,
          cajeroEliminaID: userData.id,
          cajeroElimina: userData.nombreCompleto,
          cajeroEliminaTimestamp: Timestamp.fromDate(ahoraServidor().toDate()),
        } : p)));
      } catch (error) {
        console.error("Error eliminando el pedido desde el Historial:", error);
        Swal.fire({ title: 'Error', text: 'No se pudo eliminar el pedido. Revisá la conexión e intentá de nuevo.', icon: 'error', confirmButtonColor: '#dc3545' });
      }
    });
  };

  // Restaurar: vuelve un pedido que eliminó el admin al estado que tenía. Solo el
  // admin puede sacar un pedido de ELIMINADO (regla saleDeAnuladoSoloAdmin) y solo
  // los eliminados desde acá guardan `estadoAnterior`. Vuelve a contar en su noche,
  // así que se borra el resumen de esa noche para que se recalcule.
  const restaurarPedido = async (pedido) => {
    const { isConfirmed } = await Swal.fire({
      title: '¿Restaurar el pedido?',
      text: `El pedido ${pedido.codigo} vuelve a ${pedido.estadoAnterior} y vuelve a contar en las estadísticas.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#198754',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, restaurar',
      cancelButtonText: 'Cancelar',
    });
    if (!isConfirmed || sinConexion()) return;

    await ejecutar(async () => {
      try {
        await actualizarPedidoYResumen(docDeSucursal(sucursalActiva, "pedidos", pedido.id), pedido, {
          estado: pedido.estadoAnterior,
          estadoAnterior: deleteField(),
          restauradoPorID: userData.id,
          restauradoPor: userData.nombreCompleto,
          restauradoTimestamp: serverTimestamp(),
        }, sucursalActiva);

        setPedidos((prev) => prev.map((p) => {
          if (p.id !== pedido.id) return p;
          const { estadoAnterior, ...resto } = p;
          return {
            ...resto,
            estado: estadoAnterior,
            restauradoPorID: userData.id,
            restauradoPor: userData.nombreCompleto,
            restauradoTimestamp: Timestamp.fromDate(ahoraServidor().toDate()),
          };
        }));
      } catch (error) {
        console.error("Error restaurando el pedido desde el Historial:", error);
        Swal.fire({ title: 'Error', text: 'No se pudo restaurar el pedido. Revisá la conexión e intentá de nuevo.', icon: 'error', confirmButtonColor: '#dc3545' });
      }
    });
  };

  const columnasPedidos = [
    {
      accessorKey: "timestamp",
      header: "Hora",
      cell: ({ getValue }) => {
        const ts = getValue();
        return fmtFechaHora(ts);
      },
    },
    { columnasBasicas: ["codigo"] },
    // El total con fmtPesos y el método legible: "%" se guarda, pero en pantalla es
    // "Dividido".
    { accessorKey: "total", header: "Total", cell: ({ getValue }) => fmtPesos(getValue()) },
    { accessorKey: "metodoPago", header: "Pago", cell: ({ getValue }) => etiquetaPago(getValue()) },
    { columnasBasicas: ["nombre", "direccion", "telefono"] },
    {
      accessorKey: "envio",
      header: "Envío",
      cell: ({ getValue }) => {
        const envio = getValue();
        return envio ? fmtPesos(envio.costo_envio) : "—";
      },
    },
    {
      accessorKey: "estado",
      header: "Estado",
      // Entregado en verde, eliminado en rojo y cancelado en naranja; lo que sigue
      // en curso, en gris. Bootstrap no tiene bg naranja: va su $orange inline.
      cell: ({ getValue }) => {
        const estado = getValue();
        if (estado === ESTADOS.CANCELADO) {
          return <span className="badge" style={{ backgroundColor: "#fd7e14" }}>{estado}</span>;
        }
        const color = estado === ESTADOS.FINAL ? "bg-success"
          : estado === ESTADOS.ELIMINADO ? "bg-danger"
          : "bg-secondary";
        return <span className={`badge ${color}`}>{estado}</span>;
      },
    },
    {
      id: "acciones",
      header: "Acciones",
      cell: ({ row }) => {
        const pedido = row.original;
        const anulado = [ESTADOS.ELIMINADO, ESTADOS.CANCELADO].includes(pedido.estado);
        return (
          <div className="d-flex gap-1 justify-content-center">
            <button
              className="btn btn-outline-dark btn-sm"
              title="Ver auditoría"
              onClick={() => setAuditoriaPedido(pedido)}
            >
              <i className="fa-solid fa-magnifying-glass" />
            </button>
            {/* Ya anulado no se ofrece: volver a eliminarlo no cambia nada. */}
            {!anulado && (
              <button
                className="btn btn-outline-danger btn-sm"
                title={enLaCalle(pedido)
                  ? "El repartidor está en la calle: primero la jefa de deliverys marca que volvió"
                  : "Eliminar pedido"}
                onClick={() => eliminarPedido(pedido)}
                disabled={eliminando || enLaCalle(pedido)}
              >
                <i className="fa-solid fa-trash" />
              </button>
            )}
            {/* Solo los que eliminó el admin desde acá: los de F3 no guardan a qué
                estado volver. */}
            {pedido.estado === ESTADOS.ELIMINADO && pedido.estadoAnterior && (
              <button
                className="btn btn-outline-success btn-sm"
                title={`Restaurar pedido (vuelve a ${pedido.estadoAnterior})`}
                onClick={() => restaurarPedido(pedido)}
                disabled={eliminando}
              >
                <i className="fa-solid fa-rotate-left" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      {isLoading ? (
        <div className="w-100">
          <span className="loader position-absolute start-50 top-50 mt-3"></span>
        </div>
      ) : (
        <div className="w-100">
          <div className="container mw-100">
            <div className="row">
              <div className="col">
                <br />
                <div className="d-flex justify-content-between align-items-center mt-3 mb-3 flex-wrap gap-2">
                  <h1 style={{ marginLeft: "10px", marginBottom: 0 }}>Historial de Pedidos</h1>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    {esAdmin && (
                      <>
                        <label className="fw-semibold mb-0 small">Sucursal</label>
                        <select
                          className="form-select form-select-sm text-center"
                          style={{ width: "180px" }}
                          value={sucursalSel}
                          onChange={e => setSucursalSel(e.target.value)}
                        >
                          {sucursales.map(s => (
                            <option key={s.id} value={s.id}>{s.nombre || s.id}</option>
                          ))}
                        </select>
                      </>
                    )}
                    <label className="fw-semibold mb-0 small">Desde</label>
                    <input
                      type="date"
                      className="form-control form-control-sm text-center"
                      style={{ width: "160px" }}
                      value={fechaInicioStr}
                      onChange={e => setFechaInicioStr(e.target.value)}
                    />
                    <label className="fw-semibold mb-0 small">Hasta</label>
                    <input
                      type="date"
                      className="form-control form-control-sm text-center"
                      style={{ width: "160px" }}
                      value={fechaFinStr}
                      onChange={e => setFechaFinStr(e.target.value)}
                    />
                    <button className="btn btn-sm btn-dark" onClick={handleBuscar}>
                      Buscar
                    </button>
                  </div>
                </div>

                <TablaGenerica
                  data={pedidos}
                  columnas={columnasPedidos}
                  sortBy="timestamp"
                  ordenDescendente={true}
                  camposBusqueda={["codigo", "nombre", "direccion", "telefono"]}
                  camposFiltros={["metodoPago", "estado", "esLocal"]}
                  etiquetasFiltros={{ metodoPago: etiquetaPago }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <AuditoriaPedido
        pedido={auditoriaPedido}
        isOpen={!!auditoriaPedido}
        onClose={() => setAuditoriaPedido(null)}
      />
    </>
  );
};

export default HistorialPedidos;
