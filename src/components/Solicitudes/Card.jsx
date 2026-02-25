import React, { useContext } from 'react'
import { Link } from 'react-router-dom'
import { CartContext } from '../../context/CartContext'
import { CATEGORIAS_HAMBURGUESA } from '../../Utils/Constantes'

export const Card = ({ producto }) => {
  const { 
    agregarProductoNormal,
    iniciarSeleccionHamburguesa,
    limpiarNombreHamburguesa,
    aumentarCombo,
    agregarAlCarrito,
  } = useContext(CartContext);

  // Determinar si es una hamburguesa
  const esHamburguesa = CATEGORIAS_HAMBURGUESA.includes(producto.categoria);
  
  // Obtener nombre para mostrar en la card
  const nombreMostrar = esHamburguesa ? 
    limpiarNombreHamburguesa(producto.descripcion) : 
    producto.descripcion;

  const handleAgregar = () => {
    if (esHamburguesa && producto.variantes) {
      aumentarCombo();
      iniciarSeleccionHamburguesa(producto);
    } else if (producto.categoria === 'BEBIDAS') {
      // Las bebidas se agregan directamente (se consolidan si ya están en carrito)
      agregarAlCarrito(producto);
    } else {
      aumentarCombo();
      agregarProductoNormal(producto);
    }
  };

  return (
    <div className='cardCS'>
      <div className="cardColumnCS m-3">
        <Link to={`/item/${producto.id}`} className='text-decoration-none pe-none'>
          <p className='titulo'>{nombreMostrar}</p>
        </Link>
        <p className="ingredientes">{producto.ingredientes}</p>
        <div className="cardRowCS">
          <div className="imagenCS btn">
            <img src={producto.imagen} alt={nombreMostrar} loading="lazy" onClick={handleAgregar}/>
          </div>
          <div className="cardColumnCS m-3">
            <p className="precio">${(producto.precio)}</p>
            <button type='button' className='btn btn-success' onClick={handleAgregar}>
              Agregar al pedido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};