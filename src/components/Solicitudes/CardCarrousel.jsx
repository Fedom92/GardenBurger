import React, { useContext } from 'react'
import { Link } from 'react-router-dom'
import { CartContext } from '../../context/CartContext'

export const CardCarousel = ({ producto }) => {

  const { agregarAlCarrito } = useContext(CartContext);
  
  return (
    <div style={{ 
      width: '100%', 
      maxWidth: '100%', 
      overflow: 'hidden',
      position: 'relative'
    }}>
      <div className="carousel-slide position-relative d-flex align-items-center justify-content-center" 
           style={{ 
             width: '100%', 
             maxWidth: '100%',
             overflow: 'hidden',
             position: 'relative',
             minHeight: '300px'
           }}>
        
        {/* Imagen de fondo */}
        <img
          src={producto.imagen}
          alt={producto.descripcion}
          className="carousel-bg"
          loading="lazy"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            maxWidth: '100%',
            zIndex: 1
          }}
        />

        {/* CARTEL DE OFERTA con ribbon - RESTAURADO */}
        {producto.oferta && (
          <div className="position-absolute top-0 start-0" style={{ zIndex: 3 }}>
            <div className="ribbon">
              <span>OFERTA</span>
            </div>
          </div>
        )}

        {/* Overlay de contenido */}
        <div className="carousel-overlay text-center text-light px-3 px-md-5"
             style={{
               position: 'relative',
               zIndex: 2,
               width: '100%',
               maxWidth: '100%',
               backgroundColor: 'rgba(0,0,0,0.4)',
               padding: '2rem 1rem',
               borderRadius: '0.5rem'
             }}>
          
          <Link to={`/item/${producto.id}`} className="text-decoration-none text-light">
            <h2 className="carousel-title fw-bold mb-3" style={{ fontSize: 'clamp(1.2rem, 4vw, 2rem)' }}>
              {producto.descripcion}
            </h2>
          </Link>

          <p className="carousel-ingredientes mb-3" style={{ fontSize: 'clamp(0.8rem, 2vw, 1rem)' }}>
            {producto.ingredientes}
          </p>
          
          <p className="carousel-price display-6 fw-semibold mb-4" style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)' }}>
            ${producto.precio.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  )
}