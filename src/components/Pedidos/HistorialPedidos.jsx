import React, { useState, useEffect, useCallback, useRef } from "react";
import { collection, query, orderBy, getDocs, where } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import "../../style/Main.css"
import TablaGenerica from "../../Utils/TablaGenerica";
import { Modal } from 'react-bootstrap';
import { getRangoJornada } from "../../Utils/fechaComercial";
import { ESTADOS } from "../../Utils/Constantes";
import AuditoriaPedido from "./AuditoriaPedido";

const HistorialPedidos = () => {
  const [pedidos, setPedidos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalShowVerNotas, setModalShowVerNotas] = useState([false, ""]);
  const [auditoriaId, setAuditoriaId] = useState(null);
  const { inicio, fin } = getRangoJornada();

  const pedidosCollection = useRef(query(collection(db, "pedidos"),
    where("estado", "==", ESTADOS.FINAL),
    where("timestamp", ">=", inicio),
    where("timestamp", "<=", fin),
    orderBy("timestamp", "desc")
  ));

  const getPedidos = useCallback((snapshot) => {
    const pedidosArray = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setPedidos(pedidosArray);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const pedidosSnapshot = await getDocs(pedidosCollection.current);
        await getPedidos(pedidosSnapshot);
      } catch (error) {
        console.error('Error fetching data HistorialPedidos:', error);
      }
    };

    fetchData();
  }, [getPedidos]);

  const columnasPedidos = [
    { columnasBasicas: ["codigo", "nombre", "direccion", "telefono", "total", "timestamp"] },
    {
      accessorKey: "metodoPago",
      header: "Método de Pago",
      cell: ({ getValue }) => {
        const metodo = getValue();
        const colorClass = metodo === "MP" ? "text-primary" : metodo === "EFECTIVO" ? "text-success" : "text-warning";
        return <span className={colorClass}>{metodo}</span>;
      },
    },
    {
      accessorKey: "envio",
      header: "Envío",
      cell: ({ getValue }) => {
        const envio = getValue();
        return envio ? `${envio.zona_envio} - $${envio.costo_envio}` : "Sin envío";
      },
    },
    {
      accessorKey: "carrito",
      header: "Productos",
      cell: ({ getValue }) => {
        const carrito = getValue();
        if (!carrito || carrito.length === 0) return "Sin productos";

        const totalProductos = carrito.reduce((sum, item) => sum + item.cantidad, 0);
        return `${totalProductos} producto${totalProductos !== 1 ? 's' : ''}`;
      },
    },
    {
      accessorKey: "pagaCon",
      header: "Paga Con",
      cell: ({ getValue, row }) => {
        const pagaCon = getValue();
        const metodoPago = row.original.metodoPago;

        if (metodoPago === "EFECTIVO" && pagaCon) {
          const vuelto = pagaCon - row.original.total;
          return (
            <div>
              <div>${pagaCon}</div>
              {vuelto > 0 && <small className="text-success">Vuelto: ${vuelto}</small>}
            </div>
          );
        }
        return "-";
      },
    },
    {
      accessorKey: "observaciones",
      header: "Observaciones",
      cell: ({ getValue }) => {
        const obs = getValue();
        return obs ? (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setModalShowVerNotas([true, obs])}
            title="Ver comentario"
          >
            <i className="fa-regular fa-comment"></i>
          </button>
        ) : "-";
      },
    },
    {
      id: "acciones",
      header: "Acciones",
      cell: ({ row }) => (
        <button
          className="btn btn-outline-dark btn-sm"
          title="Ver auditoría"
          onClick={() => setAuditoriaId(row.original.id)}
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
                <br></br>
                <div className="d-flex justify-content-between mt-3">
                  <div
                    className="d-flex justify-content-start align-items-center"
                    style={{ maxHeight: "40px", marginLeft: "10px" }}
                  >
                    <h1>Historial de Pedidos</h1>
                  </div>
                </div>

                <TablaGenerica
                  data={pedidos}
                  columnas={columnasPedidos}
                  sortBy="timestamp"
                  ordenDescendente={true}
                  camposBusqueda={["codigo", "nombre", "direccion", "telefono"]}
                  camposFiltros={["metodoPago"]}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {modalShowVerNotas[0] && (
        <Modal
          show={modalShowVerNotas[0]}
          size="md"
          aria-labelledby="contained-modal-title-vcenter"
          centered
          onHide={() => setModalShowVerNotas([false, ""])}
        >
          <Modal.Header
            closeButton
            onClick={() => setModalShowVerNotas([false, ""])}
          >
            <Modal.Title>Comentarios</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <form>
              <div className="row">
                <p>{modalShowVerNotas[1]}</p>
              </div>
            </form>
          </Modal.Body>
        </Modal>
      )}

      <AuditoriaPedido
        pedidoId={auditoriaId}
        isOpen={!!auditoriaId}
        onClose={() => setAuditoriaId(null)}
      />
    </>
  );
};

export default HistorialPedidos;
