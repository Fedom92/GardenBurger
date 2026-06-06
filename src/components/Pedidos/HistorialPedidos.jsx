import React, { useState, useEffect } from "react";
import { collection, query, orderBy, getDocs, where } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import "../../style/Main.css"
import TablaGenerica from "../../Utils/TablaGenerica";
import { getRangoJornada } from "../../Utils/fechaComercial";
import { ESTADOS } from "../../Utils/Constantes";
import AuditoriaPedido from "./AuditoriaPedido";
import moment from "moment";

const { inicio: inicioJornada, fin: finJornada } = getRangoJornada();
const toInputDate = (d) => moment(d).format("YYYY-MM-DD");

const computeRango = (startStr, endStr) => {
  const horaAbre = Number(process.env.REACT_APP_horaAbre) || 9;
  const inicio = moment(startStr).set({ hour: horaAbre, minute: 0, second: 0, millisecond: 0 }).toDate();
  const fin = moment(endStr).add(1, "day").set({ hour: 3, minute: 0, second: 0, millisecond: 0 }).toDate();
  return { inicio, fin };
};

const HistorialPedidos = () => {
  const [pedidos, setPedidos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [auditoriaPedido, setAuditoriaPedido] = useState(null);

  const [fechaInicioStr, setFechaInicioStr] = useState(toInputDate(inicioJornada));
  const [fechaFinStr, setFechaFinStr] = useState(toInputDate(moment(finJornada).subtract(4, "hours")));
  const [queryRange, setQueryRange] = useState({ inicio: inicioJornada, fin: finJornada });

  const handleBuscar = () => setQueryRange(computeRango(fechaInicioStr, fechaFinStr));

  useEffect(() => {
    setIsLoading(true);
    const q = query(
      collection(db, "pedidos"),
      where("estado", "==", ESTADOS.FINAL),
      where("timestamp", ">=", queryRange.inicio),
      where("timestamp", "<=", queryRange.fin),
      orderBy("timestamp", "desc")
    );
    getDocs(q)
      .then(snap => setPedidos(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(err => console.error("Error HistorialPedidos:", err))
      .finally(() => setIsLoading(false));
  }, [queryRange]);

  const columnasPedidos = [
    {
      accessorKey: "timestamp",
      header: "Hora",
      cell: ({ getValue }) => {
        const ts = getValue();
        return ts?.toDate ? moment(ts.toDate()).format("DD/MM/YY HH:mm") : "—";
      },
    },
    { columnasBasicas: ["codigo", "total", "metodoPago", "nombre", "direccion", "telefono"] },
    {
      accessorKey: "envio",
      header: "Envío",
      cell: ({ getValue }) => {
        const envio = getValue();
        return envio ? `$${envio.costo_envio}` : "—";
      },
    },
    {
      accessorKey: "estado",
      header: "Estado",
      cell: ({ getValue }) => (
        <span className="badge bg-secondary">{getValue()}</span>
      ),
    },
    {
      id: "acciones",
      header: "Acciones",
      cell: ({ row }) => (
        <button
          className="btn btn-outline-dark btn-sm"
          title="Ver auditoría"
          onClick={() => setAuditoriaPedido(row.original)}
        >
          <i className="fa-solid fa-magnifying-glass" />
        </button>
      ),
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
                    <label className="fw-semibold mb-0 small">Desde</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      style={{ width: "160px" }}
                      value={fechaInicioStr}
                      onChange={e => setFechaInicioStr(e.target.value)}
                    />
                    <label className="fw-semibold mb-0 small">Hasta</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
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
                  camposFiltros={["metodoPago", "estado"]}
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
