import React, { useContext } from 'react'
import { Link } from 'react-router-dom'
import { CartContext } from '../../context/CartContext'

export const Card = ({ producto }) => {
  const { 
    agregarProductoNormal,
    iniciarSeleccionHamburguesa,
    categoriasHamburguesas,
    limpiarNombreHamburguesa,
    aumentarCombo,
  } = useContext(CartContext);

  // Determinar si es una hamburguesa
  const esHamburguesa = categoriasHamburguesas.includes(producto.categoria);
  
  // Obtener nombre para mostrar en la card
  const nombreMostrar = esHamburguesa ? 
    limpiarNombreHamburguesa(producto.descripcion) : 
    producto.descripcion;

  const handleAgregar = () => {
    aumentarCombo();
    if (esHamburguesa && producto.variantes) {
      iniciarSeleccionHamburguesa(producto);
    } else {
      agregarProductoNormal(producto);
    }
  };

  return (
    <div className='cardCS'>
      <div className="cardColumnCS m-3">
        <Link to={`/item/${producto.id}`} className='text-decoration-none'>
          <p className='titulo'>{nombreMostrar}</p>
        </Link>
        <p className="ingredientes">{producto.ingredientes}</p>
        <div className="cardRowCS">
          <div className="imagenCS">
            <img src={producto.imagen} alt={nombreMostrar} loading="lazy" />
          </div>
          <div className="cardColumnCS m-3">
            <p className="precio">${(producto.precio).toFixed(2)}</p>
            <button className='btnVerde' onClick={handleAgregar}>
              Agregar al pedido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};