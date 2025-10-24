import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom';
import logo from '../../img/logo_negro3.png';
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";




export const PaginaDetalle = () => {
  const { id } = useParams(); // ID de la URL
  const [pedido, setPedido] = useState(null);

  useEffect(() => {
    const fetchPedido = async () => {
      try {
        const pedidoRef = doc(db, "solicitudes", id);
        const pedidoSnap = await getDoc(pedidoRef);

        if (pedidoSnap.exists()) {
          console.log("Datos del pedido:", pedidoSnap.data());
          setPedido(pedidoSnap.data());
        } else {
          console.log("No existe el pedido");
        }
      } catch (error) {
        console.error("Error obteniendo el pedido:", error);
      }
    };

    fetchPedido();
  }, [id]);


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

      <div>
        <h1>Detalle del pedido</h1>
        {pedido ? (
          <>
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
              </div> }
              <div className='d-flex m-2 gap-2'><p>Método de pago:</p>
               <em> {pedido.cliente.metodoPago}</em>
              </div>
              <div className='d-flex m-2 gap-2'><p>Celular:</p>
               <em> {pedido.cliente.telefono}</em>
              </div>
              <div className='d-flex m-2 gap-2'><p>Estado del pedido:</p>
              <em>  {pedido.estado}</em>
              </div>

            {pedido.productos.map((producto) => {
              return (

                <div className='itemDetalle'>
                  <div className="imagen">
                    <img src={producto.imagen} alt="imagen" />
                  </div>
                  <div className='tituloVP'>{producto.descripcion} x{producto.amountInCart}</div>

                  <div className="precioVP">${(producto.precio * producto.amountInCart).toFixed(2)}</div>

                </div>

              )
            }
            )}


            <div className='d-flex m-2 gap-2 precioVP'>Total:
              <div>${pedido.total}</div>
            </div>
            </div>
          </>
        ) : (

          <p>Cargando pedido...</p>
        )}
      </div>
    </div>

  )
}
