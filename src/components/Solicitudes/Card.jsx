import React, { useContext } from 'react'
import { Link } from 'react-router-dom'
import { CartContext } from '../../context/CartContext'

export const Card = ({ producto }) => {

  const { agregarAlCarrito } = useContext(CartContext);


  return (
    <div className='cardCS'>
      <div className="cardColumnCS m-3">
        <Link to={`/item/${producto.id}`}><p className='titulo'>{producto.descripcion}</p></Link>
        <p className="ingredientes">{(producto.ingredientes)}</p>
        <div className="cardRowCS">
          <div className="imagenCS">
            <img src={producto.imagen} alt="imagen" />
          </div>
          <div className="cardColumnCS m-3">
            <p className="precio">${(producto.precio).toFixed(2)}</p>
            <button className='btnVerde' onClick={() => agregarAlCarrito(producto)}>Agregar al pedido</button>
          </div>
        </div>
      </div>
    </div>

  )
}
