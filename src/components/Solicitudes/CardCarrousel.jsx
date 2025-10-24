import React,{ useContext } from 'react'
import { Link } from 'react-router-dom'
import { CartContext } from '../../context/CartContext'

export const CardCarousel = ({ producto }) => {

  const { agregarAlCarrito } = useContext(CartContext);
  return (

    // <div className="card cardCarouselCS border-0 text-center w-100">
    //   <div className="position-relative">
    //     {/* Imagen del producto */}
    //     <div className='cardCS'>
    //       <div className="cardColumnCS m-3">
    //         <Link to={`/item/${producto.id}`} className='text-decoration-none'><p className='titulo'>{producto.descripcion}</p></Link>
    //         <p className="ingredientes">{(producto.ingredientes)}</p>
    //         <div className="cardRowCS">
    //           <div className="imagenCS">
    //             <img src={producto.imagen} alt={producto.descripcion} loading="lazy" />
    //           </div>
    //           <div className="cardColumnCS m-3">
    //             <p className="precio">${(producto.precio).toFixed(2)}</p>
    //             <button className='btnVerde' onClick={() => agregarAlCarrito(producto)}>Agregar al pedido</button>
    //           </div>
    //         </div>
    //       </div>
    //     </div>

    //     {/* Etiqueta OFERTA */}
    //     <span className="badge bg-danger oferta-badge position-absolute top-0 start-0 m-2">
    //       OFERTA
    //     </span>
    //   </div>


    // </div>


 
    <div className="carousel-slide position-relative d-flex align-items-center justify-content-center">
      {/* Imagen de fondo */}
      <img
        src={producto.imagen}
        alt={producto.descripcion}
        className="carousel-bg"
        loading="lazy"
      />

      {/* Overlay de contenido */}
      <div className="carousel-overlay text-center text-light px-3 px-md-5">
        {producto.oferta && (
<div className="ribbon">
  <span>OFERTA</span>
</div>
        )}

        <Link to={`/item/${producto.id}`} className="text-decoration-none text-light">
          <h2 className="carousel-title fw-bold mb-3">{producto.descripcion}</h2>
        </Link>

        <p className="carousel-ingredientes mb-3">{producto.ingredientes}</p>
        <p className="carousel-price display-6 fw-semibold mb-4">
          ${producto.precio.toFixed(2)}
        </p>

        <button
          className="btn btn-lg btn-success px-4 shadow-sm rounded-pill"
          onClick={() => agregarAlCarrito(producto)}
        >
          Agregar al pedido
        </button>
      </div>
    </div>
  )
}
