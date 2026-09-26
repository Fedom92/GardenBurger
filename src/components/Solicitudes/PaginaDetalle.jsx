import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom';
import logo from '../../img/logo_negro3.png';
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import whatsapp from "../../img/whatsapp.webp";
import { FaCartPlus } from 'react-icons/fa';
import { Link } from "react-router-dom";
import { ESTADOS, ENVIOS_LOCALES, FLUJO_PUB_ESTADOS, getCurrentStepIndex } from '../../Utils/Constantes.jsx';
import Footer from './Footer';
import { fmtPesos } from "../../Utils/formato";

export const PaginaDetalle = () => {
  const { sucursal, id } = useParams(); // Sucursal e ID del pedido en la URL
  const [pedido, setPedido] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    const fetchPedido = async () => {
      try {
        const pedidoRef = doc(db, "sucursales", sucursal, "pedidos", id);
        const pedidoSnap = await getDoc(pedidoRef);

        if (pedidoSnap.exists()) {
          setPedido(pedidoSnap.data());
        } else {
          setPedido(null);
        }
      } catch (error) {
        console.error("Error obteniendo el pedido:", error);
        // Las reglas niegan el link vencido y el que no existe con el mismo
        // permission-denied: el cartel tiene que servir para los dos.
        setAviso(error.code === "permission-denied"
          ? "Este pedido ya no está disponible. Si tenés dudas, escribinos por WhatsApp."
          : "No pudimos cargar tu pedido. Probá recargar la página.");
      } finally {
        setLoading(false);
      }
    };

    fetchPedido();
  }, [id, sucursal]);

  const enviarMensajeWSP = (() => {
    // El teléfono de la sucursal quedó guardado en la solicitud al crearla.
    if (pedido?.mensajeWsp && pedido?.telefonoSucursal) {
      window.open(`https://api.whatsapp.com/send?phone=549${pedido.telefonoSucursal}&text=${pedido.mensajeWsp}`, "_blank");
    }
  })

  const estado = pedido?.estado;
  const isCancelado = estado === ESTADOS.CANCELADO || estado === ESTADOS.ELIMINADO;
  const currentStep = getCurrentStepIndex(estado);

  // Cocina rutea por envio.zona_envio, asi que esa es la fuente real; mientras el
  // cajero no cargue el pedido, la unica pista es lo que eligio el cliente en la web.
  const esRetiro = pedido?.envio
    ? ENVIOS_LOCALES.includes(pedido.envio.zona_envio)
    : pedido?.cliente?.opcion === ENVIOS_LOCALES[0];

  return (
    <div className='mainpageVP' >
      <header>
        <img className='logoCS' src={logo} alt="logoGarden" />
      </header>

      {pedido && (
        <div className="container">
          {isCancelado ? (
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
              {FLUJO_PUB_ESTADOS.map((paso, index) => {
                const esCompletado = index <= currentStep;
                const esActivo = index < currentStep;
                const esUltimo = index === FLUJO_PUB_ESTADOS.length - 1;

                return (
                  <div key={paso} className="text-center position-relative flex-fill">
                    {!esUltimo && (
                      <div className={`mt-2 position-absolute end-0 top-50 w-100 opacity-50 start-50 z-0 border border-1 border-dark ${esActivo ? 'bg-dark' : 'bg-secondary'}`}></div>
                    )}

                    <div className={`mb-1 ${esCompletado ? 'text-dark fw-bold' : 'text-secondary'}`}>
                      <span className='fs-6 mx-2'>{esRetiro && paso === ESTADOS.DELIVERY ? "LISTO" : paso}</span>
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
        {loading ? (
          <p className="text-center mt-5">Cargando pedido...</p>
        ) : pedido ? (
          <>
            {!isCancelado && (<h1 className='text-center m-4'>Gracias por tu compra!</h1>)}

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

              {pedido.carrito?.map((producto, index) => {
                return (
                  <div key={`${producto.id}-${index}`} className='itemDetalle'>
                    <div className="imagen">
                      <img src={producto.imagen} alt="imagen" />
                    </div>
                    <div className='tituloVP'>{producto.descripcion} x{producto.cantidad}</div>

                    <div className="precioVP">{fmtPesos(producto.precio * producto.cantidad)}</div>
                  </div>
                )
              }
              )}

              <div className='d-flex m-2 gap-2 precioVP'>Total:
                <div>{fmtPesos(pedido.total)}</div>
              </div>
            </div>

            <div className='d-flex flex-column align-items-center text-center mt-3 mb-3 w-50 mx-auto'>
              <Link
                to={`/crear-solicitud/${sucursal}`}
                className="btn btn-primary fw-bold mt-3 mb-3 d-flex align-items-center justify-content-center gap-2"
              >
                <FaCartPlus />
                Hacer Otro Pedido
              </Link>
            </div>

            {/* Botón flotante WhatsApp: solo si la sucursal tenía teléfono al crear el pedido */}
            {pedido.telefonoSucursal && (
              <button
                type="button"
                className="fab-whatsapp"
                onClick={enviarMensajeWSP}
              >
                <img src={whatsapp} alt="WhatsApp" />
              </button>
            )}
          </>
        ) : (
          aviso
            ? <h4 className='text-center m-4'>{aviso}</h4>
            : <h1 className='text-center m-4'>No se ha encontrado registros!</h1>
        )}
      </div>
      <Footer sucursal={pedido?.telefonoSucursal ? { telefono: pedido.telefonoSucursal } : null} />
    </div>
  )
}