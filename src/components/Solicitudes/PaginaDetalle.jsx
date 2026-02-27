import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom';
import logo from '../../img/logo_negro3.png';
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import whatsapp from "../../img/whatsapp.webp";
import { useContext } from "react";
import { CartContext } from '../../context/CartContext.jsx'
import { FaCartPlus } from 'react-icons/fa';
import { Link } from "react-router-dom";
import { ESTADOS_SOLICITUDES } from '../../Utils/Constantes.jsx';


export const PaginaDetalle = () => {
  const { id } = useParams(); // ID de la URL
  const [pedido, setPedido] = useState(null);

  const { mensajeWSP } = useContext(CartContext);

  useEffect(() => {
    const fetchPedido = async () => {
      try {
        const pedidoRef = doc(db, "solicitudes", id);
        const pedidoSnap = await getDoc(pedidoRef);

        if (pedidoSnap.exists()) {
          setPedido(pedidoSnap.data());
        }
      } catch (error) {
        console.error("Error obteniendo el pedido:", error);
      }
    };

    fetchPedido();
  }, [id]);

  const enviarMensajeWSP = (() => {
    window.open(`https://api.whatsapp.com/send?phone=549${process.env.REACT_APP_celular}&text=${mensajeWSP}`, "_blank")
  })

  const indexActivo = ESTADOS_SOLICITUDES.findIndex(i => i.key === pedido?.estado);

  return (
    <div className='mainpageVP' >
      <header>
        <img className='logoCS' src={logo} alt="logoGarden" />
      </header>
      <main>
        <section className="m-1">
          <div className="d-flex justify-content-center">
            <i className="fa fa-map-marker m-1" aria-hidden="true"></i>
            <h5>Leonardo Da Vinci 4225 - Gregorio de Laferrere</h5>
          </div>
          <h6>La Matanza, La Matanza (Buenos Aires)</h6>
          <div className="d-flex justify-content-center">
            <i className="fa fa-motorcycle m-1" aria-hidden="true"></i>
            <h5>Envios a domicilio</h5>
          </div>
        </section>

      </main>

      {pedido && (
        <div className="container">
          {pedido.estado === "CANCELADO" ? (
            <div className="d-flex justify-content-center align-items-center flex-column">
              <div className="mb-2 small text-danger fw-bold text-uppercase">
                {pedido.estado}
              </div>
              <div className="bg-white">
                <i className="fa fa-check-circle text-danger fs-1" aria-hidden="true"></i>
              </div>
            </div>
          ) : (
            <div className="d-flex justify-content-between">
              {ESTADOS_SOLICITUDES.map((estado, index) => {
                const esCompletado = index <= indexActivo;
                const esActivo = index < indexActivo;
                const esUltimo = index === ESTADOS_SOLICITUDES.length - 1;

                return (
                  <div key={estado.key} className="text-center position-relative flex-fill">
                    {!esUltimo && (
                      <div className={`mt-2 position-absolute end-0 top-50 w-100 opacity-50 start-50 z-0 border border-1 border-dark ${esActivo ? 'bg-dark' : 'bg-secondary'}`}></div>
                    )}

                    <div className={`mb-1
                      ${esCompletado ? 'text-dark fw-bold' : 'text-secondary'
                      }`}>
                      <span className='fs-6 mx-2'>{estado.label}</span>
                    </div>

                    <div className="position-relative bg-white" style={{ zIndex: 1, display: 'inline-block', padding: '0 10px' }}>
                      <i className={`fa ${esCompletado ? 'fa-check-circle text-dark' : 'fa-circle text-secondary'} fs-2`} aria-hidden="true"></i>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div>
        {pedido ? (
          <>
            {pedido.estado !== "CANCELADO" && (<h1 className='text-center m-4'>Gracias por tu compra!</h1>)}

            <div className='itemsConteiner'>

              <div className='d-flex m-2 gap-2'><p>Cliente:</p>
                <em>{pedido.cliente.nombre}</em>
              </div>
              <div className='d-flex m-2 gap-2'><p>Método de entrega:</p>
                <em> {pedido.cliente.opcion}</em>
              </div>
              {pedido.cliente.direccion &&
                <div className='d-flex m-2 gap-2'><p>Dirección:</p>
                  <em> {pedido.cliente.direccion}</em>
                </div>}
              <div className='d-flex m-2 gap-2'><p>Método de pago:</p>
                <em> {pedido.cliente.metodoPago}</em>
              </div>
              <div className='d-flex m-2 gap-2'><p>Celular:</p>
                <em> {pedido.cliente.telefono}</em>
              </div>

              {pedido.productos.map((producto) => {
                return (
                  <div key={producto.id} className='itemDetalle'>
                    <div className="imagen">
                      <img src={producto.imagen} alt="imagen" />
                    </div>
                    <div className='tituloVP'>{producto.descripcion} x{producto.amountInCart}</div>

                    <div className="precioVP">${(producto.precio * producto.amountInCart)}</div>
                  </div>
                )
              }
              )}

              <div className='d-flex m-2 gap-2 precioVP'>Total:
                <div>${pedido.total}</div>
              </div>
            </div>

            <div className='d-flex flex-column align-items-center text-center mt-3 mb-3 w-50 mx-auto'>
              <button
                type="button"
                className="btn btn-success fw-bold d-flex align-items-center justify-content-center gap-2"
                onClick={enviarMensajeWSP}
              >
                <img
                  src={whatsapp}
                  width="20"
                  alt="Logo Wsp"
                />
                Enviar Whatsapp
              </button>

              <Link
                to="/crear-solicitud"
                className="btn btn-primary fw-bold mt-3 d-flex align-items-center justify-content-center gap-2"
              >
                <FaCartPlus />
                Hacer Otro Pedido
              </Link>

            </div>
          </>
        ) : (
          <p>Cargando pedido...</p>
        )}
      </div>
    </div>
  )
}