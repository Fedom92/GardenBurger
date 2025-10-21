import React, { useState, useEffect, useCallback, useRef } from "react";
import { collection, query, orderBy, getDocs, where, or } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import "../../style/Main.css"
import CryptoJS from 'crypto-js';
import TablaGenerica from "../../Utils/TablaGenerica";
import moment from 'moment';
import { Modal } from 'react-bootstrap';

const HistorialPedidos = () => {
  const [rol, setRol] = useState("");
  const [pedidos, setPedidos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalShowVerNotas, setModalShowVerNotas] = useState([false, ""]);
  const { inicio, fin } = getRangoJornada(new Date());
  
  function getRangoJornada(now = new Date()) {
    const startHour = 19; // 19:00
    const endHour = 2;    // 02:00 del día siguiente

    let inicio = new Date(now);
    let fin = new Date(now);

    if (now.getHours() < endHour) {
      // Caso: Entre 00:00 y 02:00 → jornada que empezó ayer
      inicio.setDate(inicio.getDate() - 1);
      inicio.setHours(startHour, 0, 0, 0);
      fin.setHours(endHour, 0, 0, 0);
    } else {
      // Caso: Después de 02:00 → jornada actual
      inicio.setHours(startHour, 0, 0, 0);
      fin.setDate(fin.getDate() + 1);
      fin.setHours(endHour, 0, 0, 0);
    }

    return { inicio, fin };
  }

  const pedidosCollectiona = collection(db, "pedidos");
  const pedidosCollection = useRef(query(
    pedidosCollectiona,
    where("estado", "==", "FIN"),
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
console.log(pedidosArray)
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

  useEffect(() => {
    const rolEncriptado = localStorage.getItem("rol");
    let bytesDesencriptado = CryptoJS.AES.decrypt(rolEncriptado, process.env.REACT_APP_cryptoKey);
    let rolDesencriptado = bytesDesencriptado.toString(CryptoJS.enc.Utf8);
    setRol(rolDesencriptado);
  }, []);

  const columnasPedidos = [
    { columnasBasicas: ["codigo", "nombre", "direccion", "telefono", "total", "fecha", "hora"] },
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
              {vuelto > 0 && <small className="text-success">Vuelto: ${vuelto.toFixed(2)}</small>}
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
                  campoSelector="metodoPago"
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
    </>
  );
};

export default HistorialPedidos;
